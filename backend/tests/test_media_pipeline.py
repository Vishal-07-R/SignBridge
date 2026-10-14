"""Tests for Stage 5 media ingestion pipelines: OCR, video audio extraction, and jobs."""

from __future__ import annotations

import io
import subprocess
import uuid
from pathlib import Path

import pytest
from httpx import AsyncClient
from PIL import Image, ImageDraw
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import VideoProcessingJob
from app.models.user import User
from app.services.media.validator import detect_file_format_by_magic_bytes


def create_synthetic_text_image(text: str = "HELLO FRIEND") -> bytes:
    """Create a synthetic PNG image with high-contrast text for Tesseract OCR verification."""
    img = Image.new("RGB", (400, 100), color="white")
    draw = ImageDraw.Draw(img)
    # Draw simple high-contrast text
    draw.text((20, 35), text, fill="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_blank_image() -> bytes:
    """Create a completely black synthetic PNG image with zero readable text."""
    img = Image.new("RGB", (200, 200), color="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_magic_byte_detection() -> None:
    """Verify magic-byte inspection identifies file headers without relying on extensions."""
    # PNG
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20
    assert detect_file_format_by_magic_bytes(png_bytes) == "image/png"

    # JPEG
    jpeg_bytes = b"\xff\xd8\xff\xe0" + b"\x00" * 20
    assert detect_file_format_by_magic_bytes(jpeg_bytes) == "image/jpeg"

    # WebP
    webp_bytes = b"RIFF" + b"\x00" * 4 + b"WEBP" + b"\x00" * 10
    assert detect_file_format_by_magic_bytes(webp_bytes) == "image/webp"

    # PDF
    pdf_bytes = b"%PDF-1.4" + b"\x00" * 20
    assert detect_file_format_by_magic_bytes(pdf_bytes) == "application/pdf"

    # WebM
    webm_bytes = b"\x1a\x45\xdf\xa3" + b"\x00" * 20
    assert detect_file_format_by_magic_bytes(webm_bytes) == "video/webm"

    # MP4
    mp4_bytes = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 20
    assert detect_file_format_by_magic_bytes(mp4_bytes) == "video/mp4"

    # Corrupt / unknown
    corrupt_bytes = b"NOT_A_VALID_HEADER"
    assert detect_file_format_by_magic_bytes(corrupt_bytes) is None


@pytest.mark.asyncio
async def test_upload_validation_errors(async_client: AsyncClient) -> None:
    """Verify uploads reject empty files, bad extensions, size limits, and spoofed magic bytes."""
    # 1. Empty file
    res = await async_client.post(
        "/api/v1/translate/image",
        files={"file": ("test.png", b"", "image/png")},
    )
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()

    # 2. Unsupported extension
    res = await async_client.post(
        "/api/v1/translate/image",
        files={"file": ("test.exe", b"\x89PNG\r\n\x1a\n" + b"A" * 20, "image/png")},
    )
    assert res.status_code == 400
    assert "unsupported file extension" in res.json()["detail"].lower()

    # 3. Mismatched magic bytes (text file renamed to .png)
    res = await async_client.post(
        "/api/v1/translate/image",
        files={"file": ("fake.png", b"This is plain text pretending to be png", "image/png")},
    )
    assert res.status_code == 400
    assert "magic bytes mismatch" in res.json()["detail"].lower()

    # 4. Oversized image (>15MB)
    oversized = b"\x89PNG\r\n\x1a\n" + b"\x00" * (16 * 1024 * 1024)
    res = await async_client.post(
        "/api/v1/translate/image",
        files={"file": ("large.png", oversized, "image/png")},
    )
    assert res.status_code == 413
    assert "exceeds maximum allowed size" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_ocr_extraction_synthetic_image(async_client: AsyncClient) -> None:
    """Verify Tesseract OCR extracts text from a clear synthetic image and translates to ISL."""
    img_bytes = create_synthetic_text_image("HELLO FRIEND")

    res = await async_client.post(
        "/api/v1/translate/image",
        files={"file": ("hello_friend.png", img_bytes, "image/png")},
        data={"source_language": "en", "auto_translate": "true"},
    )
    assert res.status_code == 200
    data = res.json()

    assert "extracted_text" in data
    assert "HELLO" in data["extracted_text"].upper() or "FRIEND" in data["extracted_text"].upper()
    assert data["metadata"]["engine"] == "tesseract-5.5.3"
    assert data["metadata"]["char_count"] > 0
    assert data["translation"] is not None
    # Check that translation mapped to ISL segments
    assert len(data["translation"]["segments"]) > 0


@pytest.mark.asyncio
async def test_ocr_unreadable_blank_image(async_client: AsyncClient) -> None:
    """Verify Rule 1: Blank or unreadable images return explicit error instead of hallucinating."""
    blank_bytes = create_blank_image()

    res = await async_client.post(
        "/api/v1/translate/image",
        files={"file": ("blank.png", blank_bytes, "image/png")},
        data={"source_language": "en", "auto_translate": "false"},
    )
    assert res.status_code == 422
    assert "no readable text detected" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_segment_retranslation_endpoint(async_client: AsyncClient) -> None:
    """Verify POST /api/v1/translate/segment re-translates a corrected transcript segment."""
    res = await async_client.post(
        "/api/v1/translate/segment",
        json={"text": "thank you", "source_language": "en"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["text"] == "thank you"
    assert "THANK_YOU" in data["glosses"]
    assert isinstance(data["grammar_audit"], list)


@pytest.mark.asyncio
async def test_job_status_lifecycle_and_isolation(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verify job polling, cancellation, retry, and user data isolation."""
    # Create test user
    user = User(
        id=uuid.uuid4(),
        email=f"jobuser_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password="argon2id$mockhash",
        full_name="Job User",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    # Create private job for user
    job = VideoProcessingJob(
        id=uuid.uuid4(),
        user_id=user.id,
        job_type="transcription",
        status="queued",
        progress=0,
        input_file_path="/tmp/test_video.mp4",
        result_data=None,
    )
    db_session.add(job)
    await db_session.commit()

    # 1. Unauthenticated or wrong user cannot access private job (User Data Isolation)
    res = await async_client.get(f"/api/v1/jobs/{job.id}")
    assert res.status_code == 403
    assert "permission" in res.json()["detail"].lower()

    # 2. Guest job (user_id=None) can be polled by public client
    guest_job = VideoProcessingJob(
        id=uuid.uuid4(),
        user_id=None,
        job_type="transcription",
        status="queued",
        progress=10,
        input_file_path="/tmp/guest_video.mp4",
        result_data=None,
    )
    db_session.add(guest_job)
    await db_session.commit()

    res = await async_client.get(f"/api/v1/jobs/{guest_job.id}")
    assert res.status_code == 200
    job_data = res.json()
    assert job_data["id"] == str(guest_job.id)
    assert job_data["status"] == "queued"
    assert job_data["progress"] == 10

    # 3. Cancel guest job
    res_cancel = await async_client.post(f"/api/v1/jobs/{guest_job.id}/cancel")
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "cancelled"

    # 4. Retry guest job
    res_retry = await async_client.post(f"/api/v1/jobs/{guest_job.id}/retry")
    assert res_retry.status_code == 200
    assert res_retry.json()["status"] == "queued"
    assert res_retry.json()["progress"] == 0

    # 5. Non-existent job returns 404
    non_existent_id = uuid.uuid4()
    res_404 = await async_client.get(f"/api/v1/jobs/{non_existent_id}")
    assert res_404.status_code == 404


@pytest.mark.asyncio
async def test_video_without_audio_detection() -> None:
    """Verify video audio extraction correctly detects when a video has no audio stream."""
    from app.services.media.video import extract_audio_from_video

    # Generate a tiny 1-second synthetic MP4 video without audio using ffmpeg
    temp_video = Path(f"/tmp/no_audio_{uuid.uuid4().hex}.mp4")
    temp_wav = Path(f"/tmp/extracted_{uuid.uuid4().hex}.wav")

    cmd = [
        "/usr/bin/ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=160x120:d=1",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(temp_video),
    ]
    subprocess.run(cmd, capture_output=True, check=True)

    try:
        success, err = extract_audio_from_video(temp_video, temp_wav)
        assert success is False
        assert err == "no_audio_stream"
    finally:
        if temp_video.exists():
            temp_video.unlink()
        if temp_wav.exists():
            temp_wav.unlink()
