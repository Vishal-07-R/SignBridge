"""Sign vocabulary, animation asset, and sign review models."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now

if TYPE_CHECKING:
    from app.models.translation import TranslationSegment
    from app.models.user import User


class SignVocabulary(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Verified ISL vocabulary entries."""

    __tablename__ = "sign_vocabulary"

    gloss: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Honesty and linguistic review metadata
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_reviewed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    linguist_notes: Mapped[str] = mapped_column(
        Text, default="needs linguist review", nullable=False
    )

    # Sign spatial and articulatory properties
    handshape: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    movement: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    animation_assets: Mapped[list[SignAnimationAsset]] = relationship(
        "SignAnimationAsset",
        back_populates="sign",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    reviews: Mapped[list[SignReview]] = relationship(
        "SignReview",
        back_populates="sign",
        cascade="all, delete-orphan",
    )
    segments: Mapped[list[TranslationSegment]] = relationship(
        "TranslationSegment",
        back_populates="sign",
    )


class SignAnimationAsset(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """3D avatar skeletal animation assets mapped to vocabulary."""

    __tablename__ = "sign_animation_assets"

    sign_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("sign_vocabulary.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    asset_url: Mapped[str] = mapped_column(String(500), nullable=False)
    format: Mapped[str] = mapped_column(String(20), default="glb", nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    sign: Mapped[SignVocabulary] = relationship("SignVocabulary", back_populates="animation_assets")


class SignReview(Base, UUIDPrimaryKeyMixin):
    """Linguist review records for sign verification and quality control."""

    __tablename__ = "sign_reviews"

    sign_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("sign_vocabulary.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # approved, rejected, needs_revision
    notes: Mapped[str] = mapped_column(Text, nullable=False)
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # Relationships
    sign: Mapped[SignVocabulary] = relationship("SignVocabulary", back_populates="reviews")
    reviewer: Mapped[User | None] = relationship("User")
