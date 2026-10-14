"""Health check endpoint."""

from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.config import Settings, get_settings

router = APIRouter()


class ComponentHealth(BaseModel):
    """Component health status."""

    status: Literal["healthy", "degraded", "unhealthy"] = "healthy"
    details: str | None = None


class HealthResponse(BaseModel):
    """System health response model."""

    status: Literal["ok", "degraded", "error"] = "ok"
    app_name: str
    version: str
    environment: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    components: dict[str, ComponentHealth] = Field(
        default_factory=lambda: {
            "api": ComponentHealth(status="healthy", details="FastAPI core running"),
        }
    )


@router.get("", response_model=HealthResponse, summary="System Health Status")
async def get_health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """Return application health, version and basic component status."""
    return HealthResponse(
        status="ok",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        components={
            "api": ComponentHealth(status="healthy", details="FastAPI core running"),
        },
    )
