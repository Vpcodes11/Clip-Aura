# Clip Aura — Production Readiness Audit Report

**Date:** 2025-05-23
**Scope:** Full codebase audit — frontend, backend, database, AI pipeline, payments, security, DevOps, UX
**Verdict:** **NOT PRODUCTION-READY**

---

## Launch Readiness Score: 38%

| Category | Score | Weight | Weighted |
|---|---|---|---|
| Frontend | 40% | 20% | 8.0 |
| Backend API | 45% | 20% | 9.0 |
| Database & Supabase | 35% | 15% | 5.25 |
| Payment & Billing | 30% | 15% | 4.5 |
| AI Pipeline | 30% | 10% | 3.0 |
| Security | 25% | 10% | 2.5 |
| DevOps & Deployment | 25% | 5% | 1.25 |
| UX & Product | 45% | 5% | 2.25 |
| **TOTAL** | | | **35.75%** |

**Production Blockers: 26**
**Estimated Production Risk: EXTREME**

---

## Production Blockers (Must Fix Before Any Traffic)

### BLOCKER-001: Sentry-level `.env.production` leak
**File:** `.env.production`
**Severity:** CRITICAL — DATA BREACH
Production database connection string (`<redacted-previously-exposed-database-url>`) and Supabase JWT secret were committed in plaintext. Rotate immediately. Verify `.env` was never pushed.

### BLOCKER-002: No `middleware.ts` — dashboard routes unprotected
**File:** Missing `frontend/middleware.ts`
**Severity:** CRITICAL — AUTH BYPASS
Dashboard uses client-side auth check with `useEffect` redirect. Anyone can view dashboard HTML source. Unauthenticated users see the full dashboard UI briefly before redirect.

### BLOCKER-003: `spend_usage_minutes` credit double-spend race
**File:** `app/core/plans.py:54-69`
**Severity:** CRITICAL — FINANCIAL LOSS
Read-modify-write on `used_minutes` without `SELECT ... FOR UPDATE` or atomic `UPDATE WHERE`. Two concurrent Celery tasks for the same user can double-spend minutes.

### BLOCKER-004: No monthly `used_minutes` reset
**File:** `app/api/payments.py:activate_subscription`
**Severity:** CRITICAL — FINANCIAL LOSS
`activate_subscription` never resets `used_minutes` to 0 on renewal. Paid users run out of minutes permanently after first month.

### BLOCKER-005: EditorModal leaked `setInterval`
**File:** `frontend/components/EditorModal.tsx`
**Severity:** CRITICAL — RUNTIME CRASH
`setInterval` in `handleSave` is never cleared if the modal is closed during save. Polling continues on unmounted component, calling `setIsSaving(false)` and `onClose()`.

### BLOCKER-006: Silently swallowed AI exceptions
**File:** `app/core/analyzer.py:242`
**Severity:** CRITICAL — SILENT FAILURE
`except Exception as e: print(f"Error analyzing chunk {i+1}: {e}")` swallows ALL exceptions including rate-limit errors. The Groq→OpenAI fallback is **dead code** — never triggers. Users get fallback clips with no indication of failure.

### BLOCKER-007: No API timeout on LLM calls
**File:** `app/core/analyzer.py:154`, `app/subtitles/transcriber.py:98`
**Severity:** CRITICAL — WORKER HANG
OpenAI/Groq API calls have no `timeout=` parameter. A hung API blocks the Celery worker until the 540s soft limit kills the entire task.

### BLOCKER-008: Hydration mismatch on homepage
**File:** `frontend/app/page.tsx:10-13`
**Severity:** CRITICAL — BROKEN UI
`WAVEFORM_DATA` computed at module level produces different values on server vs. client (`toFixed(4)` floating-point differences). Negative height values generated (`-6.0158px`). Causes React hydration warnings, potential layout corruption.

### BLOCKER-009: `DEV_MODE` bypass accessible in production
**File:** `app/api/auth.py:42-47`, `frontend/lib/AuthContext.tsx:19-38`
**Severity:** CRITICAL — AUTH BYPASS
If `NEXT_PUBLIC_DEV_MODE=true` leaks to production, anyone can access the full API with PRO-tier access. Frontend + backend bypass is independent — either enables full access.

