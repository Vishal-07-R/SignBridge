"""Tests for AI SignBridge CLI commands."""

import uuid

from click.testing import CliRunner
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.cli import cli
from app.core.security import verify_password
from app.models.user import User


def test_cli_create_admin_short_password() -> None:
    """Verify CLI rejects passwords shorter than 8 characters."""
    runner = CliRunner()
    result = runner.invoke(
        cli,
        [
            "create-admin",
            "--email",
            "short@example.com",
            "--password",
            "short",
            "--name",
            "Short Admin",
        ],
    )
    assert result.exit_code != 0
    assert "at least 8 characters" in result.output


async def test_cli_create_admin_success(db_session: AsyncSession) -> None:
    """Verify CLI successfully creates an admin user with Argon2id hash and admin role."""
    runner = CliRunner()
    unique_email = f"cli_admin_{uuid.uuid4().hex[:8]}@example.com"
    plain_password = "AdminSuperSecret123!"

    result = runner.invoke(
        cli,
        [
            "create-admin",
            "--email",
            unique_email,
            "--password",
            plain_password,
            "--name",
            "CLI Created Admin",
        ],
    )
    assert result.exit_code == 0
    assert "created successfully" in result.output

    # Query DB
    user = await db_session.scalar(
        select(User).options(selectinload(User.roles)).where(User.email == unique_email)
    )
    assert user is not None
    assert user.is_verified is True
    assert verify_password(plain_password, user.hashed_password) is True
    assert any(r.name == "admin" for r in user.roles)
