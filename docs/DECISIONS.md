# Architecture Decision Records (ADRs)

## ADR 0001: Technology Stack Selection

- **Status**: Accepted
- **Date**: 2026-10-14
- **Context**: AI SignBridge requires a high-performance, two-way Indian Sign Language (ISL) communication web application. The platform involves browser-based landmark extraction, real-time 3D avatar animation (React Three Fiber), asynchronous video/document processing (OCR, transcription), and secure role-based multi-user workflows.
- **Decision**:
  - **Frontend**: React + TypeScript + Vite. Vite enables fast native ESM builds and HMR. TypeScript provides strict typings for complex spatial coordinates and sign sequences. Tailwind CSS and shadcn/ui primitives provide an accessible, responsive dark navy/charcoal UI with cyan accents. React Three Fiber (R3F) and drei are selected for the 3D avatar rendering pipeline. TanStack Query manages async server state.
  - **Backend**: Modular FastAPI with Python 3.12 managed via `uv`. FastAPI offers native async I/O, OpenAPI documentation, and high throughput. Pydantic v2 enforces strict validation. SQLAlchemy 2.0 and Alembic handle relational schemas and migrations.
  - **Background Jobs**: Celery / RQ backed by Redis 7 for OCR, video processing, and audio extraction pipelines.
  - **Storage**: PostgreSQL 16 for metadata, users, audit logs, and vocabulary records. MinIO (S3-compatible) for video/audio files, documents, and 3D avatar GLB assets.
- **Consequences**: Fast feedback loops, decoupled frontend/backend services, strict type safety across the stack, and local reproduction with zero paid cloud dependencies.

---

## ADR 0002: Repository Layout and Service Boundaries

- **Status**: Accepted
- **Date**: 2026-10-14
- **Context**: We need a clear monorepo structure separating concerns while keeping local orchestration straightforward.
- **Decision**:
  The repository is organized into five top-level modules:
  - `/frontend`: Single-page application (React, TS, Vite, Tailwind, Vitest).
  - `/backend`: API server (FastAPI app factory, core settings, API v1 routes, tests).
  - `/ml`: Machine learning contracts, landmark extraction pipelines, temporal sequence buffers, and model-serving interfaces.
  - `/infra`: Container orchestration, deployment scripts, and database maintenance utilities.
  - `/docs`: Requirements, architecture decisions (ADRs), stage definitions, and running status logs.
- **Consequences**: Clean separation of frontend client, backend business logic, ML pipelines, and infrastructure configuration.

---

## ADR 0003: CachyOS Tooling and Shell Conventions

- **Status**: Accepted
- **Date**: 2026-10-14
- **Context**: The primary development environment is CachyOS (Arch Linux) using the `fish` shell as default. Direct execution of non-standard bash syntax (such as inline heredocs or `export VAR=...`) fails in fish.
- **Decision**:
  - Python dependencies are strictly managed with `uv` targeting Python 3.12.
  - Node dependencies use standard `npm` (Node 22+).
  - Shell commands documented in `README.md` provide both native `fish` syntax and standard `bash` commands.
  - Automation scripts use explicit `#!/usr/bin/env bash` shebangs.
  - Browser verification utilizes the local Chromium binary at `/usr/bin/chromium` with fake media stream flags for automated testing.
- **Consequences**: Seamless operation on the host system without shell syntax errors or environment discrepancies.

---

## ADR 0004: Authentication, Session Management, and CSRF Architecture

