"""Dataset source and import job models."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, JsonType, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class DatasetSource(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """External or curated dataset provenance record."""

    __tablename__ = "dataset_sources"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    licence: Mapped[str] = mapped_column(String(100), nullable=False)
    provenance_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    import_jobs: Mapped[list[DatasetImportJob]] = relationship(
        "DatasetImportJob",
        back_populates="source",
    )


class DatasetImportJob(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Background ingestion and quality validation job for vocabulary sets."""

    __tablename__ = "dataset_import_jobs"

    source_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("dataset_sources.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    initiated_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False
    )  # pending, processing, completed, failed
    stats: Mapped[dict[str, Any] | None] = mapped_column(JsonType, nullable=True)
    error_log: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    source: Mapped[DatasetSource | None] = relationship(
        "DatasetSource", back_populates="import_jobs"
    )
    user: Mapped[User | None] = relationship("User")
