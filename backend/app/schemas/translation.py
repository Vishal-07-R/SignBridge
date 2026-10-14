"""Pydantic schemas for text-to-ISL translation and feedback."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.sign import SignAnimationAssetResponse


class GrammarRuleAppliedSchema(BaseModel):
    """Linguistic grammar transformation record."""

    rule_id: str
    description: str
    linguist_notes: str = "needs linguist review"
    original_order: list[str]
    transformed_order: list[str]


class TranslationSegmentSchema(BaseModel):
    """Segment detail for a single token in the generated sign sequence."""

    id: uuid.UUID | None = None
    sequence_order: int
    source_token: str
    gloss: str
    sign_id: uuid.UUID | None = None
    is_supported: bool
    duration_ms: int = 1000
    timestamp_start_ms: int = 0
    timestamp_end_ms: int = 1000
    animation_asset: SignAnimationAssetResponse | None = None


class CoverageMetricsSchema(BaseModel):
    """Vocabulary coverage statistics enforcing honesty rules."""

    total_tokens: int
    supported_tokens: int
    unsupported_tokens: list[str]
    coverage_percentage: float


class TextTranslationRequest(BaseModel):
    """Input payload for text-to-ISL translation."""

    text: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Source text to translate into Indian Sign Language",
    )
    source_language: str = Field(
        default="en",
        description="Source language ISO code ('en' for English, 'hi' for Hindi)",
    )
    save_history: bool = Field(
        default=True,
        description="Whether to persist this translation in session history",
    )


class TextTranslationResponse(BaseModel):
    """Complete translation response with linguistic breakdown and avatar sequence."""

    model_config = ConfigDict(from_attributes=True)

    translation_id: uuid.UUID
    source_text: str
    source_language: str
    target_language: str = "ISL"
    normalized_tokens: list[str]
    reordered_glosses: list[str]
    grammar_rules_applied: list[GrammarRuleAppliedSchema]
    segments: list[TranslationSegmentSchema]
    coverage: CoverageMetricsSchema
    honesty_notice: str
    created_at: datetime


class TranslationFeedbackCreate(BaseModel):
    """User feedback submission for translation accuracy."""

    rating: int = Field(..., ge=1, le=5, description="Quality rating from 1 to 5 stars")
    feedback_text: str | None = Field(
        default=None,
        max_length=1000,
        description="Optional textual explanation of errors or suggestions",
    )
    error_category: str | None = Field(
        default=None,
        description="Category: 'wrong_sign', 'bad_grammar', 'unrecognized', 'timing', 'other'",
    )


class TranslationFeedbackResponse(BaseModel):
    """Feedback confirmation response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    translation_id: uuid.UUID
    user_id: uuid.UUID | None
    rating: int
    feedback_text: str | None
    error_category: str | None
    created_at: datetime


class SupportedLanguageResponse(BaseModel):
    """Supported source language information."""

    code: str
    name: str
    native_name: str
    status: str
    notes: str
