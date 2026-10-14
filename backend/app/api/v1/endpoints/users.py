"""User profile, preferences, active sessions, and personal history isolation endpoints."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user, get_current_session, get_db, verify_csrf
from app.models.audit import AuditLog
from app.models.translation import Translation
from app.models.user import User, UserPreference, UserSession
from app.schemas.user import UserPreferenceResponse, UserPreferenceUpdate, UserSessionResponse

router = APIRouter()


@router.get("/me/preferences", response_model=UserPreferenceResponse)
async def get_preferences(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> UserPreferenceResponse:
    """Retrieve UI and accessibility preferences for current user."""
    stmt = select(UserPreference).where(UserPreference.user_id == current_user.id)
    pref = await db.scalar(stmt)
    if not pref:
        pref = UserPreference(
            user_id=current_user.id,
            theme="dark",
            reduced_motion=False,
            preferred_avatar_view="front",
            auto_play=True,
        )
        db.add(pref)
        await db.commit()
        await db.refresh(pref)

    return UserPreferenceResponse.model_validate(pref)


@router.patch(
    "/me/preferences",
    response_model=UserPreferenceResponse,
    dependencies=[Depends(verify_csrf)],
)
async def update_preferences(
    payload: UserPreferenceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> UserPreferenceResponse:
    """Update current user's UI/accessibility preferences."""
    stmt = select(UserPreference).where(UserPreference.user_id == current_user.id)
    pref = await db.scalar(stmt)
    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)

    if payload.theme is not None:
        pref.theme = payload.theme
    if payload.reduced_motion is not None:
        pref.reduced_motion = payload.reduced_motion
    if payload.preferred_avatar_view is not None:
        pref.preferred_avatar_view = payload.preferred_avatar_view
    if payload.auto_play is not None:
        pref.auto_play = payload.auto_play

    await db.commit()
    await db.refresh(pref)
    return UserPreferenceResponse.model_validate(pref)


@router.get("/me/sessions", response_model=list[UserSessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_active_user),
    current_session: UserSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> list[UserSessionResponse]:
    """List all active sessions belonging strictly to the current user."""
    stmt = (
        select(UserSession)
        .where(UserSession.user_id == current_user.id)
        .order_by(UserSession.created_at.desc())
    )
    result = await db.execute(stmt)
    sessions = result.scalars().all()

    return [
        UserSessionResponse(
            id=s.id,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            created_at=s.created_at,
            expires_at=s.expires_at,
            is_current=(s.id == current_session.id),
        )
        for s in sessions
    ]


@router.delete("/me/sessions/{session_id}", dependencies=[Depends(verify_csrf)])
async def revoke_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Revoke a specific session owned by the current user."""
    stmt = select(UserSession).where(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id,
    )
    target_session = await db.scalar(stmt)
    if not target_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or not owned by current user.",
        )

    await db.delete(target_session)
    await db.commit()
    return {"message": "Session revoked successfully."}


@router.get("/me/history")
async def get_user_history(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Retrieve translation history strictly belonging to current user."""
    stmt = (
        select(Translation)
        .options(selectinload(Translation.segments))
        .where(Translation.user_id == current_user.id)
        .order_by(Translation.created_at.desc())
    )
    result = await db.execute(stmt)
    translations = result.scalars().all()

    return [
        {
            "id": str(t.id),
            "direction": t.direction,
            "source_text": t.source_text,
            "status": t.status,
            "created_at": t.created_at.isoformat(),
            "segments_count": len(t.segments),
        }
        for t in translations
    ]


@router.delete("/me/history", dependencies=[Depends(verify_csrf)])
async def clear_user_history(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Purge personal translation history for current user."""
    stmt = delete(Translation).where(Translation.user_id == current_user.id)
    await db.execute(stmt)

    audit = AuditLog(
        user_id=current_user.id,
        action="USER_CLEAR_HISTORY",
        entity_type="translation",
    )
    db.add(audit)
    await db.commit()

    return {"message": "Personal translation history cleared."}
