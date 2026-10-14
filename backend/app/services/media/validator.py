"""Secure file upload validator with magic-byte checking and safe temporary file lifecycle."""

from __future__ import annotations

import contextlib
import os
import uuid
from collections.abc import Generator
from pathlib import Path

from fastapi import HTTPException, status

UPLOAD_TEMP_DIR = Path("/tmp/signbridge_uploads")
UPLOAD_TEMP_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)

MAX_IMAGE_DOCUMENT_SIZE = 15 * 1024 * 1024  # 15 MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100 MB

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".pdf"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}

ALLOWED_IMAGE_MIMES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
}

ALLOWED_VIDEO_MIMES = {
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-matroska",
}


def detect_file_format_by_magic_bytes(header: bytes) -> str | None:
    """Inspect first bytes of file to reliably identify format without relying on extension."""
    if len(header) < 4:
        return None

    # PNG
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"

    # JPEG
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"

    # WebP: RIFF....WEBP
    if header.startswith(b"RIFF") and len(header) >= 12 and header[8:12] == b"WEBP":
        return "image/webp"

    # PDF: %PDF-
    if header.startswith(b"%PDF-"):
        return "application/pdf"

    # WebM / Matroska EBML ID: 0x1A 0x45 0xDF 0xA3
    if header.startswith(b"\x1a\x45\xdf\xa3"):
        return "video/webm"

    # MP4 / QuickTime: check for ftyp box in first 32 bytes
    if len(header) >= 12:
        if header[4:8] == b"ftyp" or header[4:8] == b"moov":
            return "video/mp4"
        for offset in range(0, min(len(header) - 8, 32)):
            if header[offset : offset + 4] == b"ftyp":
                return "video/mp4"

    return None


def validate_image_or_document_upload(
    file_bytes: bytes,
    filename: str,
    content_type: str | None = None,
) -> str:
    """Validate image or document upload against size limits, extensions, MIME, and magic bytes.

    Returns the canonical MIME type if valid; raises HTTPException otherwise.
    """
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes).",
        )

    if len(file_bytes) > MAX_IMAGE_DOCUMENT_SIZE:
        max_mb = MAX_IMAGE_DOCUMENT_SIZE // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {max_mb}MB.",
        )

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_IMAGE_EXTENSIONS))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed extensions: {allowed}.",
        )

    detected_mime = detect_file_format_by_magic_bytes(file_bytes[:32])
    if not detected_mime or detected_mime not in ALLOWED_IMAGE_MIMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File magic bytes mismatch or corrupted format for '{filename}'. "
                "Expected valid PNG, JPEG, WebP, or PDF."
            ),
        )

    return detected_mime


def validate_video_upload(
    file_bytes: bytes,
    filename: str,
    content_type: str | None = None,
) -> str:
    """Validate video upload against size limits, extensions, MIME types, and magic bytes.

    Returns the canonical MIME type if valid; raises HTTPException otherwise.
    """
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded video file is empty (0 bytes).",
        )

    if len(file_bytes) > MAX_VIDEO_SIZE:
        max_mb = MAX_VIDEO_SIZE // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Video file exceeds maximum allowed size of {max_mb}MB.",
        )

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_VIDEO_EXTENSIONS))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video extension '{ext}'. Allowed extensions: {allowed}.",
        )

    detected_mime = detect_file_format_by_magic_bytes(file_bytes[:64])
    if not detected_mime or detected_mime not in ALLOWED_VIDEO_MIMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File magic bytes mismatch or corrupted format for video '{filename}'. "
                "Expected valid MP4, WebM, or QuickTime."
            ),
        )

    return detected_mime


@contextlib.contextmanager
def secure_temp_file(file_bytes: bytes, suffix: str) -> Generator[Path, None, None]:
    """Context manager to securely write bytes to a UUID temp file and guarantee cleanup on exit."""
    unique_name = f"{uuid.uuid4()}{suffix}"
    temp_path = UPLOAD_TEMP_DIR / unique_name
    try:
        # Write with restricted permissions (0o600)
        fd = os.open(str(temp_path), os.O_CREAT | os.O_WRONLY | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as f:
            f.write(file_bytes)
        yield temp_path
    finally:
        if temp_path.exists():
            with contextlib.suppress(Exception):
                temp_path.unlink()
