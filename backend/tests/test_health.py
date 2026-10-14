"""Tests for system health endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint_success(async_client: AsyncClient):
    """Verify health endpoint responds with 200 OK and expected schema."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["app_name"] == "AI SignBridge Test"
    assert data["version"] == "0.1.0-test"
    assert data["environment"] == "testing"
    assert "timestamp" in data
    assert "components" in data
    assert data["components"]["api"]["status"] == "healthy"


@pytest.mark.asyncio
async def test_root_endpoint_success(async_client: AsyncClient):
    """Verify root endpoint responds with basic metadata and links."""
    response = await async_client.get("/")
    assert response.status_code == 200

    data = response.json()
    assert data["name"] == "AI SignBridge Test"
    assert data["version"] == "0.1.0-test"
    assert data["health"] == "/api/v1/health"
    assert data["docs"] == "/api/v1/docs"
