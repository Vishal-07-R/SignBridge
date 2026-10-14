"""Text to ISL translation and user feedback API endpoints."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_optional_user
from app.models.translation import Translation, TranslationFeedback
from app.models.user import User
from app.schemas.translation import (
    SupportedLanguageResponse,
    TextTranslationRequest,
    TextTranslationResponse,
    TranslationFeedbackCreate,
    TranslationFeedbackResponse,
)
from app.services.linguistics.pipeline import SUPPORTED_LANGUAGES, translate_text_to_isl

router = APIRouter()


@router.post("/text", response_model=TextTranslationResponse)
async def translate_text_endpoint(
    payload: TextTranslationRequest,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> TextTranslationResponse:
    """Translate raw text to an ordered ISL gloss sequence and 3D avatar animation timeline."""
    user_id = current_user.id if current_user else None
    return await translate_text_to_isl(
        text=payload.text,
        source_language=payload.source_language,
        save_history=payload.save_history,
        user_id=user_id,
        db=db,
    )


@router.get("/languages", response_model=list[SupportedLanguageResponse])
async def get_supported_languages() -> list[SupportedLanguageResponse]:
    """Retrieve list of supported source languages and their linguistic capabilities."""
    return [
        SupportedLanguageResponse(
            code=info["code"],
            name=info["name"],
            native_name=info["native_name"],
            status=info["status"],
            notes=info["notes"],
        )
        for info in SUPPORTED_LANGUAGES.values()
    ]


@router.post("/{translation_id}/feedback", response_model=TranslationFeedbackResponse)
async def submit_translation_feedback(
    translation_id: uuid.UUID,
    payload: TranslationFeedbackCreate,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> TranslationFeedbackResponse:
    """Submit user rating and feedback for translation quality control and linguistic review."""
    # Verify translation session exists
    stmt = select(Translation).where(Translation.id == translation_id)
    translation = await db.scalar(stmt)
    if not translation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Translation record not found.",
        )

    user_id = current_user.id if current_user else None
    feedback = TranslationFeedback(
        id=uuid.uuid4(),
        translation_id=translation_id,
        user_id=user_id,
        rating=payload.rating,
        feedback_text=payload.feedback_text,
        error_category=payload.error_category,
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)

    return TranslationFeedbackResponse.model_validate(feedback)


@router.get("/{translation_id}")
async def get_translation_detail(
    translation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve translation metadata and ordered sign segments by ID."""
    stmt = (
        select(Translation)
        .options(selectinload(Translation.segments))
        .where(Translation.id == translation_id)
    )
    translation = await db.scalar(stmt)
    if not translation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Translation record not found.",
        )

    return {
        "id": str(translation.id),
        "direction": translation.direction,
        "source_text": translation.source_text,
        "status": translation.status,
        "metadata": translation.metadata_,
        "created_at": translation.created_at.isoformat(),
        "segments": [
            {
                "id": str(s.id),
                "sequence_order": s.sequence_order,
                "source_token": s.source_token,
                "sign_id": str(s.sign_id) if s.sign_id else None,
                "confidence": s.confidence,
                "timestamp_start_ms": s.timestamp_start_ms,
                "timestamp_end_ms": s.timestamp_end_ms,
            }
            for s in translation.segments
        ],
    }
