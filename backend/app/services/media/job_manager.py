"""Asynchronous background job manager for media transcription, OCR, and ISL mapping."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import uuid
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.job import VideoProcessingJob
from app.services.linguistics.pipeline import translate_text_to_isl
from app.services.media.video import extract_audio_from_video, transcribe_audio_segments

logger = logging.getLogger(__name__)

# In-memory registry of cancelled job IDs to interrupt background threads immediately
_CANCELLED_JOBS: set[uuid.UUID] = set()


async def create_video_job(
    db: AsyncSession,
    input_file_path: str,
    job_type: str = "transcription",
    user_id: uuid.UUID | None = None,
) -> VideoProcessingJob:
    """Create and persist a new media processing job."""
    job = VideoProcessingJob(
        id=uuid.uuid4(),
        user_id=user_id,
        job_type=job_type,
        status="queued",
        progress=0,
        input_file_path=input_file_path,
        result_data=None,
        error_message=None,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def get_job_authorized(
    db: AsyncSession,
    job_id: uuid.UUID,
    user_id: uuid.UUID | None,
    is_admin: bool = False,
) -> VideoProcessingJob:
    """Retrieve job by ID and verify user authorization (User Data Isolation)."""
    stmt = select(VideoProcessingJob).where(VideoProcessingJob.id == job_id)
    job = await db.scalar(stmt)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Processing job {job_id} not found.",
        )

    # Strictly enforce user data isolation: authenticated users can only view their own jobs
    if job.user_id is not None and not is_admin:
        if user_id is None or job.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this processing job.",
            )

    return job


async def cancel_job(
    db: AsyncSession,
    job_id: uuid.UUID,
    user_id: uuid.UUID | None,
    is_admin: bool = False,
) -> VideoProcessingJob:
    """Cancel a pending or running job."""
    job = await get_job_authorized(db, job_id, user_id, is_admin)

    if job.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel an already completed job.",
        )

    _CANCELLED_JOBS.add(job_id)
    job.status = "cancelled"
    job.error_message = "Job was cancelled by the user."
    await db.commit()
    await db.refresh(job)

    # Clean up input file if present
    if job.input_file_path:
        with contextlib.suppress(Exception):
            p = Path(job.input_file_path)
            if p.exists():
                p.unlink()

    return job


async def retry_job(
    db: AsyncSession,
    job_id: uuid.UUID,
    user_id: uuid.UUID | None,
    is_admin: bool = False,
) -> VideoProcessingJob:
    """Retry a failed or cancelled job."""
    job = await get_job_authorized(db, job_id, user_id, is_admin)

    if job.status not in ("failed", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot retry job in '{job.status}' state. "
                "Only failed or cancelled jobs can be retried."
            ),
        )

    if job_id in _CANCELLED_JOBS:
        _CANCELLED_JOBS.discard(job_id)

    job.status = "queued"
    job.progress = 0
    job.error_message = None
    job.result_data = None
    await db.commit()
    await db.refresh(job)

    # Re-dispatch background processing
    asyncio.create_task(
        process_video_transcription_job(
            job_id=job.id,
            video_path=Path(job.input_file_path),
            language="en",
            user_id=job.user_id,
        )
    )

    return job


async def _update_job_progress(
    job_id: uuid.UUID,
    status_val: str,
    progress: int,
    result_data: dict[str, Any] | None = None,
    error_message: str | None = None,
) -> None:
    """Helper to update job progress in a short-lived DB session."""
    async with AsyncSessionLocal() as session:
        stmt = select(VideoProcessingJob).where(VideoProcessingJob.id == job_id)
        job = await session.scalar(stmt)
        if job:
            job.status = status_val
            job.progress = progress
            if result_data is not None:
                job.result_data = result_data
            if error_message is not None:
                job.error_message = error_message
            await session.commit()


async def process_video_transcription_job(
    job_id: uuid.UUID,
    video_path: Path,
    language: str = "en",
    user_id: uuid.UUID | None = None,
) -> None:
    """Full asynchronous video audio extraction, whisper transcription, and ISL mapping pipeline."""
    audio_path = video_path.parent / f"extracted_{job_id.hex}.wav"

    try:
        # Check cancellation
        if job_id in _CANCELLED_JOBS:
            await _update_job_progress(
                job_id, "cancelled", 0, error_message="Cancelled before start"
            )
            return

        # 1. Update status to processing
        await _update_job_progress(job_id, "processing", 15)

        # 2. Extract audio safely with ffmpeg argument list
        success, err = await asyncio.to_thread(extract_audio_from_video, video_path, audio_path)

        if job_id in _CANCELLED_JOBS:
            await _update_job_progress(
                job_id, "cancelled", 15, error_message="Cancelled during extraction"
            )
            return

        if not success:
            if err == "no_audio_stream":
                # Handle video without speech or audio stream per Requirements
                await _update_job_progress(
                    job_id,
                    "completed",
                    100,
                    result_data={
                        "status": "no_audio_stream",
                        "segments": [],
                        "message": (
                            "Video contains no audio stream. If this is a video of a "
                            "person signing, please use the ISL-to-text recognition "
                            "pipeline. If it contains on-screen text, use the "
                            "document/image OCR pipeline."
                        ),
                    },
                )
                return
            else:
                await _update_job_progress(
                    job_id, "failed", 0, error_message=err or "Audio extraction failed"
                )
                return

        # 3. Speech-to-text with faster-whisper
        await _update_job_progress(job_id, "processing", 45)
        raw_segments = await asyncio.to_thread(
            transcribe_audio_segments, audio_path, language=language
        )

        if job_id in _CANCELLED_JOBS:
            await _update_job_progress(
                job_id, "cancelled", 45, error_message="Cancelled during transcription"
            )
            return

        # 4. Map each transcript segment into ISL glosses using linguistics pipeline
        await _update_job_progress(job_id, "processing", 75)
        enriched_segments: list[dict[str, Any]] = []

        async with AsyncSessionLocal() as session:
            for seg in raw_segments:
                seg_text = seg["text"].strip()
                if not seg_text:
                    continue

                try:
                    translation_res = await translate_text_to_isl(
                        text=seg_text,
                        source_language=language,
                        save_history=False,
                        user_id=user_id,
                        db=session,
                    )
                    # Extract glosses for 3D avatar animation
                    glosses = [
                        s.gloss if s.is_supported else s.source_token.upper()
                        for s in translation_res.segments
                    ]
                    unsupported = translation_res.coverage.unsupported_tokens
                    grammar_audit = [
                        {
                            "rule_id": r.rule_id,
                            "description": r.description,
                            "linguist_notes": r.linguist_notes,
                        }
                        for r in translation_res.grammar_rules_applied
                    ]
                except Exception as e:
                    logger.warning("Segment translation fallback for '%s': %s", seg_text, e)
                    glosses = [w.upper() for w in seg_text.split()]
                    unsupported = []
                    grammar_audit = []

                enriched_segments.append(
                    {
                        "id": seg["id"],
                        "start": seg["start"],
                        "end": seg["end"],
                        "text": seg_text,
                        "glosses": glosses,
                        "unsupported_tokens": unsupported,
                        "grammar_audit": grammar_audit,
                    }
                )

        if job_id in _CANCELLED_JOBS:
            await _update_job_progress(
                job_id, "cancelled", 75, error_message="Cancelled before save"
            )
            return

        # 5. Job completion
        await _update_job_progress(
            job_id,
            "completed",
            100,
            result_data={
                "status": "success",
                "language": language,
                "segment_count": len(enriched_segments),
                "segments": enriched_segments,
            },
        )

    except Exception as exc:
        logger.exception("Unexpected error in video processing job %s: %s", job_id, exc)
        await _update_job_progress(job_id, "failed", 0, error_message=str(exc))
    finally:
        # Safe cleanup of temporary media files
        if audio_path.exists():
            with contextlib.suppress(Exception):
                audio_path.unlink()
        if video_path.exists():
            with contextlib.suppress(Exception):
                video_path.unlink()
        _CANCELLED_JOBS.discard(job_id)
