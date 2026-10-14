"""Tests for application factory configuration."""

from fastapi import FastAPI

from app.core.config import Settings
from app.main import create_app


def test_app_factory_custom_settings():
    """Verify application factory respects custom settings."""
    custom_settings = Settings(
        APP_NAME="Custom Bridge Test",
        APP_VERSION="9.9.9",
        DEBUG=True,
        ENVIRONMENT="custom_env",
        SECRET_KEY="custom_secret_key_32_characters_long_min!",
        CORS_ORIGINS=["https://custom.signbridge.local"],
    )

    custom_app = create_app(settings=custom_settings)
    assert isinstance(custom_app, FastAPI)
    assert custom_app.title == "Custom Bridge Test"
    assert custom_app.version == "9.9.9"


def test_app_factory_default():
    """Verify application factory works with defaults."""
    default_app = create_app()
    assert isinstance(default_app, FastAPI)
    assert default_app.title == "AI SignBridge"
