"""Pydantic schemas for admin overview and audit logs."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AdminOverviewResponse(BaseModel):
    """System-level entity counts computed from real database records."""

    total_users: int
    total_signs: int
    total_translations: int
    total_jobs: int


class AuditLogResponse(BaseModel):
    """Audit log entry schema."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    entity_type: str | None
    entity_id: str | None
    ip_address: str | None
    details: dict[str, Any] | None
    created_at: datetime
