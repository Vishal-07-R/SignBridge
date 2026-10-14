"""API endpoints for ISL to Text landmark sequence recognition and video analysis."""

from __future__ import annotations

import asyncio
import os
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_optional_user
from app.models.job import VideoProcessingJob
from app.models.user import User
from app.schemas.recognition import (
    LandmarkSequenceRequest,
    ModelMetadataResponse,
    RecognitionResponse,
    VideoRecognitionJobResponse,
    VideoRecognitionSegment,
)
from app.services.media.job_manager import create_video_job, get_job_authorized
from app.services.media.validator import (
    UPLOAD_TEMP_DIR,
    validate_video_upload,
)
from app.services.recognition.demo_model import DemoRuleBasedSequenceModel
from app.services.recognition.video_pipeline import (
    cancel_recognition_job_in_memory,
    process_video_recognition_job,
)

router = APIRouter()
_model_instance = DemoRuleBasedSequenceModel()


@router.get("/model-info", response_model=ModelMetadataResponse)
async def get_model_metadata() -> ModelMetadataResponse:
    """Return versioned ISL recognition model metadata, input tensor specifications, and honest limitations."""
    return _model_instance.get_metadata()


@router.post("/landmarks", response_model=RecognitionResponse)
@router.post("/signs", response_model=RecognitionResponse)
async def recognize_landmark_sequence(
    request: LandmarkSequenceRequest,
) -> RecognitionResponse:
    """Run real-time inference on a temporal sequence of frame landmarks from the browser webcam.

    Evaluates geometric features across the temporal window. If confidence is below the
    threshold (< 0.60), returns an explicit "Sign not recognized" state (Honesty Rule 1 & 4).
    """
    return await _model_instance.predict(request)


@router.post("/video", status_code=status.HTTP_202_ACCEPTED)
async def upload_signing_video_for_recognition(
    file: Annotated[UploadFile, File(...)],
    sampling_fps: Annotated[int, Form()] = 15,
    batch_size: Annotated[int, Form()] = 32,
    language: Annotated[str, Form()] = "en",
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> dict[str, Any]:
    """Upload pre-recorded video of signing for asynchronous batch recognition."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required.",
        )

    file_bytes = await file.read()
    validate_video_upload(file_bytes, file.filename, file.content_type)

    ext = Path(file.filename).suffix.lower() or ".mp4"
    job_uuid = uuid.uuid4()
    temp_path = UPLOAD_TEMP_DIR / f"sign_recog_{job_uuid.hex}{ext}"

    # Safely persist upload to temporary path with restricted permissions
    fd = os.open(str(temp_path), os.O_CREAT | os.O_WRONLY | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as f:
        f.write(file_bytes)

    # Persist job record
    user_id = current_user.id if current_user else None
    job = await create_video_job(
        db=db,
        input_file_path=str(temp_path),
        job_type="recognition",
        user_id=user_id,
    )

    # Dispatch background worker
    asyncio.create_task(
        process_video_recognition_job(
            job_id=job.id,
            video_path=temp_path,
            sampling_fps=sampling_fps,
            batch_size=batch_size,
            language=language,
            user_id=user_id,
        )
    )

    return {
        "job_id": str(job.id),
        "status": "queued",
        "progress": 0,
        "message": "Signing video uploaded and recognition job queued.",
    }


@router.get("/video/{job_id}", response_model=VideoRecognitionJobResponse)
async def get_video_recognition_job(
    job_id: uuid.UUID,
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> VideoRecognitionJobResponse:
    """Retrieve recognition job status, progress percentage, and extracted sign segments."""
    user_id = current_user.id if current_user else None
    is_admin = bool(current_user and any(r.name == "admin" for r in current_user.roles))

    job = await get_job_authorized(db, job_id, user_id=user_id, is_admin=is_admin)

    segments: list[VideoRecognitionSegment] = []
    full_transcript = ""
    message = None

    if job.result_data:
        raw_segs = job.result_data.get("segments", [])
        segments = [
            VideoRecognitionSegment(
                id=s.get("id", idx + 1),
                start=s.get("start", 0.0),
                end=s.get("end", 0.0),
                gloss=s.get("gloss", ""),
                confidence=s.get("confidence", 0.0),
                is_demo=s.get("is_demo", True),
            )
            for idx, s in enumerate(raw_segs)
        ]
        full_transcript = job.result_data.get("full_transcript", "")
        message = job.result_data.get("message")

    return VideoRecognitionJobResponse(
        job_id=str(job.id),
        status=job.status,
        progress=job.progress,
        segments=segments,
        full_transcript=full_transcript,
        message=message,
        error_message=job.error_message,
    )


@router.post("/video/{job_id}/cancel")
async def cancel_video_recognition_job(
    job_id: uuid.UUID,
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> dict[str, str]:
    """Cancel a running or pending video recognition job."""
    user_id = current_user.id if current_user else None
    is_admin = bool(current_user and any(r.name == "admin" for r in current_user.roles))

    job = await get_job_authorized(db, job_id, user_id=user_id, is_admin=is_admin)

    if job.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel an already completed recognition job.",
        )

    cancel_recognition_job_in_memory(job_id)
    job.status = "cancelled"
    job.error_message = "Recognition job cancelled by user."
    await db.commit()

    return {
        "job_id": str(job.id),
        "status": "cancelled",
        "message": "Job successfully cancelled.",
    }