### BLOCKER-010: Hardcoded Supabase fallback credentials
**File:** `frontend/lib/supabase.ts:3-4`
**Severity:** CRITICAL — SECURITY
Real Supabase project URL and anon key are hardcoded as JS fallback values. If env var is missing in prod, app silently connects to a specific Supabase project.

### BLOCKER-011: Docker volume mounts mismatch
**File:** `docker-compose.yml` vs `app/config.py`
**Severity:** CRITICAL — DATA LOSS
Docker mounts `./uploads:/app/uploads` but code writes to `runtime/uploads/`. Mounted dirs sit unused; app dirs are lost on container restart.

### BLOCKER-012: `psycopg2-binary` won't build on slim image
**File:** `Dockerfile:3`
**Severity:** CRITICAL — DEPLOY FAILURE
`python:3.10-slim` lacks `libpq-dev` and `gcc`. `psycopg2-binary` compilation fails on Railway. Must add `libpq-dev gcc` to `apt-get install`.

### BLOCKER-013: `.dockerignore` allows `.env.production` into Docker
**File:** `.dockerignore`
**Severity:** CRITICAL — SECURITY
`.env.production` contains live DB credentials and is NOT in `.dockerignore`. Gets baked into Docker image layers.

### BLOCKER-014: No Stripe Customer Portal
**File:** `frontend/app/dashboard/billing/page.tsx`
**Severity:** HIGH — UX / CHARGEBACK RISK
Billing page is placeholder. Users cannot cancel subscriptions, update payment methods, or view invoices. Must email support to cancel.

### BLOCKER-015: `downgrade_subscription` leaves users over-limit
**File:** `app/api/payments.py:52-54`
**Severity:** HIGH — LOCKOUT
On downgrade, `total_minutes_limit` becomes 60 but `used_minutes` is not reset. User with 230 used → instantly over limit.

### BLOCKER-016: No `stripe_subscription_id` on User model
**File:** `app/models/models.py:6-20`
**Severity:** HIGH — DESYNC
Multiple subscriptions per Stripe customer cannot be distinguished. Cancelling one cancels the wrong one.

### BLOCKER-017: Retry endpoint has no rate limiter
**File:** `app/api/main.py:~800`
**Severity:** HIGH — RESOURCE ABUSE
`POST /api/job/{job_id}/retry` unrestricted. User can spam retries, burning unlimited API credits.

### BLOCKER-018: `retry_job.py` has broken import path
**File:** `scripts/retry_job.py:21`
**Severity:** HIGH — TOOLING FAILURE
`from app.worker.celery_app import celery_app` — module is `app.workers` (plural). Script will fail with ImportError.

### BLOCKER-019: `useSearchParams()` without `<Suspense>`
**File:** `frontend/app/dashboard/clips/page.tsx:58`
**Severity:** HIGH — RUNTIME WARNING
`useSearchParams()` requires Suspense boundary in Next.js 16. Page will bail out of static rendering.

### BLOCKER-020: ASS subtitle injection via LLM output
**File:** `app/rendering/clipper.py:~305`
**Severity:** HIGH — VULNERABILITY
LLM-generated hook headlines inserted directly into ASS files without sanitizing `{`, `}`, `\`. Can break or corrupt captions.

### BLOCKER-021: No `NEXT_PUBLIC_API_URL` validation
**File:** Multiple frontend files
**Severity:** HIGH — SILENT FAILURE
Falls back to `http://localhost:8000` if env var is missing. All API calls fail silently in production.

### BLOCKER-022: Dead waitlist form
**File:** `frontend/app/page.tsx:~325`
**Severity:** HIGH — BROKEN UX
Waitlist email form has no `onSubmit` handler. Form does nothing when submitted.

### BLOCKER-023: Contact form discards all input
**File:** `frontend/app/contact/page.tsx:~63`
**Severity:** HIGH — BROKEN UX
Form uses `alert()` — never sends data anywhere.

### BLOCKER-024: Dead code: `backend/app/` entire directory
**File:** `backend/` directory
**Severity:** MEDIUM — CONFUSION
Complete ghost mirror of `app/` with only `__pycache__/` files. Should be deleted.

