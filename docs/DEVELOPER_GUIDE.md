# Clip Aura — Developer Guide

## Architecture Overview

Clip Aura is an AI-powered video clip generation SaaS platform. It ingests long-form video, transcribes audio, analyzes content via LLM to find highlight moments, and renders short clips with captions, B-roll, and face tracking.

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 16 Frontend                     │
│  (App Router, framer-motion, Supabase Auth, WebSocket)       │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP / WebSocket
┌────────────────▼────────────────────────────────────────────┐
│                   FastAPI Backend (app/)                     │
│  ┌──────────┬───────────┬──────────────┬──────────────────┐ │
│  │ Auth     │ REST API  │ WebSocket    │ Health           │ │
│  │ (Supabase│ (main.py) │ (main.py)    │ Endpoints        │ │
│  │  JWT)    │           │              │                  │ │
│  └──────────┴───────────┴──────────────┴──────────────────┘ │
└────────────────┬────────────────────────────────────────────┘
                 │ Task Dispatch
┌────────────────▼────────────────────────────────────────────┐
│              Celery Workers (app/workers/)                   │
│  ┌──────────┬───────────┬──────────────┬──────────────────┐ │
│  │ Download │ Transcribe│ Analyze      │ Render Clips     │ │
│  │ (yt-dlp) │ (Whisper) │ (LLM)        │ (FFmpeg)         │ │
│  └──────────┴───────────┴──────────────┴──────────────────┘ │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                     Redis                                    │
│  (Celery broker, Pub/Sub, Rate Limiting, Stripe Idempotency)│
└─────────────────────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                   Database                                   │
│  Dev: SQLite (runtime/db/clip_aura.db)                      │
│  Prod: PostgreSQL via DATABASE_URL (Supabase or standalone) │
└─────────────────────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                 External Services                            │
│  Supabase (Auth) │ Groq (LLM + Whisper) │ OpenAI (Fallback) │
│  Stripe (Billing)│ Pexels (B-Roll)     │ MediaPipe (Face)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
Clip Aura/
├── app/                        # Backend (FastAPI + Celery)
│   ├── api/
│   │   ├── main.py             # FastAPI app, REST endpoints, WebSocket
│   │   ├── auth.py             # Supabase JWT verification, beta gating
│   │   └── payments.py         # Stripe webhook handler, subscription logic
│   ├── core/
│   │   ├── config.py           # All configuration, env vars, constants
│   │   ├── plans.py            # Subscription tier logic, minutes spending
│   │   ├── analyzer.py         # LLM transcript analysis (clip detection)
│   │   ├── broll.py            # Pexels B-roll search + download
│   │   ├── downloader.py       # yt-dlp video download from URLs
│   │   └── schema_compat.py    # Runtime DB schema migration helpers
│   ├── models/
│   │   └── models.py           # SQLAlchemy: User, Job models
│   ├── rendering/
│   │   ├── clipper.py          # FFmpeg clip rendering + ASS subtitles
│   │   └── storage.py          # S3/local file storage abstraction
│   ├── subtitles/
│   │   └── transcriber.py      # Whisper (Groq/OpenAI) transcription
│   ├── tracking/
│   │   └── face_processor.py   # MediaPipe face detection + crop
│   ├── workers/
│   │   ├── celery_app.py       # Celery app factory
│   │   ├── tasks.py            # Pipeline orchestration, stage checkpoints
│   │   └── recover.py          # Manual job recovery from checkpoints
│   ├── schemas/                # Empty — reserved for Pydantic schemas
│   └── services/               # Empty — reserved for service layer
├── frontend/                   # Next.js 16 App Router
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── layout.tsx          # Root layout + providers
│   │   ├── globals.css         # Global styles
│   │   ├── error.tsx           # Root error boundary
│   │   ├── login/              # Login page
│   │   ├── dashboard/          # Dashboard routes
│   │   │   ├── layout.tsx      # Sidebar + auth check
│   │   │   ├── page.tsx        # Projects list + upload
│   │   │   ├── clips/          # Clips grid
│   │   │   ├── settings/       # Settings (placeholder)
│   │   │   ├── billing/        # Billing (placeholder)
│   │   │   └── projects/       # Projects (placeholder)
│   │   ├── demo/               # Demo page
│   │   ├── pricing/            # Pricing page
│   │   ├── contact/            # Contact page
│   │   ├── terms/              # Terms of service
│   │   ├── privacy-policy/     # Privacy policy
│   │   ├── refund-policy/      # Refund policy
│   │   ├── sitemap.xml         # Sitemap
│   │   └── robots.txt          # Robots config
│   ├── components/
│   │   ├── UploadModal.tsx     # Video upload + URL input
│   │   ├── EditorModal.tsx     # Clip editing (captions, timestamps)
│   │   ├── ExportModal.tsx     # Export preview + QR code download
│   │   ├── ErrorBoundary.tsx   # React error boundary wrapper
│   │   ├── Footer.tsx          # Site footer
│   │   └── ClientLayout.tsx    # Client-side providers wrapper
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client (browser)
│   │   └── AuthContext.tsx      # Auth provider + context
│   ├── .env.production         # Production env vars (contains secrets!)
│   └── next.config.ts          # Next.js config
├── supabase/
│   └── migrations/             # Supabase schema migrations
├── scripts/
│   ├── smoke_test.py           # HTTP-only smoke test
│   ├── retry_job.py            # Job retry script (broken import path)
│   ├── check_env_contract.py   # Env var validation
│   └── wait-for-redis          # Redis readiness check
├── tests/                      # 16 pytest test files
├── docs/                       # Documentation
├── runtime/                    # Runtime data
│   ├── db/                     # SQLite database files
│   ├── renders/                # Generated video output
│   ├── uploads/                # Uploaded source videos
│   ├── temp/                   # Temporary files
│   ├── previews/               # Preview images (empty)
│   └── logs/                   # Log output (empty)
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── requirements.txt
├── smoke_test.py               # Broken root smoke test
└── .env / .env.production      # Environment variables (DO NOT COMMIT)
```

### ⚠️ Dead Directories to Delete
- `backend/` — Ghost directory with only `__pycache__/` files
- `app/worker/` — Empty, actual module is `app/workers/`
- `mkdir/` — Accidental artifact
- `output/`, `temp/`, `uploads/` (root) — Redundant with `runtime/`
- `$null` — PowerShell artifact

---

## Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 20+
- Docker & Docker Compose (for Redis + production-like env)
- FFmpeg installed locally
- Git

### Quick Start

```bash
# Clone repository
git clone <repo-url>
cd clip-aura

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend && npm install && cd ..

