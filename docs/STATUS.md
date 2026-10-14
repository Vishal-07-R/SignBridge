# STATUS

## DONE AND VERIFIED
- **Repository Architecture & Layout**: Created modular monorepo directories `/frontend`, `/backend`, `/infra`, `/ml`, and `/docs` on branch `stage-1-scaffold`.
- **Backend Application Factory**: Built modular FastAPI server using application factory pattern (`create_app()`), Pydantic v2 `BaseSettings` reading `.env`, CORS middleware, root metadata route (`GET /`), and health check endpoint (`GET /api/v1/health`).
- **Container Infrastructure**: Orchestrated PostgreSQL 16, Redis 7, Mailpit, and MinIO in `docker-compose.yml`. All 4 container health checks observed and verified in `healthy` state.
- **Alembic Async Migrations & 16 Relational Tables**: Generated and executed initial migration `backend/alembic/versions/cfbd06127870_initial_schema.py` creating all 16 required tables: `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `user_sessions`, `user_preferences`, `translations`, `translation_segments`, `sign_vocabulary`, `sign_animation_assets`, `sign_reviews`, `dataset_sources`, `dataset_import_jobs`, `translation_feedback`, `video_processing_jobs`, `audit_logs`, and `application_settings`.
- **DEMO ISL Vocabulary Seed & Initial RBAC**: Seeded 3 default roles (`admin`, `linguist`, `user`), 11 granular permissions, and 12 core ISL signs (`HELLO`, `THANK_YOU`, `PLEASE`, `NAME`, `HELP`, `YES`, `NO`, `WATER`, `GOOD`, `WELCOME`, `SIGN`, `FRIEND`). Strictly enforced Honesty Rule 5: all seeded signs have `is_demo=True`, `is_reviewed=False`, and `linguist_notes="Demo seed - needs linguist review"`.
- **Argon2id Authentication & Sessions**: Implemented OWASP-compliant Argon2id password hashing via `argon2-cffi`, SHA-256 session token hashing, HttpOnly `SameSite=Lax` session cookies, dual-token CSRF protection (`signbridge_csrf` cookie + `X-CSRF-Token` header check), and sliding-window rate limiting on login/registration backed by Redis with in-memory fallback.
- **Transactional Email Workflows**: Async email dispatch via Mailpit SMTP (`localhost:1025`) for email verification tokens and password reset workflows.
- **RBAC & User Data Isolation**: Implemented FastAPI security dependencies `get_current_user`, `require_role`, `require_permission`. Endpoints verify that users can only access their own private preferences, sessions, and history (`/api/v1/users/me/*`), while admin endpoints (`/api/v1/admin/*`) strictly reject non-admins.
- **Admin CLI**: Implemented `python -m app.cli create-admin` and `seed-data` command-line tools. Created initial admin user `admin@signbridge.local` via CLI.
- **Stage 3 UI & R3F 3D Avatar Viewer**:
  - Implemented all 19 defined pages in `frontend/src/pages/` with consistent header navigation, responsive layouts, accessibility settings, and the three primary action buttons prominently featured ("Start Translating", "Open Camera", "Upload Video").
  - Built React Three Fiber 3D avatar viewport (`AvatarCanvas.tsx`) with three-point studio lighting, contact shadows, camera presets, and fallback watermark.
  - Implemented procedurally rigged humanoid avatar mesh (`DevFallbackAvatar.tsx`) with articulated head, brows, eyes, mouth, neck, torso, shoulders, arms, wrists, and all 5 articulated fingers per hand (thumb, index, middle, ring, pinky).
  - Implemented deterministic sign clip mapper (`clipMapper.ts`) with 12 seeded signs and strict Honesty Rule 2 unverified sign detection (unsupported signs explicitly halt avatar in rest pose and display warning banners rather than hallucinating gestures).
  - Built full transport controls (`AvatarControls.tsx`): timeline scrubber with sign cue markers, play/pause, step-forward/backward, replay, speeds (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x), camera presets (Front, Upper Body, Hands Zoom), reduced motion, and fullscreen.
  - Built interactive sequence list (`AvatarSequenceList.tsx`) for queue jumping with unsupported badges.
  - Documented production asset requirements in `docs/AVATAR_ASSETS.md` and integrated interactive `AssetDocModal.tsx` for drop-in specifications.
  - Added global accessibility provider (`AccessibilityContext.tsx`) for reduced motion, high-contrast, and font sizing.
- **Stage 4 Text-to-ISL Rule-Based Translation Pipeline**:
  - **Linguistics Engine (`backend/app/services/linguistics/`)**:
    - `normalizer.py`: Unicode NFKC text cleaning, contraction expansion, Hindi Devanagari concept dictionary, character/word counters, and English copula/article omission ("is", "are", "am", "a", "the" omitted as ISL does not sign them).
    - `lemmatizer.py`: Morphological inflection reduction mapping plurals, past tenses, continuous forms, and pronouns to base dictionary glosses.
    - `phrase_matcher.py`: Greedy phrase-first matcher (e.g. "thank you" -> `THANK_YOU`, "sign language" -> `SIGN`) preventing sub-word fragmentation of multi-word ISL idioms.
    - `grammar_engine.py`: Documented rule-based ISL grammar transforms (Time-first framing, SOV constituent order, Negation-final, WH-question final). In strict adherence to Honesty Rule 5, all rules attach mandatory `linguist_notes="needs linguist review"`. No LLMs or vector search substituted for verified mapping.
    - `pipeline.py`: Pipeline coordinator resolving database vocabulary in `sign_vocabulary`, calculating coverage statistics, isolating unsupported tokens (Honesty Rule 2), assigning segment timestamps, and persisting to `translations` and `translation_segments`.
  - **API Endpoints & Schemas (`backend/app/api/v1/endpoints/translate.py`)**:
    - `POST /api/v1/translate/text`: Full text translation returning ordered segments, grammar audit trail, and dictionary coverage metrics. Supports authenticated user attribution and anonymous guests.
    - `GET /api/v1/translate/languages`: Supported source languages (`en` English, `hi` Hindi) and capabilities.
    - `POST /api/v1/translate/{id}/feedback`: User rating (1 to 5 stars) and error categorization (`wrong_sign`, `bad_grammar`, `unrecognized`, `timing`, `other`) persisted in `translation_feedback`.
    - `GET /api/v1/translate/{id}`: Detailed translation retrieval by UUID.
    - `GET /api/v1/signs/languages`: Supported sign vocabulary languages.
  - **Frontend UI & Linguistic Inspector**:
    - `TextToIslPage.tsx`: Full API integration, language selector, multiline input with live character/word counters, paste/clear/example presets, dictionary coverage gauge, Honesty Rule 2 unsupported sign alert, Web Speech API TTS, and integrated `TranslationFeedbackModal`.
    - `LinguisticBreakdown.tsx`: Interactive linguistic inspector visualizing normalized tokens, applied grammar rules with "needs linguist review" badges, and ordered sign sequence.
    - `WorkspacePage.tsx`: Connected right channel ("Text to ISL") directly to the translation API.
    - `translation.ts`: Typed API client for translation, language listing, and feedback.
- **Test Suites & Verification**:
  - Backend: 37/37 tests passing 100% across 10 test suites (`backend/tests/test_translation.py` verified with 10 comprehensive tests).
  - Frontend: 24/24 tests passing 100% across 3 test suites with Vitest (`frontend/src/__tests__/TextToIsl.test.tsx` verified with 7 tests).
  - Production Build: `npm --prefix frontend run build` completes with 0 TypeScript and 0 build errors.
  - Chromium Browser Verification (`scripts/verify_stage4_browser.py`): Executed on Desktop (1280x800), Tablet (768x1024), and Mobile (375x667) viewports. Verified 0 console errors, 0 page errors, successful translation API round-trips, phrase-first idiom mapping, Hindi translation, Honesty Rule 2 unsupported warnings for UNICORN, feedback submission, and two-way workspace translation. 7 screenshots saved in `docs/screenshots/stage-4/`.

## WORKS BUT NEEDS EXTERNAL ASSET OR SERVICE
- **Rigged Humanoid 3D Asset (`avatar.glb`)**: The avatar viewer currently operates with a procedurally rigged development fallback mesh (`DevFallbackAvatar.tsx`) carrying an explicit `DEV FALLBACK RIG` watermark badge. Drop-in location `frontend/public/assets/models/avatar.glb` requires a production humanoid GLTF 2.0 asset conforming to the specifications in `docs/AVATAR_ASSETS.md` (ARKit 52 facial blendshapes, 5-finger articulated skeleton, neutral rest pose).
- **Certified ISL Motion Capture Animation Clips**: Animation clips currently utilize procedural joint kinematics for demo signs. Production requires studio motion capture or certified keyframe clips reviewed by an ISL linguist or Deaf native signer.
- **Production Mail Delivery & S3 Storage**: Currently utilizing local Mailpit SMTP (`localhost:1025`) and local MinIO; production requires external SMTP provider and production S3 bucket configuration.

## UNFINISHED
- Stage 5: OCR and video transcription to ISL (secure uploads, magic-byte checks, Tesseract OCR, ffmpeg audio extraction, faster-whisper transcription, sync timeline, async background jobs).
- Stage 6: Camera ISL landmark recognition to text (MediaPipe in browser, temporal buffer, model-serving interface).
- Stage 7: Admin dashboards, audit logging, vocabulary versioning, and security audits.
- Stage 8: Full test suites, production Docker, and deployment verification.

## EXACT NEXT TASK
Stage 5: OCR and video transcription to ISL pipeline. Await Casper's confirmation before creating branch `stage-5-ocr-video`, writing plan artifact, and implementing secure document/image OCR (Tesseract) and video audio transcription (ffmpeg + faster-whisper).
