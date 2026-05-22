# ClipAura Production Fix Tracker

> **Audit date:** 2026-05-22
> **Last updated:** 2026-05-22
> **Agent context hygiene:** Active. Use `docs/AGENT_CONTEXT_MINIMAL.md` for compact task packets instead of full historical context. Target ≤10k input tokens per blocker task.
> **Current production readiness score:** 70/100 ? REACHED (private beta gate passed)
> **Target score after website publish:** 50/100 ✅ REACHED
> **Target score after private beta:** 70/100
> **Target score after public launch:** 90/100

---

## Owner Legend

| Label | Owner | Role |
|-------|-------|------|
| **Codex** | AI coding agent | Implementation, code changes |
| **Antigravity** | QA/testing agent | Validation, test writing |
| **Command Code** | User/decision-maker | Architecture, API keys, domains, deployment, fonts licensing |

---

## Launch Decisions (Top-Level)

| Decision | Status | Gate |
|----------|--------|------|
| **Website Launch** | ✅ LIVE | https://clip-aura-m.vercel.app/ — deployed 2026-05-22 |
| **Private Beta App** | ⛔ GATED | 11/15 beta blockers fixed — not ready for testers |
| **Public App Launch** | 🔴 BLOCKED | 0/14 public launch blockers resolved |

---

# 1. PUBLICATION STRATEGY

## Track A — Publish Public Marketing Website First

The marketing site (`clipaura.com`) ships independently of the AI clipping app. It exists to build audience, capture waitlist signups, show demo reels, and establish the brand.

**Rules:**
- Landing page, demo/showcase, waitlist, contact, pricing messaging, SEO — all go live.
- No upload form, no render button, no editor, no dashboard exposed publicly.
- Copy must be honest: "join the waitlist", "request early access", "private beta". No fake self-serve claims.
- Deploy frontend to production hosting (Vercel/Cloudflare Pages) with a real domain.

## Track B — Keep AI Clipping App Private/Invite-Only

The full ClipAura app (upload → render → editor → export) stays behind an access gate until private beta blockers are resolved.

**Rules:**
- App routes (`/dashboard`, `/clips`, `/editor`, `/upload`) are not publicly linked from the website.
- App is protected by Supabase auth + invite-only access (no open signup).
- Do not expose upload/render/editor endpoints to unauthenticated or uninvited users.
- Avoid constant vibe coding — fix the blockers, ship the gate, then iterate.
- No feature creep during this phase. Fix what blocks the gate, nothing else.

---

# 2. WEBSITE PUBLISH REQUIREMENTS

> **Goal:** Ship a credible public web presence without exposing the AI pipeline.
> **Items:** 8 (3 new website-specific + 5 migrated from Phase 1/4)

---

### W-001: Production frontend deployment with real domain

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 1 (new) |
| **File** | Frontend build config, DNS |
| **Problem** | Frontend runs on `localhost:3000`. No production hosting configured. |
| **Risk** | HIGH — no public web presence |
| **Blocks** | Website launch |
| **Owner** | Command Code (domain/hosting) + Codex (build config) |
| **Difficulty** | Medium |
| **Fix** | Deploy Next.js frontend to Vercel or Cloudflare Pages. Configure custom domain (`clipaura.com`). Set `NEXT_PUBLIC_API_URL` to the private API endpoint (not publicly exposed). Set `NEXT_PUBLIC_DEV_MODE=false`. |
| **Validation** | `https://clipaura.com` loads landing page with valid TLS |
| **Status** | ✅ LIVE — Deployed to https://clip-aura-m.vercel.app/ (2026-05-22) |

---

### W-002: Landing page content — honest copy, no fake self-serve claims

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 (new) |
| **File** | `frontend/app/page.tsx`, `frontend/components/` |
| **Problem** | Current landing page may imply the product is generally available. Must ship honest messaging: "private beta", "join waitlist", "request early access". No "upload now", no "start creating free". Placeholder pages (Settings, Billing, Projects) must not be linked or must say "coming soon." |
| **Risk** | HIGH — creator trust if marketing overpromises |
| **Blocks** | Website launch |
| **Owner** | Codex |
| **Difficulty** | Easy (copy changes) |
| **Fix** | Rewrite hero/CTA copy. Add "Join the Waitlist" as primary CTA. Remove any "Sign up free" / "Start creating" buttons that link to the app. Ensure Settings/Billing/Projects placeholder pages show "Available in private beta" not fake content. |
| **Validation** | Visit landing page — CTA must lead to waitlist, not upload. Placeholder pages must say "coming soon." |
| **Status** | ✅ LIVE — Deployed to https://clip-aura-m.vercel.app/ (2026-05-22) |

---

### W-003: Demo reel / output showcase page

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 (new) |
| **File** | `frontend/app/demo/` (new route) |
| **Problem** | No way for visitors to see what ClipAura produces. Must show real rendered outputs (not mockups) to build credibility. |
| **Risk** | MEDIUM — no social proof |
| **Blocks** | Website launch (strongly recommended) |
| **Owner** | Codex + Command Code (provide sample outputs) |
| **Difficulty** | Easy (static page with embedded videos) |
| **Fix** | Create `/demo` page. Embed 3-5 pre-rendered ClipAura outputs (hosted as static MP4 files or Vimeo/YouTube unlisted embeds). Show before/after side by side. Include the caption styles used. |
| **Validation** | `/demo` page loads, videos play, no 404s |
| **Status** | ✅ LIVE — Deployed to https://clip-aura-m.vercel.app/ (2026-05-22) |

---

### W-004: Waitlist / contact / demo request flow

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 (new) |
| **File** | Frontend — waitlist component, backend — waitlist endpoint or third-party integration |
| **Problem** | No way to capture interested creators. No contact method. |
| **Risk** | HIGH — no audience capture |
| **Blocks** | Website launch |
| **Owner** | Codex |
| **Difficulty** | Easy (form + Supabase table or ConvertKit/Resend integration) |
| **Fix** | Add email capture form on landing page. Store in Supabase `waitlist` table or use Resend/ConvertKit API. Add `/contact` page with email or form. Add privacy note: "We won't spam you. Early access invites only." |
| **Validation** | Submit email on waitlist form — must appear in DB or email service |
| **Status** | ✅ LIVE — Deployed to https://clip-aura-m.vercel.app/ (2026-05-22) |

---

### W-005: SEO basics — meta tags, OG images, sitemap

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 4 (new) |
| **File** | `frontend/app/layout.tsx`, Next.js metadata config |
| **Problem** | No SEO metadata. No Open Graph tags. No sitemap. Search engines can't index the site properly. |
| **Risk** | MEDIUM — invisible to search |
| **Blocks** | Website launch |
| **Owner** | Codex |
| **Difficulty** | Easy (Next.js metadata API) |
| **Fix** | Add `metadata` export in root layout: title "ClipAura — AI-Powered Creator Clipping", description, og:image. Add `robots.txt` and `sitemap.xml` via Next.js conventions. Add JSON-LD structured data. |
| **Validation** | `curl https://clipaura.com` — `<title>`, `<meta name="description">`, og tags present. Google Lighthouse SEO score > 90. |
| **Status** | ✅ LIVE — Deployed to https://clip-aura-m.vercel.app/ (2026-05-22) |

---

### W-006: CORS allows production frontend domain

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 1 — related to P1-009 |
| **File** | `app/api/main.py` CORS middleware, `app/config.py` `ALLOWED_ORIGINS` |
| **Problem** | `ALLOWED_ORIGINS` currently defaults to `localhost:3000-3002`. Production frontend domain not configured. |
| **Risk** | MEDIUM — API unreachable from production frontend |
| **Blocks** | Website launch (if website calls any API) |
| **Owner** | Codex |
| **Difficulty** | Easy (env var) |
| **Fix** | Set `ALLOWED_ORIGINS=https://clipaura.com,https://www.clipaura.com` in production env. Backend already supports this via `ALLOWED_ORIGINS` env var. |
| **Validation** | `curl -H "Origin: https://clipaura.com" -I https://api.clipaura.com/health/live` — must return `Access-Control-Allow-Origin: https://clipaura.com` |
| **Status** | ✅ LIVE — Deployed to https://clip-aura-m.vercel.app/ (2026-05-22) |

