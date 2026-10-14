"""Application settings key-value store model."""

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, JsonType, UUIDPrimaryKeyMixin, utc_now


class ApplicationSetting(Base, UUIDPrimaryKeyMixin):
    """Dynamic application configuration and feature flags."""

    __tablename__ = "application_settings"

    key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    value: Mapped[dict[str, Any] | list[Any] | str | int | float | bool] = mapped_column(
        JsonType, nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
