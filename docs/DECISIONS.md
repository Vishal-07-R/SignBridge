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

---

## ADR 0007: Text-to-ISL Rule-Based Translation Pipeline and Honesty Constraints

- **Status**: Accepted
- **Date**: 2026-10-14
- **Context**: Translating English and Hindi natural language into Indian Sign Language (ISL) requires mapping spoken language syntax into ISL's visual-gestural structure. Crucially, ISL grammar is not English word order; it features Topic-Comment structure, Subject-Object-Verb (SOV) canonical order, Time-first framing, and post-predicate/clause-final negation and wh-question positioning. Honesty Rule 5 strictly prohibits using LLMs or vector search as a substitute for verified sign mapping and requires that all rule-based grammatical reorderings be explicitly flagged "needs linguist review". Honesty Rule 2 strictly prohibits inventing or hallucinating signs for unsupported words.
- **Decision**:
  - **Linguistic Pipeline Architecture**: Created modular pipeline in `backend/app/services/linguistics/`:
    1. `normalizer.py`: Unicode NFKC normalization, contraction expansion, punctuation isolation, English copula/article stopword filtering ("is", "are", "am", "a", "the" are omitted as ISL does not sign them), and Hindi-to-ISL concept mapping.
    2. `lemmatizer.py`: Deterministic inflection reduction mapping plurals, past tenses, continuous forms, and pronouns to canonical root glosses.
    3. `phrase_matcher.py`: Greedy phrase-first matcher (e.g. "thank you" -> `THANK_YOU`, "sign language" -> `SIGN`) ensuring multi-word idioms are prioritized over single-token fragmentation.
    4. `grammar_engine.py`: Deterministic rule transforms:
       - `RULE_FILTER_COPULAS_ARTICLES`: Copula/article omission.
       - `RULE_TIME_FIRST`: Temporal adverbials repositioned to clause head.
       - `RULE_SOV_ORDER`: Transitive Subject-Verb-Object reordered to Subject-Object-Verb.
       - `RULE_NEGATION_FINAL`: Negators repositioned to clause end/post-predicate.
       - `RULE_WH_QUESTION_FINAL`: Interrogative question words positioned at clause end.
       - Every applied rule attaches mandatory audit metadata: `{"rule_id": "...", "description": "...", "linguist_notes": "needs linguist review"}`.
    5. `pipeline.py`: Coordinates database lookup against `SignVocabulary`, identifies unsupported words, computes coverage metrics (`total_tokens`, `supported_tokens`, `unsupported_tokens`, `coverage_percentage`), and creates persistent `Translation` and `TranslationSegment` records.
  - **Honesty Rule 2 Enforcement**: Any unrecognized word produces an explicit `is_supported=False` segment, is listed in `coverage.unsupported_tokens`, causes the avatar to hold a neutral rest pose with a warning badge, and triggers an explicit UI alert. Signs are never invented.
  - **User Feedback & Quality Loop**: Added `POST /api/v1/translate/{id}/feedback` and `TranslationFeedbackModal` enabling users and linguists to submit 1-5 star ratings and error classifications (`wrong_sign`, `bad_grammar`, `unrecognized`, `timing`, `other`) stored in `translation_feedback`.
  - **Bidirectional Workspace Integration**: Connected both `TextToIslPage` and `WorkspacePage` to the live translation API.
- **Consequences**: Transparent, reproducible, rule-based linguistic translation with zero hallucinated signs, complete honesty compliance, and an active linguist review feedback loop.

---

## ADR 0008: Document OCR and Video Audio Transcription Pipeline with Background Jobs and Honesty Compliance

- **Status**: Accepted
- **Date**: 2026-10-14
- **Context**: Ingesting scanned documents, photos of text, and video files with spoken audio to translate their contents into Indian Sign Language (ISL) animations. External tools (`tesseract`, `pdftoppm`, `ffmpeg`) and heavy inference models (`faster-whisper`) must run safely without blocking synchronous web workers or introducing command-injection vulnerabilities. Furthermore, Honesty Rule 1 mandates that unreadable or blank media must never hallucinate text, and Honesty Rule 6 mandates that jobs never report fake completion or fabricated results.
- **Decision**:
  - **Magic-Byte Sniffing & File Validation**: Added `backend/app/services/media/validator.py` performing strict header signature checks (PNG, JPEG, WebP, PDF, MP4, WebM) and hard size limits (15MB document/image, 100MB video) with atomic temp file lifecycles.
  - **Command Injection Prevention**: All invocations of `/usr/bin/tesseract`, `/usr/bin/pdftoppm`, and `/usr/bin/ffmpeg` pass arguments as explicit lists of strings (`subprocess.run(cmd, shell=False)`), preventing shell interpolation and argument injection.
  - **OCR Engine & Honesty Rule 1**: Implemented `backend/app/services/media/ocr.py` using native PDF text extraction with rasterization fallback via `pdftoppm` and Tesseract 5 (`eng`, `hin`). If the resulting text is empty or unreadable, the endpoint raises HTTP 422 with a descriptive notice ("No readable text detected in document or image") rather than hallucinating content.
  - **Asynchronous Background Jobs**: Video transcription runs as asynchronous background tasks tracked in PostgreSQL table `video_processing_jobs` (`job_type="transcription"`). Statuses transition through `queued` -> `processing` (with % progress) -> `completed` / `failed` / `cancelled`. Endpoints `GET /jobs/{id}`, `POST /jobs/{id}/cancel`, and `POST /jobs/{id}/retry` enforce server-side user data isolation.
  - **Audio-less Video Routing**: `ffmpeg` probes video streams; if no audio stream exists, the job reports `status: "no_audio_stream"`. The UI immediately surfaces an explicit banner directing the user to `#video-recognition` if this is a video of an individual signing.
  - **Audio Extraction & Whisper Transcription**: Spoken audio is extracted to 16kHz mono WAV and transcribed with `faster-whisper` (`tiny` int8 model on CPU). PyAV is pinned to `av>=11.0.0,<14.0.0` in `pyproject.toml` to guarantee compatibility with faster-whisper's internal container decoder.
  - **Segment-Synchronized Timeline & Inline Editing**: Resulting transcript segments map to ISL gloss sequences via the Stage 4 linguistic pipeline. The frontend (`VideoToIslPage.tsx`) renders interactive time cues, HTML5 video preview with closed-caption overlay, avatar sizing controls, inline segment editing with `POST /api/v1/translate/segment` re-translation, and WebVTT caption download.
- **Consequences**: Scalable, non-blocking media translation pipeline operating with zero shell injection risks, strict honesty compliance, and responsive user feedback across viewports.