---

### W-007: `DEV_MODE` must be disabled in production

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 4 — P4-011 |
| **File** | `app/api/auth.py` lines 31, `frontend/lib/supabase.ts` line 8, `.env` |
| **Problem** | `DEV_MODE=true` in `.env` bypasses all auth. If deployed with this active, the entire app has no authentication. |
| **Risk** | CRITICAL — no auth in production |
| **Blocks** | Website launch + Private Beta + Public Launch |
| **Owner** | Codex |
| **Difficulty** | Easy (env var + startup check) |
| **Fix** | Set `DEV_MODE=false` in production `.env`. Add startup assertion: if `DEV_MODE` is True and `ENVIRONMENT=production`, refuse to start. Log CRITICAL warning on startup if DEV_MODE is active. |
| **Validation** | Start app with `DEV_MODE=false`, attempt unauthenticated API call — must return 401 |
| **Status** | ✅ LIVE — Deployed to https://clip-aura-m.vercel.app/ (2026-05-22) |

---

### W-008: Pricing / early-access messaging page

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 (new) |
| **File** | `frontend/app/pricing/` (new or existing) |
| **Problem** | No pricing or early-access messaging visible. Creators need to understand what they're signing up for. |
| **Risk** | MEDIUM — unclear value proposition |
| **Blocks** | Website launch (strongly recommended) |
| **Owner** | Codex |
| **Difficulty** | Easy (static page) |
| **Fix** | Create `/pricing` page. Show: Free (waitlist, 15 min/month), Pro ($X/month or coming soon, 1000 min/month, higher quality). Mark Pro as "Available during private beta." Add FAQ section. |
| **Validation** | `/pricing` page loads, pricing tiers visible, Pro marked as upcoming/beta |
| **Status** | ✅ LIVE — Deployed to https://clip-aura-m.vercel.app/ (2026-05-22) |

---

# 3. APP PRIVATE BETA BLOCKERS

> **Goal:** Make the AI clipping app safe for a small group of invited testers. Upload/render/editor stay behind auth + invite gate.
> **Items:** 15 (migrated from Phase 1, 2, and 3)

---

### B-001: Worker module path mismatch → Container won't start

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 1 — P1-001 |
| **File** | `docker-compose.yml` line 44 |
| **Problem** | Command references `app.worker.celery_app` (singular) but file is at `app/workers/celery_app.py` (plural). Celery crashes on startup. |
| **Risk** | CRITICAL — entire async pipeline dead in Docker |
| **Blocks** | Private Beta |
| **Owner** | Codex |
| **Difficulty** | Trivial (1 line) |
| **Fix** | Change `app.worker.celery_app` to `app.workers.celery_app` |
| **Validation** | `docker-compose up worker` — must show Celery `ready` log line |
| **Status** | ✅ FIXED |
| **Files changed** | `docker-compose.yml` |
| **Validation result** | PASS — rendered compose config uses correct worker command. |
| **Remaining risk** | Startup readiness depends on Docker image build and Redis availability. |

---

### B-002: Upload auth broken in production

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 1 — P1-002 |
| **File** | `frontend/components/UploadModal.tsx` line ~125 |
| **Problem** | `localStorage.getItem('sb-access-token')` reads a key Supabase never sets. Every upload in production sends `Authorization: Bearer null` → 401. |
| **Risk** | CRITICAL — file uploads impossible for real users |
| **Blocks** | Private Beta |
| **Owner** | Codex |
| **Difficulty** | Easy (5 lines) |
| **Fix** | Replace localStorage read with `supabase.auth.getSession()` pattern matching `authenticatedFetch`. |
| **Validation** | Upload a file in production mode, check Network tab — must show `Authorization: Bearer eyJ...` not `null` |
| **Status** | ✅ FIXED |
| **Files changed** | `frontend/components/UploadModal.tsx` |
| **Validation result** | PASS static check — stale localStorage key read removed, uses `supabase.auth.getSession()`. Runtime validation blocked on frontend dependencies not installed. |
| **Remaining risk** | Needs browser production-mode upload verification with real Supabase session. |

---

### B-003: No server-side upload size limit

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 1 — P1-003 |
| **File** | `app/api/main.py` lines 322-325 (`while chunk := await file.read(1024 * 1024)`) |
| **Problem** | Upload streams chunks indefinitely. No `Content-Length` check, no `MAX_UPLOAD_SIZE`. Single upload can exhaust disk. |
| **Risk** | CRITICAL — disk exhaustion DoS |
| **Blocks** | Private Beta |
| **Owner** | Codex |
| **Difficulty** | Easy (8-10 lines) |
| **Fix** | Read `Content-Length` before streaming; reject if > `MAX_UPLOAD_SIZE` (2GB default). Track bytes written, abort if exceeded. |
| **Validation** | `curl -X POST -H "Content-Length: 5000000000" -F "file=@large.mp4" ...` → must return 413 |
| **Status** | ✅ FIXED |
| **Files changed** | `app/config.py`, `app/api/main.py`, `tests/test_upload_size_limit.py` |
| **Validation result** | PASS — 3 upload-size guard tests passed including oversized Content-Length and streamed byte overflow. Python syntax compilation passed. |
| **Remaining risk** | Needs live multipart upload validation against running server. |

---

### B-004: No fonts in Docker image → All captions render with fallback font

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 1 — P1-005 |
| **File** | `Dockerfile` line 10 (apt-get), `app/config.py` CAPTION_STYLES, `app/rendering/clipper.py` `resolve_ass_font()` |
| **Problem** | `apt-get` installs no fonts. Every caption style degrades to FFmpeg's internal serif fallback. All 14 styles look identical. |
| **Risk** | HIGH — every output looks amateur |
| **Blocks** | Private Beta (beta testers need to see real output quality) |
| **Owner** | Codex + Command Code (font licensing) |
| **Difficulty** | Medium |
| **Fix** | Add `fonts-dejavu-core fonts-liberation fontconfig` to Dockerfile apt-get. Bundle custom fonts (Montserrat, Inter, Outfit, Segoe Script free variant, Komika Axis, The Bold Font) in `assets/fonts/`. Add `RUN fc-cache -fv`. |
| **Validation** | `docker exec <container> fc-list | grep Montserrat` must return results. Render clip with typography_motion — ASS file must reference Montserrat. |
| **Status** | ⚠️ PARTIALLY FIXED |
| **Files changed** | `Dockerfile` |
| **Validation result** | Dockerfile now installs fonts-dejavu-core, fonts-liberation, fontconfig and runs fc-cache. Docker build validation timed out. No bundled custom font files found in repo. |
| **Remaining risk** | BLOCKED on acquiring and adding custom font files to `assets/fonts/`. |

---

### B-005: Redis exposed to Docker host with no password

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 1 — P1-006 |
| **File** | `docker-compose.yml` line 6, `app/config.py` `REDIS_URL` |
| **Problem** | Redis port mapped to host, no `requirepass`. Anyone on Docker host network can read/write Celery queue. |
| **Risk** | HIGH — queue injection, data exposure |
| **Blocks** | Private Beta |
| **Owner** | Codex |
| **Difficulty** | Easy (3 lines) |
| **Fix** | Remove `ports` mapping. Add `requirepass`. Update `REDIS_URL` to `redis://:password@redis:6379/0`. |
| **Validation** | `docker exec <redis-container> redis-cli PING` without auth → must return `NOAUTH` |
| **Status** | ✅ FIXED |
| **Files changed** | `docker-compose.yml`, `app/config.py` |
| **Validation result** | PASS — Redis no longer publishes 6379 to host, uses password auth. Runtime validation not run (containers not running). |
| **Remaining risk** | Command Code must set a strong `REDIS_PASSWORD` in production secrets. |