# Set up environment
cp .env.example .env  # Edit with your keys

# Start Redis via Docker
docker compose up redis -d

# Start backend API
uvicorn app.api.main:app --reload --port 8000

# Start Celery worker (separate terminal)
celery -A app.workers.celery_app worker --loglevel=info --concurrency=2

# Start frontend (separate terminal)
cd frontend && npm run dev
```

### Docker Compose (Full Stack)
```bash
docker compose up -d
# Starts: Redis + API (gunicorn) + Celery worker
```

### Dev Mode
Set `DEV_MODE=true` in `.env` to:
- Bypass Supabase auth (uses `dev-architect-id`)
- Use local SQLite instead of Postgres
- Use hardcoded dev user with PRO-tier access

---

## Environment Variables

### Required (All Environments)
| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key (for JWT verification) |
| `GROQ_API_KEY` | Groq API key (LLM + Whisper) |
| `REDIS_URL` | Redis connection string |
| `DATABASE_URL` | PostgreSQL URL (required in production, SQLite in dev) |

### Required (Production)
| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | Stripe Price ID for Pro tier |
| `STRIPE_STUDIO_PRICE_ID` | Stripe Price ID for Studio tier |
| `STRIPE_AGENCY_PRICE_ID` | Stripe Price ID for Agency tier |
| `STRIPE_CREDIT_PACK_PRICE_ID` | Stripe Price ID for credit packs |
| `REDIS_PASSWORD` | Redis password |
| `ALLOWED_ORIGINS` | CORS origins (e.g., `https://clipaura.com,https://www.clipaura.com`) |
| `ENVIRONMENT` | Set to `"production"` |
| `FRONTEND_URL` | Frontend URL for redirects |

### Optional
| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Fallback for when Groq rate limits |
| `PEXELS_API_KEY` | B-roll footage source |
| `PREVIEW_SIGNING_SECRET` | HMAC secret for signed preview URLs |
| `S3_BUCKET`, `S3_REGION`, `S3_KEY`, `S3_SECRET` | Cloud storage (if `STORAGE_MODE=cloud`) |
| `DEV_MODE` | Dev-mode toggle (NEVER in production!) |
| `MAX_UPLOAD_SIZE_MB` | Upload size limit (default 2048) |

### Frontend Variables (`frontend/.env.production`)
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL (browser-visible) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser-visible) |
| `NEXT_PUBLIC_API_URL` | Backend API URL (e.g., `https://api.clipaura.com`) |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL (e.g., `wss://api.clipaura.com`) |
| `NEXT_PUBLIC_DEV_MODE` | Dev-mode toggle (NEVER in production!) |

---

## API Documentation

### Base URL
- Dev: `http://localhost:8000`
- Prod: `https://api.clipaura.com`

### Authentication
All endpoints (except health) require a Supabase JWT in the `Authorization` header:
```
Authorization: Bearer <supabase_access_token>
```

### Endpoints

