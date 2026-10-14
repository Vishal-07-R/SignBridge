"""Schemas for OCR, video media processing, and job management."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.translation import TextTranslationResponse


class OcrTranslationResponse(BaseModel):
    """Response payload for document and image OCR processing."""

    extracted_text: str = Field(..., description="Raw text extracted from image or document")
    metadata: dict[str, Any] = Field(..., description="Extraction metadata (engine, counts, pages)")
    translation: TextTranslationResponse | None = Field(
        None, description="Optional immediate ISL translation of the extracted text"
    )


class SegmentTranslationRequest(BaseModel):
    """Payload to translate a single edited transcript segment into ISL glosses."""

    text: str = Field(..., min_length=1, max_length=1000, description="Segment text content")
    source_language: str = Field("en", description="Source language code (en or hi)")


class SegmentTranslationResponse(BaseModel):
    """Response containing updated ISL glosses and grammar audit for an edited segment."""

    text: str
    glosses: list[str]
    unsupported_tokens: list[str]
    grammar_audit: list[dict[str, Any]]


class JobStatusResponse(BaseModel):
    """Real-time status and result data for asynchronous background media jobs."""

    id: uuid.UUID
    job_type: str
    status: str  # queued, processing, completed, failed, cancelled
    progress: int  # 0 to 100
    error_message: str | None = None
    result_data: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