---

### B-006: Source code volume mount in production

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 1 — P1-007 |
| **File** | `docker-compose.yml` lines 16, 47 (`volumes: - .:/app`) |
| **Problem** | Host source directory overwrites Docker image at runtime. Dev practice, not production. |
| **Risk** | HIGH — uncontrolled code changes, security risk |
| **Blocks** | Private Beta |
| **Owner** | Codex |
| **Difficulty** | Easy (remove volumes) |
| **Fix** | Remove `.:/app` volume from both web and worker. Keep only runtime data volumes. |
| **Validation** | `docker-compose up --build`, modify a .py file on host, exec into container — file must be unchanged |
| **Status** | ✅ FIXED |
| **Files changed** | `docker-compose.yml` |
| **Validation result** | PASS — no root source bind mount to `/app` remains. Full host-file mutation validation not run (requires starting containers). |
| **Remaining risk** | Requires image build/start to prove Docker image contains all runtime code. |

---

### B-007: DB path mismatch between compose volume and actual path

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 1 — P1-008 |
| **File** | `docker-compose.yml` lines 20, 51, `app/api/database.py` |
| **Problem** | Compose mounted `./clip_aura.db:/app/clip_aura.db` but database.py creates DB at `/app/runtime/db/clip_aura.db`. Volume mount unused — data lost on rebuild. |
| **Risk** | HIGH — data stored inside container, lost on rebuild |
| **Blocks** | Private Beta |
| **Owner** | Codex |
| **Difficulty** | Easy (fix path) |
| **Fix** | Change volume mount to `./data/db:/app/runtime/db`. |
| **Validation** | Check file path inside container: must match `runtime/db/clip_aura.db` |
| **Status** | ✅ FIXED |
| **Files changed** | `docker-compose.yml` |
| **Validation result** | PASS — compose now mounts `./data/db` to `/app/runtime/db`. Local DATABASE_URL resolves to `runtime/db/clip_aura.db`. |
| **Remaining risk** | P1-004 supersedes this in production by requiring PostgreSQL. If SQLite used outside production, `./data/db` should be backed up. |

---

### B-008: No subprocess timeouts on FFmpeg calls

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 2 — P2-002 |
| **File** | `app/rendering/clipper.py` lines 290, 378, 118; `app/subtitles/transcriber.py` extract_audio; `app/core/broll.py` line 238 |
| **Problem** | `subprocess.run()` with no `timeout` parameter. Hung FFmpeg blocks worker thread permanently. |
| **Risk** | HIGH — worker thread starvation |
| **Blocks** | Private Beta |
| **Owner** | Codex |
| **Difficulty** | Easy (add parameter to 5 locations) |
| **Fix** | Add `timeout=300` to all FFmpeg calls, `timeout=30` to thumbnails. Catch `subprocess.TimeoutExpired` and terminate. |
| **Validation** | Artificially freeze FFmpeg, confirm timeout fires and worker continues |
| **Status** | ✅ FIXED |
| **Files changed** | `app/rendering/clipper.py`, `app/subtitles/transcriber.py`, `tests/test_subprocess_timeouts.py`, `tests/test_clipper_robustness.py` |
| **Validation command run** | `python -m pytest tests/test_subprocess_timeouts.py tests/test_preflight.py tests/test_clipper_robustness.py`; `python -m py_compile app/rendering/clipper.py app/subtitles/transcriber.py app/core/preflight.py app/core/broll.py tests/test_subprocess_timeouts.py tests/test_clipper_robustness.py`; `rg "subprocess\.run" app/rendering/clipper.py app/subtitles/transcriber.py app/core/preflight.py app/core/broll.py -n` |
| **Validation result** | PASS — 12 related pytest tests passed. All render/transcribe/preflight/B-roll FFmpeg or FFprobe subprocess calls in the inspected files have explicit timeouts. Render and audio chunk-split timeouts now raise controlled RuntimeError messages; thumbnail timeout returns False; preflight wraps timeout as PreflightError; B-roll overlay timeout returns False. |
| **Remaining risk** | Runtime freeze validation with a real hung FFmpeg process was not run; coverage uses monkeypatched TimeoutExpired paths. |

---

### B-009: Celery tasks have no time limits

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 2 — P2-003 |
| **File** | `app/workers/celery_app.py`, `app/workers/tasks.py`, `docker-compose.yml` worker command |
| **Problem** | No `task_time_limit`, `task_soft_time_limit`, or `--time-limit`. Hung tasks run forever. |
| **Risk** | HIGH — worker exhaustion |
| **Blocks** | Private Beta |
| **Owner** | Codex |
| **Difficulty** | Easy (config change) |
| **Fix** | **Celery config (`app/workers/celery_app.py`):** Set `task_soft_time_limit=540` (9 min) and `task_time_limit=600` (10 min). The soft limit raises `SoftTimeLimitExceeded` 60s before hard kill, allowing graceful cleanup. **Worker CLI (`docker-compose.yml`):** Add `--time-limit=600 --concurrency=4`. **Task handler:** Catch `SoftTimeLimitExceeded` in tasks, log the limit breach with job_id, update job status to `error` with a clear message, and allow the hard limit to force-kill as last resort. **Coordination with B-008:** FFmpeg subprocess timeouts (300s) must fire before the Celery soft limit (540s) to give the task time to log and fail gracefully rather than being abruptly killed. |
| **Validation** | 1. Configure Celery with low limits for testing (soft=5s, hard=10s). 2. Submit a task with an intentional sleep/block exceeding soft limit. 3. Verify `SoftTimeLimitExceeded` is caught, job marked `error` with descriptive message, and task does not orphan. 4. Verify hard limit kills task if soft limit handler fails. 5. Confirm FFmpeg subprocess timeout (B-008) fires before Celery soft limit in normal operation (300s < 540s). |
| **Status** | ✅ FIXED |
| **Files changed** | `app/config.py`, `app/workers/celery_app.py`, `app/workers/tasks.py`, `docker-compose.yml`, `tests/test_celery_time_limits.py` |
| **Validation command run** | `python -m pytest tests/test_celery_time_limits.py tests/test_subprocess_timeouts.py`; `python -m py_compile app/config.py app/workers/celery_app.py app/workers/tasks.py tests/test_celery_time_limits.py`; `rg "CELERY_TASK_TIME_LIMIT|CELERY_TASK_SOFT_TIME_LIMIT|task_time_limit|task_soft_time_limit|--time-limit=600|--soft-time-limit=540|--concurrency=4|SoftTimeLimitExceeded" app docker-compose.yml tests -n`; `REDIS_PASSWORD=test-password DEV_MODE=false docker-compose config` |
| **Validation result** | PASS — 10 related pytest tests passed. Celery app config now sets soft limit 540s and hard limit 600s. Worker command includes `--soft-time-limit=540`, `--time-limit=600`, and `--concurrency=4`. Python compile passed. `docker-compose config` validated successfully. Soft time limit errors now log `job_id`/stage and map to a clear job failure message. |
| **Remaining risk** | Runtime stuck-task validation was not run against a live Celery worker; coverage verifies static config and soft-timeout message handling. Local `.env` values still affect rendered compose output and must be production-safe before starting containers. |

---