#### Health
```
GET /                         # Root — returns {"status": "healthy"}
GET /health/live              # Liveness probe
GET /health/ready             # Readiness probe (DB + Redis)
GET /api/health               # Deep health (DB + Redis + Celery)
```

#### Jobs
```
GET  /api/jobs                                    # List user's jobs
POST /api/upload                                  # Upload video (multipart) or URL (JSON)
     Body (file): multipart/form-data with video file
     Body (URL): {"url": "https://..."}
     Returns: {"job_id": "uuid"}
GET  /api/status/{job_id}                         # Get job status
GET  /api/preview-url/{job_id}/{filename}         # Get signed preview URL
GET  /api/download/{job_id}/{filename}            # Download rendered clip
DELETE /api/job/{job_id}                          # Delete job
POST /api/job/{job_id}/retry                     # Retry failed job
POST /api/clip/edit                               # Edit clip captions
     Body: {"job_id": "uuid", "title": "...", "hook_caption": "...", "words": [...]}
```

#### Billing (Authenticated)
```
POST /api/billing/create-checkout-session        # Create Stripe checkout
     Body: {"tier": "pro"|"studio"|"agency"}
POST /api/billing/create-credit-pack-session     # Create credit pack checkout
```

#### Webhooks (Unauthenticated — Stripe only)
```
POST /api/billing/webhook                        # Stripe webhook receiver
```

#### WebSocket
```
WS /ws/{job_id}?token={jwt_token}                # Job progress stream
     Messages: {"type": "progress", "progress": 45, "message": "Transcribing..."}
```

---

## Auth Flow

### Frontend
1. `AuthContext` wraps the app at layout level
2. `useAuth()` hook provides `user`, `session`, `loading`, `signOut`
3. Dashboard layout checks `user` — redirects to `/` if unauthenticated
4. Supabase session is persisted via `supabase.auth.getSession()` on mount
5. Token is passed to API calls via `Authorization: Bearer` header
6. WebSocket connections pass token as query parameter

### Backend
1. `get_beta_user(token, db)` dependency on protected routes
2. Calls `supabase.auth.get_user(token)` to verify JWT
3. Looks up local `User` record by `user_id` (auto-creates if needed)
4. Applies `require_beta_access()` and `require_active_trial()` checks
5. Returns authenticated `User` object to route handler

### Dev Mode Bypass
When `DEV_MODE=true`: hardcoded `dev-architect-id` user, full PRO access, no JWT check.

---

## Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Copy project URL and anon key to `.env`
3. Enable Auth providers (Email/Password minimum)
4. Apply migrations from `supabase/migrations/`
5. Configure CORS in Supabase dashboard for your domain
6. Set `JWT_SECRET` in Supabase dashboard (do NOT commit to repo)
7. **Do NOT use the `service_role` key in client-facing code**

The app uses Supabase ONLY for auth. Application data lives in a separate SQLAlchemy-managed database.

---

## Redis Setup

### Development
Redis runs in Docker:
```bash
docker compose up redis -d
```

### Production
Use a managed Redis service (Railway Redis plugin, Upstash, Redis Cloud). Set these env vars:
- `REDIS_URL` — full connection string
- `REDIS_PASSWORD` — auth password

### Redis Usage
- Celery broker + result backend
- Job progress pub/sub (`job_progress_{job_id}` channels)
- Rate limiting (upload endpoint)
- Stripe webhook idempotency (`stripe_event:{event_id}` keys, 7-day TTL)

---

## Railway Deployment

### Prerequisites
- Railway account with project created
- Railway CLI installed (`npm i -g @railway/cli`)
- All environment variables configured in Railway dashboard

### Key Configuration Notes

