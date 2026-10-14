"""Translation, TranslationSegment, and TranslationFeedback models."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, JsonType, TimestampMixin, UUIDPrimaryKeyMixin, utc_now

if TYPE_CHECKING:
    from app.models.sign import SignVocabulary
    from app.models.user import User


class Translation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User translation session record."""

    __tablename__ = "translations"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    direction: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # TEXT_TO_ISL, ISL_TO_TEXT, MEDIA_TO_ISL
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default="completed", nullable=False
    )  # pending, processing, completed, failed
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JsonType, nullable=True)

    # Relationships
    user: Mapped[User | None] = relationship("User", back_populates="translations")
    segments: Mapped[list[TranslationSegment]] = relationship(
        "TranslationSegment",
        back_populates="translation",
        cascade="all, delete-orphan",
        order_by="TranslationSegment.sequence_order",
        lazy="selectin",
    )
    feedback: Mapped[list[TranslationFeedback]] = relationship(
        "TranslationFeedback",
        back_populates="translation",
        cascade="all, delete-orphan",
    )


class TranslationSegment(Base, UUIDPrimaryKeyMixin):
    """Individual sign token segment within a translation sequence."""

    __tablename__ = "translation_segments"

    translation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("translations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False)
    source_token: Mapped[str] = mapped_column(String(100), nullable=False)
    sign_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("sign_vocabulary.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    timestamp_start_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    timestamp_end_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    translation: Mapped[Translation] = relationship("Translation", back_populates="segments")
    sign: Mapped[SignVocabulary | None] = relationship("SignVocabulary", back_populates="segments")


class TranslationFeedback(Base, UUIDPrimaryKeyMixin):
    """User-submitted feedback on translation accuracy."""

    __tablename__ = "translation_feedback"

    translation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("translations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 to 5
    feedback_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_category: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # wrong_sign, bad_grammar, unrecognized, other
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # Relationships
    translation: Mapped[Translation] = relationship("Translation", back_populates="feedback")
    user: Mapped[User | None] = relationship("User")
