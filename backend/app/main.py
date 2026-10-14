"""FastAPI Application Factory for AI SignBridge."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.v1.api import api_router
from app.core.config import Settings, get_settings
from app.core.security import hash_password
from app.db.seed import seed_roles_and_permissions
from app.db.session import AsyncSessionLocal, engine
from app.models.user import Role, User, UserPreference


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager for startup and shutdown hooks."""
    app_settings: Settings = app.state.settings

    # Bootstrap roles, permissions, and optional one-time admin
    try:
        async with AsyncSessionLocal() as session:
            await seed_roles_and_permissions(session)

            if app_settings.BOOTSTRAP_ADMIN_EMAIL and app_settings.BOOTSTRAP_ADMIN_PASSWORD:
                admin_role = await session.scalar(
                    select(Role).options(selectinload(Role.permissions)).where(Role.name == "admin")
                )
                if admin_role:
                    admin_exists = await session.scalar(
                        select(User).join(User.roles).where(Role.name == "admin")
                    )
                    if not admin_exists:
                        bootstrap_admin = User(
                            email=app_settings.BOOTSTRAP_ADMIN_EMAIL.lower(),
                            hashed_password=hash_password(app_settings.BOOTSTRAP_ADMIN_PASSWORD),
                            full_name="Bootstrap Administrator",
                            is_active=True,
                            is_verified=True,
                            roles=[admin_role],
                            preferences=UserPreference(theme="dark"),
                        )
                        session.add(bootstrap_admin)
                        await session.commit()
    except Exception:
        # Avoid crashing startup if DB is initializing during isolated tests
        pass

    yield

    # Shutdown
    await engine.dispose()


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create and configure an instance of the FastAPI application."""
    app_settings = settings or get_settings()

    application = FastAPI(
        title=app_settings.APP_NAME,
        version=app_settings.APP_VERSION,
        openapi_url=f"{app_settings.API_V1_PREFIX}/openapi.json",
        docs_url=f"{app_settings.API_V1_PREFIX}/docs",
        redoc_url=f"{app_settings.API_V1_PREFIX}/redoc",
        lifespan=lifespan,
    )

    application.state.settings = app_settings
    if settings is not None:
        application.dependency_overrides[get_settings] = lambda: app_settings

    # Configure CORS
    if app_settings.CORS_ORIGINS:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in app_settings.CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Register API routers
    application.include_router(api_router, prefix=app_settings.API_V1_PREFIX)

    # Root endpoint
    @application.get("/", tags=["root"])
    async def root() -> JSONResponse:
        return JSONResponse(
            content={
                "name": app_settings.APP_NAME,
                "version": app_settings.APP_VERSION,
                "environment": app_settings.ENVIRONMENT,
                "health": f"{app_settings.API_V1_PREFIX}/health",
                "docs": f"{app_settings.API_V1_PREFIX}/docs",
            }
        )

    return application


app = create_app()
