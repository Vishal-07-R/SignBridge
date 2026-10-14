"""Pytest fixtures for AI SignBridge backend tests."""

import uuid
from collections.abc import AsyncGenerator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import Settings
from app.core.rate_limit import clear_rate_limits
from app.core.security import generate_csrf_token, generate_secure_token, hash_password, hash_token
from app.db.seed import seed_demo_vocabulary, seed_roles_and_permissions
from app.db.session import AsyncSessionLocal
from app.main import create_app
from app.models.user import Role, User, UserPreference, UserSession


@pytest.fixture(autouse=True)
async def reset_rate_limits() -> AsyncGenerator[None, None]:
    """Reset rate limiting counters before each test."""
    await clear_rate_limits()
    yield
    await clear_rate_limits()


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    """Provide test settings using local PostgreSQL and Redis test databases."""
    return Settings(
        APP_NAME="AI SignBridge Test",
        APP_VERSION="0.1.0-test",
        DEBUG=False,
        ENVIRONMENT="testing",
        SECRET_KEY="test_secret_key_for_unit_tests_only_32_chars!",
        CORS_ORIGINS=["http://testserver", "http://localhost:5173"],
        DATABASE_URL=(
            "postgresql+asyncpg://signbridge:signbridge_dev_secret@localhost:5432/signbridge_dev"
        ),
        REDIS_URL="redis://localhost:6379/0",
        SECURE_COOKIES=False,
        RATE_LIMIT_LOGIN_PER_MINUTE=1000,
        RATE_LIMIT_REGISTER_PER_MINUTE=1000,
        RATE_LIMIT_FORGOT_PASSWORD_PER_MINUTE=1000,
    )


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a database session per test."""
    async with AsyncSessionLocal() as session:
        await seed_roles_and_permissions(session)
        await seed_demo_vocabulary(session)
        yield session


@pytest.fixture
def app(test_settings: Settings) -> FastAPI:
    """Create test application instance."""
    return create_app(settings=test_settings)


@pytest.fixture
async def async_client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Provide async HTTP client for unauthenticated testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        cookies={},
    ) as client:
        yield client


@pytest.fixture
async def normal_user(db_session: AsyncSession) -> User:
    """Create a verified test user with 'user' role."""
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    user_role = await db_session.scalar(
        select(Role).options(selectinload(Role.permissions)).where(Role.name == "user")
    )
    user = User(
        email=unique_email,
        hashed_password=hash_password("UserPass123!"),
        full_name="Regular Test User",
        is_active=True,
        is_verified=True,
        roles=[user_role],
        preferences=UserPreference(theme="dark"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Create a verified test user with 'admin' role."""
    unique_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"
    admin_role = await db_session.scalar(
        select(Role).options(selectinload(Role.permissions)).where(Role.name == "admin")
    )
    admin = User(
        email=unique_email,
        hashed_password=hash_password("AdminPass123!"),
        full_name="Admin Test User",
        is_active=True,
        is_verified=True,
        roles=[admin_role],
        preferences=UserPreference(theme="dark"),
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest.fixture
async def authenticated_client(
    app: FastAPI,
    normal_user: User,
    db_session: AsyncSession,
) -> AsyncGenerator[tuple[AsyncClient, str, User], None]:
    """Provide HTTP client logged in as a normal user with session cookie and CSRF token."""
    raw_token = generate_secure_token(32)
    csrf_secret = generate_csrf_token()
    session = UserSession(
        user_id=normal_user.id,
        session_token_hash=hash_token(raw_token),
        csrf_secret=csrf_secret,
        expires_at=normal_user.created_at.replace(year=normal_user.created_at.year + 1),
    )
    db_session.add(session)
    await db_session.commit()

    transport = ASGITransport(app=app)
    cookies = {
        "signbridge_session": raw_token,
        "signbridge_csrf": csrf_secret,
    }
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        cookies=cookies,
    ) as client:
        yield client, csrf_secret, normal_user


@pytest.fixture
async def admin_client(
    app: FastAPI,
    admin_user: User,
    db_session: AsyncSession,
) -> AsyncGenerator[tuple[AsyncClient, str, User], None]:
    """Provide HTTP client logged in as an admin user with session cookie and CSRF token."""
    raw_token = generate_secure_token(32)
    csrf_secret = generate_csrf_token()
    session = UserSession(
        user_id=admin_user.id,
        session_token_hash=hash_token(raw_token),
        csrf_secret=csrf_secret,
        expires_at=admin_user.created_at.replace(year=admin_user.created_at.year + 1),
    )
    db_session.add(session)
    await db_session.commit()

    transport = ASGITransport(app=app)
    cookies = {
        "signbridge_session": raw_token,
        "signbridge_csrf": csrf_secret,
    }
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        cookies=cookies,
    ) as client:
        yield client, csrf_secret, admin_user