- **Status**: Accepted
- **Date**: 2026-10-14
- **Context**: Authentication requires resilient defense against credential stuffing, session hijacking, cross-site scripting (XSS), and cross-site request forgery (CSRF). Password storage must resist GPU cracking.
- **Decision**:
  - **Password Hashing**: Implemented Argon2id via `argon2-cffi` (`time_cost=2`, `memory_cost=102400` KiB, `parallelism=8`), meeting OWASP password storage recommendations.
  - **Session Management**: Opaque random cryptographically secure 256-bit session tokens stored as SHA-256 hashes in PostgreSQL (`user_sessions`). Delivered to browser via `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookies (`signbridge_session`).
  - **CSRF Defense**: Dual-token pattern. A non-HttpOnly CSRF token (`signbridge_csrf`) is issued alongside the session. All mutating requests (POST, PUT, PATCH, DELETE) require an `X-CSRF-Token` header matching the HMAC-SHA256 authenticated secret tied to the active session.
  - **Rate Limiting**: Redis-backed sliding-window rate limiting on sensitive routes (`/login`, `/register`, `/forgot-password`, `/reset-password`) with automatic in-memory fallback.
  - **Authorization**: RBAC enforced at endpoint level via FastAPI dependencies (`require_role`, `require_permission`). Admin creation is strictly restricted to CLI (`python -m app.cli create-admin`) with no public self-elevation.
- **Consequences**: High resistance to token theft and CSRF attacks without relying on vulnerable client-side storage for JWTs.

---

## ADR 0005: ISL Seed Integrity and Honesty Constraints

- **Status**: Accepted
- **Date**: 2026-10-14
- **Context**: Project rules strictly prohibit fabricating sign language accuracy, vocabulary coverage, or claiming unverified recognition.
- **Decision**:
  - All initial ISL vocabulary seeded in the database are explicitly flagged with `is_demo=True`, `is_reviewed=False`, and `linguist_notes="Demo seed - needs linguist review"`.
  - Non-existent or unreviewed signs must explicitly return an "unsupported sign" response rather than improvising or hallucinating gestures.
  - Database schema enforces integrity fields: `is_reviewed`, `review_status`, and `linguist_notes` across `sign_vocabulary` and `sign_reviews`.
- **Consequences**: Strict honesty compliance guaranteed at data and API boundaries.

---

## ADR 0006: 3D Avatar Rendering Pipeline, Dev Fallback Rig, and Honesty Rule Compliance

- **Status**: Accepted
- **Date**: 2026-10-14
- **Context**: Real-time 3D avatar visualization is required for Direction A (Text/Media to ISL). Production motion-captured humanoid `.glb` models with ARKit 52 facial blendshapes and linguist-certified sign clips are pending studio capture. Honesty Rules 1, 2, and 8 mandate that we never invent gestures, never pretend missing assets exist, explicitly flag unverified signs with an unsupported notice, and provide a clearly labeled DEMO fallback while documenting exact asset specifications.
- **Decision**:
  - **3D Engine**: Integrated Three.js (`three@^0.162.0`), React Three Fiber (`@react-three/fiber@^8.18.0`), and `@react-three/drei@^9.122.0` pinned for React 18 compatibility.
  - **Clip Mapper & Dictionary**: Implemented `clipMapper.ts` with strict validation. Seeded signs (`HELLO`, `THANK_YOU`, `PLEASE`, `WATER`, etc.) map to timed clips; any unknown or unverified gloss triggers an explicit "Unsupported Sign" status (Honesty Rule 2) and halts the avatar in neutral rest pose rather than inventing gestures.
  - **Procedural Dev Fallback Rig**: Created `DevFallbackAvatar.tsx`, a procedurally rigged humanoid mesh with head, eyes, brows, neck, torso, shoulders, arms, wrists, and all 5 articulated fingers per hand running kinematic easing curves for demo gestures.
  - **Honesty Rule 8 Transparency**: Rendered an unobtrusive `DEV FALLBACK RIG` watermark badge and interactive `AssetDocModal` documenting target drop-in location (`frontend/public/assets/models/avatar.glb`) and formal specifications in `docs/AVATAR_ASSETS.md`.
  - **Controls & Accessibility**: Provided comprehensive transport controls (play, pause, step, replay, scrubber with sign cues), speed options (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x), camera presets (Front, Upper Body, Hands zoom), reduced motion mode, and responsive layout across Desktop, Tablet, and Mobile.
  - **Full UI Integration**: Delivered all 19 defined pages in `frontend/src/pages/` with consistent header navigation, hash-based routing, and the three primary action buttons prominently displayed ("Start Translating", "Open Camera", "Upload Video").
- **Consequences**: Complete end-to-end avatar pipeline operational immediately, with clean drop-in readiness for production `.glb` assets without rewriting UI or playback control architecture.


