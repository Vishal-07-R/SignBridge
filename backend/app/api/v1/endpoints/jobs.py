"""Job status, cancellation, and retry endpoints for asynchronous media pipelines."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_optional_user
from app.models.user import User
from app.schemas.media import JobStatusResponse
from app.services.media.job_manager import cancel_job, get_job_authorized, retry_job

router = APIRouter()


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: uuid.UUID,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> JobStatusResponse:
    """Retrieve real-time processing status, progress, and results for a media job.

    Enforces user data isolation: authenticated users can only view their own jobs.
    """
    user_id = current_user.id if current_user else None
    is_admin = False
    if current_user:
        is_admin = any(role.name == "admin" for role in current_user.roles)

    job = await get_job_authorized(db, job_id, user_id=user_id, is_admin=is_admin)
    return JobStatusResponse.model_validate(job)


@router.post("/{job_id}/cancel", response_model=JobStatusResponse)
async def cancel_job_endpoint(
    job_id: uuid.UUID,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> JobStatusResponse:
    """Cancel a queued or running processing job.

    Enforces user data isolation: users can only cancel their own jobs.
    """
    user_id = current_user.id if current_user else None
    is_admin = False
    if current_user:
        is_admin = any(role.name == "admin" for role in current_user.roles)

    job = await cancel_job(db, job_id, user_id=user_id, is_admin=is_admin)
    return JobStatusResponse.model_validate(job)


@router.post("/{job_id}/retry", response_model=JobStatusResponse)
async def retry_job_endpoint(
    job_id: uuid.UUID,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> JobStatusResponse:
    """Retry a failed or cancelled media processing job."""
    user_id = current_user.id if current_user else None
    is_admin = False
    if current_user:
        is_admin = any(role.name == "admin" for role in current_user.roles)

    job = await retry_job(db, job_id, user_id=user_id, is_admin=is_admin)
    return JobStatusResponse.model_validate(job)
