# AI SignBridge

> Two-way Indian Sign Language (ISL) communication platform bridging communities through accessible AI vision recognition and 3D avatar animation.

---

## Architecture Overview

```
signbridge/
├── frontend/             # React 18, TypeScript, Vite, Tailwind CSS, Vitest
├── backend/              # FastAPI application factory, Pydantic v2 settings, Pytest
├── ml/                   # Machine learning contracts and landmark schemas
├── infra/                # Containers and deployment manifests
├── docs/                 # Requirements, ADRs, stages, and status logs
├── docker-compose.yml    # Postgres 16, Redis 7, Mailpit, MinIO
└── .env.example          # Environment variables blueprint
```

- **Direction A (Text & Media to ISL)**: Rule-based linguistic mapping with linguist review flags, phrase-first dictionary lookups, and articulated 3D avatar playback.
- **Direction B (ISL to Text)**: In-browser hand and pose landmark extraction, temporal buffering, and confidence-bounded inference.

---

## CachyOS / Arch Linux Setup & Run Commands

### 1. Prerequisites Check
Verify installed system packages:
```bash
pacman -Q uv nodejs npm docker chromium ffmpeg tesseract
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
# Bash
cp .env.example .env

# Fish
cp .env.example .env
```

### 3. Start Infrastructure Services (PostgreSQL, Redis, Mailpit, MinIO)
```bash
# Bash & Fish
docker compose up -d

# Verify container health
docker compose ps
```

Services exposed:
- **PostgreSQL 16**: `localhost:5432`
- **Redis 7**: `localhost:6379`
- **Mailpit SMTP**: `localhost:1025` | **Mailpit UI**: `http://localhost:8025`
- **MinIO API**: `http://localhost:9002` | **MinIO Console**: `http://localhost:9001`

---

### 4. Backend Setup & Run

#### In `fish` shell:
```fish
# Navigate to backend
cd backend

# Create Python 3.12 virtualenv with uv
uv venv --python 3.12

# Activate virtualenv
source .venv/bin/activate.fish

# Install dependencies with dev tools
uv pip install -e ".[dev]"

# Run backend tests
pytest -v

# Run backend development server (with live reload)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### In `bash` shell:
```bash
cd backend
uv venv --python 3.12
source .venv/bin/activate
uv pip install -e ".[dev]"
pytest -v
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Health check endpoint**: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)
- **Interactive OpenAPI docs**: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)

---

### 5. Frontend Setup & Run

#### In `fish` or `bash`:
```bash
cd frontend

# Install npm dependencies
npm install

# Run frontend tests with Vitest
npm test

# Build production bundle
npm run build

# Start Vite dev server
npm run dev
```

- **Frontend application**: [http://localhost:5173](http://localhost:5173)

---

### 6. Linting & Formatting Checks

```bash
# Backend linting & format check (Ruff)
backend/.venv/bin/ruff check backend
backend/.venv/bin/ruff format --check backend

# Auto-format backend
backend/.venv/bin/ruff format backend
```

---

### 7. Stopping Services

```bash
docker compose down
```
To also purge local dev volumes:
```bash
docker compose down -v
```
