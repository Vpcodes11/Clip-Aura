# Private Beta Launch Checklist

> **Status:** ✅ B-track complete (15/15). Ready for testers.
> **Date:** 2026-05-22

---

## 1. PostgreSQL / DATABASE_URL Setup

SQLite is not suitable — concurrent web + worker writes cause `SQLITE_BUSY`.

**Plan:**
- Supabase managed PostgreSQL (free tier: 500MB, enough for 3–5 beta testers).
- Create project at [supabase.com/dashboard](https://supabase.com/dashboard) → Settings → Database → Connection string.
- Set `DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres` in `.env`.
- Pool config already set in `app/api/database.py`: `pool_size=10, max_overflow=20, pool_recycle=3600`.
- Alternatives: Neon, Railway Postgres, or self-hosted PostgreSQL Docker container.

## 2. Backend Hosting

**Recommendation: Railway or Fly.io** (not Vercel — Vercel is serverless, doesn't run Docker workers or FFmpeg).

- **Railway:** Deploy from Dockerfile. Add Redis plugin. Set env vars. $5/mo starter.
- **Fly.io:** `fly launch` from repo. Add Redis via Upstash. $1.94/mo for smallest VM.
- **Hetzner VPS:** Cheapest option. 2 vCPU/4GB RAM (~$6/mo). Full control, manual Docker setup.

For 3–5 testers, Railway or Fly.io is simplest.

## 3. Required Production Env Checklist

Run `python scripts/check_env_contract.py` — must exit 0 before launch.

| Key | Source | Status |
|-----|--------|--------|
| `DATABASE_URL` | Supabase/Neon/Railway Postgres | Required (L-001) |
| `REDIS_PASSWORD` | Generate strong random string | Required |
| `GROQ_API_KEY` | Groq console | Required |
| `SUPABASE_URL` | Supabase project | Required |
| `SUPABASE_ANON_KEY` | Supabase project | Required |
| `SUPABASE_JWT_SECRET` | Supabase project | Required |
| `STRIPE_SECRET_KEY` | Stripe dashboard | Optional for beta |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard | Optional for beta |
| `STRIPE_PRO_PRICE_ID` | Stripe dashboard | Optional for beta |
| `DEV_MODE` | Set `false` (compose-enforced) | Required |
| `ENVIRONMENT` | Set `production` (compose default) | Required |

## 4. First Live Smoke Test

1. **Provision:** `docker-compose up --build -d` on host. Confirm all services healthy.
2. **Allowlist:** `UPDATE users SET is_beta_user=true WHERE email='tester@example.com'`.
3. **Login:** Tester visits `/login`, authenticates via Supabase.
4. **Gate check:** Tester visits `/dashboard` — returns 200 (not 403).
5. **Upload:** Upload 15–60s MP4. Confirm job created in DB.
6. **Render:** Worker picks up job, processes, outputs to `/output/`.
7. **Download:** Tester downloads rendered clip. Verify captions visible, 9:16 format, playable.

## 5. Monitoring for First 3–5 Testers

- **Docker health:** `docker ps` — all services `healthy` or `running`.
- **Worker logs:** `docker logs clipaura-worker-1 --tail 50 -f` — watch for `SoftTimeLimitExceeded`, FFmpeg errors, OOM.
- **Disk usage:** Monitor `/output/` and `/temp/` — no orphaned files (L-006/L-007 deferred).
- **DB size:** Supabase dashboard → Database → monthly usage under 500MB.
- **Manual checkpoints:** After each tester's first render, confirm job status in DB and file exists in `/output/`.

---

## Known Risks

- **PostgreSQL required.** Beta won't start production without `DATABASE_URL` set.
- **Fonts:** Custom fonts deferred. Renders use DejaVu/Liberation — functional but visually uniform.
- **Rate limiting:** Only upload protected. Clip edit/retry unlimited (L-005 deferred).
- **Logging:** Some modules still use `print()`. Full structured logging deferred (L-003).
- **No TLS:** Plain HTTP on backend. Acceptable for 3–5 invited testers behind auth gate. HTTPS deferred to L-002.

## Rollback

- `docker-compose down`
- `UPDATE users SET is_beta_user=false WHERE email='...'`
- Uninvited users get 403 via `get_beta_user` dependency.
