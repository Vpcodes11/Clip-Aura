# Clip Aura New PC Migration - One Page

Use this as the complete checklist when moving Clip Aura to a new PC.

## 1. Accounts And Access Needed

- GitHub: access to `https://github.com/Vpcodes11/Clip-Aura.git`
- Supabase: project dashboard access
- Razorpay: dashboard access
- Groq: API key access
- Optional: OpenAI API key
- Optional: Pexels API key
- Optional: S3/R2 storage dashboard if `STORAGE_MODE=cloud`

## 2. Software To Install

- Git
- Docker Desktop
- Node.js 20 LTS or newer
- Python 3.10
- FFmpeg, only if running backend outside Docker

## 3. Clone The Code

```powershell
git clone https://github.com/Vpcodes11/Clip-Aura.git
cd Clip-Aura
git status
```

Expected: clean working tree.

## 4. Environment File

Create `.env` from the example:

```powershell
Copy-Item .env.example .env
```

If you privately moved `.env.new-pc.local` from the old PC:

```powershell
Copy-Item .env.new-pc.local .env
```

Never commit `.env`, `.env.*`, real keys, database passwords, or webhook secrets.

## 5. Required `.env` Items

API keys:

- `GROQ_API_KEY`
- `OPENAI_API_KEY` optional
- `PEXELS_API_KEY` optional

Supabase:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Razorpay:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_PRO_PLAN_ID`
- `RAZORPAY_STUDIO_PLAN_ID`
- `RAZORPAY_AGENCY_PLAN_ID`
- `RAZORPAY_CREDIT_PACK_ITEM_ID`

App and infrastructure:

- `ENVIRONMENT=development` for local, `production` for deploy
- `DEV_MODE=false`
- `NEXT_PUBLIC_DEV_MODE=false`
- `BASE_URL=http://localhost:8000`
- `FRONTEND_URL=http://localhost:3000`
- `NEXT_PUBLIC_API_URL=http://localhost:8000`
- `ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`
- `REDIS_PASSWORD`
- `REDIS_URL=redis://:<REDIS_PASSWORD>@redis:6379/0`
- `DATABASE_URL`
- `OUTPUT_DIR=./runtime/renders`
- `PREVIEW_SIGNING_SECRET`
- `LEAD_HASH_SALT`

Worker/timeouts:

- `AI_API_TIMEOUT_SECONDS=120`
- `AI_API_MAX_RETRIES=2`
- `FFMPEG_TIMEOUT_SECONDS=300`
- `FFPROBE_TIMEOUT_SECONDS=30`
- `THUMBNAIL_TIMEOUT_SECONDS=30`
- `CELERY_TASK_TIME_LIMIT=600`
- `CELERY_TASK_SOFT_TIME_LIMIT=540`

Storage:

- `STORAGE_MODE=local`
- If cloud storage is used: `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`, `S3_BUCKET_NAME`, `S3_ENDPOINT_URL`

Generate unique secrets:

```powershell
openssl rand -hex 32
```

Use different generated values for `REDIS_PASSWORD`, `PREVIEW_SIGNING_SECRET`, and `LEAD_HASH_SALT`.

## 6. Supabase Setup

Apply migrations in timestamp order from:

```text
supabase/migrations/
```

Confirm these exist after migration:

- `razorpay_events`
- `lead_submissions`
- `audit_logs`
- `usage_records`
- user fields: `role`, `subscription_plan`, `rollover_credits`, `razorpay_customer_id`, `razorpay_subscription_id`

## 7. Razorpay Setup

In Razorpay dashboard, configure webhook URL:

```text
https://<api-domain>/api/billing/webhook
```

For local testing, use a tunnel and configure:

```text
https://<tunnel-domain>/api/billing/webhook
```

Events handled:

- `subscription.charged`
- `subscription.updated`
- `subscription.cancelled`
- `subscription.halted`
- `payment.captured`

## 8. Run App With Docker

```powershell
python scripts/check_env_contract.py
docker compose up --build
```

Backend:

- `http://localhost:8000`
- `http://localhost:8000/health/live`
- `http://localhost:8000/health/ready`

## 9. Run Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend:

- `http://localhost:3000`

## 10. Verify

Backend:

```powershell
python -m pytest tests -q
```

Frontend:

```powershell
cd frontend
$env:NEXT_PUBLIC_DEV_MODE='false'
npm run build
```

Expected:

- Backend tests pass
- Frontend build passes
- Dashboard redirects unauthenticated users to login
- `/health/ready` returns healthy database and Redis checks
- Upload/render flow starts a job
- Razorpay webhook returns 200 for valid signed events

## 11. Do Not Move Through Git

These are local-only:

- `.env`
- `.env.new-pc.local`
- `runtime/`
- `uploads/`
- `output/`
- `_docker_build.log`
- `.refact/`
- `$null`
- `fix.py`

