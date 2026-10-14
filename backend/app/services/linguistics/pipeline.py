"""End-to-end Text-to-ISL translation pipeline coordinator."""

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.sign import SignVocabulary
from app.models.translation import Translation, TranslationSegment
from app.schemas.sign import SignAnimationAssetResponse
from app.schemas.translation import (
    CoverageMetricsSchema,
    GrammarRuleAppliedSchema,
    TextTranslationResponse,
    TranslationSegmentSchema,
)
from app.services.linguistics.grammar_engine import transform_to_isl_grammar
from app.services.linguistics.normalizer import normalize_text
from app.services.linguistics.phrase_matcher import match_phrases

HONESTY_NOTICE = (
    "AI SignBridge enforces strict honesty rules: ISL grammar reordering is rule-based "
    "and flagged 'needs linguist review' (Rule 5). Unsupported words are explicitly reported "
    "and never replaced with hallucinated or random signs (Rule 2)."
)

SUPPORTED_LANGUAGES: dict[str, dict[str, str]] = {
    "en": {
        "code": "en",
        "name": "English",
        "native_name": "English",
        "status": "active",
        "notes": "Direct tokenization, phrase-first idiom lookup, rule-based SOV reordering.",
    },
    "hi": {
        "code": "hi",
        "name": "Hindi",
        "native_name": "हिन्दी",
        "status": "active",
        "notes": "Devanagari script tokenization, bilingual gloss mapping, SOV alignment.",
    },
}


async def translate_text_to_isl(
    text: str,
    source_language: str = "en",
    save_history: bool = True,
    user_id: uuid.UUID | None = None,
    db: AsyncSession | None = None,
) -> TextTranslationResponse:
    """Execute the complete Text-to-ISL pipeline.

    1. Validates input
    2. Normalizes text
    3. Matches multi-word phrases (phrase-first)
    4. Applies rule-based ISL grammar transforms (flagged 'needs linguist review')
    5. Resolves dictionary glosses in PostgreSQL
    6. Identifies unsupported signs and computes coverage
    7. Persists translation and segments
    """
    # 1. Validation
    trimmed_text = text.strip() if text else ""
    if not trimmed_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text input cannot be empty or whitespace only.",
        )

    if len(trimmed_text) > 2000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Text exceeds maximum allowed length of 2000 characters.",
        )

    lang_code = source_language.lower()
    if lang_code not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported source language '{source_language}'. Supported: {list(SUPPORTED_LANGUAGES.keys())}",
        )

    # 2. Normalization & Tokenization
    raw_tokens = normalize_text(trimmed_text, source_language=lang_code)
    if not raw_tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid translatable tokens found after normalization.",
        )

    # 3. Phrase-First Multi-Word Idiom Lookup
    phrased_tokens = match_phrases(raw_tokens)

    # 4. Rule-Based ISL Grammar Transformations
    reordered_glosses, grammar_rules = transform_to_isl_grammar(phrased_tokens)

    # 5. Sign Dictionary Lookup
    gloss_records: dict[str, SignVocabulary] = {}
    if db is not None and reordered_glosses:
        unique_glosses = list(set(reordered_glosses))
        stmt = (
            select(SignVocabulary)
            .options(selectinload(SignVocabulary.animation_assets))
            .where(SignVocabulary.gloss.in_(unique_glosses))
        )
        result = await db.execute(stmt)
        found_signs = result.scalars().all()
        gloss_records = {s.gloss: s for s in found_signs}

    # 6. Build Segments, Detect Unsupported Signs, and Compute Timestamps
    segments: list[TranslationSegmentSchema] = []
    unsupported_tokens: list[str] = []
    current_time_ms = 0
    standard_duration_ms = 1000

    for idx, gloss in enumerate(reordered_glosses):
        sign = gloss_records.get(gloss)
        is_supported = sign is not None

        if is_supported and sign is not None:
            anim = None
            duration = standard_duration_ms
            if sign.animation_assets:
                asset = sign.animation_assets[0]
                anim = SignAnimationAssetResponse.model_validate(asset)
                duration = int(asset.duration_seconds * 1000)

            seg = TranslationSegmentSchema(
                sequence_order=idx,
                source_token=gloss.lower(),
                gloss=gloss,
                sign_id=sign.id,
                is_supported=True,
                duration_ms=duration,
                timestamp_start_ms=current_time_ms,
                timestamp_end_ms=current_time_ms + duration,
                animation_asset=anim,
            )
            current_time_ms += duration
        else:
            unsupported_tokens.append(gloss)
            seg = TranslationSegmentSchema(
                sequence_order=idx,
                source_token=gloss.lower(),
                gloss=gloss,
                sign_id=None,
                is_supported=False,
                duration_ms=0,
                timestamp_start_ms=current_time_ms,
                timestamp_end_ms=current_time_ms,
                animation_asset=None,
            )

        segments.append(seg)

    total_tokens = len(reordered_glosses)
    supported_tokens = total_tokens - len(unsupported_tokens)
    coverage_pct = round((supported_tokens / total_tokens) * 100, 1) if total_tokens > 0 else 0.0

    coverage = CoverageMetricsSchema(
        total_tokens=total_tokens,
        supported_tokens=supported_tokens,
        unsupported_tokens=unsupported_tokens,
        coverage_percentage=coverage_pct,
    )

    grammar_rule_schemas = [
        GrammarRuleAppliedSchema(
            rule_id=r.rule_id,
            description=r.description,
            linguist_notes=r.linguist_notes,
            original_order=r.original_order,
            transformed_order=r.transformed_order,
        )
        for r in grammar_rules
    ]

    translation_id = uuid.uuid4()
    now_utc = datetime.now(timezone.utc)

    # 7. Persistence
    if save_history and db is not None:
        translation_record = Translation(
            id=translation_id,
            user_id=user_id,
            direction="TEXT_TO_ISL",
            source_text=trimmed_text,
            status="completed",
            metadata_={
                "source_language": lang_code,
                "coverage": coverage.model_dump(),
                "grammar_rules": [r.to_dict() for r in grammar_rules],
            },
            created_at=now_utc,
            updated_at=now_utc,
        )
        db.add(translation_record)
        await db.flush()

        for seg in segments:
            db_segment = TranslationSegment(
                id=uuid.uuid4(),
                translation_id=translation_record.id,
                sequence_order=seg.sequence_order,
                source_token=seg.source_token,
                sign_id=seg.sign_id,
                confidence=1.0 if seg.is_supported else None,
                timestamp_start_ms=seg.timestamp_start_ms,
                timestamp_end_ms=seg.timestamp_end_ms,
            )
            db.add(db_segment)

        await db.commit()

    return TextTranslationResponse(
        translation_id=translation_id,
        source_text=trimmed_text,
        source_language=lang_code,
        target_language="ISL",
        normalized_tokens=raw_tokens,
        reordered_glosses=reordered_glosses,
        grammar_rules_applied=grammar_rule_schemas,
        segments=segments,
        coverage=coverage,
        honesty_notice=HONESTY_NOTICE,
        created_at=now_utc,
    )
