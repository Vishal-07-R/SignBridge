"""API v1 router aggregator."""

from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, health, signs, translate, users

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(signs.router, prefix="/signs", tags=["signs"])
api_router.include_router(translate.router, prefix="/translate", tags=["translate"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])

