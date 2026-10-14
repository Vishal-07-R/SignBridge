"""Authentication endpoints: registration, Argon2 login, cookie sessions, CSRF, verification."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user, get_current_session, get_db, verify_csrf
from app.core.config import get_settings
from app.core.email import send_password_reset_email, send_verification_email
from app.core.rate_limit import rate_limit
from app.core.security import (
    generate_csrf_token,
    generate_secure_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.audit import AuditLog
from app.models.user import Role, User, UserPreference, UserSession
from app.schemas.user import (
    ForgotPasswordRequest,
    LoginResponse,
    ResetPasswordRequest,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    VerifyEmailRequest,
)

router = APIRouter()
settings = get_settings()


def build_user_response(user: User) -> UserResponse:
    """Format user model into API response with flat roles and permission codes."""
    role_names = [r.name for r in user.roles]
    permissions = set()
    for r in user.roles:
        permissions.update(p.code for p in r.permissions)

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_verified=user.is_verified,
        roles=role_names,
        permissions=sorted(permissions),
        created_at=user.created_at,
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("register"))],
)
async def register(
    payload: UserRegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Register a new user account with Argon2id password hashing and email verification."""
    # Check if user already exists
    existing = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Standard public registration strictly assigns 'user' role
    user_role = await db.scalar(
        select(Role).options(selectinload(Role.permissions)).where(Role.name == "user")
    )
    if not user_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="System roles not initialized.",
        )

    # Generate email verification token
    verification_token = generate_secure_token(32)
    expires_at = datetime.now(UTC) + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)

    new_user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        is_active=True,
        is_verified=False,
        email_verification_token=verification_token,
        email_verification_expires_at=expires_at,
        roles=[user_role],
        preferences=UserPreference(
            theme="dark",
            reduced_motion=False,
            preferred_avatar_view="front",
            auto_play=True,
        ),
    )
    db.add(new_user)
    await db.flush()

    # Record audit log
    client_ip = request.client.host if request.client else None
    audit = AuditLog(
        user_id=new_user.id,
        action="AUTH_REGISTER",
        entity_type="user",
        entity_id=str(new_user.id),
        ip_address=client_ip,
        details={"email": new_user.email},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(new_user)

    # Dispatch verification email asynchronously
    await send_verification_email(new_user.email, verification_token, new_user.full_name)

    return build_user_response(new_user)


@router.post("/verify-email")
async def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Verify account email address using token sent via Mailpit."""
    stmt = select(User).where(User.email_verification_token == payload.token)
    user = await db.scalar(stmt)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired email verification token.",
        )

    if user.email_verification_expires_at and user.email_verification_expires_at < datetime.now(
        UTC
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email verification token has expired.",
        )

    user.is_verified = True
    user.email_verification_token = None
    user.email_verification_expires_at = None

    client_ip = request.client.host if request.client else None
    audit = AuditLog(
        user_id=user.id,
        action="AUTH_VERIFY_EMAIL",
        entity_type="user",
        entity_id=str(user.id),
        ip_address=client_ip,
    )
    db.add(audit)
    await db.commit()

    return {"message": "Email address verified successfully."}


@router.post(
    "/login",
    response_model=LoginResponse,
    dependencies=[Depends(rate_limit("login"))],
)
async def login(
    payload: UserLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Authenticate user with Argon2id and issue secure session cookie and CSRF token."""
    stmt = (
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.email == payload.email.lower())
    )
    user = await db.scalar(stmt)

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive.",
        )

    # Create new session
    session_token = generate_secure_token(32)
    csrf_secret = generate_csrf_token()
    session_hash = hash_token(session_token)
    expires_at = datetime.now(UTC) + timedelta(days=settings.SESSION_EXPIRE_DAYS)

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500]

    session = UserSession(
        user_id=user.id,
        session_token_hash=session_hash,
        csrf_secret=csrf_secret,
        ip_address=client_ip,
        user_agent=user_agent,
        expires_at=expires_at,
    )
    db.add(session)

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="AUTH_LOGIN",
        entity_type="user_session",
        ip_address=client_ip,
        details={"email": user.email},
    )
    db.add(audit)
    await db.commit()

    # Set HttpOnly session cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        samesite="lax",
        secure=settings.SECURE_COOKIES,
        path="/",
        max_age=settings.SESSION_EXPIRE_DAYS * 86400,
    )

    # Set readable CSRF cookie
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_secret,
        httponly=False,
        samesite="lax",
        secure=settings.SECURE_COOKIES,
        path="/",
        max_age=settings.SESSION_EXPIRE_DAYS * 86400,
    )

    return LoginResponse(
        user=build_user_response(user),
        csrf_token=csrf_secret,
        message="Sign-in successful",
    )


@router.post("/logout", dependencies=[Depends(verify_csrf)])
async def logout(
    response: Response,
    session: UserSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Terminate current user session, purge database record, and clear cookies."""
    user_id = session.user_id
    await db.delete(session)

    audit = AuditLog(
        user_id=user_id,
        action="AUTH_LOGOUT",
        entity_type="user_session",
        entity_id=str(session.id),
    )
    db.add(audit)
    await db.commit()

    response.delete_cookie(settings.SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(settings.CSRF_COOKIE_NAME, path="/")

    return {"message": "Logged out successfully."}


@router.post(
    "/forgot-password",
    dependencies=[Depends(rate_limit("forgot_password"))],
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Initiate password reset workflow and dispatch instructions to Mailpit."""
    stmt = select(User).where(User.email == payload.email.lower())
    user = await db.scalar(stmt)

    if user and user.is_active:
        reset_token = generate_secure_token(32)
        user.password_reset_token = reset_token
        user.password_reset_expires_at = datetime.now(UTC) + timedelta(
            hours=settings.PASSWORD_RESET_EXPIRE_HOURS
        )

        client_ip = request.client.host if request.client else None
        audit = AuditLog(
            user_id=user.id,
            action="AUTH_FORGOT_PASSWORD",
            entity_type="user",
            entity_id=str(user.id),
            ip_address=client_ip,
        )
        db.add(audit)
        await db.commit()

        await send_password_reset_email(user.email, reset_token, user.full_name)

    # Return standard message to prevent email enumeration
    return {
        "message": (
            "If an account with that email exists, password reset instructions have been sent."
        )
    }


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Reset account password using valid recovery token and revoke all existing sessions."""
    stmt = (
        select(User)
        .options(selectinload(User.sessions))
        .where(User.password_reset_token == payload.token)
    )
    user = await db.scalar(stmt)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token.",
        )

    if user.password_reset_expires_at and user.password_reset_expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired.",
        )

    # Update password with Argon2id
    user.hashed_password = hash_password(payload.new_password)
    user.password_reset_token = None
    user.password_reset_expires_at = None

    # Invalidate all existing sessions for security
    for s in list(user.sessions):
        await db.delete(s)

    client_ip = request.client.host if request.client else None
    audit = AuditLog(
        user_id=user.id,
        action="AUTH_RESET_PASSWORD",
        entity_type="user",
        entity_id=str(user.id),
        ip_address=client_ip,
    )
    db.add(audit)
    await db.commit()

    return {"message": "Password reset successful. Please sign in with your new password."}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    """Retrieve profile and permissions of the currently authenticated user."""
    return build_user_response(current_user)
