# Production Dockerfile for AI SignBridge Backend
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend

# Install required system packages: FFmpeg for video processing, Tesseract for OCR (Eng + Hin), libmagic
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    libmagic1 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency specifications first for optimal layer caching
COPY backend/pyproject.toml backend/README.md ./backend/
RUN pip install --no-cache-dir uv && \
    uv pip install --system -e ./backend

# Copy Alembic migration config and backend application
COPY alembic.ini .
COPY backend/ ./backend/

# Default port for FastAPI / Uvicorn (overridden by $PORT on Render/Railway)
EXPOSE 8000

# Run Alembic migrations to latest schema, then launch FastAPI via application factory
CMD ["sh", "-c", "alembic upgrade head && python -m uvicorn app.main:create_app --factory --host 0.0.0.0 --port ${PORT:-8000}"]