### BLOCKER-025: Dead code: `app/worker/` empty directory
**File:** `app/worker/`
**Severity:** MEDIUM — CONFUSION
Empty `app/worker/` vs active `app/workers/`. Import confusion risk.

### BLOCKER-026: Empty/dev `.env.production`
**File:** `.env.production`
**Severity:** CRITICAL — CANNOT START
9 critical keys are blank in `.env.production`. Production cannot start. `docker-compose` will crash on `${REDIS_PASSWORD:?required}`.

---

## Full Findings by Category

### 1. PROJECT STRUCTURE

| # | Issue | File | Severity |
|---|---|---|---|
| S1 | `backend/app/` entire directory is dead code (only __pycache__) | `backend/` | MEDIUM |
| S2 | `app/worker/` empty, actual module is `app/workers/` | `app/worker/` | MEDIUM |
| S3 | `$null` PowerShell artifact at project root | `/$null` | LOW |
| S4 | `mkdir/` empty accidental directory | `/mkdir/` | LOW |
| S5 | `opus_pro.db` orphaned from pre-rebrand | `runtime/db/` | LOW |
| S6 | `runtime/temp/stripe.exe` misplaced 60MB binary | `runtime/temp/` | LOW |
| S7 | Stale render upload dirs in `runtime/` | `runtime/renders/`, `runtime/uploads/` | LOW |
| S8 | `app/schemas/` and `app/services/` declared but empty | `app/schemas/`, `app/services/` | LOW |
| S9 | Redundant root dirs: `output/`, `temp/`, `uploads/` | root | LOW |
| S10 | Broken `smoke_test.py` imports from `app.worker` | `/smoke_test.py` | MEDIUM |

### 2. FRONTEND

| # | Issue | File | Severity |
|---|---|---|---|
| F1 | Hydration mismatch — `WAVEFORM_DATA` + negative height | `frontend/app/page.tsx:10-13` | **CRITICAL** |
| F2 | No `middleware.ts` — unprotected dashboard routes | Missing | **CRITICAL** |
| F3 | EditorModal leaked `setInterval` on modal close | `frontend/components/EditorModal.tsx` | **CRITICAL** |
| F4 | Hardcoded Supabase fallback credentials | `frontend/lib/supabase.ts:3-4` | **CRITICAL** |
| F5 | `useSearchParams()` without `<Suspense>` | `frontend/app/dashboard/clips/page.tsx:58` | HIGH |
| F6 | `DEV_MODE` bypass with fake user | `frontend/lib/AuthContext.tsx` | HIGH |
| F7 | 8 pages have zero SEO metadata (all `'use client'`) | Multiple | HIGH |
| F8 | No `loading.tsx` files on any route | All routes | HIGH |
| F9 | `NEXT_PUBLIC_API_URL` falls back to `localhost:8000` | Multiple files | HIGH |
| F10 | Dead waitlist form | `frontend/app/page.tsx` | HIGH |
| F11 | Contact form discards data to `alert()` | `frontend/app/contact/page.tsx` | HIGH |
| F12 | Missing `not-found.tsx` | Missing | MEDIUM |
| F13 | No mobile nav hamburger menu | `frontend/app/layout.tsx` | MEDIUM |
| F14 | Dashboard sidebar not responsive | `frontend/app/dashboard/layout.tsx` | MEDIUM |
| F15 | Two icon libraries bundled (lucide + phosphor) | Multiple | MEDIUM |
| F16 | No `next/dynamic` for heavy modals | Multiple | MEDIUM |
| F17 | Fonts via `@import` instead of `next/font/google` | `frontend/app/globals.css` | MEDIUM |
| F18 | Missing `aria-label` on most interactive elements | Multiple | MEDIUM |
| F19 | Footer color contrast fails WCAG AA | `frontend/components/Footer.tsx` | MEDIUM |
| F20 | `confirm()` for delete — inaccessible | `frontend/app/dashboard/page.tsx` | MEDIUM |
| F21 | Polling intervals run with tab in background | `frontend/app/dashboard/page.tsx` | MEDIUM |
| F22 | XHR upload has no abort on unmount | `frontend/components/UploadModal.tsx` | MEDIUM |
| F23 | `enableHookOpt` checkbox is dead code | `frontend/components/UploadModal.tsx` | MEDIUM |
| F24 | Sitemap missing `/login`, `/terms`, `/privacy-policy`, `/refund-policy` | `frontend/app/sitemap.xml` | LOW |
| F25 | CSS `height` animation causes layout thrashing | `frontend/app/globals.css` | LOW |
| F26 | Missing `htmlFor` on form labels | Multiple | LOW |

