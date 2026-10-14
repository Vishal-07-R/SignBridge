"""Tests for rate limiting on authentication endpoints."""

import uuid

from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import create_app


async def test_login_rate_limiting() -> None:
    """Verify exceeding login rate limit triggers 429 Too Many Requests with Retry-After header."""
    settings = Settings(
        APP_NAME="RateLimitTest",
        RATE_LIMIT_LOGIN_PER_MINUTE=2,
        SECRET_KEY="test_key_minimum_32_characters_long!",
    )
    app = create_app(settings=settings)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        email = f"ratelimit_{uuid.uuid4().hex[:8]}@example.com"
        responses = []
        for _ in range(4):
            res = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": email,
                    "password": "WrongPassword!",
                },
            )
            responses.append(res)

        status_codes = [r.status_code for r in responses]
        assert 429 in status_codes
        rate_limited_res = next(r for r in responses if r.status_code == 429)
        assert "Retry-After" in rate_limited_res.headers
        assert "Rate limit exceeded" in rate_limited_res.json()["detail"]
