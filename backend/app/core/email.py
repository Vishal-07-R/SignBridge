"""Email service for transactional emails via Mailpit SMTP."""

import logging
from email.message import EmailMessage

import aiosmtplib

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str,
) -> bool:
    """Send an email asynchronously via SMTP (Mailpit in development)."""
    settings = get_settings()

    message = EmailMessage()
    message["From"] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM_ADDRESS}>"
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(text_content)
    message.add_alternative(html_content, subtype="html")

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.MAILPIT_SMTP_HOST,
            port=settings.MAILPIT_SMTP_PORT,
            timeout=5.0,
        )
        logger.info("Sent email to %s: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.warning("Failed to dispatch email to %s: %s", to_email, exc)
        return False


async def send_verification_email(to_email: str, token: str, full_name: str) -> bool:
    """Send an account email verification link."""
    settings = get_settings()
    verification_url = (
        f"http://{settings.BACKEND_HOST}:{settings.FRONTEND_PORT}/verify-email?token={token}"
    )

    subject = f"Verify your {settings.APP_NAME} account"
    text_content = (
        f"Hello {full_name},\n\n"
        f"Welcome to {settings.APP_NAME}! Please verify your email address by visiting:\n"
        f"{verification_url}\n\n"
        f"This link expires in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.\n"
    )
    html_content = (
        f'<div style="font-family: sans-serif; background-color: #0b0f19; '
        f'color: #f3f4f6; padding: 24px; border-radius: 8px;">\n'
        f'  <h2 style="color: #38bdf8;">Welcome to {settings.APP_NAME}</h2>\n'
        f"  <p>Hello {full_name},</p>\n"
        f"  <p>Please click the button below to verify your email address:</p>\n"
        f'  <p style="margin: 24px 0;">\n'
        f'    <a href="{verification_url}" style="background-color: #0284c7; color: white; '
        f"padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; "
        f'display: inline-block;">Verify Email Address</a>\n'
        f"  </p>\n"
        f'  <p style="color: #9ca3af; font-size: 12px;">'
        f"This link will expire in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.</p>\n"
        f"</div>"
    )
    return await send_email(to_email, subject, html_content, text_content)


async def send_password_reset_email(to_email: str, token: str, full_name: str) -> bool:
    """Send a password recovery email."""
    settings = get_settings()
    reset_url = (
        f"http://{settings.BACKEND_HOST}:{settings.FRONTEND_PORT}/reset-password?token={token}"
    )

    subject = f"Reset your {settings.APP_NAME} password"
    text_content = (
        f"Hello {full_name},\n\n"
        f"A password reset was requested for your {settings.APP_NAME} account.\n"
        f"Reset your password by visiting:\n"
        f"{reset_url}\n\n"
        f"This link expires in {settings.PASSWORD_RESET_EXPIRE_HOURS} hour.\n"
        f"If you did not request this, please ignore this email.\n"
    )
    html_content = (
        f'<div style="font-family: sans-serif; background-color: #0b0f19; '
        f'color: #f3f4f6; padding: 24px; border-radius: 8px;">\n'
        f'  <h2 style="color: #38bdf8;">Password Reset Request</h2>\n'
        f"  <p>Hello {full_name},</p>\n"
        f"  <p>Click the button below to set a new password:</p>\n"
        f'  <p style="margin: 24px 0;">\n'
        f'    <a href="{reset_url}" style="background-color: #ef4444; color: white; '
        f"padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; "
        f'display: inline-block;">Reset Password</a>\n'
        f"  </p>\n"
        f'  <p style="color: #9ca3af; font-size: 12px;">'
        f"This link expires in {settings.PASSWORD_RESET_EXPIRE_HOURS} hour.</p>\n"
        f"</div>"
    )
    return await send_email(to_email, subject, html_content, text_content)