### 3. BACKEND API

| # | Issue | File | Severity |
|---|---|---|---|
| B1 | `spend_usage_minutes` race condition | `app/core/plans.py:54-69` | **CRITICAL** |
| B2 | No API timeout on AI calls | `app/core/analyzer.py`, `app/subtitles/transcriber.py` | **CRITICAL** |
| B3 | `DEV_MODE` auth bypass | `app/api/auth.py:42-47` | **CRITICAL** |
| B4 | Preview signing falls back to Stripe webhook secret | `app/api/main.py:68-78` | HIGH |
| B5 | WebSocket auth skips trial expiry check | `app/api/main.py:381-385` | HIGH |
| B6 | Rate limiter fails OPEN on Redis failure | `app/api/main.py:254-260` | HIGH |
| B7 | Only `/api/upload` is rate-limited | Multiple | MEDIUM |
| B8 | `socket.getaddrinfo` blocking in async handler | `app/api/main.py:147` | MEDIUM |
| B9 | `print()` used everywhere instead of logging | Multiple | MEDIUM |
| B10 | `WordUpdate` has no `max_length` | `app/api/main.py:574-577` | MEDIUM |
| B11 | `EditClipRequest` fields lack length validation | `app/api/main.py` | MEDIUM |
| B12 | Inconsistent API resource naming (`/api/job/` vs `/api/jobs/`) | `app/api/main.py` | LOW |
| B13 | Inconsistent error response shapes | `app/api/main.py` | LOW |
| B14 | `Base.metadata.create_all()` at import time | `app/api/main.py:33` | LOW |
| B15 | Legacy plan aliases silently upgrade users | `app/api/auth.py:24-28` | LOW |
| B16 | `OPENAI_API_KEY` optional but not validated at startup | `app/config.py:301` | LOW |

### 4. DATABASE & SUPABASE

| # | Issue | File | Severity |
|---|---|---|---|
| D1 | `spend_usage_minutes` read-modify-write race | `app/core/plans.py` | **CRITICAL** |
| D2 | Credit pack purchase read-modify-write race | `app/api/payments.py:159` | **CRITICAL** |
| D3 | No monthly `used_minutes` reset mechanism | Multiple | **CRITICAL** |
| D4 | `jobs.user_id` has no index | `app/models/models.py:28` | HIGH |
| D5 | `users.stripe_customer_id` has no index | `app/models/models.py:14` | HIGH |
| D6 | `downgrade_subscription` leaves users over-limit | `app/api/payments.py:52-54` | HIGH |
| D7 | `next_billing_date` never populated | `app/models/models.py` | MEDIUM |
| D8 | No CHECK constraints on numeric columns | `app/models/models.py` | MEDIUM |
| D9 | No foreign key ON DELETE behavior specified | `app/models/models.py` | MEDIUM |
| D10 | No Alembic migrations | Missing | MEDIUM |
| D11 | `is_beta_user` has no admin toggle | `app/models/models.py` | MEDIUM |
| D12 | No `subscription_status` column | `app/models/models.py` | MEDIUM |
| D13 | `rollover_credits` nullable but shouldn't be | `app/models/models.py` | LOW |

### 5. PAYMENT & BILLING

