# AI SignBridge: Product Requirements

## Directions
A) TEXT AND MEDIA TO ISL: typed text, text from images/screenshots, uploaded
documents, speech (where supported), uploaded video with speech, live typed
communication, converted to a verified sign sequence performed by a realistic
rigged 3D avatar.
B) ISL TO TEXT: live camera recognition, uploaded signing-video recognition,
recorded webcam video recognition, with confidence and uncertainty indicators.
Use facial expression/posture only where the model supports it. Optional TTS.
Separate these capabilities clearly in the UI.

## Two-way conversation mode
Split screen. Left: camera or sign video, recognized transcription, status.
Right: text input, 3D avatar, playback controls. Directions operate
independently. Shared transcript only when explicitly enabled. Manual
correction, optional TTS, translation status, clear/reset, consent and privacy
controls. No background recording or transmission; recording is user-initiated
and clearly indicated.

## Technology (propose in Stage 1, justify in docs/DECISIONS.md)
- Frontend: React + TypeScript + Vite, Tailwind, shadcn/ui, Three.js with
  React Three Fiber + drei, TanStack Query.
- Backend: modular FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, PostgreSQL.
  Jobs: Celery or RQ + Redis.
- Media: private S3-compatible storage (MinIO locally) or controlled volume;
  only references/metadata in PostgreSQL.
- Layout: /frontend /backend /ml /infra /docs. Everything runs locally via
  docker compose plus documented dev commands. Mailpit for dev email.

## Design
Dark navy and charcoal theme, white text, restrained cyan/blue accents,
optional light theme, modern typography, consistent spacing, visible focus,
restrained transitions, responsive desktop/tablet/mobile, WCAG-minded,
reduced-motion mode. Primary actions easy to find: "Start Translating",
"Open Camera", "Upload Video".

## Pages
Landing; sign-in; registration; email verification; password recovery; main
translation workspace; text-to-ISL; image/document-to-ISL; video-to-ISL; live
camera recognition; uploaded-video recognition; user dashboard; translation
history; saved signs and phrases; vocabulary and learning centre;
accessibility settings; admin dashboard; vocabulary management and review;
dataset import and processing centre; system health and audit dashboard;
help, privacy and feedback.

## 3D avatar
Rigged GLB/GLTF humanoid: head, face, neck, shoulders, torso, arms, elbows,
wrists, both hands, individually articulated fingers and thumbs, eyebrows,
eyes, mouth, facial blend shapes (ARKit-style where available). Natural
transitions, neutral pose between signs, high-contrast clothing, professional
lighting, front-facing default, hand-zoom and upper-body camera presets, large
viewport with no cropped fingertips or face.
Controls: play, pause, resume, replay, previous/next sign, speed, timeline,
current sign label, sequence list, camera angle, fullscreen, reduced motion,
loading and error states.
Animation engine maps validated ISL sign IDs to clips. Missing clip =>
explicit unsupported-sign message. If no rigged model or validated clips
exist: build full loader and mapping architecture, ship a clearly labelled DEV
FALLBACK avatar, and document the real asset needed (rigged humanoid with
finger bones and blendshapes plus per-sign clips or retargetable mocap,
produced or verified with ISL signers).

## Text-to-ISL pipeline
validate input -> language processing -> ISL linguistic mapping (rule-based,
documented) -> verified phrase/sign lookup (phrase-first) -> ordered sequence
-> animation sequence -> avatar playback.
Features: multiline input, char/word counts, clear/paste/example controls,
source-language selection, sentence and phrase processing, coverage info,
unsupported word/phrase warnings, feedback submission, optional TTS.

## Image and document to ISL
PNG, JPEG, WebP, PDF, text. Backend validates extension, MIME, magic bytes,
size, permissions. OCR (Tesseract; PaddleOCR only if justified) -> user edits
text -> same validated pipeline -> avatar. Image preview, OCR status, PDF page
selection, unreadable-image errors, size limits, upload progress, secure temp
files, deletion after processing.

