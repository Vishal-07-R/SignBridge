"""Pydantic schemas for authentication and user management."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegisterRequest(BaseModel):
    """Payload for user registration."""

    email: EmailStr
    password: str = Field(min_length=8, description="Password with minimum 8 characters")
    full_name: str = Field(min_length=2, max_length=100)


class UserLoginRequest(BaseModel):
    """Payload for user sign-in."""

    email: EmailStr
    password: str


class RoleResponse(BaseModel):
    """Role information."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str


class UserResponse(BaseModel):
    """Public user profile information."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    is_active: bool
    is_verified: bool
    roles: list[str] = []
    permissions: list[str] = []
    created_at: datetime


class LoginResponse(BaseModel):
    """Authentication response returning user profile and CSRF token."""

    user: UserResponse
    csrf_token: str
    message: str = "Sign-in successful"


class VerifyEmailRequest(BaseModel):
    """Payload for verifying an email address."""

    token: str = Field(min_length=16)


class ForgotPasswordRequest(BaseModel):
    """Payload to request password reset instructions."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Payload to reset account password using recovery token."""

    token: str = Field(min_length=16)
    new_password: str = Field(min_length=8)


class UserPreferenceUpdate(BaseModel):
    """Payload to update user preferences."""

    theme: str | None = Field(default=None, pattern="^(dark|light|system)$")
    reduced_motion: bool | None = None
    preferred_avatar_view: str | None = Field(
        default=None, pattern="^(front|upper_body|hands_zoom)$"
    )
    auto_play: bool | None = None


class UserPreferenceResponse(BaseModel):
    """User preferences response."""

    model_config = ConfigDict(from_attributes=True)

    theme: str
    reduced_motion: bool
    preferred_avatar_view: str
    auto_play: bool


class UserSessionResponse(BaseModel):
    """Active user session representation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ip_address: str | None
    user_agent: str | None
    created_at: datetime
    expires_at: datetime
    is_current: bool = False
