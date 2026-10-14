"""Video processing job model for OCR, speech-to-text, and recognition."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, JsonType, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class VideoProcessingJob(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Asynchronous background processing job for media and recognition."""

    __tablename__ = "video_processing_jobs"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    job_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # ocr, transcription, recognition
    status: Mapped[str] = mapped_column(
        String(30), default="queued", nullable=False
    )  # queued, processing, completed, failed, cancelled
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0 to 100
    input_file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    result_data: Mapped[dict[str, Any] | None] = mapped_column(JsonType, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped[User | None] = relationship("User", back_populates="video_jobs")
