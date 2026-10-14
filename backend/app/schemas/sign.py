"""Pydantic schemas for sign vocabulary and animation assets."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SignAnimationAssetResponse(BaseModel):
    """Animation asset details."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_url: str
    format: str
    duration_seconds: float
    is_approved: bool
    version: int


class SignResponse(BaseModel):
    """Sign vocabulary response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    gloss: str
    category: str
    description: str
    is_demo: bool
    is_reviewed: bool
    linguist_notes: str
    handshape: str | None
    location: str | None
    movement: str | None
    animation_assets: list[SignAnimationAssetResponse] = []
    created_at: datetime
