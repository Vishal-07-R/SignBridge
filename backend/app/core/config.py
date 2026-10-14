"""Application configuration settings using Pydantic v2 Settings."""

from functools import lru_cache
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Core application settings."""

    # Application metadata
    APP_NAME: str = "AI SignBridge"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "dev_insecure_secret_key_change_in_production_min_32_chars!"

    # Server configuration
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 5173

    # CORS
    CORS_ORIGINS: list[str] | str = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json

                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(i) for i in v]
        return []

    # Authentication & Session Security
    SESSION_COOKIE_NAME: str = "signbridge_session"
    SESSION_EXPIRE_DAYS: int = 7
    CSRF_COOKIE_NAME: str = "signbridge_csrf"
    SECURE_COOKIES: bool = False  # Set to True in HTTPS production
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_EXPIRE_HOURS: int = 1

    # Rate Limiting
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 5
    RATE_LIMIT_REGISTER_PER_MINUTE: int = 3
    RATE_LIMIT_FORGOT_PASSWORD_PER_MINUTE: int = 3

    # Optional One-time Bootstrap Admin (Controlled)
    BOOTSTRAP_ADMIN_EMAIL: str | None = None
    BOOTSTRAP_ADMIN_PASSWORD: str | None = None

    # Database (PostgreSQL 16)
    POSTGRES_USER: str = "signbridge"
    POSTGRES_PASSWORD: str = "signbridge_dev_secret"
    POSTGRES_DB: str = "signbridge_dev"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = (
        "postgresql+asyncpg://signbridge:signbridge_dev_secret@localhost:5432/signbridge_dev"
    )

    # Redis 7
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379/0"

    # MinIO
    MINIO_ENDPOINT: str = "http://localhost:9002"
    MINIO_ROOT_USER: str = "signbridge_minio"
    MINIO_ROOT_PASSWORD: str = "signbridge_minio_secret"
    MINIO_PORT: int = 9002
    MINIO_CONSOLE_PORT: int = 9001
    MINIO_BUCKET_MEDIA: str = "signbridge-media"
    MINIO_BUCKET_ASSETS: str = "signbridge-assets"

    # Mailpit
    MAILPIT_SMTP_HOST: str = "localhost"
    MAILPIT_SMTP_PORT: int = 1025
    MAILPIT_HTTP_PORT: int = 8025
    MAIL_FROM_ADDRESS: str = "noreply@signbridge.local"
    MAIL_FROM_NAME: str = "AI SignBridge Dev"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached Settings instance."""
    return Settings()
