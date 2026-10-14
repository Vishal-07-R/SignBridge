"""Sign vocabulary endpoints with permission-controlled access."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.models.sign import SignVocabulary
from app.schemas.sign import SignResponse

router = APIRouter()


@router.get("", response_model=list[SignResponse])
async def list_signs(
    category: str | None = Query(default=None),
    is_demo: bool | None = Query(default=None),
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[SignResponse]:
    """Retrieve sign vocabulary entries with optional category/demo filtering."""
    stmt = (
        select(SignVocabulary)
        .options(selectinload(SignVocabulary.animation_assets))
        .offset(offset)
        .limit(limit)
        .order_by(SignVocabulary.gloss)
    )

    if category is not None:
        stmt = stmt.where(SignVocabulary.category == category)
    if is_demo is not None:
        stmt = stmt.where(SignVocabulary.is_demo == is_demo)

    result = await db.execute(stmt)
    signs = result.scalars().all()
    return [SignResponse.model_validate(s) for s in signs]


@router.get("/{sign_id}", response_model=SignResponse)
async def get_sign(
    sign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> SignResponse:
    """Retrieve a specific sign vocabulary item by UUID."""
    stmt = (
        select(SignVocabulary)
        .options(selectinload(SignVocabulary.animation_assets))
        .where(SignVocabulary.id == sign_id)
    )
    sign = await db.scalar(stmt)
    if not sign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sign vocabulary entry not found.",
        )
    return SignResponse.model_validate(sign)