| # | Issue | File | Severity |
|---|---|---|---|
| P1 | No monthly `used_minutes` reset on renewal | `app/api/payments.py` | **CRITICAL** |
| P2 | No self-service cancellation (billing placeholder) | `frontend/app/dashboard/billing/page.tsx` | HIGH |
| P3 | No `stripe_subscription_id` on User model | `app/models/models.py` | HIGH |
| P4 | No `invoice.payment_failed` webhook handling | `app/api/payments.py` | MEDIUM |
| P5 | Idempotency fails open on Redis down | `app/api/payments.py:30-36` | MEDIUM |
| P6 | Credit-back on failed renders not implemented | `app/workers/tasks.py` | MEDIUM |
| P7 | No idempotency key on checkout creation | `app/api/payments.py:62` | LOW |
| P8 | No Stripe Customer Portal integration | Missing | LOW |
| P9 | Trial minutes model is "one-time" not "per-month" | `app/core/plans.py` | LOW |

### 6. AI PIPELINE

| # | Issue | File | Severity |
|---|---|---|---|
| A1 | Silently swallowed exceptions per chunk | `app/core/analyzer.py:242` | **CRITICAL** |
| A2 | No timeout on OpenAI/Groq API calls | `app/core/analyzer.py:154`, `app/subtitles/transcriber.py:98` | **CRITICAL** |
| A3 | No chunk count limit — 3hr video = 35+ API calls | `app/core/analyzer.py` | **CRITICAL** |
| A4 | Fallback clips are blind duration guesses | `app/core/analyzer.py:248-277` | **CRITICAL** |
| A5 | ASS subtitle injection via unsanitized LLM output | `app/rendering/clipper.py:~305` | **CRITICAL** |
| A6 | No API cost cap per job/user | Multiple | **CRITICAL** |
| A7 | Retry endpoint has no rate limiter | `app/api/main.py:~800` | HIGH |
| A8 | Job `provider` field never updated on fallback | `app/workers/tasks.py:164` | HIGH |
| A9 | No inter-request delay between chunk API calls | `app/core/analyzer.py` | HIGH |
| A10 | FaceTracker singleton not thread-safe | `app/tracking/face_processor.py:232` | HIGH |
| A11 | No file size limit on URL downloads | `app/core/downloader.py` | HIGH |
| A12 | No prompt injection guard on transcript | `app/core/analyzer.py:128` | MEDIUM |
| A13 | No provider health check at startup | Missing | MEDIUM |
| A14 | Hardcoded model names | `app/core/analyzer.py` | LOW |
| A15 | `get_video_info_url` has no timeout | `app/core/downloader.py` | LOW |

### 7. SECURITY

| # | Issue | File | Severity |
|---|---|---|---|
| SEC1 | Database password committed in `.env.production` | `.env.production` | **CRITICAL** |
| SEC2 | Supabase JWT secret committed in `.env.production` | `.env.production` | **CRITICAL** |
| SEC3 | Live Groq API key in `.env` | `.env` | **CRITICAL** |
| SEC4 | Live Stripe webhook secret in `.env` | `.env` | **CRITICAL** |
| SEC5 | Hardcoded Supabase credentials in frontend source | `frontend/lib/supabase.ts` | **CRITICAL** |
| SEC6 | `.env.production` baked into Docker image | `.dockerignore` | **CRITICAL** |
| SEC7 | Missing security headers (CSP, HSTS, X-Frame-Options) | `app/api/main.py` | HIGH |
| SEC8 | CSRF protection missing | `app/api/main.py` | HIGH |
| SEC9 | CORS `allow_methods=["*"]`, `allow_headers=["*"]` | `app/api/main.py:178` | HIGH |
| SEC10 | WebSocket token in query string | `app/api/main.py:305` | MEDIUM |
| SEC11 | `DEV_MODE` bypass accessible via env var | Multiple | MEDIUM |
| SEC12 | Preview signing hardcoded in `DEV_MODE` | `app/api/main.py:80` | MEDIUM |
| SEC13 | Error message leakage in health endpoint | `app/api/main.py` | MEDIUM |
| SEC14 | Docker runs as root | `Dockerfile` | MEDIUM |
| SEC15 | Unpinned Python dependencies | `requirements.txt` | MEDIUM |
| SEC16 | No `.dockerignore` for tests, docs, frontend | `.dockerignore` | LOW |
| SEC17 | `REDIS_PASSWORD` exposed via `env_file` | `docker-compose.yml` | LOW |

### 8. DEVOPS & DEPLOYMENT

