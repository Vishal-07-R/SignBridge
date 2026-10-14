"""Administrative endpoints restricted strictly to users with 'admin' role."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, require_role
from app.models.audit import AuditLog
from app.models.job import VideoProcessingJob
from app.models.sign import SignVocabulary
from app.models.translation import Translation
from app.models.user import Role, User
from app.schemas.admin import AdminOverviewResponse, AuditLogResponse
from app.schemas.user import UserResponse

router = APIRouter(dependencies=[Depends(require_role("admin"))])


@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    db: AsyncSession = Depends(get_db),
) -> AdminOverviewResponse:
    """Return aggregated system counts derived strictly from real database records."""
    users_count = await db.scalar(select(func.count(User.id))) or 0
    signs_count = await db.scalar(select(func.count(SignVocabulary.id))) or 0
    translations_count = await db.scalar(select(func.count(Translation.id))) or 0
    jobs_count = await db.scalar(select(func.count(VideoProcessingJob.id))) or 0

    return AdminOverviewResponse(
        total_users=users_count,
        total_signs=signs_count,
        total_translations=translations_count,
        total_jobs=jobs_count,
    )


@router.get("/audit-logs", response_model=list[AuditLogResponse])
async def list_audit_logs(
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    action: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[AuditLogResponse]:
    """Retrieve paginated audit logs for administrative security tracking."""
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    if action:
        stmt = stmt.where(AuditLog.action == action)

    result = await db.execute(stmt)
    logs = result.scalars().all()
    return [AuditLogResponse.model_validate(log) for log in logs]


@router.get("/users", response_model=list[UserResponse])
async def list_all_users(
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[UserResponse]:
    """List system users with associated role metadata."""
    stmt = (
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    users = result.scalars().all()

    response: list[UserResponse] = []
    for u in users:
        role_names = [r.name for r in u.roles]
        perms = set()
        for r in u.roles:
            perms.update(p.code for p in r.permissions)
        response.append(
            UserResponse(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                is_active=u.is_active,
                is_verified=u.is_verified,
                roles=role_names,
                permissions=sorted(perms),
                created_at=u.created_at,
            )
        )
    return response
