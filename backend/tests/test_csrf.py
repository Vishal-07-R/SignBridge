"""Tests for CSRF protection on mutating HTTP requests."""

from httpx import AsyncClient

from app.models.user import User


async def test_csrf_missing_token_rejected(
    authenticated_client: tuple[AsyncClient, str, User],
) -> None:
    """Verify mutating request without X-CSRF-Token returns 403 Forbidden."""
    client, _, _ = authenticated_client
    response = await client.patch(
        "/api/v1/users/me/preferences",
        json={"theme": "light"},
    )
    assert response.status_code == 403
    assert "CSRF validation failed" in response.json()["detail"]


async def test_csrf_invalid_token_rejected(
    authenticated_client: tuple[AsyncClient, str, User],
) -> None:
    """Verify mutating request with wrong X-CSRF-Token returns 403 Forbidden."""
    client, _, _ = authenticated_client
    response = await client.patch(
        "/api/v1/users/me/preferences",
        json={"theme": "light"},
        headers={"X-CSRF-Token": "invalid_csrf_token_value"},
    )
    assert response.status_code == 403
    assert "CSRF validation failed" in response.json()["detail"]


async def test_csrf_valid_token_accepted(
    authenticated_client: tuple[AsyncClient, str, User],
) -> None:
    """Verify mutating request with correct X-CSRF-Token succeeds."""
    client, csrf_token, _ = authenticated_client
    response = await client.patch(
        "/api/v1/users/me/preferences",
        json={"theme": "light", "reduced_motion": True},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["theme"] == "light"
    assert data["reduced_motion"] is True


async def test_safe_get_does_not_require_csrf(
    authenticated_client: tuple[AsyncClient, str, User],
) -> None:
    """Verify GET requests do not require CSRF token."""
    client, _, _ = authenticated_client
    response = await client.get("/api/v1/users/me/preferences")
    assert response.status_code == 200
