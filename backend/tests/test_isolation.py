"""Tests for multi-tenant user data isolation."""

import uuid

from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_csrf_token, generate_secure_token, hash_token
from app.main import create_app
from app.models.translation import Translation
from app.models.user import User, UserSession


async def test_user_data_isolation(
    authenticated_client: tuple[AsyncClient, str, User],
    normal_user: User,
    db_session: AsyncSession,
) -> None:
    """Verify users can only view and manage their own private data and history."""
    client_a, csrf_a, user_a = authenticated_client

    # Create translation for User A
    trans_a = Translation(
        user_id=user_a.id,
        direction="TEXT_TO_ISL",
        source_text="Private message of User A",
        status="completed",
    )
    db_session.add(trans_a)
    await db_session.commit()

    # Create User B with their own session
    user_b = User(
        email=f"user_b_{uuid.uuid4().hex[:8]}@example.com",
        hashed_password="hash",
        full_name="User B",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user_b)
    await db_session.flush()

    raw_token_b = generate_secure_token(32)
    csrf_b = generate_csrf_token()
    session_b = UserSession(
        user_id=user_b.id,
        session_token_hash=hash_token(raw_token_b),
        csrf_secret=csrf_b,
        expires_at=user_b.created_at.replace(year=user_b.created_at.year + 1),
    )
    db_session.add(session_b)
    await db_session.commit()

    app = create_app()
    transport = ASGITransport(app=app)
    cookies_b = {
        "signbridge_session": raw_token_b,
        "signbridge_csrf": csrf_b,
    }
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        cookies=cookies_b,
    ) as client_b:
        # User B reads their history
        res_b = await client_b.get("/api/v1/users/me/history")
        assert res_b.status_code == 200
        history_b = res_b.json()
        # User B should NOT see User A's private translation
        assert len(history_b) == 0

        # User B attempts to delete User A's session (must fail with 404 Not Found)
        session_a_stmt = await client_a.get("/api/v1/users/me/sessions")
        session_a_id = session_a_stmt.json()[0]["id"]

        del_foreign = await client_b.delete(
            f"/api/v1/users/me/sessions/{session_a_id}",
            headers={"X-CSRF-Token": csrf_b},
        )
        assert del_foreign.status_code == 404  # Blocked from deleting other user's session

        # User B can delete their own session
        del_own = await client_b.delete(
            f"/api/v1/users/me/sessions/{session_b.id}",
            headers={"X-CSRF-Token": csrf_b},
        )
        assert del_own.status_code == 200
