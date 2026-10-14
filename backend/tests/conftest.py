"""Pytest fixtures for backend tests."""

from collections.abc import AsyncGenerator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def test_settings() -> Settings:
    """Provide isolated test settings."""
    return Settings(
        APP_NAME="AI SignBridge Test",
        APP_VERSION="0.1.0-test",
        DEBUG=True,
        ENVIRONMENT="testing",
        SECRET_KEY="test_secret_key_for_unit_tests_only_32_chars!",
        CORS_ORIGINS=["http://testserver"],
    )


@pytest.fixture
def app(test_settings: Settings) -> FastAPI:
    """Create test application instance."""
    return create_app(settings=test_settings)


@pytest.fixture
async def async_client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Provide async HTTP client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
