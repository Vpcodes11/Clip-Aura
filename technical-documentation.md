# Clip Aura — Complete Technical Documentation

**Version:** Pre-1.0 (Pre-Production Audit)
**Date:** 2025-05-26
**Purpose:** Handoff documentation for engineers, security reviewers, DevOps teams, auditors, and enterprise clients.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Folder & Codebase Structure](#3-folder--codebase-structure)
4. [API Documentation](#4-api-documentation)
5. [Database & Storage](#5-database--storage)
6. [AI System Documentation](#6-ai-system-documentation)
7. [Background Job System](#7-background-job-system)
8. [Security Documentation](#8-security-documentation)
9. [DevOps & Deployment Guide](#9-devops--deployment-guide)
10. [Troubleshooting Guide](#10-troubleshooting-guide)
11. [Testing Documentation](#11-testing-documentation)
12. [Technical Debt & Future Improvements](#12-technical-debt--future-improvements)

---

## 1. Project Overview

### 1.1 What Clip Aura Does

Clip Aura is an AI-powered video clipping engine that transforms long-form video content (podcasts, streams, interviews, presentations) into short-form viral clips optimized for TikTok, Instagram Reels, and YouTube Shorts.

**Core workflow:**
1. User uploads a video (file or URL from YouTube/Twitch/Vimeo/etc.)
2. AI transcribes the audio using Whisper (Groq or OpenAI)
3. LLM analyzes the transcript and identifies the most viral-worthy moments
4. Clip boundaries are aligned to natural speech pauses
5. Clips are rendered with face-tracking dynamic cropping, animated karaoke captions, viral hook headlines, and optional B-roll overlay
6. Rendered clips are available for download or streaming

### 1.2 Target Users

- Content creators and influencers
- Podcasters and streamers
- Social media managers
- Marketing agencies
- Video editors looking for AI-assisted workflows

### 1.3 Business Model

- **Freemium SaaS** with tiered subscriptions via Stripe
- **Trial:** 60 one-time minutes
- **Pro:** $29/mo — 300 min/mo, 1080p export
- **Studio:** $69/mo — 900 min/mo, 1080p export
- **Agency:** $149/mo — 2400 min/mo, 4K export
- **Credit packs:** $15 per 60 additional minutes
- Role-based access: `user`, `beta`, `staff`, `admin`, `super_admin`

### 1.4 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend Framework** | FastAPI (Python 3.10+) |
| **WSGI Server** | Gunicorn + UvicornWorker (4 workers) |
| **Task Queue** | Celery (Redis broker/backend) |
| **Cache/Broker/PubSub** | Redis 7 Alpine |
| **Database** | SQLite (dev) / PostgreSQL via Supabase (prod) |
| **ORM** | SQLAlchemy |
| **Auth** | Supabase Auth (JWT-based) |
| **Payments** | Stripe |
| **AI Transcription** | Groq Whisper (`whisper-large-v3-turbo`), fallback OpenAI Whisper |
| **AI Analysis** | Groq LLaMA 3.1 8B (`llama-3.1-8b-instant`), fallback GPT-4o-mini |
| **Video Processing** | FFmpeg + FFprobe |
| **Face Tracking** | MediaPipe 0.10.11 + OpenCV |
| **Video Download** | yt-dlp |
| **Cloud Storage** | S3-compatible (boto3) — R2, AWS S3 |
| **B-Roll** | Pexels API |
| **Frontend** | Next.js 16 (React 19), Tailwind CSS 4, Framer Motion |
| **Containerization** | Docker + Docker Compose |
| **Observability** | Structured JSON logging, Sentry, OpenTelemetry |

---

## 2. High-Level Architecture

### 2.1 System Topology

```
┌───────────────────────────────────────────────────────────────┐
│                         INTERNET                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  Browser │  │  Stripe  │  │  Supabase │                   │
│  │ (Next.js)│  │ Webhooks │  │   Auth    │                   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
│       │              │              │                          │
│  ┌────┴──────────────┴──────────────┴─────────────────────┐  │
│  │              Reverse Proxy (nginx/Traefik)              │  │
│  │              TLS Termination, Rate Limiting              │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           │                                    │
│  ┌────────────────────────┴───────────────────────────────┐  │
│  │                 FastAPI (Gunicorn + Uvicorn)            │  │
│  │                 Port 8000, 4 Workers                    │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ Routes: /api/*, /health/*, /ws/*                  │  │  │
│  │  │ Auth: Supabase JWT verification                   │  │  │
│  │  │ Middleware: Logging, Security Headers, CORS       │  │  │
│  │  │ Rate Limiter: Redis-based, tiered                 │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └───────┬─────────────┬──────────────────┬──────────────┘  │
│          │             │                   │                  │
│  ┌───────┴──┐  ┌───────┴──────┐  ┌────────┴────────┐       │
│  │  Redis   │  │  PostgreSQL  │  │   S3/R2 Cloud   │       │
│  │  Cache   │  │  / SQLite    │  │     Storage     │       │
│  │  Broker  │  │   (Models)   │  │   (Optional)    │       │
│  │  Pub/Sub │  └──────────────┘  └─────────────────┘       │
│  └────┬─────┘                                                │
│       │                                                       │
│  ┌────┴──────────────────────────────────────────────────┐  │
│  │              Celery Worker (4 concurrent)              │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ Pipeline:                                       │  │  │
│  │  │  Preflight → Transcribe → Analyze → Align       │  │  │
│  │  │  → Render Clips (ThreadPoolExecutor)            │  │  │
│  │  │    ├─ Face Tracking (MediaPipe)                │  │  │
│  │  │    ├─ ASS Subtitles (karaoke animation)        │  │  │
│  │  │    ├─ FFmpeg Clip Generation                   │  │  │
│  │  │    └─ B-Roll Overlay (Pexels)                  │  │  │
│  │  │  → Cloud Upload → Usage Billing                │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  External AI Services:                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Groq    │  │  OpenAI  │  │  Pexels  │                  │
│  │ Whisper  │  │ GPT-4o   │  │  B-Roll  │                  │
│  │ + LLaMA  │  │  +Whisper│  │   API    │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow: Video Processing Pipeline

```
User Upload/URL
    │
    ▼
┌─────────────────┐
│  POST /api/upload │  Create Job (status=queued)
└────────┬────────┘  save video to disk
         │            dispatch Celery task
         ▼
┌─────────────────┐
│  1. PREFLIGHT    │  ffprobe validation
│  stage=preflighted│  check video/audio streams, duration
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. TRANSCRIBE   │  Extract audio → chunk if >25MB
│  stage=transcribed│  Groq/OpenAI Whisper → word timestamps
│  persist: JSON    │  Fallback: OpenAI on rate limit
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. ANALYZE      │  Chunk transcript (400 words/chunk)
│  stage=analyzed  │  Groq LLaMA / GPT-4o-mini → viral clips
│  persist: JSON    │  Fallback: OpenAI, then deterministic
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. ALIGN        │  Snap LLM boundaries to silence points
│  stage=aligned   │  Update clip start/end times
└────────┬────────┘
         │
         ▼
┌─────────────────┐  ThreadPoolExecutor(max_workers=4)
│  5. RENDER CLIPS │  ┌──────────────────────────┐
│  stage=rendering │  │ Face Tracking (MediaPipe) │
│  → clips_rendered│  │ → dynamic crop coordinates│
│                  │  │ → Gaussian smoothing      │
│                  │  │ → FFmpeg sendcmd filter   │
│                  │  └──────────────────────────┘
│                  │  ┌──────────────────────────┐
│                  │  │ ASS Subtitle Generation  │
│                  │  │ → hook headline (5s fade)│
│                  │  │ → word-by-word karaoke   │
│                  │  │ → emoji injection        │
│                  │  │ → watermark overlay      │
│                  │  └──────────────────────────┘
│                  │  ┌──────────────────────────┐
│                  │  │ FFmpeg Clip Render       │
│                  │  │ → dynamic panning crop   │
│                  │  │ → subtitle burn-in       │
│                  │  │ → B-roll overlay (opt)   │
│                  │  │ → thumbnail generation   │
│                  │  └──────────────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  6. FINALIZE     │  Cloud upload (if S3 configured)
│  stage=complete  │  Usage billing (charge minutes)
│  status=complete │  WebSocket → broadcast complete
└─────────────────┘
```

### 2.3 Authentication Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│ Frontend │         │  Supabase │         │  Backend  │
│ (Next.js)│         │   Auth    │         │ (FastAPI) │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                     │                     │
     │ signInWithPassword  │                     │
     │────────────────────▶│                     │
     │                     │                     │
     │  access_token +     │                     │
     │  refresh_token      │                     │
     │◀────────────────────│                     │
     │                     │                     │
     │ Set session hint    │                     │
     │ cookie              │                     │
     │                     │                     │
     │ authenticatedFetch  │                     │
     │ Bearer {token}      │                     │
     │─────────────────────────────────────────▶│
     │                     │                     │
     │                     │ supabase.auth       │
     │                     │ .get_user(token)    │
     │                     │◀────────────────────│
     │                     │                     │
     │                     │   user_id, email    │
     │                     │────────────────────▶│
     │                     │                     │
     │                     │       Query local   │
     │                     │       User table    │
     │                     │  (auto-create if    │
     │                     │   not exists)       │
     │                     │                     │
     │   JSON Response     │                     │
     │◀─────────────────────────────────────────│
```

### 2.4 Billing Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │     │  Backend  │     │  Stripe  │     │  Webhook │
│          │     │ (FastAPI) │     │   API    │     │  Handler │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                  │
     │ Create checkout│                │                  │
     │ session request│                │                  │
     │───────────────▶│                │                  │
     │                │ Create session │                  │
     │                │───────────────▶│                  │
     │                │                │                  │
     │                │  session URL   │                  │
     │                │◀───────────────│                  │
     │                │                │                  │
     │ Redirect URL   │                │                  │
     │◀───────────────│                │                  │
     │                │                │                  │
     │ Complete checkout in Stripe     │                  │
     │────────────────────────────────▶│                  │
     │                │                │                  │
     │                │                │ checkout.session │
     │                │                │ .completed       │
     │                │                │─────────────────▶│
     │                │                │                  │
     │                │                │   Verify sig     │
     │                │                │   Idempotency    │
     │                │                │   Update User:   │
     │                │                │   - tier          │
     │                │                │   - minutes       │
     │                │                │   - subscription  │
```

**⚠️ CRITICAL NOTE:** The Stripe webhook handler code does not yet exist in the codebase. This is the highest-priority pre-launch fix. See Section 8.4.

---

## 3. Folder & Codebase Structure

### 3.1 Root Directory

```
Clip Aura/
├── app/                    # Backend application code
│   ├── api/                # FastAPI web layer
│   │   ├── main.py         # ALL routes, WebSocket handler, CORS (1084 lines)
│   │   ├── auth.py         # Supabase JWT verification, user dependencies
│   │   ├── database.py     # SQLAlchemy engine, session, connection pool
│   │   ├── middleware.py   # Request logging, correlation IDs, security headers
│   │   ├── rate_limiter.py # Redis-based rate limiter (tiered, fail-closed)
│   │   ├── payments.py     # Stripe billing status endpoint
│   │   ├── admin.py        # Admin API: role/plan/feature-flag management
│   │   └── schema_compat.py# SQLite ALTER TABLE migration helper
│   │
│   ├── core/               # Business logic and processing
│   │   ├── analyzer.py     # LLM transcript analysis → clip detection
│   │   ├── broll.py        # Pexels B-roll overlay
│   │   ├── circuit_breaker.py # Redis-based AI provider circuit breaker
│   │   ├── config.py       # All application config, startup validation
│   │   ├── clipper.py      # FFmpeg clip rendering (in app/rendering/)
│   │   ├── cut_aligner.py  # Snap clip boundaries to silence
│   │   ├── downloader.py   # yt-dlp wrapper for URL downloads
│   │   ├── face_processor.py # MediaPipe face tracking (in app/tracking/)
│   │   ├── logging_config.py # Structured JSON logging, Sentry, OTel
│   │   ├── plans.py        # Plan tier definitions, minute allocation
│   │   ├── preflight.py    # Source video validation
│   │   ├── storage.py      # S3/R2 cloud storage abstraction
│   │   └── transcriber.py  # Whisper transcription (in app/subtitles/)
│   │
│   ├── workers/            # Celery task system
│   │   ├── celery_app.py   # Celery instance configuration
│   │   ├── tasks.py        # Pipeline orchestrator (433 lines)
│   │   └── recover.py      # Job recovery helpers
│   │
│   ├── models/             # SQLAlchemy database models
│   │   └── models.py       # User, Job, StripeEvent, LeadSubmission, AuditLog, UsageRecord
│   │
│   ├── security/           # Authorization
│   │   └── rbac.py         # Role hierarchy, permissions, audit logging
│   │
│   ├── services/           # Service layer (partially populated)
│   │   ├── credits.py      # Credit enforcement, usage tracking
│   │   └── feature_flags.py # Plan/role-gated feature flags
│   │
│   └── schemas/            # Pydantic schemas (empty — to be populated)
│
├── frontend/               # Next.js 16 frontend
│   ├── app/                # App Router pages
│   │   ├── page.tsx        # Landing page
│   │   ├── layout.tsx      # Root layout, metadata, fonts
│   │   ├── globals.css     # Tailwind imports, custom styles
│   │   ├── dashboard/      # Dashboard (1432 lines)
│   │   ├── login/          # Login page
│   │   ├── pricing/        # Pricing page
│   │   ├── demo/           # Demo page
│   │   ├── contact/        # Contact form
│   │   ├── terms/          # Terms of service
│   │   ├── privacy-policy/ # Privacy policy
│   │   ├── refund-policy/  # Refund policy
│   │   └── sitemap.ts      # SEO sitemap
│   │
│   ├── components/         # React components
│   │   ├── UploadModal.tsx  # Video upload (873 lines)
│   │   ├── EditorModal.tsx  # Clip editor (1087 lines)
│   │   ├── ExportModal.tsx  # Clip export (635 lines)
│   │   ├── ErrorBoundary.tsx# Error boundary wrapper
│   │   └── Footer.tsx       # Site footer
│   │
│   ├── lib/                # Frontend utilities
│   │   ├── supabase.ts     # Supabase client + authenticatedFetch
│   │   └── AuthContext.tsx  # React auth context provider
│   │
│   ├── middleware.ts        # Route protection, security headers
│   ├── next.config.ts       # Next.js configuration
│   └── package.json         # Frontend dependencies
│
├── data/                   # Container for database files (empty in repo)
├── docs/                   # Operational documentation
│   ├── DEPLOYMENT_RUNBOOK.md
│   ├── DEVELOPER_GUIDE.md
│   ├── INCIDENT_RESPONSE.md
│   ├── KNOWN_LIMITATIONS.md
│   ├── SECURITY_CHECKLIST.md
│   ├── STRIPE_PRODUCTION_SETUP.md
│   ├── SUPABASE_MIGRATION_RUNBOOK.md
│   ├── TECH_DEBT_REGISTER.md
│   └── USER_FLOW.md
│
├── output/                 # Deprecated — use runtime/renders/
├── runtime/                # Docker volume mount target
│   ├── uploads/            # User video uploads
│   ├── renders/            # Generated clips
│   ├── temp/               # Temporary processing files
│   └── db/                 # SQLite database (dev)
│
├── scripts/                # Dev ops and utility scripts
│   ├── dev.ps1             # PowerShell dev helper
│   ├── smoke_test.py       # Health check smoke test
│   ├── check_env_contract.py # Pre-deploy env validation
│   └── retry_job.py        # Manual job retry with DB reset
│
├── supabase/               # PostgreSQL migrations
│   └── migrations/         # 3 migration files (timestamped)
│
├── tests/                  # Automated tests (pytest)
├── uploads/                # Mount target (empty)
├── temp/                   # Mount target (empty)
│
├── Dockerfile              # Container build
├── docker-compose.yml      # Redis + web + worker orchestration
├── .env.example            # Development env template
├── .env.production.example # Production env template
├── .gitignore              # Git exclusions
├── .dockerignore           # Docker build exclusions
├── .gitleaks.toml          # Secret scanning config
├── .pre-commit-config.yaml # Pre-commit hooks
├── requirements.txt        # Python dependencies
└── README.md               # Project README
```

### 3.2 Service Boundaries

| Component | Responsibility | Dependencies |
|-----------|---------------|--------------|
| `app/api/` | HTTP routing, auth, validation, response | `app/core/`, `app/models/`, `app/security/` |
| `app/core/` | Business logic, AI integration, video processing | `app/config.py`, external APIs |
| `app/workers/` | Background job orchestration, Celery tasks | `app/core/`, `app/models/`, `app/config.py` |
| `app/models/` | Database schema, ORM definitions | SQLAlchemy |
| `app/security/` | RBAC, audit logging | `app/models/` |
| `app/services/` | Domain services (credits, feature flags) | `app/models/` |
| `frontend/` | User interface, client state | Backend API, Supabase Auth |

---

## 4. API Documentation

### 4.1 Authentication

All protected endpoints require: `Authorization: Bearer {supabase_access_token}`

- Tokens are verified server-side via Supabase `auth.get_user(token)`
- Frontend attaches token via `authenticatedFetch()` wrapper
- WebSocket: token passed as query parameter (`?token=`) — ⚠️ **Should be migrated to header-based auth**

### 4.2 Public Endpoints

#### `GET /` — Root Health

```
Response 200: {"status": "ok", "service": "Clip Aura"}
```

#### `GET /health/live` — Kubernetes Liveness Probe

```
Response 200: {"status": "ok"}
```

#### `GET /health/ready` — Readiness Probe

```
Response 200: {"status": "ok", "database": "connected", "redis": "connected"}
Response 503: {"status": "unhealthy", "detail": "..."}
```
Checks: Database connectivity + Redis ping.

#### `GET /api/health` — Detailed Health

```
Response 200: {"status": "healthy", "database": "connected", "redis": "connected", "celery": "connected"}
Response 200: {"status": "degraded", ..., "celery": "unreachable"}
```
Checks: Database, Redis, Celery worker availability.

#### `GET /api/presets` — Available Presets & Caption Styles

```
Response 200: {"presets": {...}, "caption_styles": [...]}
```
Returns all available video presets and caption styles with labels.

#### `POST /api/waitlist` — Join Waitlist

```
Auth: None (IP rate-limited: 3/hour)
Request: {"email": "user@example.com", "name": "John"}
Response 200: {"message": "You're on the list!"}
Response 429: Rate limited
```
Validates: email format, name ≥ 2 chars. IP hash stored with salt.

#### `POST /api/contact` — Contact Form

```
Auth: None (IP rate-limited: 3/hour)
Request: {"email": "user@example.com", "name": "John", "message": "Hello..."}
Response 200: {"message": "Message received!"}
Response 429: Rate limited
```
Validates: name ≥ 2 chars, message ≥ 10 chars, truncated to 120/4000 chars.

### 4.3 Authenticated Endpoints

All require: `Authorization: Bearer {token}` + beta access + active trial

#### `GET /api/me` — Current User

```
Response 200: {
    "id": "uuid",
    "email": "user@example.com",
    "subscription_tier": "pro",
    "total_minutes_limit": 300,
    "used_minutes": 45,
    "rollover_credits": 0,
    "role": "user",
    "is_beta_user": true,
    "feature_flags": {...}
}
```

#### `POST /api/upload` — Upload Video

```
Auth: Bearer (rate-limited: 5/min)
Content-Type: multipart/form-data
Fields:
  - file: video file (optional if source_url provided)
  - source_url: URL string (optional if file provided)
  - preset: "tiktok"|"youtube_shorts"|"square"|"landscape"|"tiktok_4k"|...
  - caption_style: "tiktok"|"minimal"|"viral"|"bold_impact"|"neon_pulse"|...
  - provider: "groq"|"openai" (optional, default: groq)

Response 200: {
    "job_id": "uuid",
    "status": "queued",
    "message": "Job created. Processing started."
}
Response 400: Invalid preset/caption style
Response 413: File exceeds max upload size
Response 429: Rate limited

Security:
  - File extension whitelist: .mp4, .mov, .avi, .mkv, .webm
  - Max file size: 2GB default (configurable)
  - URL passed through is_safe_url() SSRF protection
  - Filename sanitized via sanitize_filename()
```

#### `GET /api/jobs` — List User's Jobs

```
Response 200: [{
    "id": "uuid",
    "status": "processing",
    "stage": "transcribed",
    "progress": 45,
    "message": "Analyzing transcript...",
    "source": "filename.mp4",
    "preset": "tiktok",
    "caption_style": "viral",
    "provider": "groq",
    "clips": [...],
    "errors": [...],
    "created_at": "2025-05-26T12:00:00Z"
}]
```
Returns all jobs for authenticated user, ordered by created_at DESC.

#### `GET /api/status/{job_id}` — Poll Job Progress

```
Response 200: {
    "id": "uuid",
    "status": "processing",
    "stage": "rendering",
    "progress": 75,
    "message": "Rendering clip 2/4...",
    "clips": [...],
    "errors": [...]
}
Response 403: Job belongs to different user
Response 404: Job not found

Preferred over polling: WebSocket /ws/{job_id}
```

#### `GET /api/preview-url/{job_id}/{filename}` — Get Signed Preview URL

```
Response 200: {
    "preview_url": "/api/preview/job_id/clip_1.mp4?token=...&expires=..."
}
```
Generates HMAC-SHA256 signed URL with 15-minute TTL. Bound to job_id, filename, user_id, and expiration.

#### `GET /api/preview/{job_id}/{filename}` — Stream Preview Clip

```
Auth: Signed URL token (not Bearer)
Response 200: Video file stream
Response 403: Invalid/expired signature
```
Streams clip file. Accessible via signed URL only, no auth header required.

#### `GET /api/download/{job_id}/{filename}` — Download Clip

```
Auth: Bearer
Response 200: Video file download
Response 403: Not your job
Response 404: File not found

⚠️ No rate limit — bandwidth abuse vector
```

#### `DELETE /api/job/{job_id}` — Delete Job

```
Auth: Bearer
Response 200: {"message": "Job deleted"}
Response 403: Not your job
Response 404: Not found
```
Deletes job record and associated files from disk/cloud.

#### `POST /api/job/{job_id}/retry` — Retry Failed Job

```
Auth: Bearer
Response 200: {"message": "Job re-queued", "job_id": "uuid", "status": "queued"}
Response 409: Only failed/partial jobs can be retried
Response 403: Not your job

⚠️ No rate limit — CPU abuse vector
```
Resets job to appropriate checkpoint and re-queues Celery task.

#### `POST /api/clip/edit` — Edit Clip Caption & Re-render

```
Auth: Bearer (⚠️ No rate limit)
Request: {
    "job_id": "uuid",
    "clip_index": 0,
    "title": "New Title",
    "hook_caption": "NEW HOOK TEXT",
    "caption_style": "viral",
    "words": [
        {"word": "Hello", "start": 0.5, "end": 1.2},
        ...
    ]
}
Response 200: {"message": "Regeneration started"}
Response 409: Another edit in progress (optimistic lock)
Response 400: Invalid caption style

⚠️ title and hook_caption have no max length
⚠️ word text not validated for ASS format safety
```

#### `GET /api/billing/status` — Billing Status

```
Auth: Bearer
Response 200: {
    "subscription_tier": "pro",
    "total_minutes_limit": 300,
    "used_minutes": 45,
    "rollover_credits": 10,
    "features": {...}
}
```

### 4.4 Admin Endpoints

All require: `Authorization: Bearer {token}` + `manage_users` or `manage_feature_flags` permission

#### `PATCH /api/admin/users/{id}/role` — Change User Role

```
Auth: Bearer + manage_users permission
Request: {"role": "admin"}
Response 200: {"message": "Role updated", "user": {...}}
Response 403: Insufficient permissions (can_modify_role check)
```
Audit logged. Cannot self-promote. Only super_admin can assign super_admin.

#### `PATCH /api/admin/users/{id}/plan` — Change User Plan

```
Auth: Bearer + manage_users permission
Request: {"plan": "studio"}
Response 200: {"message": "Plan updated", "user": {...}}
Response 403: Cannot modify super_admin's plan without super_admin role
```
⚠️ No full role-based plan modification restriction — admin can modify another admin.

#### `PATCH /api/admin/users/{id}/feature-flags` — Toggle Feature Flags

```
Auth: Bearer + manage_feature_flags permission
Request: {"unlimited_generation": true}
Response 200: {"message": "Feature flags updated", "user": {...}}
```

### 4.5 WebSocket Events

#### Connection: `WS /ws/{job_id}?token={access_token}`

**⚠️ Token in query string — will be logged by proxies. Should use post-connect auth message.**

```
→ Client connects with token query parameter
← Server validates token, beta access, trial status, job ownership
← On auth failure: close with code 1008 (Policy Violation)

Server → Client messages:

{"type": "progress", "stage": "transcribing", "progress": 25, "message": "Transcribing audio..."}
{"type": "progress", "stage": "analyzing", "progress": 50, "message": "Finding viral moments..."}
{"type": "progress", "stage": "rendering", "progress": 75, "message": "Rendering clip 1/3..."}
{"type": "progress", "stage": "complete", "progress": 100, ...}
{"type": "complete", "message": "Done! 3 viral clips created.", "clips": [...]}
{"type": "error", "message": "Transcription failed", "errors": [...]}

Client → Server:
No client-to-server messages are currently handled.
```

### 4.6 Common Error Responses

| Status | When | Response Body |
|--------|------|---------------|
| 400 | Invalid input | `{"detail": "..."}` |
| 401 | Missing/invalid token | `{"detail": "Not authenticated"}` |
| 403 | Insufficient permissions | `{"detail": "..."}` |
| 404 | Resource not found | `{"detail": "Not found"}` |
| 409 | Conflict (e.g., concurrent edit) | `{"detail": "..."}` |
| 413 | File too large | `{"detail": "Upload exceeds maximum allowed size."}` |
| 429 | Rate limited | `{"detail": "Too many requests", "retry_after": 60}` |
| 500 | Internal error | `{"detail": "Internal Server Error"}` |
| 503 | Service unavailable | `{"detail": "Service temporarily unavailable"}` |

---

## 5. Database & Storage

### 5.1 Environment Support

| Environment | Database | Connection |
|-------------|----------|------------|
| Development | SQLite (WAL mode, NORMAL synchronous) | `runtime/db/clip_aura.db` |
| Production | PostgreSQL via Supabase | `DATABASE_URL` env var |

### 5.2 Schema

#### `users` — User Accounts

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Supabase user ID |
| `email` | String(unique) | User email |
| `stripe_customer_id` | String | Stripe customer reference |
| `stripe_subscription_id` | String | Active subscription ID |
| `subscription_tier` | String | `trial`, `pro`, `studio`, `agency` |
| `role` | String | `user`, `beta`, `staff`, `admin`, `super_admin` |
| `total_minutes_limit` | Integer | Minutes allowed per billing period |
| `used_minutes` | Integer | Minutes consumed this period |
| `rollover_credits` | Integer | Purchased credit pack minutes |
| `credits_remaining` | Integer | ⚠️ Stale — not decremented on spend |
| `monthly_credit_limit` | Integer | ⚠️ Stale — not used in enforcement |
| `is_beta_user` | Boolean | Beta access flag |
| `feature_flags` | JSON | Per-user feature overrides |
| `is_internal_account` | Boolean | Internal team flag |
| `trial_end` | DateTime | Trial expiration |
| `next_billing_date` | DateTime | ⚠️ May not be populated |
| `created_at` | DateTime | Account creation |
| `updated_at` | DateTime | Last modification |

**⚠️ Dual credit systems:** `credits_remaining`/`monthly_credit_limit` are set once at user creation and never updated. Only `used_minutes`/`total_minutes_limit`/`rollover_credits` are actually used for enforcement. The stale columns should be dropped.

#### `jobs` — Video Processing Jobs

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Job identifier |
| `user_id` | UUID (FK→users) | ⚠️ **No index — MUST ADD** |
| `status` | String | `queued`, `processing`, `complete`, `error` |
| `stage` | String | Pipeline checkpoint: `queued`, `preflighted`, `transcribed`, `analyzed`, `aligned`, `rendering`, `rendered`, `complete` |
| `progress` | Integer | 0-100 percentage |
| `message` | String | Human-readable status |
| `video_path` | String | Path to uploaded source video |
| `source` | String | Original filename or URL |
| `provider` | String | AI provider: `groq`, `openai` |
| `preset` | String | Video resolution preset |
| `caption_style` | String | Subtitle style key |
| `transcript` | JSON | Whisper output: `{words: [{word, start, end}, ...]}` |
| `clip_candidates` | JSON | LLM output: `{clips: [{title, hook_caption, start_time, end_time, ...}]}` |
| `clips` | JSON | Rendered results: `[{filename, thumbnail, title, ...}]` |
| `errors` | JSON | Error log: `[{stage, message, clip_index, detail}]` |
| `usage_minutes_charged` | Integer | Minutes billed for this job |
| `created_at` | DateTime | Job creation |
| `updated_at` | DateTime | Last update |

**Indexes needed:** `jobs.user_id` (critical), `jobs.created_at` (for ordering), `jobs.status` (for filtering).

#### `stripe_events` — Idempotency Tracking

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `event_id` | String(unique) | Stripe event ID |
| `event_type` | String | Stripe event type name |
| `created_at` | DateTime | Record creation |

#### `lead_submissions` — Waitlist/Contact

| Column | Type |
|--------|------|
| `id` | UUID (PK) |
| `kind` | String: `waitlist`, `contact` |
| `email` | String |
| `name` | String |
| `message` | Text |
| `ip_hash` | String (indexed) |
| `created_at` | DateTime |

#### `audit_logs` — Authorization Audit Trail

| Column | Type |
|--------|------|
| `id` | UUID (PK) |
| `actor_user_id` | UUID (indexed) |
| `target_user_id` | UUID (indexed) |
| `action` | String (indexed) |
| `metadata_json` | JSON |
| `ip_address` | String |
| `created_at` | DateTime (indexed) |

Composite index: `(action, created_at)`.

#### `usage_records` — Billing Audit Trail

| Column | Type |
|--------|------|
| `id` | UUID (PK) |
| `user_id` | UUID (FK→users) |
| `job_id` | UUID (FK→jobs) |
| `minutes` | Integer |
| `plan_spent` | Integer |
| `credit_spent` | Integer |
| `enforcement_skipped` | Boolean |
| `reason` | String |
| `created_at` | DateTime |

Composite index: `(user_id, created_at)`.

### 5.3 Redis Usage

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `rate_limit:*` | Rate limiter windows | Window duration |
| `circuit_breaker:groq:*` | AI provider failure tracking | 60s cooldown |
| `stripe:idempotency:*` | Webhook deduplication | 7 days |
| `job_progress:{job_id}` | WebSocket Pub/Sub channel | None (ephemeral) |
| Celery broker keys | Task queue, results | Task lifetime |

### 5.4 File Storage

**Local:** `runtime/uploads/` (source videos), `runtime/renders/` (output clips), `runtime/temp/` (processing)

**Cloud (optional):** S3-compatible storage via boto3, activated by `STORAGE_MODE=cloud` and `S3_*` env vars. Stores clips at `jobs/{job_id}/clip_{i}.mp4` and thumbnails at `jobs/{job_id}/thumb_{i}.jpg`.

### 5.5 Indexing Strategy

**Critical missing index:**
```sql
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
```

**Recommended additional indexes:**
```sql
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
```

### 5.6 Connection Pooling

**PostgreSQL:**
```python
pool_size=10, max_overflow=20, pool_recycle=3600
# ⚠️ Missing pool_pre_ping=True
```

**SQLite:**
```python
check_same_thread=False, timeout=30
# WAL mode + NORMAL synchronous set via pragma
```

---

## 6. AI System Documentation

### 6.1 AI Providers

| Provider | Model | Purpose | Endpoint |
|----------|-------|---------|----------|
| Groq | `whisper-large-v3-turbo` | Audio transcription | OpenAI-compatible API |
| Groq | `llama-3.1-8b-instant` | Viral moment analysis | OpenAI-compatible API |
| OpenAI | `whisper-1` | Fallback transcription | Standard API |
| OpenAI | `gpt-4o-mini` | Fallback analysis | Standard API |

Both providers accessed via OpenAI Python SDK with custom `base_url` for Groq.

### 6.2 Circuit Breaker

**File:** `app/core/circuit_breaker.py`

Tracks consecutive failures per provider in Redis:
- **5 consecutive failures** → Circuit OPENS → All calls auto-fallback to alternate provider
- **60-second cooldown** → Circuit HALF-OPEN → Next call is a probe
- Probe succeeds → Circuit CLOSES (resume using primary provider)
- Probe fails → Circuit re-OPENS (continue using fallback)

The `_wrap_ai_call()` function transparently wraps all AI API calls with circuit breaker logic.

### 6.3 Transcription Flow

1. Extract audio from source video using FFmpeg (`-vn -acodec pcm_s16le`)
2. If audio file > 24MB (Whisper limit), chunk into segments
3. Send each chunk to Groq Whisper with word-level timestamps (`timestamp_granularities=["word"]`)
4. On rate limit (429) → circuit breaker increments failure count
5. On circuit open → fallback to OpenAI Whisper
6. Merge chunk results, return `{words: [{word, start, end, confidence}, ...]}`

### 6.4 Analysis Flow (LLM)

1. Chunk transcript into segments of 400 words (~550 tokens each)
2. For each chunk, construct prompt:
   - **System prompt:** Viral Content Strategist persona with selection criteria (controversy, emotion, value, humor, cliffhangers)
   - **User prompt:** Raw transcript text + JSON output format specification
3. Send to Groq LLaMA / GPT-4o-mini with `response_format={"type": "json_object"}`
4. Parse response: extract JSON, strip markdown fences, find JSON boundaries
5. Validate each clip:
   - `start_time`, `end_time` clamped to video duration
   - Minimum 2s clip length
   - `virality_score` clamped to 0.0-10.0
   - `hashtags` cast to strings, filtered
6. If total failure (no valid clips from any chunk) → deterministic fallback clips
7. Aggregate valid clips from all chunks (max 8)

### 6.5 AI Safety Considerations

**⚠️ Current gaps (critical pre-launch fixes needed):**

1. **No prompt injection guard:** Raw transcript injected verbatim into LLM prompt without delimiters or instruction hierarchy
2. **No content moderation:** Zero safety checks on input or output content
3. **ASS format injection:** LLM-generated text unescaped in subtitle files
4. **System prompt encourages extremes:** Explicitly instructs LLM to prioritize controversial content

### 6.6 ASS Subtitle Generation

**File:** `app/rendering/clipper.py` — `generate_ass_subtitles()`

1. Generate ASS file header with script info, resolution, styles
2. Add hook headline (5-second fade-in at top): `{\fad(200,200) \an8}{HOOK_TEXT}`
3. Group words into 2-3 word phrases (configurable by caption style)
4. For each word: apply karaoke timing `{\k{duration_cs}}`, POWER_WORDS get emoji injection
5. Apply per-style formatting: font, colors, outline, shadow, alignment, margins

**⚠️ Characters `{`, `}`, `\` in word text or LLM output will corrupt the ASS format. These MUST be escaped before insertion.**

### 6.7 Cost Considerations

- **Chunk-based processing:** ~22 LLM calls for a 60-minute video
- **No per-user token budget:** No daily/monthly AI API spend caps
- **No per-job cost tracking:** AI token usage not measured
- **Circuit breaker prevents retry storms** but doesn't limit initial spend
- **GROQ_API_KEY** used for both Whisper and LLM calls

---

## 7. Background Job System

### 7.1 Celery Architecture

```
┌─────────────────────────────────────────┐
│              Redis Broker                │
│  ┌─────────────────────────────────┐    │
│  │  Default Queue                   │    │
│  │  ┌───────────┐ ┌──────────────┐ │    │
│  │  │ Task 1    │ │ Task 2       │ │    │
│  │  │ process_  │ │ download_    │ │    │
│  │  │ video_job │ │ and_process  │ │    │
│  │  └───────────┘ └──────────────┘ │    │
│  └─────────────────────────────────┘    │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │   Celery Worker (4x)    │
    │   max-tasks-per-child=10│
    │   soft-limit=540s       │
    │   hard-limit=600s       │
    │                         │
    │   process_video_job()   │
    │   ┌──────────────────┐  │
    │   │ preflight        │  │
    │   │ transcribe       │  │
    │   │ analyze          │  │
    │   │ align            │  │
    │   │ render (T.P.E)   │  │
    │   │ finalize         │  │
    │   └──────────────────┘  │
    │                         │
    │   Checkpoints: DB stage │
    │   column after each step│
    └─────────────────────────┘
```

### 7.2 Celery Configuration

```python
# app/workers/celery_app.py
celery_app = Celery(
    "clip_aura",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.workers.tasks"]
)

# Settings
task_serializer = "json"
accept_content = ["json"]
result_serializer = "json"
timezone = "UTC"
# ⚠️ task_acks_late = False (default) — task lost on worker crash
# ⚠️ No task_track_started, no worker_prefetch_multiplier override
```

### 7.3 Task Retry Policy

```python
@celery_app.task(
    autoretry_for=(RedisError, TimeoutError, ConnectionError, OSError, AIServiceError),
    retry_backoff=True,    # Exponential backoff
    retry_jitter=True,     # Random jitter
    retry_kwargs={"max_retries": 3},
)
```

- Max 3 retries with exponential backoff + jitter
- Retries go back to the same queue (no dead-letter queue)
- `AIServiceError` triggers retry; circuit breaker provides additional protection

### 7.4 Job Checkpointing (Idempotency)

Each pipeline stage persists results to the database immediately:

```python
# Stage persistence pattern:
if job.stage in complete_or_resume_stages and job.transcript:
    transcript_data = job.transcript  # Skip transcription
else:
    transcript_data = run_transcription()
    job.stage = STAGE_TRANSCRIBED
    job.transcript = transcript_data
    db.commit()  # Persist immediately
```

This enables:
- **Crash recovery:** Task re-queued → resumes from last checkpoint
- **Manual retry:** `POST /api/job/{id}/retry` resets to appropriate checkpoint
- **No duplicate AI calls:** Already-computed results reused

### 7.5 Concurrent Clip Rendering

```python
with ThreadPoolExecutor(max_workers=min(4, os.cpu_count() or 1)) as executor:
    futures = {}
    for i, clip_info in enumerate(clips_info):
        future = executor.submit(safe_create_clip, ...)
        futures[future] = (i, clip_info)
```

- 4 parallel FFmpeg processes (I/O-bound, release GIL)
- Each clip writes to distinct output file
- Individual failures caught per-clip; job succeeds if ≥1 clip renders

### 7.6 Usage Billing

```python
if user and int(job.usage_minutes_charged or 0) <= 0:
    user = db.query(User).filter(User.id == user.id).with_for_update().one()
    record_usage(db, user, minutes_used, job_id=job_id, reason="completed_render")
    job.usage_minutes_charged = minutes_used
```

⚠️ **Race condition:** The `usage_minutes_charged` guard is checked BEFORE the `FOR UPDATE` lock is acquired on the job row. Two concurrent tasks could both pass the guard. Fix: acquire `FOR UPDATE` on job row first, then check the guard.

### 7.7 Worker Lifecycle

- **Recycle:** `--max-tasks-per-child=10` — prevents memory leaks
- **Concurrency:** 4 worker processes per container
- **Time limits:** 540s soft, 600s hard
- **Graceful shutdown:** Default Celery SIGTERM behavior (wait for running tasks)
- **Prefetch:** Default of 4 with concurrency=4
- **⚠️ Task loss risk:** `task_acks_late=False` — unacknowledged tasks lost on worker crash

### 7.8 Queue Architecture

**Single flat queue** — no prioritization or routing. Two task types:
- `tasks.process_video_job` — main pipeline
- `tasks.download_and_process_job` — URL download then pipeline

⚠️ A long-running job blocks all shorter jobs. Consider separate queues for download vs process.

---

## 8. Security Documentation

### 8.1 Authentication Model

- **External auth provider:** Supabase Auth (JWT-based)
- **Token verification:** Server-side via `supabase.auth.get_user(token)` — never parsed locally
- **Token storage:** Frontend via Supabase JS SDK (`@supabase/supabase-js`)
- **Token refresh:** Client-side automatic via Supabase SDK
- **Token lifetime:** Default 1-hour expiry (Supabase default)
- **Session management:** `clipaura_session_hint` cookie for middleware routing

### 8.2 Authorization Model (RBAC)

**Five-tier role hierarchy:**
```
user < beta < staff < admin < super_admin
```

**Permission system:**

| Permission | Description | Default Roles |
|------------|-------------|---------------|
| `manage_users` | Modify user roles/plans | staff, admin, super_admin |
| `manage_feature_flags` | Toggle feature flags | admin, super_admin |
| `view_admin_dashboard` | Access admin panel | staff, admin, super_admin |
| `unlimited_generation` | Bypass credit limits | staff, admin, super_admin |
| `experimental_rendering` | Beta features | beta, staff, admin, super_admin |
| `internal_dashboard` | Internal tools | staff, admin, super_admin |
| `beta_ai_model` | Experimental AI models | beta, staff, admin, super_admin |
| `admin_tools` | Administrative tools | admin, super_admin |

**Role modification guards:**
- Cannot assign role higher than own role
- Cannot self-promote
- Only super_admin can assign super_admin
- All role changes are audit logged

### 8.3 Rate Limiting Strategy

**⚠️ Current implementation is incomplete.** The robust `rate_limiter.py` module is not wired to endpoints. See Audit Report for details.

**Intended tiers:**
- `strict`: 3 requests/minute
- `standard`: 30 requests/minute
- `moderate`: 60 requests/minute
- `generous`: 120 requests/minute

**Scopes:**
- IP-based for public endpoints
- User-based for authenticated endpoints

### 8.4 Stripe Webhook Security (Critical Pre-Launch Fix)

**⚠️ Webhook handler code does not exist.** Required implementation:

```python
@app.post("/api/billing/webhook")
async def stripe_webhook(request: Request):
    # 1. Verify signature: stripe.Webhook.construct_event(payload, sig_header, secret)
    # 2. Idempotency: check stripe_events table, Redis SET NX
    # 3. Handle events:
    #    - checkout.session.completed → activate subscription, set plan
    #    - customer.subscription.updated → update plan/limits
    #    - customer.subscription.deleted → downgrade to trial/free
    #    - invoice.payment_failed → mark past_due, notify
    # 4. Response: 200 OK to Stripe
```

### 8.5 Preview URL Signing

```
URL structure: /api/preview/{job_id}/{filename}?token={hmac}&expires={timestamp}

Token = HMAC-SHA256(
    PREVIEW_SIGNING_SECRET,
    f"{job_id}:{filename}:{user_id}:{expires}"
)

Validation:
  1. expires timestamp not in past (15-min TTL)
  2. HMAC matches computed signature (timing-safe hmac.compare_digest)
  3. filename passes path traversal checks
```

### 8.6 SSRF Protection

`is_safe_url()` in `main.py`:
1. Parses URL, rejects non-http/https schemes
2. Resolves hostname via `socket.getaddrinfo()`
3. Checks ALL resolved IPs against:
   - Private (RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
   - Loopback: 127.0.0.0/8, ::1
   - Link-local: 169.254.0.0/16
   - Reserved: 0.0.0.0/8, 240.0.0.0/4
   - Multicast: 224.0.0.0/4
4. ⚠️ DNS rebinding race: check at request time, download resolves again later

### 8.7 Path Traversal Prevention

```python
def resolve_job_file(directory: Path, filename: str) -> Path:
    safe_name = os.path.basename(filename)  # Strip any path components
    filepath = (directory / safe_name).resolve()
    base = directory.resolve()
    if base not in filepath.parents:  # Ensure no .. escape
        raise HTTPException(400)
    return filepath
```

### 8.8 Secret Management

- All secrets via environment variables, loaded from `.env` in dev
- `validate_production_startup()` blocks launch if required secrets are missing/placeholder
- `_enforce_secret_uniqueness()` prevents using same value across trust boundaries
- `NEXT_PUBLIC_*` leak detection for Stripe keys, Groq keys
- Gitleaks pre-commit hook for accidental secret commits
- ⚠️ `.env.production` is git-tracked (should be removed)
- ⚠️ Hardcoded `"dev-preview-signing-secret"` fallback in production code

### 8.9 Security Headers

**Backend (all responses):**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'none'; script-src 'none'; ...
```

**Frontend (middleware):**
```
Same headers + CSP: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
```

⚠️ `'unsafe-eval'` and `'unsafe-inline'` should be removed from CSP.

### 8.10 Data Sanitization

- Logging: Redacts API keys, secrets, tokens, cookies, auth headers
- Values truncated at 4096 characters
- `sanitize_filename()`: `[^a-zA-Z0-9_-]` → underscore
- IP hashing with salt for waitlist/contact forms

---

## 9. DevOps & Deployment Guide

### 9.1 Environment Variables

**Required for all environments:**
| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key (public) |
| `GROQ_API_KEY` | Groq API key |
| `REDIS_URL` | Redis connection string |
| `DATABASE_URL` | PostgreSQL connection (required in prod) |

**Required for production:**
| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `PREVIEW_SIGNING_SECRET` | HMAC key for preview URLs |
| `LEAD_HASH_SALT` | Salt for IP hashing |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |

**Optional:**
| Variable | Purpose | Default |
|----------|---------|---------|
| `OPENAI_API_KEY` | OpenAI fallback API key | None |
| `PEXELS_API_KEY` | Pexels B-roll API key | None |
| `STORAGE_MODE` | `local` or `cloud` | `local` |
| `S3_ENDPOINT_URL` | S3-compatible endpoint | None |
| `S3_BUCKET_NAME` | Storage bucket | None |
| `S3_ACCESS_KEY` | S3 access key | None |
| `S3_SECRET_KEY` | S3 secret key | None |
| `SENTRY_DSN` | Sentry error tracking | None |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry collector | None |
| `MAX_UPLOAD_SIZE` | Max file upload bytes | 2GB |
| `LOG_LEVEL` | Logging level | `INFO` |
| `AI_API_TIMEOUT_SECONDS` | AI API timeout | 120 |
| `AI_API_MAX_RETRIES` | AI API max retries | 2 |

**Frontend (`NEXT_PUBLIC_*`):**
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_DEV_MODE` | Dev mode toggle (must be `false` in prod) |

### 9.2 Docker Setup

**Build:**
```bash
docker build -t clip-aura .
```

**Run with Docker Compose:**
```bash
# Copy and configure environment
cp .env.production.example .env
# Edit .env with real values

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Services:**
- `redis`: Redis 7 Alpine with password auth, persistent volume
- `web`: FastAPI on Gunicorn (4 Uvicorn workers), port 8000
- `worker`: Celery worker (4 concurrent, max 10 tasks per child)

### 9.3 Local Development

```bash
# Backend
cp .env.example .env
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.api.main:app --reload --port 8000

# Celery worker (separate terminal)
celery -A app.workers.celery_app worker --loglevel=info --concurrency=2

# Frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### 9.4 Production Deployment

**Recommended topology:**
1. **Reverse proxy** (nginx/Traefik) — TLS termination, rate limiting, static caching
2. **Backend** — Gunicorn + Uvicorn behind reverse proxy
3. **Worker** — Celery worker, separate container/VM
4. **Redis** — Managed or self-hosted with persistence
5. **Database** — Supabase (PostgreSQL) or self-hosted PostgreSQL
6. **Storage** — S3-compatible for rendered clips (local ephemeral storage not suitable)
7. **Frontend** — Vercel or static export served via CDN

**Platform-specific:**
- **Railway:** Deploy via Dockerfile, set env vars in dashboard
- **Vercel (frontend):** Connect GitHub repo, set `NEXT_PUBLIC_*` vars
- **Fly.io:** Deploy backend + worker as separate apps
- **Bare metal:** Docker Compose behind nginx reverse proxy

### 9.5 CI/CD Pipeline

**⚠️ Not yet implemented.** Recommended GitHub Actions workflow:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install -r requirements.txt
      - run: pytest tests/ -v
      
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install ruff
      - run: ruff check app/

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd frontend && npm ci && npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install pip-audit && pip-audit
      - run: cd frontend && npm audit --production
```

### 9.6 Monitoring & Alerting

**Recommended setup:**
- **Error tracking:** Sentry (via `SENTRY_DSN` env var)
- **Uptime monitoring:** UptimeRobot or similar on `/health/live`
- **Metrics:** Prometheus endpoint + Grafana dashboard
- **Worker monitoring:** Celery Flower (password-protected)
- **Log aggregation:** JSON logs → Fluentd/Loki/CloudWatch

### 9.7 Backup Strategy

**Database:**
- Supabase: Point-in-time recovery (PITR) built-in
- PostgreSQL: `pg_dump` cron job
- SQLite: file copy (acceptable for dev only)

**Files:**
- Rendered clips: S3 versioning if using cloud storage
- Source videos: Temporary — can be re-uploaded

### 9.8 Rollback Strategy

1. **Database:** Supabase PITR or manual migration reversal
2. **Backend:** Docker image tags, redeploy previous tag
3. **Frontend:** Vercel instant rollback
4. **Verify:** Run `scripts/smoke_test.py` after rollback

---

## 10. Troubleshooting Guide

### 10.1 Common Failures

**Worker crashes / tasks stuck in "processing":**
1. Check worker logs: `docker-compose logs worker`
2. Verify Redis is running and accessible
3. Check for OOM kills: `dmesg | grep -i kill`
4. Manually retry stuck job: `POST /api/job/{id}/retry`
5. ⚠️ If `task_acks_late=False`, tasks lost on crash — re-queue manually

**AI transcription fails:**
1. Check Groq API key validity and rate limits
2. Verify circuit breaker state (check Redis keys)
3. Check if OpenAI fallback key is configured
4. Video audio extraction may have failed — check ffprobe output

**WebSocket disconnections:**
1. Token may have expired — refresh session on frontend
2. Redis Pub/Sub may be blocked — check Redis memory
3. Network timeout — check proxy/load balancer timeout settings

**Subtitle rendering issues (garbled text, missing captions):**
1. Check that ASS fonts are installed in container
2. Verify hook headline doesn't contain ASS special characters
3. Check `caption_style` value against `CAPTION_STYLES` dict

**Stripe webhook failures:**
1. ⚠️ Verify webhook handler code exists
2. Check webhook secret matches Stripe dashboard
3. Verify endpoint URL is registered in Stripe dashboard
4. Check `stripe_events` table for idempotency conflicts

**Redis connection refused:**
1. Verify `REDIS_URL` is correct
2. Check Redis password in docker-compose
3. Verify Redis container is running: `docker-compose ps redis`

**Database connection errors:**
1. PostgreSQL: Check `DATABASE_URL`, SSL mode, IP allowlist
2. SQLite: Check file permissions on `runtime/db/`
3. ⚠️ Add `pool_pre_ping=True` for PostgreSQL

### 10.2 Debugging Procedures

**Local debugging:**
```bash
# Check health
curl http://localhost:8000/health/ready
curl http://localhost:8000/api/health

# Check worker status
docker-compose exec worker celery -A app.workers.celery_app inspect active
docker-compose exec worker celery -A app.workers.celery_app inspect stats

# Run smoke tests
python scripts/smoke_test.py

# Check environment
python scripts/check_env_contract.py

# Manual job retry
python scripts/retry_job.py --job-id <uuid>
```

### 10.3 Stuck Jobs

1. Identify stuck job: `SELECT id, status, stage FROM jobs WHERE status='processing' AND updated_at < datetime('now', '-30 minutes')`
2. Check worker logs for that job
3. Reset and re-queue: `POST /api/job/{id}/retry`
4. If retry fails: use `scripts/retry_job.py` for direct re-queue

### 10.4 Redis Failures

1. Check Redis connectivity: `redis-cli -h <host> -a <password> PING`
2. If Redis down: rate limiter may fail open (inline) or closed (module)
3. Circuit breaker state lost — will reinitialize
4. WebSocket progress stops — HTTP polling fallback available
5. Restart Redis: `docker-compose restart redis`

---

## 11. Testing Documentation

### 11.1 Test Structure

```
tests/
└── test_production_env_safety.py   # Production startup validation tests
```

### 11.2 Running Tests

```bash
# Backend tests
pytest tests/ -v

# Environment validation
python scripts/check_env_contract.py

# Smoke test
python scripts/smoke_test.py
```

### 11.3 Testing Strategy

**Current coverage gaps:**
- ❌ No unit tests for core business logic (analyzer, clipper, transcriber)
- ❌ No integration tests for payment flow (Stripe webhook → subscription)
- ❌ No integration tests for full AI pipeline
- ❌ No frontend tests (Playwright/Cypress)
- ❌ No concurrent/race condition tests (credit billing)
- ❌ No performance/load tests

**Recommended additions:**
1. Unit tests for `app/core/` modules (mocked external APIs)
2. Integration tests for Stripe webhook handling
3. Integration tests for pipeline stages (mock AI responses)
4. Frontend smoke tests with Playwright
5. Concurrent billing test (2 threads charging same job)
6. Load test with k6 or Locust

---

## 12. Technical Debt & Future Improvements

### 12.1 Known Compromises

1. **SQLite/PostgreSQL dual support:** Adds complexity. SQLite silently ignores `FOR UPDATE` locks. Recommend PostgreSQL-only for production.
2. **Monolithic `main.py`:** 1084-line route file. Should be split into route modules.
3. **No API versioning:** Breaking changes will be difficult. Add `/api/v1/` prefix now.
4. **Unused `rate_limiter.py`:** Well-designed module exists but not wired. Wire to all endpoints.
5. **Dual credit systems:** `credits_remaining` unused — should be dropped.
6. **No `task_acks_late`:** Tasks lost on worker crash. Enable with visibility timeout.
7. **Single Celery queue:** No prioritization. Add separate queues for download/process.
8. **Direct container exposure:** No nginx. Add reverse proxy for TLS, rate limiting, caching.

### 12.2 Scalability Concerns

1. **Redis single point of failure:** Broker, cache, rate limiter, Pub/Sub all on one instance. Add sentinel/cluster for HA.
2. **Worker single-instance:** No horizontal scaling config. Add task routing for distributed workers.
3. **WebSocket sticky sessions:** Required for multi-instance backend.
4. **FFmpeg CPU contention:** Concurrent renders saturate CPU. Consider GPU acceleration or render queue.
5. **No AI cost caps:** Unexpected bills possible. Add per-user spend tracking.

### 12.3 Future Refactors

1. **Service layer extraction:** Move business logic from route handlers to `app/services/`
2. **Event-driven pipeline:** Replace direct function calls with events
3. **Frontend component decomposition:** Split monolithic components into hooks + sub-components
4. **Alembic migrations:** Replace `schema_compat.py` hacks with proper migration tool
5. **Multi-stage Docker build:** Reduce image size, remove build deps
6. **CSS Modules or Tailwind extraction:** Replace inline `<style jsx>` blocks

### 12.4 Recommended Upgrades

1. **Python 3.12+**: Better performance, security updates
2. **Next.js output standalone**: For production Docker deployment
3. **PostgreSQL-only**: Drop SQLite dual-path complexity
4. **`psycopg2` (not binary)**: Production-grade PostgreSQL driver
5. **Prometheus metrics**: Monitor request rates, error rates, queue depth
6. **Feature flag system**: LaunchDarkly or Redis-based for gradual rollouts

### 12.5 Architecture Evolution Path

```
Current (v0.x)              →  Short-term              →  Long-term
─────────────────────────────────────────────────────────────────
Single Celery queue          →  Priority queues          →  Event-driven workers
SQLite + PostgreSQL          →  PostgreSQL-only          →  Read replicas
Monolithic main.py           →  Route modules            →  Service layer
ThreadPoolExecutor(4)        →  Process pool             →  GPU render farm
Single Redis                 →  Redis sentinel           →  Redis cluster
No metrics                   →  Prometheus + Grafana     →  Distributed tracing
Inline style jsx             →  CSS Modules              →  Design system
No CI/CD                     →  GitHub Actions           →  GitOps/ArgoCD
```

---

## Appendix A: Configuration Reference

### `app/config.py` Key Constants

| Constant | Default | Description |
|----------|---------|-------------|
| `MAX_UPLOAD_SIZE` | 2GB | Max file upload size |
| `MIN_CLIP_DURATION` | 5s | Shortest allowed clip |
| `MAX_CLIP_DURATION` | 90s | Longest allowed clip |
| `MAX_CLIPS` | 8 | Max clips per job |
| `WHISPER_MAX_FILE_SIZE` | 24MB | Max audio chunk for Whisper |
| `AUDIO_CHUNK_DURATION` | 600s | Chunk size for long audio |
| `PREVIEW_URL_TTL_SECONDS` | 900s (15 min) | Preview URL lifetime |
| `CELERY_TASK_SOFT_TIME_LIMIT` | 540s | Celery soft time limit |
| `CELERY_TASK_TIME_LIMIT` | 600s | Celery hard time limit |
| `AI_API_TIMEOUT_SECONDS` | 120s | AI API timeout |
| `AI_API_MAX_RETRIES` | 2 | AI API retry attempts |

### Plan Tiers

| Tier | Price | Minutes/Month | Max Resolution |
|------|-------|---------------|----------------|
| Trial | Free | 60 (one-time) | 1080p |
| Pro | $29/mo | 300 | 1080p |
| Studio | $69/mo | 900 | 1080p |
| Agency | $149/mo | 2400 | 4K |
| Credit Pack | $15 | 60 (one-time) | Per plan |

---

## Appendix B: External Service Dependencies

| Service | Purpose | Criticality | Fallback |
|---------|---------|-------------|----------|
| Supabase | Auth, PostgreSQL | Critical | None |
| Groq | AI transcription + analysis | High | OpenAI |
| OpenAI | Fallback AI | Medium | None (circuit breaker opens) |
| Stripe | Payments | Critical | None |
| Redis | Cache/broker/Pub/Sub | Critical | None |
| S3/R2 | Cloud storage | Low (optional) | Local storage |
| Pexels | B-roll video | Low (optional) | No B-roll |

---

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| **ASS** | Advanced SubStation Alpha — subtitle format used for karaoke captions |
| **B-roll** | Supplementary footage overlaid on main clip (from Pexels) |
| **Circuit Breaker** | Pattern that prevents cascading failures by auto-fallback after repeated errors |
| **Hook Headline** | Attention-grabbing text displayed for first 5 seconds of clip |
| **Karaoke Captions** | Word-by-word animated subtitles synchronized with speech |
| **Sendcmd** | FFmpeg filter for dynamic frame-by-frame parameter changes (used for face tracking) |
| **Viral Score** | LLM-generated 0-10 rating of clip's viral potential |
| **WAL** | Write-Ahead Logging — SQLite mode for concurrent read performance |
| **yt-dlp** | YouTube downloader fork supporting 1000+ video platforms |

---

**End of Technical Documentation**
