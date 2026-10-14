"""Tests for registration, Argon2id authentication, cookie sessions, verification, and recovery."""

import uuid

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.models.user import User, UserSession


async def test_registration_and_argon2_hashing(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verify user registration hashes password with Argon2id and dispatches verification token."""
    email = f"reg_{uuid.uuid4().hex[:8]}@example.com"
    plain_password = "SecurePassword123!"

    response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": plain_password,
            "full_name": "Test Signer",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == email
    assert data["is_verified"] is False
    assert "user" in data["roles"]

    # Verify database record
    user = await db_session.scalar(select(User).where(User.email == email))
    assert user is not None
    assert user.hashed_password.startswith("$argon2id$")
    assert verify_password(plain_password, user.hashed_password) is True
    assert verify_password("WrongPassword!", user.hashed_password) is False
    assert user.email_verification_token is not None


async def test_duplicate_registration_rejected(
    async_client: AsyncClient,
    normal_user: User,
) -> None:
    """Verify registration fails with 400 for existing email."""
    response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": normal_user.email,
            "password": "SomeOtherPassword123!",
            "full_name": "Duplicate User",
        },
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


async def test_email_verification_flow(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verify email verification token marks user verified and clears token."""
    email = f"verify_{uuid.uuid4().hex[:8]}@example.com"
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": "Verification User",
        },
    )
    assert reg_res.status_code == 201

    user = await db_session.scalar(select(User).where(User.email == email))
    token = user.email_verification_token

    # Verify valid token
    verify_res = await async_client.post(
        "/api/v1/auth/verify-email",
        json={"token": token},
    )
    assert verify_res.status_code == 200
    assert "verified successfully" in verify_res.json()["message"]

    await db_session.refresh(user)
    assert user.is_verified is True
    assert user.email_verification_token is None

    # Re-using token should fail
    bad_res = await async_client.post(
        "/api/v1/auth/verify-email",
        json={"token": token},
    )
    assert bad_res.status_code == 400


async def test_login_success_and_cookie_issuance(
    async_client: AsyncClient,
    normal_user: User,
) -> None:
    """Verify login authenticates credentials, sets HttpOnly session cookie, and returns CSRF."""
    response = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": normal_user.email,
            "password": "UserPass123!",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == normal_user.email
    assert data["csrf_token"] is not None

    # Check cookies
    cookies = response.cookies
    assert "signbridge_session" in cookies
    assert "signbridge_csrf" in cookies


async def test_login_invalid_credentials(
    async_client: AsyncClient,
    normal_user: User,
) -> None:
    """Verify login rejects wrong password with 401."""
    response = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": normal_user.email,
            "password": "WrongPassword123!",
        },
    )
    assert response.status_code == 401


async def test_get_me_endpoint(
    authenticated_client: tuple[AsyncClient, str, User],
) -> None:
    """Verify GET /auth/me returns current user profile when session cookie is provided."""
    client, _, user = authenticated_client
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(user.id)
    assert data["email"] == user.email


async def test_get_me_unauthenticated(async_client: AsyncClient) -> None:
    """Verify GET /auth/me returns 401 when unauthenticated."""
    response = await async_client.get("/api/v1/auth/me")
    assert response.status_code == 401


async def test_logout_revokes_session(
    authenticated_client: tuple[AsyncClient, str, User],
    db_session: AsyncSession,
) -> None:
    """Verify logout deletes session in DB and clears cookies."""
    client, csrf_token, user = authenticated_client

    response = await client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": csrf_token},
    )
    assert response.status_code == 200
    assert "Logged out successfully" in response.json()["message"]

    # Verify session is purged from DB
    remaining = await db_session.scalar(select(UserSession).where(UserSession.user_id == user.id))
    assert remaining is None


async def test_password_reset_flow(
    async_client: AsyncClient,
    normal_user: User,
    db_session: AsyncSession,
) -> None:
    """Verify forgot-password generates reset token and reset-password updates hash."""
    forgot_res = await async_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": normal_user.email},
    )
    assert forgot_res.status_code == 200

    await db_session.refresh(normal_user)
    reset_token = normal_user.password_reset_token
    assert reset_token is not None

    new_pass = "BrandNewPassword456!"
    reset_res = await async_client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": reset_token,
            "new_password": new_pass,
        },
    )
    assert reset_res.status_code == 200

    # Verify user can sign in with new password
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": normal_user.email,
            "password": new_pass,
        },
    )
    assert login_res.status_code == 200
