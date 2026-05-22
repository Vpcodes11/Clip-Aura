# Beta Deploy — Click-by-Click

> Website LIVE on Vercel. 15/15 B-track. This is the UI guide. No CLI needed.

---

## Step 1 — Supabase PostgreSQL

1. Open [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Name: `clipaura-beta`
4. Generate database password → save it
5. Region: closest to testers
6. Click **Create Project** → wait ~2min
7. Left sidebar → **Settings** → **Database**
8. Under "Connection string" → copy **URI** (starts with `postgresql://`)
9. Save as → `DATABASE_URL` env var

---

## Step 2 — Railway Redis

1. Open [railway.app](https://railway.app) → **New Project**
2. Name: `clipaura-beta`
3. Click **+ New** → **Database** → **Add Redis**
4. Click the Redis tile → **Variables** tab → copy `REDIS_URL` (auto-set)
5. Add manual var: `REDIS_PASSWORD` → paste same strong password
6. Note: Redis connection auto-wired to services in this project

---

## Step 3 — Railway Web Service

1. In `clipaura-beta` project → **+ New** → **GitHub Repo**
2. Select repo → Railway detects Dockerfile
3. Click **Deploy** → wait for first build
4. Click service → **Settings** tab
5. **Start Command:**
   ```
   gunicorn -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8000 --timeout 120 --graceful-timeout 30 app.api.main:app
   ```
6. **Port:** 8000
7. **Variables** tab → paste all env vars from Step 5

---

## Step 4 — Railway Worker Service

1. **+ New** → **GitHub Repo** → same repo
2. **Start Command:**
   ```
   celery -A app.workers.celery_app worker --loglevel=info --soft-time-limit=540 --time-limit=600 --concurrency=4 --max-tasks-per-child=10
   ```
3. **Variables** tab → same env vars as web (copy all)
4. Deploy

---

## Step 5 — Env Vars (Set on BOTH Web + Worker)

| Variable | From |
|----------|------|
| `DATABASE_URL` | Supabase URI |
| `REDIS_URL` | Railway Redis (auto) |
| `REDIS_PASSWORD` | Manual (match Redis) |
| `GROQ_API_KEY` | Groq console |
| `SUPABASE_URL` | Supabase API settings |
| `SUPABASE_ANON_KEY` | Supabase API settings |
| `SUPABASE_JWT_SECRET` | Supabase API settings |
| `STRIPE_SECRET_KEY` | Stripe (optional) |
| `STRIPE_WEBHOOK_SECRET` | Stripe (optional) |
| `STRIPE_PRO_PRICE_ID` | Stripe (optional) |
| `DEV_MODE` | `false` |
| `ENVIRONMENT` | `production` |
| `ALLOWED_ORIGINS` | Vercel + Railway domains (comma-separated) |

Railway domain: `[project-name].up.railway.app`

---

## Step 6 — Allowlist Users

Supabase dashboard → **SQL Editor** → New query:

```sql
UPDATE users SET is_beta_user = true
WHERE email = 'tester@example.com';
```

Users register at Vercel `/login` first.

---

## Step 7 — Smoke Test

1. Railway: 3 services green (web, worker, redis)
2. `curl [railway-url]/health/live` → 200
3. Visit Vercel site → `/login` → sign in
4. Visit `/dashboard` → loads (not 403)
5. Upload 15-60s MP4 → submit
6. Wait ~2min → download rendered clip
7. Verify: 9:16, captions visible, plays

---

## Step 8 — Rollback

**If render fails:**
1. Railway worker → **Logs** → check for FFmpeg/Celery errors
2. Check Supabase `jobs` table for error status
3. Fix env var or code → redeploy from GitHub
4. Railway → **Deployments** → rollback to previous build

**Emergency:**
- Railway → **Settings** → **Delete Project** (data gone)
- Supabase → **Delete Project** (data gone)
- Remove `is_beta_user` from any testers