## Video to ISL
Validate file; extract audio with ffmpeg using argument lists (no shell
injection); transcribe with faster-whisper locally or a configured hosted
service; user reviews/corrects transcript; same translation pipeline; sync
signs to segments; preview side-by-side or avatar panel, optional captions,
adjustable avatar size; export video only where rendering is feasible.
On-screen-text-only videos use OCR. Videos of a person signing route to the
ISL-to-text pipeline. Do not assume all videos contain speech. Async jobs with
real status, retry, cancel. Never show a fake completed video.

## Camera ISL to text
Explicit permission flow with explanation, starts only on user action, live
preview, clear recording indicator, pause/stop, review recording, full stream
release on end, clear permission errors, HTTPS or localhost.
Pipeline: frames -> MediaPipe hand/pose landmarks (in browser) -> temporal
buffer -> versioned model-serving interface -> text.
UI: preview, optional landmark overlay (debug), recognized sign/phrase,
confidence and uncertainty, partial and final transcription, clear/retry,
optional TTS, manual correction. Never invent a sentence; show "Sign not
recognized" on low confidence. Use a real trained sequence model only if
provided; otherwise a labelled DEMO mode and documentation of required model,
input tensor format and integration steps. Document supported signs and
limitations from real evaluation only.

## Uploaded sign video to text
Upload, preview, validation, configurable frame sampling, batching, resource
limits, landmark extraction, temporal sequence construction, inference via the
same interface, partial/final text, confidence, progress, retry/error
handling, optional transcript export.

## Accounts and dashboards
Registration, login, email verification, password reset, logout, session
management, profile, preferences, accessibility settings, optional deletable
history, saved phrases, favourite signs, recent activity, export and delete
personal data, optional retention. Argon2, server-side validation, secure
cookie sessions, CSRF, rate limiting.

## Admin area
Separate and fully protected. Metrics from real DB records and telemetry only.
User/role management, vocabulary management, dataset imports, animation asset
management, review and approval, translation error monitoring, feedback
management, job status, health, DB connectivity, audit logs, configuration,
vocabulary versioning and rollback, usage analytics. First admin via
controlled CLI or one-time env bootstrap. No hardcoded password. No admin
self-registration.

## Database tables
users, roles, permissions, user_sessions, user_preferences, translations,
translation_segments, sign_vocabulary, sign_animation_assets, sign_reviews,
dataset_sources, dataset_import_jobs, translation_feedback,
video_processing_jobs, audit_logs, application_settings.
PKs/FKs, indexes, uniqueness, timestamps, transactions, Alembic migrations,
small DEMO vocabulary seed (marked demo, to be replaced by linguist-reviewed
data), deletion policies. Large files in storage, not DB rows. Vector DB
optional, never a substitute for verified mapping.

## API (adjust to final design; JSON; correct status codes)
Auth: POST /api/auth/register /login /logout /forgot-password
/reset-password; GET /api/auth/me.
Translation: POST /api/translate/text /image /document /video;
POST /api/recognize/signs /api/recognize/video; GET /api/jobs/{id};
POST /api/jobs/{id}/cancel.
Vocabulary: GET /api/signs /api/signs/{id} /api/languages.
User: GET/PATCH /api/users/me; GET/DELETE /api/users/me/history.
Admin: GET /api/admin/overview /users /signs /jobs /audit-logs /health;
POST /api/admin/signs /datasets/import; PATCH /api/admin/signs/{id}.
Long tasks return a job ID and real status.

## Dataset and model management
Versioned vocabulary imports, strict CSV/JSON schema validation, approved
animation asset uploads, provenance and licence tracking, duplicate detection,
quality reports, train/val/test separation, dataset versioning, model version
metadata, evaluation reports, review and approval before publication,
failed-import reports, rollback, pagination and background jobs. Never claim
an import or training finished unless it did.

## Security and privacy
HTTPS in production, secure cookies, CSRF, server-side validation, SQL
injection and XSS protection, strict CORS, security headers and CSP, request
and upload size limits, rate limiting, safe file storage, magic-byte
validation, optional ClamAV, temp cleanup, private media with signed URLs,
secrets via env vars, audit logs for sensitive admin actions, pip-audit and
npm audit, backup and recovery docs, user-controlled retention, minimal
logging of sensitive content.