| # | Issue | File | Severity |
|---|---|---|---|
| O1 | `psycopg2-binary` can't build on slim image | `Dockerfile` | **CRITICAL** |
| O2 | Docker volume mounts mismatch | `docker-compose.yml` | **CRITICAL** |
| O3 | `.env.production` has 9 blank critical keys | `.env.production` | **CRITICAL** |
| O4 | No `railway.json` or `Procfile` | Missing | HIGH |
| O5 | No CI/CD pipeline | Missing | HIGH |
| O6 | `retry_job.py` broken import path | `scripts/retry_job.py:21` | HIGH |
| O7 | No Redis persistence volume | `docker-compose.yml` | MEDIUM |
| O8 | No worker healthcheck | `docker-compose.yml` | MEDIUM |
| O9 | No container resource limits | `docker-compose.yml` | MEDIUM |
| O10 | No monitoring/alerting | Missing | MEDIUM |
| O11 | `frontend/.env.production` points to nonexistent API | `frontend/.env.production` | MEDIUM |
| O12 | Unpinned pip deps break reproducibility | `requirements.txt` | MEDIUM |
| O13 | No database backup verification | Missing | MEDIUM |
| O14 | No Celery Flower for worker visibility | Missing | LOW |
| O15 | No multi-stage Docker build | `Dockerfile` | LOW |

### 9. UX & PRODUCT

| # | Issue | File | Severity |
|---|---|---|---|
| U1 | Dead waitlist form on homepage | `frontend/app/page.tsx` | HIGH |
| U2 | Contact form discards all input | `frontend/app/contact/page.tsx` | HIGH |
| U3 | Billing page is a placeholder | `frontend/app/dashboard/billing/page.tsx` | HIGH |
| U4 | Projects page is a placeholder | `frontend/app/dashboard/projects/page.tsx` | HIGH |
| U5 | Missing nav items for Billing and Projects | `frontend/app/dashboard/layout.tsx` | MEDIUM |
| U6 | No branded 404 page | Missing | MEDIUM |
| U7 | No mobile hamburger menu | `frontend/app/layout.tsx` | MEDIUM |
| U8 | Video hover-to-play doesn't work on touch | `frontend/app/dashboard/clips/page.tsx` | MEDIUM |
| U9 | Trial "one-time" vs "per-month" confusion | Multiple | LOW |
| U10 | No skip-to-content link for accessibility | Missing | LOW |

---

## Top 10 Critical Fixes Before Launch

1. **Rotate all exposed secrets** — DB password, JWT secret, Groq key, Stripe keys (BLOCKER-001)
2. **Add `middleware.ts`** for server-side route protection (BLOCKER-002)
3. **Fix `spend_usage_minutes`** race condition with atomic SQL update (BLOCKER-003)
4. **Reset `used_minutes`** in `activate_subscription` on renewal (BLOCKER-004)
5. **Fix EditorModal leaked `setInterval`** (BLOCKER-005)
6. **Fix silent AI exception swallow** in `_run_analyze_transcript` (BLOCKER-006)
7. **Add `timeout=`** to all OpenAI/Groq API calls (BLOCKER-007)
8. **Fix hydration mismatch** in `WAVEFORM_DATA` on homepage (BLOCKER-008)
9. **Guard `DEV_MODE`** in both frontend and backend (BLOCKER-009)
10. **Fix Docker volume mounts** and `psycopg2-binary` build (BLOCKER-011, BLOCKER-012)

---

## Recommended Launch Sequence

### Phase 0: Pre-Launch (Week 1-2)
- Rotate all secrets from git history
- Add `middleware.ts` for auth protection
- Fix all 26 blockers

### Phase 1: Internal Beta (Week 3)
- Deploy to Railway with 1-2 internal testers
- Add Sentry error tracking
- Add UptimeRobot monitoring
- Verify Stripe webhooks end-to-end

### Phase 2: Closed Beta (Week 4-5)
- 10-20 beta users
- Add Stripe Customer Portal
- Add database indexes
- Add rate limiting to all endpoints

### Phase 3: Public Launch (Week 6)
- Scale to 2+ web workers, 4+ Celery workers
- Enable monitoring dashboards
- Add CDN for video delivery
- 24/7 on-call rotation