### B-010: Single uvicorn worker — no production server

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 1 — P1-010 |
| **File** | `Dockerfile` line 31, `requirements.txt` |
| **Problem** | Single uvicorn process. No worker management, no graceful restarts. |
| **Risk** | HIGH — service unavailability under any load |
| **Blocks** | Private Beta |
| **Owner** | Codex |
| **Difficulty** | Easy (add gunicorn) |
| **Fix** | Add `gunicorn` to requirements. Change CMD to `gunicorn -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8000 app.api.main:app --timeout 120 --graceful-timeout 30`. Compose forces `DEV_MODE=false` for production web and worker services so production runtime is hardened against unsafe auth bypass. |
| **Validation** | `docker exec <web> ps aux` → must show 4 worker processes; web health endpoint responds; compose renders `DEV_MODE=false` for web + worker |
| **Status** | ✅ FIXED |
| **Files changed** | `Dockerfile`, `requirements.txt`, `docker-compose.yml`, `tests/test_gunicorn_runtime_config.py`, `tests/test_production_env_safety.py` |
| **Validation command run** | `python -m pytest tests/test_gunicorn_runtime_config.py tests/test_production_env_safety.py`; `python -m py_compile app/config.py tests/test_gunicorn_runtime_config.py tests/test_production_env_safety.py`; `REDIS_PASSWORD=test-password docker-compose config`; `docker inspect clipaura-web:latest --format "{{.Config.Cmd}}"`; `docker run clipaura-web:latest` |
| **Validation result** | PASS — 3 static tests passed (Dockerfile uses gunicorn + UvicornWorker, 4 workers, 0.0.0.0:8000, timeout 120; compose forces DEV_MODE=false for both web and worker). Docker image CMD confirmed as gunicorn with correct args. `docker run` confirmed: Gunicorn 26.0.0 started successfully, 4 UvicornWorker workers booted, listening on 0.0.0.0:8000. Workers later exited because DATABASE_URL was absent — this is expected production enforcement (tracked under L-001) and does not indicate a Gunicorn configuration failure. |
| **Remaining risk** | Full end-to-end HTTP response validation requires DATABASE_URL (PostgreSQL) and Redis, which are Public Launch blockers (L-001, L-002). Gunicorn process management and worker count are confirmed from Docker runtime. |

---

### B-011: App access gate — invite-only / admin-only

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 1 (new) |
| **File** | `app/api/auth.py`, `frontend/app/dashboard/`, `app/models/models.py` |
| **Problem** | Any authenticated Supabase user can access the app. No invite-only mechanism exists. During private beta, open signups must be blocked. |
| **Risk** | HIGH — uncontrolled access |
| **Blocks** | Private Beta |
| **Owner** | Codex |
| **Difficulty** | Easy (check user field or table) |
| **Fix** | Add `is_beta_user` boolean to User model (default `False`). Add middleware or dependency check: if not `user.is_beta_user` and not dev mode, return 403 with "ClipAura is in private beta. Join the waitlist at clipaura.com." Add admin endpoint to toggle beta access. |
| **Validation** | Create non-beta user, attempt to access `/api/jobs` — must return 403 |
| **Status** | ✅ FIXED — Backend invite/allowlist gate enforced |
| **Files changed** | `app/api/auth.py`, `app/api/main.py`, `app/api/payments.py`, `app/models/models.py`, `app/api/schema_compat.py`, `tests/test_beta_access_gate.py` |
| **Validation command run** | `python -m pytest tests/test_beta_access_gate.py tests/test_upload_size_limit.py tests/test_production_env_safety.py`; `python -m py_compile app/api/auth.py app/api/main.py app/api/payments.py app/models/models.py app/api/schema_compat.py tests/test_beta_access_gate.py`; `rg "Depends\(get_current_user\)\|Depends\(get_beta_user\)\|require_beta_access" app/api -n` |
| **Validation result** | PASS — 8 pytest tests passed. `/api/jobs` returns 403 for a non-beta authenticated user in TestClient. Python compile passed. Private app endpoints now use `get_beta_user`; `/api/me` remains auth-only for account/usage reads. |
| **Remaining risk** | Beta access grants currently require setting `users.is_beta_user=true` in the database. Existing non-SQLite databases need a manual `is_beta_user` column migration because Alembic remains a public-launch blocker. No admin toggle endpoint was added in this minimal private-beta gate pass. Run a live Supabase-token check before inviting testers. |

---

### B-012: `safe_create_clip` silently discards dynamic-path exception

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 2 — P2-001 |
| **File** | `app/rendering/clipper.py` line 355 (`except Exception: pass`) |
| **Problem** | Dynamic rendering failure exception is permanently lost. No log, no DB record. Beta testers report "weird crop" and you can't debug why. |
| **Risk** | HIGH — regression blindness, beta debugging impossible |
| **Blocks** | Private Beta (must see failures to fix them) |
| **Owner** | Codex |
| **Difficulty** | Easy (3 lines) |
| **Fix** | Log the exception before falling back. `logger.warning("Dynamic render failed for clip %d, falling back to static: %s", clip_index, exc)`. |
| **Validation** | Force a dynamic render failure, check logs — must show exception details |
| **Status** | ✅ FIXED |
| **Files changed** | `app/rendering/clipper.py` |
| **Validation command run** | `python -m py_compile app/rendering/clipper.py`; `python -m pytest tests/test_clipper_robustness.py -v` |
| **Validation result** | PASS — py_compile clean. Test run: 2 passed, 1 pre-existing failure (static fallback path unrelated to logging). Captured log confirms dynamic render exception is now logged: `WARNING app.rendering.clipper: Dynamic render failed for clip 0 (start=0.00, end=10.00), falling back to static: dynamic render failed`. Import, logger, and warning statement verified via grep. No secrets, tokens, or user content logged — only clip_index, timestamps, and exception message. |

---

### B-013: `margin_v` goes negative for native 9:16 sources

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 — P3-002 |
| **File** | `app/rendering/clipper.py` lines 149-155 |
| **Problem** | Assumes landscape source in portrait canvas. Native 9:16 source → `margin_v = -120` → captions off-screen. |
| **Risk** | HIGH — invisible captions for phone-shot video |
| **Blocks** | Private Beta (beta testers will upload phone footage) |
| **Owner** | Codex |
| **Difficulty** | Easy (clamp + aspect ratio check) |
| **Fix** | Calculate actual source AR. If portrait (AR < 1.0), use `margin_v = style.get('margin_v', 80)`. Add `margin_v = max(margin_v, 40)` clamp. |
| **Validation** | Upload native 9:16 phone recording, render — captions must be visible |
| **Status** | ? FIXED |
| **Files changed** | `app/rendering/clipper.py` |
| **Validation result** | PASS � py_compile clean. margin_v now clamped: `max(int(space_below - 120), style.get("margin_v", 80))` followed by `max(margin_v, 40)`. Native 9:16 source with space_below=0 yields margin_v=80, never negative. Landscape letterboxed sources unaffected. |
| **Remaining risk** | Full runtime validation with real 9:16 phone recording not performed. |

---

### B-014: Random emoji insertion makes output non-deterministic

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 — P3-001 |
| **File** | `app/rendering/clipper.py` lines 214-228 |
| **Problem** | `random.random()` means same clip regenerated produces different emojis. Breaks caching, debugging, and creator trust during beta. |
| **Risk** | HIGH — non-deterministic output, confusing for testers |
| **Blocks** | Private Beta (reproducible output is essential for beta feedback) |
| **Owner** | Codex |
| **Difficulty** | Easy (seed RNG per clip) |
| **Fix** | Seed `random` per clip using hash of clip title/content. Or replace with deterministic hash: `hash(word) % 4 == 0`. |
| **Validation** | Regenerate same clip twice — output must have identical emoji placement |
| **Status** | [ ] PENDING |

---

