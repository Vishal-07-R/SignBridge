"""Optical Character Recognition (OCR) service using Tesseract 5 and PDF extraction."""

from __future__ import annotations

import glob
import subprocess
import uuid
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status
from pypdf import PdfReader


def run_tesseract_on_image(image_path: Path, language: str = "eng") -> str:
    """Execute tesseract on an image using explicit argument lists to prevent shell injection."""
    output_prefix = image_path.parent / f"tess_out_{uuid.uuid4().hex}"
    txt_path = Path(f"{output_prefix}.txt")

    try:
        cmd = [
            "/usr/bin/tesseract",
            str(image_path),
            str(output_prefix),
            "-l",
            language,
        ]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Tesseract OCR execution failed: {result.stderr.strip()}",
            )

        if not txt_path.exists():
            return ""

        with open(txt_path, encoding="utf-8", errors="replace") as f:
            text = f.read().strip()
        return text
    finally:
        if txt_path.exists():
            with contextlib_suppress():
                txt_path.unlink()


def render_pdf_pages_to_images(pdf_path: Path, page_number: int | None = None) -> list[Path]:
    """Convert PDF pages to PNG images via pdftoppm using explicit argument lists."""
    prefix = pdf_path.parent / f"pdf_page_{uuid.uuid4().hex}"
    cmd = ["/usr/bin/pdftoppm", "-png", "-r", "150"]

    if page_number is not None and page_number > 0:
        cmd.extend(["-f", str(page_number), "-l", str(page_number)])

    cmd.extend([str(pdf_path), str(prefix)])

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF rendering failed: {result.stderr.strip()}",
        )

    rendered_files = sorted([Path(p) for p in glob.glob(f"{prefix}-*.png")])
    return rendered_files


def extract_text_from_pdf(
    pdf_path: Path, language: str = "eng", page_number: int | None = None
) -> tuple[str, int]:
    """Extract text from PDF via native text layer or pdftoppm + Tesseract for scanned pages."""
    try:
        reader = PdfReader(str(pdf_path))
        num_pages = len(reader.pages)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Corrupt or invalid PDF document: {e}",
        ) from e

    if num_pages == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF document contains zero pages.",
        )

    # If target page is specified, clamp/validate
    pages_to_process = (
        [page_number - 1]
        if page_number and 1 <= page_number <= num_pages
        else list(range(num_pages))
    )

    extracted_parts: list[str] = []
    # 1. Try native PDF text extraction first
    for idx in pages_to_process:
        try:
            page_text = reader.pages[idx].extract_text() or ""
            if page_text.strip():
                extracted_parts.append(page_text.strip())
        except Exception:
            pass

    native_text = "\n\n".join(extracted_parts).strip()
    if native_text:
        return native_text, num_pages

    # 2. Fall back to rasterizing pages with pdftoppm and running Tesseract OCR
    rendered_images = render_pdf_pages_to_images(pdf_path, page_number)
    try:
        ocr_parts: list[str] = []
        for img_path in rendered_images:
            txt = run_tesseract_on_image(img_path, language=language)
            if txt:
                ocr_parts.append(txt)
        return "\n\n".join(ocr_parts).strip(), num_pages
    finally:
        for img_path in rendered_images:
            if img_path.exists():
                with contextlib_suppress():
                    img_path.unlink()


def perform_document_ocr(
    file_path: Path,
    mime_type: str,
    language: str = "eng",
    page_number: int | None = None,
) -> tuple[str, dict[str, Any]]:
    """Perform optical character recognition on an image or PDF document.

    Enforces Honesty Rule 1: Never hallucinates text if image is blank or unreadable.
    """
    total_pages = 1

    if mime_type == "application/pdf":
        raw_text, total_pages = extract_text_from_pdf(
            file_path, language=language, page_number=page_number
        )
    else:
        raw_text = run_tesseract_on_image(file_path, language=language)

    cleaned_text = raw_text.strip()
    words = cleaned_text.split()

    if not cleaned_text or len(words) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                "No readable text detected in document or image. "
                "Please verify image clarity, contrast, and orientation."
            ),
        )

    metadata: dict[str, Any] = {
        "engine": "tesseract-5.5.3",
        "mime_type": mime_type,
        "language": language,
        "page_count": total_pages,
        "selected_page": page_number if page_number else 1,
        "word_count": len(words),
        "char_count": len(cleaned_text),
    }

    return cleaned_text, metadata


def contextlib_suppress():
    """Helper for suppressing cleanup exceptions."""
    import contextlib

    return contextlib.suppress(Exception)
