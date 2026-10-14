"""Command-line interface for AI SignBridge operations and controlled first-admin creation."""

import asyncio
import concurrent.futures
import sys
from collections.abc import Coroutine
from typing import Any

import click
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.db.seed import run_all_seeds, seed_roles_and_permissions
from app.db.session import AsyncSessionLocal
from app.models.audit import AuditLog
from app.models.user import Role, User, UserPreference


def _run_async(coro: Coroutine[Any, Any, Any]) -> Any:
    """Run an async coroutine, safely delegating to a worker thread if a loop is already running."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, coro).result()
    return asyncio.run(coro)


@click.group()
def cli() -> None:
    """AI SignBridge management CLI."""


@cli.command("create-admin")
@click.option("--email", prompt="Admin email address", help="Email for the admin user")
@click.option(
    "--password",
    prompt="Admin password",
    hide_input=True,
    confirmation_prompt=True,
    help="Password for the admin user (min 8 characters)",
)
@click.option(
    "--name",
    default="System Administrator",
    prompt="Admin full name",
    help="Full name for the admin user",
)
def create_admin(email: str, password: str, name: str) -> None:
    """Create a system administrator account via controlled CLI."""
    if len(password) < 8:
        click.echo("Error: Password must be at least 8 characters long.", err=True)
        sys.exit(1)

    async def _create() -> None:
        async with AsyncSessionLocal() as session:
            # Ensure roles exist
            await seed_roles_and_permissions(session)

            stmt = select(User).where(User.email == email.lower())
            existing = await session.scalar(stmt)
            if existing:
                click.echo(f"Error: User with email '{email}' already exists.", err=True)
                sys.exit(1)

            admin_role = await session.scalar(
                select(Role).options(selectinload(Role.permissions)).where(Role.name == "admin")
            )
            if not admin_role:
                click.echo("Error: Admin role not found.", err=True)
                sys.exit(1)

            new_admin = User(
                email=email.lower(),
                hashed_password=hash_password(password),
                full_name=name,
                is_active=True,
                is_verified=True,  # CLI created admins are pre-verified
                roles=[admin_role],
                preferences=UserPreference(
                    theme="dark",
                    reduced_motion=False,
                    preferred_avatar_view="front",
                    auto_play=True,
                ),
            )
            session.add(new_admin)
            await session.flush()

            audit = AuditLog(
                user_id=new_admin.id,
                action="ADMIN_CLI_CREATE",
                entity_type="user",
                entity_id=str(new_admin.id),
                details={"email": new_admin.email, "method": "cli"},
            )
            session.add(audit)
            await session.commit()
            click.echo(f"Admin account '{email}' created successfully.")

    _run_async(_create())


@cli.command("seed-data")
def seed_data() -> None:
    """Seed initial roles, permissions, and DEMO ISL vocabulary."""

    async def _seed() -> None:
        async with AsyncSessionLocal() as session:
            await run_all_seeds(session)
            click.echo("Database seeding completed.")

    _run_async(_seed())


if __name__ == "__main__":
    cli()