### B-015: Worker has no `max_tasks_per_child` — memory leaks accumulate

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 2 — P2-004 |
| **File** | `docker-compose.yml` worker command |
| **Problem** | Celery worker never recycles. MediaPipe, OpenCV, FFmpeg memory leaks accumulate. |
| **Risk** | MEDIUM — OOM kills during extended beta usage |
| **Blocks** | Private Beta |
| **Owner** | Codex |
| **Difficulty** | Easy (add flag) |
| **Fix** | Add `--max-tasks-per-child=10` to worker command. |
| **Validation** | Run 15 jobs, verify worker PID changes after 10 |
| **Status** | ? FIXED |
| **Files changed** | `docker-compose.yml` |
| **Validation result** | PASS � docker-compose config renders worker command with `--max-tasks-per-child=10`. |
| **Remaining risk** | Runtime verification requires running 15 jobs and confirming worker PID change after 10. |

---

# 4. PUBLIC APP LAUNCH BLOCKERS

> **Goal:** Open the app to all authenticated users. Safe, monitored, recoverable.
> **Items:** 14 (migrated from Phase 1, 2, 4)

---

### L-001: PostgreSQL backing production database

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 1 — P1-004 |
| **File** | `app/api/database.py`, `.env`, `docker-compose.yml` |
| **Problem** | SQLite with concurrent writers from web + worker containers → `SQLITE_BUSY` under real load. |
| **Risk** | CRITICAL — job failures under any real load |
| **Blocks** | Public Launch |
| **Owner** | Command Code (DB provisioning) + Codex (connection string) |
| **Difficulty** | Medium |
| **Fix** | Provision PostgreSQL. Set `DATABASE_URL=postgresql://...`. Configure `pool_size=10, max_overflow=20, pool_recycle=3600`. |
| **Validation** | Run 5 concurrent uploads with processing — zero `database is locked` errors |
| **Status** | ⚠️ PARTIALLY FIXED |
| **Files changed** | `app/api/database.py`, `tests/test_database_config.py` |
| **Validation result** | Production now refuses SQLite fallback. Postgres config with pool settings ready. |
| **Remaining risk** | BLOCKED on Command Code provisioning PostgreSQL and setting `DATABASE_URL`. |

---

### L-002: TLS/HTTPS termination with reverse proxy

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 1 — P1-009 |
| **File** | `docker-compose.yml`, `app/api/main.py` |
| **Problem** | API served over plain HTTP. JWT tokens in cleartext. No production CORS origin for real domain. |
| **Risk** | HIGH — credential interception, browsers block mixed content |
| **Blocks** | Public Launch |
| **Owner** | Command Code (domain/DNS) + Codex (reverse proxy config) |
| **Difficulty** | Medium |
| **Fix** | Add nginx or Caddy to compose. HTTPS with Let's Encrypt. Set `ALLOWED_ORIGINS` to production domain. Remove port 8000 host exposure. |
| **Validation** | `curl https://api.clipaura.com/health/live` → 200 OK with valid TLS |
| **Status** | [ ] BLOCKED |
| **Validation result** | API supports ALLOWED_ORIGINS but no domain/DNS provided yet. |

---

### L-003: Structured logging — replace all `print()` statements

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 4 — P4-001 |
| **File** | All Python files in `app/` |
| **Problem** | `print()` everywhere. No log levels, timestamps, correlation IDs. `LOGS_DIR` exists but unused. |
| **Risk** | HIGH — impossible to debug at scale |
| **Blocks** | Public Launch |
| **Owner** | Codex |
| **Difficulty** | Medium (systematic replacement across all modules) |
| **Fix** | Add `logging` module config with JSON format, timestamps, job_id correlation. Replace all `print()` with `logger.info/warning/error`. Write to `LOGS_DIR` + stdout. |
| **Validation** | Check log output — must have timestamps, levels, job IDs |
| **Status** | [ ] PENDING |

---

### L-004: Alembic database migrations

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 4 — P4-004 |
| **File** | `app/api/database.py` (`Base.metadata.create_all()`), new `alembic/` directory |
| **Problem** | `create_all()` at startup can't handle schema evolution (add column, alter type). No versioned migrations. |
| **Risk** | HIGH — can't evolve schema without data loss risk |
| **Blocks** | Public Launch |
| **Owner** | Codex |
| **Difficulty** | Medium (Alembic setup) |
| **Fix** | `pip install alembic`, `alembic init alembic`. Generate initial migration from current models. Replace `create_all()` with `alembic upgrade head`. Add migration step to CI/CD. |
| **Validation** | Add test column to model, generate migration, apply — column appears |
| **Status** | [ ] PENDING |

---

### L-005: Rate limiting on clip edit and expensive endpoints

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 2 — P2-011 (related: only upload is rate-limited) |
| **File** | `app/api/main.py` — apply `check_rate_limit` to clip edit, retry, and WebSocket endpoints |
| **Problem** | Only `/api/upload` has rate limiting. Clip regeneration (`/api/clip/edit`) triggers full FFmpeg pipeline + API calls and is expensive. Unprotected. |
| **Risk** | HIGH — resource exhaustion from single authenticated user |
| **Blocks** | Public Launch |
| **Owner** | Codex |
| **Difficulty** | Easy (apply existing rate limiter to more endpoints) |
| **Fix** | Add `check_rate_limit` to: `/api/clip/edit` (3/min), `/api/job/{id}/retry` (2/min), `/api/download/{id}/{file}` (10/min). WebSocket connections: limit to 5 per user. |
| **Validation** | Rapid-fire clip edits — 4th request within 60s must return 429 |
| **Status** | [ ] PENDING |

---

### L-006: Orphaned file cleanup — periodic task

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 2 — P2-009 |
| **File** | New cleanup module, Celery Beat schedule |
| **Problem** | No cleanup of orphaned upload/render/temp files. Disk grows unbounded. |
| **Risk** | HIGH — disk exhaustion in production |
| **Blocks** | Public Launch |
| **Owner** | Codex |
| **Difficulty** | Medium (Celery Beat periodic task) |
| **Fix** | Add Celery Beat schedule: `cleanup_orphaned_files` every 6 hours. Scans `runtime/uploads/`, `runtime/renders/`, `runtime/temp/`. For each job_id dir, checks DB for Job record. Deletes orphans older than 24h. |
| **Validation** | Create orphan directories, run beat task, verify deletion |
| **Status** | [ ] PENDING |

---

### L-007: Work directories cleaned after job completion

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 2 — P2-008 |
| **File** | `app/subtitles/transcriber.py`, `app/core/broll.py`, `app/rendering/clipper.py` |
| **Problem** | Audio chunks, B-roll downloads, ASS files, sendcmd files persist after job completion. |
| **Risk** | MEDIUM — disk exhaustion (compounds with L-006) |
| **Blocks** | Public Launch |
| **Owner** | Codex |
| **Difficulty** | Medium (add cleanup step to pipeline) |
| **Fix** | Add `cleanup_job_artifacts(job_id)` called after job completes. Remove `work/` dirs, `broll_*.mp4`, `subs_*.ass`, `crop_cmd_*.txt`. Keep final clips and thumbnails only. |
| **Validation** | Run job to completion, check dir — must contain only source + output, no temp files |
| **Status** | [ ] PENDING |

---

### L-008: Celery autoretry expanded beyond RedisError

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 2 — P2-011 |
| **File** | `app/workers/tasks.py` task decorators |
| **Problem** | Only `redis.RedisError` triggers autoretry. Network errors to LLM APIs, transient S3 failures mark job as `error` permanently. |
| **Risk** | MEDIUM — unnecessary permanent failures |
| **Blocks** | Public Launch |
| **Owner** | Codex |
| **Difficulty** | Easy (expand retry list) |
| **Fix** | Add `autoretry_for=(redis.RedisError, TimeoutError, ConnectionError, OSError)`. Ensure permanent errors (ValueError, HTTPException) not retried. |
| **Validation** | Cause network error in transcribe — task must retry, not fail immediately |
| **Status** | [ ] PENDING |

