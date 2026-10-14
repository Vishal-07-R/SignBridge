# AI SignBridge: Stages

## STAGE 1: ARCHITECTURE AND SCAFFOLD (branch stage-1-scaffold)
Propose and justify stack, repo layout, module boundaries (DECISIONS.md).
Scaffold frontend (Vite, React, TS, Tailwind, shadcn/ui, Vitest), backend
(FastAPI app factory, Pydantic settings, health endpoint, pytest),
docker-compose.yml (Postgres, Redis, Mailpit, MinIO), .env.example,
.gitignore, lint/format, pre-commit, README with exact CachyOS run commands.
Verify: health endpoint responds, frontend renders, containers start, both
test suites run. No product features yet.

## STAGE 2: FOUNDATION (branch stage-2-foundation)
Alembic and all tables, small DEMO vocabulary seed, authentication (Argon2,
cookie sessions, CSRF, email verification, password reset, rate limiting),
RBAC, controlled first-admin creation. Tests: registration, login,
authorization, user data isolation, admin role restrictions, DB persistence.

## STAGE 3: UI AND AVATAR (branch stage-3-ui-avatar)
All pages with consistent navigation and the three primary actions. R3F avatar
loader, clip mapper keyed by sign ID, playback controls, timeline, speed,
camera presets, fullscreen, reduced motion, loading/error states, labelled dev
fallback plus asset documentation. Verify at desktop, tablet, mobile widths.

## STAGE 4: TEXT TO ISL (branch stage-4-text-to-isl)
Validation, language selection, normalization, phrase-first lookup, rule-based
ISL ordering flagged for linguist review, unsupported-word reporting, coverage
metrics, sequence generation, playback, feedback, optional TTS. Tests for
validation, lookup, unsupported signs.

## STAGE 5: OCR AND VIDEO TO ISL (branch stage-5-ocr-video)
Secure uploads, magic-byte checks, temp cleanup, OCR with editable output,
ffmpeg audio extraction, speech-to-text with correctable transcript,
segment-synchronized timeline, background jobs with status/retry/cancel,
export only if feasible. Tests for upload validation, OCR failures, job
status handling.

## STAGE 6: ISL TO TEXT (branch stage-6-isl-to-text)
Camera flow, in-browser MediaPipe landmarks, temporal buffer, versioned
model-serving interface, uploaded signing-video pipeline with sampling,
batching, limits, confidence and "Sign not recognized" states, manual
correction, supported-signs and limitations document. Camera-permission
failure tests with fake media flags. DEMO mode unless a real model is given.

## STAGE 7: DASHBOARDS, ADMIN AND SECURITY (branch stage-7-admin-security)
User history, saved phrases, favourites, export/delete; admin overview from
real data, user/role management, vocabulary CRUD with versioning, review and
rollback, dataset import with schema validation, dedupe, quality report,
provenance/licence, job monitor, audit logs, health page; security headers,
CSP, strict CORS, upload limits, pip-audit and npm audit, backup and recovery
document. Include account deletion tests.

## STAGE 8: TEST AND DEPLOY (branch stage-8-test-deploy)
Full pytest, Vitest, Playwright E2E; production Docker images and production
compose file; migrations on startup or release step; health checks; setup and
operations docs. Deployment target TBD: document host-neutral Docker
deployment and required env vars; produce host-specific config when I name a
host. Never claim deployment succeeded unless the live URL was observed
working. End with the final report:
1 Works and verified (how). 2 DEMO-only. 3 Needs external service/model/
dataset/asset (exact specs). 4 Unfinished/known bugs. 5 Test results exactly
as run. 6 Deployment status and URL, only if verified.
