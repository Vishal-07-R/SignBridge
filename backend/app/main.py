"""FastAPI Application Factory for AI SignBridge."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api import api_router
from app.core.config import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create and configure an instance of the FastAPI application."""
    app_settings = settings or get_settings()

    application = FastAPI(
        title=app_settings.APP_NAME,
        version=app_settings.APP_VERSION,
        openapi_url=f"{app_settings.API_V1_PREFIX}/openapi.json",
        docs_url=f"{app_settings.API_V1_PREFIX}/docs",
        redoc_url=f"{app_settings.API_V1_PREFIX}/redoc",
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
