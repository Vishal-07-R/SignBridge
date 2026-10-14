import asyncio
import os
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_optional_user
from app.models.translation import Translation, TranslationFeedback
from app.models.user import User
from app.schemas.media import (
    JobStatusResponse,
    OcrTranslationResponse,
    SegmentTranslationRequest,
    SegmentTranslationResponse,
)
from app.schemas.translation import (
    SupportedLanguageResponse,
    TextTranslationRequest,
    TextTranslationResponse,
    TranslationFeedbackCreate,
    TranslationFeedbackResponse,
)
from app.services.linguistics.pipeline import SUPPORTED_LANGUAGES, translate_text_to_isl
from app.services.media.job_manager import create_video_job, process_video_transcription_job
from app.services.media.ocr import perform_document_ocr
from app.services.media.validator import (
    UPLOAD_TEMP_DIR,
    secure_temp_file,
    validate_image_or_document_upload,
    validate_video_upload,
)

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


@router.post("/image", response_model=OcrTranslationResponse)
async def translate_image_endpoint(
    file: UploadFile = File(...),
    source_language: str = Form("en"),
    page_number: int | None = Form(None),
    auto_translate: bool = Form(True),
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> OcrTranslationResponse:
    """Extract text from uploaded document/image via Tesseract OCR and map to ISL animation."""
    content = await file.read()
    filename = file.filename or "uploaded_media.png"
    mime_type = validate_image_or_document_upload(content, filename)
    ext = Path(filename).suffix.lower()

    user_id = current_user.id if current_user else None

    with secure_temp_file(content, ext) as temp_path:
        # Run Tesseract OCR / PDF extraction
        ocr_lang = "hin" if source_language == "hi" else "eng"
        extracted_text, metadata = perform_document_ocr(
            temp_path, mime_type, language=ocr_lang, page_number=page_number
        )

        translation_result: TextTranslationResponse | None = None
        if auto_translate and extracted_text:
            translation_result = await translate_text_to_isl(
                text=extracted_text,
                source_language=source_language,
                save_history=False,
                user_id=user_id,
                db=db,
            )

        return OcrTranslationResponse(
            extracted_text=extracted_text,
            metadata=metadata,
            translation=translation_result,
        )


@router.post("/video", response_model=JobStatusResponse)
async def translate_video_endpoint(
    file: UploadFile = File(...),
    source_language: str = Form("en"),
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> JobStatusResponse:
    """Upload video file, extract audio with ffmpeg, transcribe via faster-whisper, and map to ISL.

    Dispatches an asynchronous background job tracked in video_processing_jobs.
    """
    content = await file.read()
    filename = file.filename or "video.mp4"
    _ = validate_video_upload(content, filename)
    ext = Path(filename).suffix.lower()

    # Save to persistent temp path in UPLOAD_TEMP_DIR for background processing
    unique_file = f"{uuid.uuid4()}{ext}"
    saved_path = UPLOAD_TEMP_DIR / unique_file
    fd = os.open(str(saved_path), os.O_CREAT | os.O_WRONLY | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as f:
        f.write(content)

    user_id = current_user.id if current_user else None
    job = await create_video_job(
        db=db,
        input_file_path=str(saved_path),
        job_type="transcription",
        user_id=user_id,
    )

    # Dispatch asynchronous background task
    asyncio.create_task(
        process_video_transcription_job(
            job_id=job.id,
            video_path=saved_path,
            language=source_language,
            user_id=user_id,
        )
    )

    return JobStatusResponse.model_validate(job)


@router.post("/segment", response_model=SegmentTranslationResponse)
async def translate_segment_endpoint(
    payload: SegmentTranslationRequest,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> SegmentTranslationResponse:
    """Re-translate a single user-edited transcript segment into ISL glosses."""
    user_id = current_user.id if current_user else None
    res = await translate_text_to_isl(
        text=payload.text,
        source_language=payload.source_language,
        save_history=False,
        user_id=user_id,
        db=db,
    )

    glosses = [
        s.gloss if s.is_supported else s.source_token.upper() for s in res.segments
    ]
    audit = [
        {
            "rule_id": r.rule_id,
            "description": r.description,
            "linguist_notes": r.linguist_notes,
        }
        for r in res.grammar_rules_applied
    ]

    return SegmentTranslationResponse(
        text=payload.text,
        glosses=glosses,
        unsupported_tokens=res.coverage.unsupported_tokens,
        grammar_audit=audit,
    )
