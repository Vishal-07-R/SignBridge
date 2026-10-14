"""Tests for Role-Based Access Control (RBAC) and admin role restrictions."""

from httpx import AsyncClient

from app.models.user import User


async def test_admin_route_requires_auth(async_client: AsyncClient) -> None:
    """Verify unauthenticated requests to admin routes return 401."""
    response = await async_client.get("/api/v1/admin/overview")
    assert response.status_code == 401


async def test_normal_user_denied_admin_routes(
    authenticated_client: tuple[AsyncClient, str, User],
) -> None:
    """Verify normal user without admin role receives 403 Forbidden on admin endpoints."""
    client, _, _ = authenticated_client

    overview_res = await client.get("/api/v1/admin/overview")
    assert overview_res.status_code == 403
    assert "Operation requires 'admin' role" in overview_res.json()["detail"]

    audit_res = await client.get("/api/v1/admin/audit-logs")
    assert audit_res.status_code == 403

    users_res = await client.get("/api/v1/admin/users")
    assert users_res.status_code == 403


async def test_admin_user_granted_admin_routes(
    admin_client: tuple[AsyncClient, str, User],
) -> None:
    """Verify user with admin role successfully accesses admin endpoints."""
    client, _, _ = admin_client

    overview_res = await client.get("/api/v1/admin/overview")
    assert overview_res.status_code == 200
    overview_data = overview_res.json()
    assert "total_users" in overview_data
    assert "total_signs" in overview_data
    assert overview_data["total_users"] >= 1

    audit_res = await client.get("/api/v1/admin/audit-logs")
    assert audit_res.status_code == 200
    assert isinstance(audit_res.json(), list)

    users_res = await client.get("/api/v1/admin/users")
    assert users_res.status_code == 200
    assert isinstance(users_res.json(), list)