#### Build Dependencies
The `Dockerfile` needs these added (CURRENTLY MISSING):
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libpq-dev \      # ← MISSING — needed for psycopg2-binary
    gcc \            # ← MISSING — needed for psycopg2-binary
    && rm -rf /var/lib/apt/lists/*
```

#### No `railway.json` Exists
Create `railway.json` at project root:
```json
{
  "build": {
    "builder": "DOCKERFILE"
  }
}
```

#### Volume Strategy
Railway is ephemeral. Local file storage WILL NOT PERSIST. Set `STORAGE_MODE=cloud` and configure S3-compatible storage.

#### Redis
Use Railway's Redis plugin, not the containerized Redis from docker-compose.

---

## Build Commands

### Backend
```bash
# Install deps
pip install -r requirements.txt

# Validate environment
python scripts/check_env_contract.py

# Run tests
pytest tests/ -v

# Type checking (if mypy is installed)
mypy app/
```

### Frontend
```bash
cd frontend
npm install
npm run build -- --webpack     # Production build (webpack forced for Next.js 16)
npm run dev                     # Development with Turbopack
npm run lint                    # ESLint
```

### Docker
```bash
# Build
docker build -t clipaura-api .

# Run full stack
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

---

## Testing Workflow

### Running Tests
```bash
# All tests
pytest tests/ -v

# Specific test file
pytest tests/test_pricing.py -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

### Test Files (16 total)
- `test_pricing.py` — Subscription tier pricing verification
- `test_timeouts.py` — FFmpeg timeout enforcement
- `test_env_contract.py` — Environment variable validation
- Various model, API, and integration tests

### CI/CD (CURRENTLY MISSING)
Add `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.10' }
      - run: pip install -r requirements.txt
      - run: pytest tests/ -v
```

---

## Debugging Guide

### Backend Issues
```bash
# Check Celery worker status
celery -A app.workers.celery_app inspect active

# Check Celery registered tasks
celery -A app.workers.celery_app inspect registered

# View worker logs
docker compose logs worker -f

# Test health endpoints
curl http://localhost:8000/health/ready
curl http://localhost:8000/api/health

# Manually retry a job
python scripts/retry_job.py <job_id>
```

### Database
```bash
# Dev SQLite
sqlite3 runtime/db/clip_aura.db

# Check user
SELECT * FROM users WHERE email = 'dev@clipaura.local';

# Check job status
SELECT id, status, stage, progress, message FROM jobs ORDER BY created_at DESC;
```

### Frontend
```bash
# Dev server with debugging
cd frontend && npm run dev

# Check build output
cd frontend && npm run build -- --webpack
```

### Common Issues
| Issue | Cause | Fix |
|---|---|---|
| `DATABASE_URL` error on startup | Missing env var | Set `DATABASE_URL` or use dev mode |
| Redis connection refused | Redis not running | `docker compose up redis -d` |
| Groq 429 errors | Rate limit hit | API calls fire too fast (no delay between chunks) |
| Celery task stuck | Worker crashed | `celery -A app.workers.celery_app purge` |
| Frontend API calls to localhost | Missing `NEXT_PUBLIC_API_URL` | Set in `.env.production` |

---

## Webhook Setup

### Stripe Webhooks
1. In Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://api.clipaura.com/api/billing/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed` (RECOMMENDED — not currently handled)
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

### Local Webhook Testing
```bash
stripe listen --forward-to localhost:8000/api/billing/webhook
```

---

## AI Provider Setup

### Groq (Primary)
1. Create account at [console.groq.com](https://console.groq.com)
2. Generate API key
3. Set `GROQ_API_KEY` in `.env`
4. Models: `llama-3.1-8b-instant` (analysis), `whisper-large-v3-turbo` (transcription)
5. Rate limits: 30 RPM, 6,000 TPM for `llama-3.1-8b-instant`

### OpenAI (Fallback)
1. Create account at [platform.openai.com](https://platform.openai.com)
2. Generate API key
3. Set `OPENAI_API_KEY` in `.env`
4. Models: `gpt-4o-mini` (analysis), `whisper-1` (transcription)
5. Costs: ~$0.15/MTok input, $0.60/MTok output

### Pexels (B-Roll)
1. Create account at [pexels.com/api](https://www.pexels.com/api/)
2. Generate API key
3. Set `PEXELS_API_KEY` in `.env`
4. Rate limits: 200 requests/hour on free tier

---

## Production Deployment Steps

### Pre-Deploy Checklist
- [ ] All secrets rotated (never committed to git)
- [ ] `DEV_MODE=false` and `ENVIRONMENT=production`
- [ ] `DATABASE_URL` set to production Postgres
- [ ] `STORAGE_MODE=cloud` with S3 credentials
- [ ] `ALLOWED_ORIGINS` set to production domains
- [ ] `FRONTEND_URL` set to production frontend
- [ ] Stripe webhook endpoint configured
- [ ] Stripe price IDs match production Stripe account
- [ ] All tests pass
- [ ] Environment contract check passes
- [ ] Docker build succeeds

### Deploy
```bash
# Railway
railway up

# Or manual Docker
docker build -t clipaura-api .
docker push <registry>/clipaura-api
# Deploy to your orchestrator
```

### Post-Deploy Verification
1. Check `/api/health` returns all green
2. Verify Stripe webhook connectivity
3. Test upload flow end-to-end
4. Verify CORS headers from production frontend
5. Test auth flow (sign in, protected routes, token refresh)

### Rollback
```bash
# Railway
railway rollback

# Docker
docker compose down
docker compose up -d  # With previous image tag
```

---

## Known Issues (See PRODUCTION_AUDIT_REPORT.md for full list)

1. `.env.production` has blank critical keys
2. `retry_job.py` imports from `app.worker` (should be `app.workers`)
3. `backend/` directory is dead code
4. Frontend build requires `--webpack` flag (Turbopack incompatibility)
5. `psycopg2-binary` won't build on `python:3.10-slim` without `libpq-dev`