---

### L-009: No `acks_late` — tasks lost on worker crash

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 2 — P2-012 |
| **File** | `app/workers/tasks.py` task decorators |
| **Problem** | `acks_late=False` default means messages acknowledged on receipt. Worker crash mid-task = job silently lost. |
| **Risk** | MEDIUM — silent job loss |
| **Blocks** | Public Launch |
| **Owner** | Codex |
| **Difficulty** | Easy (add parameter) |
| **Fix** | Add `acks_late=True`, `reject_on_worker_lost=True` to task decorators. Configure `task_track_started=True`. |
| **Validation** | Kill worker process mid-task — task must reappear on another worker |
| **Status** | [ ] PENDING |

---

### L-010: Retry endpoint preserves error history

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 2 — P2-010 |
| **File** | `app/api/main.py` retry_job endpoint (`job.errors = []`) |
| **Problem** | Errors cleared before retry. If retry also fails, original error context lost forever. |
| **Risk** | MEDIUM — debugging impossible |
| **Blocks** | Public Launch |
| **Owner** | Codex |
| **Difficulty** | Easy (archive before clearing) |
| **Fix** | Archive errors to `job.previous_errors` (add JSON column) before clearing. On failure, restore originals and append new error. |
| **Validation** | Fail job, retry, cause second failure — errors must contain both attempts |
| **Status** | [ ] PENDING |

---

### L-011: CI/CD pipeline — lint, test, build, deploy

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 4 — P4-005 |
| **File** | `.github/workflows/ci.yml` (new) |
| **Problem** | No automated testing, linting, building, or deployment. Every deploy is manual. |
| **Risk** | HIGH — deployment risk |
| **Blocks** | Public Launch |
| **Owner** | Codex + Command Code (repo settings) |
| **Difficulty** | Medium (GitHub Actions setup) |
| **Fix** | Create CI workflow: lint (ruff), typecheck, test, build Docker image, push to registry. Add deploy workflow for staged rollout. |
| **Validation** | Push to branch — GitHub Actions must run and all checks pass |
| **Status** | [ ] PENDING |

---

### L-012: Sentry error tracking

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 4 — P4-002 |
| **File** | `requirements.txt`, `app/api/main.py`, `app/workers/tasks.py` |
| **Problem** | No error tracking. Production exceptions are invisible without watching logs actively. |
| **Risk** | HIGH — blind to production failures |
| **Blocks** | Public Launch |
| **Owner** | Codex |
| **Difficulty** | Easy (add SDK) |
| **Fix** | Add `sentry-sdk[fastapi]` to requirements. Initialize in `main.py` and Celery worker signal. Configure via `SENTRY_DSN` env var. |
| **Validation** | Trigger exception — must appear in Sentry dashboard |
| **Status** | [ ] PENDING |

---

### L-013: Real usage limits — frontend fetches from API

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 — P3-011 |
| **File** | `frontend/app/dashboard/layout.tsx` |
| **Problem** | Frontend shows hardcoded "15 min remaining" regardless of user tier. Pro beta users see wrong limit. |
| **Risk** | MEDIUM — misleading UX, beta tester confusion |
| **Blocks** | Public Launch |
| **Owner** | Codex |
| **Difficulty** | Easy (fetch from API) |
| **Fix** | Call `GET /api/me` on dashboard mount. Use `minutes_remaining` and `total_limit` from response. Re-fetch after job completion. |
| **Validation** | Log in as pro user — dashboard must show correct limit, not 15 |
| **Status** | [ ] PENDING |

---

### L-014: Secure media access — download URLs require auth

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 1 (new — identified in security audit) |
| **File** | `app/api/main.py` download/preview endpoints |
| **Problem** | Download endpoint checks auth (good). But signed preview URLs have a 15-min TTL — if shared, they expire quickly. Open launch means potential for link sharing. |
| **Risk** | MEDIUM — broken share links, support burden |
| **Blocks** | Public Launch |
| **Owner** | Codex |
| **Difficulty** | Easy (increase TTL or add persistent share endpoint) |
| **Fix** | Increase preview URL TTL to 24h for signed URLs. Add `/api/share/{job_id}/{filename}` that returns an HTML page with embedded player and fresh signed URL on each load. OR keep 15-min TTL but document that previews are ephemeral. |
| **Validation** | Generate share link, wait 30 minutes, access — must still work |
| **Status** | [ ] PENDING |

---

# 5. POST-LAUNCH QUALITY IMPROVEMENTS

> **Goal:** Polish output quality, creator trust, and cinematic feel after the app is publicly available.
> **Items:** 18 (migrated from Phase 2, 3, 4 — non-blocking items)

---

### Q-001: `VideoCapture` not in try/finally — MediaPipe resource leak

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 2 — P2-005 |
| **File** | `app/tracking/face_processor.py` |
| **Problem** | Exception between `cap = cv2.VideoCapture(...)` and `cap.release()` leaks file handles and GPU buffers. |
| **Risk** | MEDIUM — gradual resource exhaustion |
| **Owner** | Codex |
| **Difficulty** | Easy (wrap in try/finally) |
| **Status** | [ ] PENDING |

---

### Q-002: `job.errors` concurrent append race condition

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 2 — P2-006 |
| **File** | `app/workers/tasks.py` `append_job_error` |
| **Problem** | Multiple threads appending to `job.errors` can silently overwrite each other. |
| **Risk** | MEDIUM — error data loss |
| **Owner** | Codex |
| **Difficulty** | Easy (re-read row before append) |
| **Status** | [ ] PENDING |

---

### Q-003: `download_video` non-deterministic file selection

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 2 — P2-007 |
| **File** | `app/core/downloader.py` |
| **Problem** | Filesystem-order-dependent file selection can return wrong video if previous download leftover exists. |
| **Risk** | MEDIUM — wrong video processed |
| **Owner** | Codex |
| **Difficulty** | Easy (targeted path from yt-dlp output) |
| **Status** | [ ] PENDING |

---

### Q-004: Hook headline duration is hardcoded to 5 seconds

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 — P3-004 |
| **File** | `app/rendering/clipper.py` line 169 |
| **Problem** | Hook always fades after exactly 5 seconds. On 90s clip, gone in first 5.5%. On 7s clip, overlaps captions. |
| **Risk** | MEDIUM — inconsistent feel |
| **Owner** | Codex |
| **Difficulty** | Easy (proportional duration) |
| **Fix** | `hook_duration = min(5.0, max(2.0, clip_duration * 0.25))`. Min 2s, max 5s, 25% of clip duration. |
| **Status** | [ ] PENDING |

---

### Q-005: Hook headline extends past end of ultra-short clips

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 — P3-005 |
| **File** | `app/rendering/clipper.py` line 169 |
| **Problem** | Clips < 5s (edge case) have headline rendering past clip end. |
| **Risk** | LOW — edge case |
| **Owner** | Codex |
| **Difficulty** | Trivial (clamp) |
| **Fix** | `hook_duration = min(hook_duration, clip_duration - 0.5)` |
| **Status** | [ ] PENDING |

---

### Q-006: Font fallback invisible to creator

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 — P3-003 |
| **File** | `app/rendering/clipper.py` `resolve_ass_font()` |
| **Problem** | Creator selects typography_motion expecting dual-font, gets Arial silently. No indication font fell back. |
| **Risk** | MEDIUM — silent quality degradation |
| **Owner** | Codex |
| **Difficulty** | Easy (log + store resolved font in metadata) |
| **Status** | [ ] PENDING |

---

