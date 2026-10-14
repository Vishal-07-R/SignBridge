"""FastAPI dependencies for database, authentication, sessions, CSRF, and RBAC."""

from collections.abc import AsyncGenerator, Callable
from datetime import UTC, datetime

from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.security import hash_token, verify_csrf_token
from app.db.session import AsyncSessionLocal
from app.models.user import Role, User, UserSession


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency providing an async SQLAlchemy session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_optional_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
    signbridge_session: str | None = Cookie(default=None),
) -> UserSession | None:
    """Retrieve active UserSession from session cookie if present and valid."""
    settings = get_settings()
    token = signbridge_session or request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        # Also check Authorization header as fallback for API clients
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        return None

    token_hash = hash_token(token)
    stmt = (
        select(UserSession)
        .options(
            selectinload(UserSession.user).selectinload(User.roles).selectinload(Role.permissions)
        )
        .where(UserSession.session_token_hash == token_hash)
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if session is None:
        return None

    # Check expiration
    if session.expires_at < datetime.now(UTC):
        await db.delete(session)
        await db.commit()
        return None

    return session


async def get_current_session(
    session: UserSession | None = Depends(get_optional_session),
) -> UserSession:
    """Require an authenticated UserSession or raise 401 Unauthorized."""
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
        )
    return session


async def get_optional_user(
    session: UserSession | None = Depends(get_optional_session),
) -> User | None:
    """Return User if session is authenticated, otherwise None."""
    return session.user if session else None


async def get_current_user(
    session: UserSession = Depends(get_current_session),
) -> User:
    """Return the User associated with the authenticated session."""
    return session.user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure current user is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )
    return current_user


async def verify_csrf(
    request: Request,
    session: UserSession = Depends(get_current_session),
    x_csrf_token: str | None = Header(default=None, alias="X-CSRF-Token"),
) -> None:
    """Verify CSRF token for state-changing HTTP methods."""
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    csrf_token = x_csrf_token or request.headers.get("x-csrf-token")
    if not csrf_token or not verify_csrf_token(csrf_token, session.csrf_secret):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF validation failed: missing or invalid CSRF token.",
        )


def require_role(role_name: str) -> Callable[[User], User]:
    """Dependency factory checking user has a specific role."""

    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        user_role_names = {r.name for r in current_user.roles}
        if role_name not in user_role_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires '{role_name}' role.",
            )
        return current_user

    return role_checker


def require_permission(permission_code: str) -> Callable[[User], User]:
    """Dependency factory checking user has a specific permission (or is admin)."""

    def permission_checker(current_user: User = Depends(get_current_active_user)) -> User:
        user_role_names = {r.name for r in current_user.roles}
        if "admin" in user_role_names:
            return current_user

        user_perms: set[str] = set()
        for r in current_user.roles:
            user_perms.update(p.code for p in r.permissions)

        if permission_code not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires '{permission_code}' permission.",
            )
        return current_user

    return permission_checker