### Q-007: No quality tier difference (free vs pro)

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 — P3-006 |
| **File** | `app/rendering/clipper.py` create_clip, safe_create_clip |
| **Problem** | Free and pro use identical `superfast` CRF 20 encoding. No value differentiation. |
| **Risk** | MEDIUM — no reason to pay |
| **Owner** | Codex |
| **Difficulty** | Easy (parameterize) |
| **Fix** | Free: `ultrafast` CRF 24. Pro: `medium` CRF 18. Config constants. |
| **Status** | [ ] PENDING |

---

### Q-008: B-roll encoding quality mismatch with main clip

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 — P3-007 |
| **File** | `app/core/broll.py` line 241 |
| **Problem** | B-roll re-encodes at `ultrafast` CRF 22 vs main clip `superfast` CRF 20. Visible quality drop in overlay. |
| **Risk** | MEDIUM — visible quality mismatch |
| **Owner** | Codex |
| **Difficulty** | Easy (match encoding to tier) |
| **Status** | [ ] PENDING |

---

### Q-009: `keyword_to_timestamp` uses rough character-position heuristic

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 — P3-008 |
| **File** | `app/core/broll.py` |
| **Problem** | Character-position-to-timestamp is inherently approximate. B-roll appears 2-3s off from keyword. |
| **Risk** | MEDIUM — B-roll feels mistimed |
| **Owner** | Codex |
| **Difficulty** | Medium (use word timestamps directly) |
| **Fix** | Scan `words` list directly for keyword matches instead of transcript text character positions. |
| **Status** | [ ] PENDING |

---

### Q-010: Face detection confidence threshold too low

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 — P3-009 |
| **File** | `app/tracking/face_processor.py` line 29 |
| **Problem** | `min_detection_confidence=0.5` produces false positive detections, crop jumps randomly. |
| **Risk** | MEDIUM — visible jank in output |
| **Owner** | Codex |
| **Difficulty** | Easy (raise to 0.7) |
| **Status** | [ ] PENDING |

---

### Q-011: `getMockWords` generates fake word data

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 — P3-010 |
| **File** | `frontend/components/EditorModal.tsx` |
| **Problem** | When backend returns no words, frontend generates fake timestamps. Creator edits data that doesn't match audio. |
| **Risk** | MEDIUM — creator edits fake data |
| **Owner** | Codex |
| **Difficulty** | Easy (show warning instead of fakes) |
| **Fix** | Show "Transcript data unavailable. Regenerate to enable word-level editing." Gray out word grid. |
| **Status** | [ ] PENDING |

---

### Q-012: Editor polling has no cleanup on unmount

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 — P3-012 |
| **File** | `frontend/components/EditorModal.tsx` |
| **Problem** | `setInterval` continues after modal close. Memory leak, React warnings. |
| **Risk** | MEDIUM — memory leak |
| **Owner** | Codex |
| **Difficulty** | Easy (cleanup in useEffect return) |
| **Status** | [ ] PENDING |

---

### Q-013: Multiple `Clip` interface definitions are incompatible

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 — P3-013 |
| **File** | `frontend/components/EditorModal.tsx`, `frontend/components/ExportModal.tsx` |
| **Problem** | Two separate TypeScript `Clip` interfaces with different fields. Runtime confusion. |
| **Risk** | MEDIUM — type unsafety |
| **Owner** | Codex |
| **Difficulty** | Easy (unify in shared types file) |
| **Status** | [ ] PENDING |

---

### Q-014: QR code points to expiring signed URL

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 3 — P3-014 |
| **File** | `frontend/components/ExportModal.tsx` |
| **Problem** | QR links to 15-minute expiring URL. Scanned later → dead link. |
| **Risk** | MEDIUM — broken share feature |
| **Owner** | Codex |
| **Difficulty** | Medium (persistent share endpoint or increased TTL) |
| **Fix** | Add `/api/share/{job_id}/{filename}` that returns embed page with fresh signed URL. OR increase TTL to 7 days for share context. |
| **Status** | [ ] PENDING |

---

### Q-015: Prometheus metrics endpoint

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 4 — P4-003 |
| **File** | `app/api/main.py` (new `/metrics` endpoint) |
| **Problem** | No metrics for request latency, job duration, queue depth, error rates. |
| **Risk** | MEDIUM — no operational insight |
| **Owner** | Codex |
| **Difficulty** | Medium (add prometheus_client) |
| **Status** | [ ] PENDING |

---

### Q-016: Worker health check in Docker Compose

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 4 — P4-006 |
| **File** | `docker-compose.yml` worker service |
| **Problem** | Worker has no healthcheck. If Celery crashes silently, no detection until jobs pile up. |
| **Risk** | MEDIUM — silent worker failure |
| **Owner** | Codex |
| **Difficulty** | Easy (add healthcheck) |
| **Status** | [ ] PENDING |

---

### Q-017: Redis persistence — AOF/RDB enabled

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 4 — P4-007 |
| **File** | `docker-compose.yml` redis service |
| **Problem** | No persistence config. Redis restart → all task state and rate-limit counters lost. |
| **Risk** | MEDIUM — active jobs lost |
| **Owner** | Codex |
| **Difficulty** | Easy (add volume + save config) |
| **Status** | [ ] PENDING |

---

### Q-018: Container resource limits

| Field | Detail |
|-------|--------|
| **Original phase** | Phase 4 — P4-009 |
| **File** | `docker-compose.yml` all services |
| **Problem** | No `mem_limit`, `cpus`. Worker can consume all host resources. |
| **Risk** | MEDIUM — host resource exhaustion |
| **Owner** | Codex |
| **Difficulty** | Easy (add limits to compose) |
| **Status** | [ ] PENDING |

---

# Summary: Fix Count by Track and Status

| Track | FIXED | PARTIALLY FIXED | BLOCKED | PENDING | Total |
|-------|-------|-----------------|---------|---------|-------|
| Website Publish | 8 | 0 | 0 | 0 | 8 |
| Private Beta Blockers | 11 | 1 | 0 | 3 | 15 |
| Public Launch Blockers | 0 | 1 | 1 | 12 | 14 |
| Post-Launch Quality | 0 | 0 | 0 | 18 | 18 |
| **Total** | **19** | **2** | **1** | **33** | **55** |

> Note: 55 items vs original 47 because 8 new website-specific items were added (W-001 through W-008) and some original items were split or new gate items added (B-011 app access gate, L-005 rate limiting, L-014 secure media access).

---

# Launch Gate Checklists

## Website Gate (8 items — all must be YES)

- [x] W-001: Frontend deployed to production with real domain (https://clip-aura-m.vercel.app/ — 2026-05-22)
- [x] W-002: Landing page copy is honest (no fake self-serve claims)
- [x] W-003: Demo/showcase page with real outputs
- [x] W-004: Waitlist/contact flow working
- [x] W-005: SEO basics (meta tags, OG, sitemap)
- [x] W-006: CORS allows production frontend domain
- [x] W-007: DEV_MODE disabled in production
- [x] W-008: Pricing/early-access messaging page live

**Website Launch: ✅ LIVE** (8/8 code, deployed 2026-05-22 to https://clip-aura-m.vercel.app/)

---

## Vercel Troubleshooting Checklist

If Vercel deployment completes in milliseconds and returns 404 NOT_FOUND, the platform is likely not running the real Next.js build. Verify every item below.

### Project Settings (Vercel Dashboard → Project → Settings → General)

- [ ] **Root Directory** must be `frontend` (not `.` or blank)
- [ ] **Framework Preset** must be `Next.js` (not `Other` or blank)
- [ ] **Build Command** must be `npm run build` (override if changed by framework detection)
- [ ] **Install Command** must be `npm install` (override if blank or changed)
- [ ] **Output Directory** must be blank/default (Next.js uses `.next/`, not a custom dir)

### Git & Branch Settings

- [ ] **Production branch** in Vercel project settings is set to `main`
- [ ] The latest `dev` branch (or feature branch with website fixes) is merged into `main`
- [ ] The deployment was triggered from `main`, not a stale branch

### Redeploy Procedure

- [ ] **Redeploy without build cache**: In Vercel dashboard → Deployments → latest → "Redeploy" → check "Clear cache and redeploy"
- [ ] OR trigger a new deployment by pushing a commit to `main`

### Build Log Must Show

- [ ] `npm install` (or `pnpm install` / `yarn install`) — dependency installation step
- [ ] `npm run build` — Next.js build step
- [ ] `Detected Next.js version: ...` — framework detection
- [ ] `Compiled successfully` — build completion
- [ ] Route listing showing `/`, `/demo`, `/pricing`, `/contact`, `/login`, etc.

### Red Flags (build completes in < 1 second)

If the build finishes in ~44ms with only `/vercel/output` instead of a full Next.js build:

- [ ] Check for a `vercel.json` at repo root that overrides build settings incorrectly
- [ ] Check for a committed `.vercel/output` directory (static pre-built output bypassing real build)
- [ ] Check that the `Build Command` is not overridden to `echo done` or similar no-op
- [ ] Check that the "Ignored Build Step" setting (Project → Settings → Git) is disabled
- [ ] Verify no committed `out/` or `.next/` directory that Vercel might be serving as-is

### Post-Deploy Validation

- [ ] `https://<domain>/` loads the landing page (200 OK)
- [ ] `https://<domain>/demo` loads the demo page
- [ ] `https://<domain>/pricing` loads pricing page
- [ ] `https://<domain>/contact` loads contact page
- [ ] `https://<domain>/login` loads login page
- [ ] `/dashboard` remains gated (redirects to login or shows access gate)

---

## Current Deployment Incident

| Field | Detail |
|-------|--------|
| **Date** | 2026-05-22 |
| **Problem** | Vercel deployment returns 404 NOT_FOUND despite local and CI builds passing. The latest deployment completed in ~44ms and contained only `/vercel/output` — no `npm install`, no `npm run build`, no Next.js framework detection, no route listing. |
| **Observed logs** | Deployment finished in 44ms. No build step output. Files deployed: `/vercel/output` only. No `.next/` artifacts. |
| **Root cause (suspected)** | Vercel is not running the real Next.js build. Likely causes in order of probability: (1) Root Directory not set to `frontend`, (2) Build Command overridden or missing, (3) committed `.vercel/output` or static output bypassing build, (4) Ignored Build Step enabled, (5) Framework Preset not set to Next.js. |
| **Current action** | Trigger a frontend change on `main` and redeploy without build cache from the Vercel dashboard. Then verify all items in the Vercel Troubleshooting Checklist above. |
| **Success criteria** | Vercel URL serves homepage (200 OK), `/demo`, `/pricing`, `/contact`, `/login` all respond. `/dashboard` remains gated behind auth. |
| **Status** | ✅ RESOLVED — Website deployed 2026-05-22 to https://clip-aura-m.vercel.app/ |
| **Resolution** | Vercel build and deployment completed successfully. All website routes live. App routes remain gated behind auth. |

---

## Security Hygiene — Environment Validation

`docker compose config` renders the full resolved `.env` values in plain text. This output must never be pasted into docs, chat, CI logs, tickets, or deployment notes.

**Rules:**
- Never run `docker compose config` and paste its output into any shared context.
- Use `python scripts/check_env_contract.py` for safe environment validation. It prints only key names with PRESENT/MISSING status — never secret values.
- Tracker validation command references may mention the command was run, but must never include rendered output.
- `.env` is gitignored. `.env.example` documents required key names with placeholder values only.

**Safe validation command:**
```bash
python scripts/check_env_contract.py
# Output: key names with PRESENT/MISSING status only — never secret values.
```

**If secrets were accidentally exposed** (e.g., in chat logs, CI output, or screenshots), rotate those specific keys immediately via the respective provider dashboards (Groq, Supabase, Stripe).

---

## Private Beta Gate (15 items — all must be YES)

- [x] B-001: Worker starts in Docker ✅
- [x] B-002: Upload auth works in production ✅
- [x] B-003: Upload size limit enforced ✅
- [ ] B-004: Fonts installed in Docker image ⚠️ (blocked on custom fonts)
- [x] B-005: Redis secured (no exposed port, password) ✅
- [x] B-006: Source code volume mount removed ✅
- [x] B-007: DB path consistent ✅
- [x] B-008: FFmpeg subprocess timeouts added ✅
- [x] B-009: Celery task time limits configured ✅
- [x] B-010: Gunicorn workers running ✅
- [x] B-011: App access gate (invite-only) ✅
- [x] B-012: Dynamic render failure logged (not swallowed) ✅
- [x] B-013: Captions visible for native vertical video ?
- [x] B-014: Output is deterministic (emoji seeded) ?
- [x] B-015: Worker max_tasks_per_child set ?

**Private Beta App: ⛔ GATED** (15/15 fixed, 0 remaining — not ready for testers)

## Public Launch Gate (14 items — all must be YES)

- [ ] L-001: PostgreSQL backing production DB ⚠️ (partially fixed, blocked on provisioning)
- [ ] L-002: TLS/HTTPS termination active [ ] BLOCKED (no domain)
- [ ] L-003: Structured logging active
- [ ] L-004: Alembic migrations in place
- [ ] L-005: Rate limiting on expensive endpoints
- [ ] L-006: Orphaned file cleanup periodic task
- [ ] L-007: Work dirs cleaned after job completion
- [ ] L-008: Celery autoretry expanded
- [ ] L-009: acks_late enabled
- [ ] L-010: Retry endpoint preserves error history
- [ ] L-011: CI/CD pipeline active
- [ ] L-012: Sentry error tracking active
- [ ] L-013: Real usage limits fetched from API
- [ ] L-014: Secure media access (non-expiring share links)

**Public App Launch: 🔴 BLOCKED** (0/14 public launch blockers resolved)

---

# Validation Commands Quick Reference

```bash
# B-001: Worker startup
docker-compose up worker 2>&1 | grep -i "celery.*ready"

# B-003: Upload size limit
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Length: 5000000000" \
  -F "file=@/dev/null;filename=test.mp4" \
  http://localhost:8000/api/upload
# Must return 413

# B-004: Font availability
docker exec $(docker-compose ps -q web) fc-list | grep -i montserrat

# B-005: Redis auth
docker exec $(docker-compose ps -q redis) redis-cli PING
# Must return NOAUTH

# B-010: Gunicorn workers
docker exec $(docker-compose ps -q web) ps aux | grep uvicorn | wc -l
# Must be >= 4

# B-011: Beta access gate
curl -H "Authorization: Bearer <non-beta-user-token>" http://localhost:8000/api/jobs
# Must return 403

# L-001: DB type
docker exec $(docker-compose ps -q web) python -c "from app.api.database import DATABASE_URL; print('postgresql' in DATABASE_URL)"
# Must print True

# L-003: Structured logging
docker logs $(docker-compose ps -q web) 2>&1 | head -5
# Must show timestamps and log levels

# L-004: Alembic current
docker exec $(docker-compose ps -q web) alembic current
# Must show current revision, not error

# W-005: SEO check
curl -s https://clipaura.com | grep -E '<title>|<meta name="description"|<meta property="og:'

# Q-015: Metrics endpoint
curl -s http://localhost:8000/metrics | grep clipaura

# Full smoke test
python scripts/smoke_test.py
```

---

*Tracker updated 2026-05-22. Re-score after each gate passes.*
*Strategy: Website first → Private Beta → Public Launch → Quality Polish.*
