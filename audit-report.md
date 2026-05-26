# Clip Aura — Final Pre-Production Security & Architecture Audit

**Date:** 2025-05-26
**Auditor:** Senior Staff Security Engineer + Principal Solutions Architect
**Scope:** Entire repository — backend, frontend, infrastructure, AI pipeline, deployment, operations
**Repository:** `C:\Users\Trade\OneDrive\Attachments\Clip Aura`
**Branch:** `main` (7845894)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Security Audit](#2-security-audit)
3. [Architecture Audit](#3-architecture-audit)
4. [Reliability & Operations Audit](#4-reliability--operations-audit)
5. [Performance Audit](#5-performance-audit)
6. [Deployment Readiness](#6-deployment-readiness)
7. [Code Quality Audit](#7-code-quality-audit)
8. [Final Risk Matrix](#8-final-risk-matrix)
9. [Prioritized Action Plan](#9-prioritized-action-plan)

---

## 1. Executive Summary

### 1.1 Production Readiness Score

| Dimension | Score | Rating |
|-----------|-------|--------|
| Security | 4.5/10 | **Below Threshold** |
| Architecture | 6.5/10 | Acceptable with fixes |
| Reliability | 5.0/10 | Needs hardening |
| Performance | 6.0/10 | Adequate for MVP |
| Deployment | 4.0/10 | Not deployable as-is |
| Code Quality | 5.5/10 | Technical debt significant |
| Operations | 3.5/10 | Major gaps |
| **Overall** | **5.0/10** | **NOT RECOMMENDED FOR DEPLOYMENT** |

### 1.2 Critical Blockers (MUST fix before ANY traffic)

| # | Issue | Category |
|---|-------|----------|
| B-1 | Stripe webhook handler **does not exist** in codebase — paid users' subscription status will never update | Payments |
| B-2 | Container runs as `root` — no `USER` directive in Dockerfile | Infrastructure |
| B-3 | Missing `jobs.user_id` index — most-queried column has no index | Database |
| B-4 | Credit double-charge race condition in worker billing code | Data Integrity |
| B-5 | ASS subtitle injection — LLM output text with `{`, `}`, `\` unescaped before FFmpeg filter insertion | Security |
| B-6 | No content safety/moderation at any pipeline stage | AI Safety |
| B-7 | No CI/CD pipeline — no automated build, test, or deploy | DevOps |
| B-8 | `task_acks_late=False` — worker crash loses tasks permanently | Reliability |
| B-9 | Multiple hardcoded/dev fallback secrets in production code paths | Security |
| B-10 | Prompt injection — raw user transcript injected into LLM system prompt without delimiters | AI Safety |

### 1.3 High-Risk Issues

| # | Issue |
|---|-------|
| H-1 | JWT access token in WebSocket URL query string (logged by proxies, CDNs, load balancers) |
| H-2 | No rate limiting on download, retry, edit, or admin endpoints |
| H-3 | `'unsafe-eval'` + `'unsafe-inline'` in Content-Security-Policy |
| H-4 | CORS `allow_headers=["*"]` with `allow_credentials=True` violates spec |
| H-5 | DNS rebinding window in `is_safe_url()` check → `yt-dlp` download |
| H-6 | No reverse proxy (nginx/traefik) — Python app directly exposed on port 8000 |
| H-7 | No container resource limits (`mem_limit`, `cpus`) |
| H-8 | No `pool_pre_ping=True` for PostgreSQL connection pool |
| H-9 | Rate limiter module is built but **completely unused** — inline version only covers 3 endpoints |
| H-10 | Production `.env` files tracked in git history with live secrets referenced |

### 1.4 Overall Assessment

Clip Aura is a **technically impressive** application with a sophisticated AI video processing pipeline, clean RBAC architecture, well-structured health checks, and comprehensive logging/sanitization. The foundational security practices (JWT verification, SSRF protection, path traversal prevention, audit logging) are solid.

However, the application is **NOT ready for production deployment** without addressing the 10 critical blockers above. The most concerning gaps are:

1. **Stripe integration is incomplete** — the webhook handler that activates paid subscriptions does not exist
2. **AI output flows directly to rendered video without any sanitization** — this is a genuine safety risk
3. **Container and infrastructure hardening is absent** — root containers, no resource limits, no CI/CD
4. **Data integrity in billing** — race conditions in credit charging that could result in unexpected charges or double-billing

With focused effort, these issues can be resolved and the application can safely launch.

---

## 2. Security Audit

### 2.1 Authentication & Authorization

#### JWT / Supabase Auth

**Implementation:** `app/api/auth.py` — Backend validates JWTs via `supabase.auth.get_user(token)` on every request. Tokens are never parsed locally, avoiding key exposure. Frontend uses Supabase JS SDK with `authenticatedFetch()` wrapper.

**Strengths:**
- No `DEV_MODE` bypass on backend — explicit comment: "DEV_MODE never bypasses backend authentication"
- `get_beta_user()` chains JWT validation → beta access check → trial expiry enforcement
- All data-access endpoints require `get_beta_user` dependency
- WebSocket auth validates token, ownership, beta status, and trial

**Findings:**

| ID | Severity | Finding | File:Line |
|----|----------|---------|-----------|
| AUTH-1 | 🟡 Medium | Auto-creates local User row unconditionally on first Supabase auth — no email verification check | `auth.py:73-84` |
| AUTH-2 | 🟡 Medium | `clipaura_session_hint` cookie set via `document.cookie` (not HttpOnly), but this is a routing hint, not security enforcement | `AuthContext.tsx:35-40` |
| AUTH-3 | 🔵 Low | No server-side token refresh — relies entirely on Supabase client SDK | N/A |
| AUTH-4 | 🔵 Low | No server-side token blacklist — JWTs valid until expiry after logout | N/A (Supabase limitation) |

#### RBAC

**Implementation:** `app/security/rbac.py` — 5-tier hierarchy: `user < beta < staff < admin < super_admin`. Permission-based access control built on roles. Audit logging on all role/plan changes.

**Strengths:**
- `can_modify_role()` prevents privilege escalation (can't assign higher than own role, can't self-promote)
- Only `super_admin` can assign `super_admin`
- Plan/role/feature-flag changes are fully audited
- Permission dependencies (e.g., `manage_users`) compose cleanly with FastAPI dependency injection

**Findings:**

| ID | Severity | Finding | File:Line |
|----|----------|---------|-----------|
| AUTH-5 | 🟡 Medium | `can_modify_role` allows self-demotion (admin → user) but blocks self-promotion — intentional but undocumented | `rbac.py:119` |
| AUTH-6 | 🟡 Medium | Staff role cannot exercise `manage_users` permission — blanket denial: `if actor_role == ROLE_STAFF: return False` | `rbac.py:121` |
| AUTH-7 | 🔴 Critical | Plan update endpoint lacks full role-based plan modification restrictions — admin can change another admin's plan | `admin.py:87-88` |

### 2.2 WebSocket Authentication

| ID | Severity | Finding |
|----|----------|---------|
| AUTH-8 | 🔴 Critical | **JWT access token sent as WebSocket query parameter** — `wsUrl = ...?token=${session.access_token}`. This token is logged by all proxies, load balancers, CDNs, and browser history. Must use `Sec-WebSocket-Protocol` header or post-connect auth message. |
| AUTH-9 | 🟡 Medium | WebSocket auth correctly rejects null/undefined/empty tokens |

### 2.3 API Security

#### Rate Limiting

**Architecture:** Two parallel implementations exist — **one is unused**. The robust `rate_limiter.py` module with proper 429 + `Retry-After` headers is imported but **never wired to any endpoint**. Instead, an inline `check_rate_limit()` in `main.py` covers only 3 endpoints and **fails open** (silently bypasses on Redis failure).

**Rate Limit Coverage:**

| Endpoint | Rate Limited | Implementation |
|----------|-------------|----------------|
| `POST /api/upload` | ✅ 5/min | Inline (fails open) |
| `POST /api/waitlist` | ✅ 3/hr | Inline (fails open) |
| `POST /api/contact` | ✅ 3/hr | Inline (fails open) |
| `GET /api/jobs` | ❌ | None |
| `GET /api/status/{id}` | ❌ | None |
| `GET /api/download/{id}/{file}` | ❌ | None — **bandwidth abuse vector** |
| `POST /api/job/{id}/retry` | ❌ | None — **CPU abuse vector** |
| `POST /api/clip/edit` | ❌ | None — **CPU abuse vector** |
| `DELETE /api/job/{id}` | ❌ | None |
| `GET /api/preview-url/...` | ❌ | None |
| `WS /ws/{id}` | ❌ | None (function exists but not called) |
| Admin endpoints | ❌ | None — **brute-force vector** |

**Findings:**

| ID | Severity | Finding |
|----|----------|---------|
| API-1 | 🔴 Critical | `rate_limiter.py` module completely unused — robust implementation exists but not wired |
| API-2 | 🔴 Critical | Inline rate limiter **fails open** — inconsistency with module's fail-closed behavior |
| API-3 | 🔴 Critical | No rate limit on download endpoint — bandwidth exhaustion vector |
| API-4 | 🔴 Critical | No rate limit on retry/edit endpoints — CPU/GPU abuse vector |
| API-5 | 🟡 Medium | No rate limit on admin endpoints — brute-force vector for role/plan changes |

#### Input Validation

**Strengths:**
- File extension whitelist: `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`
- File size enforcement: streaming write with incremental check, 2GB default limit
- Filename sanitization: `sanitize_filename()` restricts to `[a-zA-Z0-9_-]`
- Path traversal: `resolve_job_file()` uses `os.path.basename()` + absolute path resolution
- Caption style: whitelist against `CAPTION_STYLES` dict
- SSRF: `is_safe_url()` with DNS resolution + private IP blocking

**Findings:**

| ID | Severity | Finding |
|----|----------|---------|
| API-6 | 🟡 Medium | `EditClipRequest` fields (`title`, `hook_caption`) have no max length |
| API-7 | 🟡 Medium | `WordUpdate.word` has no length or character restriction — rendered into FFmpeg filters |
| API-8 | 🔵 Low | Contact form: basic email regex, no character class restriction on name |
| API-9 | 🔵 Low | Email regex `[^@\s]+@[^@\s]+\.[^@\s]+` — adequate for MVP but permits unusual formats |

#### CORS & Headers

**Backend (`app/api/middleware.py`):**
```
HSTS: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
CSP: default-src 'none'; script-src 'none'; ... (extremely restrictive — correct for JSON API)
```

**Frontend (`frontend/middleware.ts`):**
```
CSP: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
connect-src: https://*.supabase.co wss://*.supabase.co
```

**Findings:**

| ID | Severity | Finding |
|----|----------|---------|
| API-10 | 🔴 Critical | Frontend CSP includes `'unsafe-eval'` and `'unsafe-inline'` — significantly weakens XSS protection |
| API-11 | 🟡 Medium | CORS `allow_headers=["*"]` with `allow_credentials=True` violates CORS spec — use explicit header list |
| API-12 | 🟡 Medium | CSP `connect-src` uses wildcard `*.supabase.co` — should use specific project reference |
| API-13 | 🔵 Low | No CSP `report-uri` or `report-to` directive — violations invisible in production |
| API-14 | 🔵 Low | Security headers duplicated identically in middleware for protected and unprotected routes |

### 2.4 Secrets & Credentials

**Findings:**

| ID | Severity | Finding |
|----|----------|---------|
| SEC-1 | 🔴 Critical | **Hardcoded dev preview secret** — `"dev-preview-signing-secret"` as fallback in `get_preview_signing_secret()` at `main.py:80` |
| SEC-2 | 🔴 Critical | **Frontend Supabase fallback defaults** — `supabase.ts` has hardcoded placeholder URLs |
| SEC-3 | 🔴 Critical | `.env.production` tracked in git (though values may be placeholders) |
| SEC-4 | 🟠 High | `print()` debug statements in `auth.py` — may log sensitive context |
| SEC-5 | 🟡 Medium | No minimum length enforcement on `PREVIEW_SIGNING_SECRET` and `LEAD_HASH_SALT` |
| SEC-6 | 🔵 Low | `NEXT_PUBLIC_SUPABASE_ANON_KEY` exposed client-side — by design for Supabase |

**Positive:** Production startup validation (`validate_production_startup`) checks all required secrets, blocks placeholder values, enforces cross-boundary uniqueness. Gitleaks pre-commit hook configured.

### 2.5 AI/LLM Security

| ID | Severity | Finding |
|----|----------|---------|
| AI-1 | 🔴 Critical | **Prompt injection** — raw Whisper transcript injected verbatim into LLM system prompt with no delimiters, no sanitization, no instruction hierarchy |
| AI-2 | 🔴 Critical | **ASS subtitle injection** — LLM-generated text flows directly into ASS subtitle files. Characters `{`, `}`, `\` are NOT escaped |
| AI-3 | 🔴 Critical | **No content safety** — zero moderation at any pipeline stage. No NSFW detection, no hate speech filtering |
| AI-4 | 🔴 Critical | **System prompt encourages extreme content** — explicitly instructs LLM to prioritize "CONTROVERSY," "hot takes that people will argue about" |
| AI-5 | 🟡 Medium | **Cost amplification** — chunked processing (~22 LLM calls per 60-min video). No per-user AI token budget |
| AI-6 | 🟡 Medium | Transcript word text not escaped for ASS karaoke tags — `{`, `}`, `\` in transcribed words corrupt subtitle rendering |
| AI-7 | 🟡 Medium | B-roll videos from Pexels CDN downloaded with no antivirus/validation scanning |
| AI-8 | 🔵 Low | No data retention disclosure — full transcripts sent to third-party AI providers |

### 2.6 Infrastructure Security

| ID | Severity | Finding |
|----|----------|---------|
| INF-1 | 🔴 Critical | **Container runs as root** — no `USER` directive in Dockerfile |
| INF-2 | 🔴 Critical | **No CI/CD pipeline** — `.github/workflows/` does not exist |
| INF-3 | 🟠 High | **No reverse proxy** — Gunicorn exposed directly on port 8000, no TLS termination in stack |
| INF-4 | 🟠 High | **No container resource limits** — worker could exhaust host memory during FFmpeg rendering |
| INF-5 | 🟡 Medium | Build dependencies (`gcc`, `libpq-dev`) remain in final container image |
| INF-6 | 🟡 Medium | No multi-stage Docker build |
| INF-7 | 🟡 Medium | No explicit network isolation between Redis and web/worker services |
| INF-8 | 🟡 Medium | No Prometheus metrics endpoint or alerting integration |
| INF-9 | 🔵 Low | No read-only root filesystem or capability dropping |
| INF-10 | 🔵 Low | Docker base image not pinned to digest (`python:3.10-slim` without `@sha256`) |

### 2.7 Dependency Security

| ID | Severity | Finding |
|----|----------|---------|
| DEP-1 | 🟠 High | **Most Python dependencies unpinned** — only `mediapipe==0.11.10` is pinned; ~20 packages float |
| DEP-2 | 🟡 Medium | No `pip-audit` or `safety check` integration in CI |
| DEP-3 | 🟡 Medium | No `npm audit` in frontend pipeline |
| DEP-4 | 🔵 Low | `psycopg2-binary` instead of `psycopg2` — binary wheel acceptable but `psycopg2` preferred for production |

---

## 3. Architecture Audit

### 3.1 System Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│  FastAPI API  │────▶│   Celery     │
│  Next.js 16  │     │  (Gunicorn)  │     │   Worker     │
│  (Vercel)    │     │  Port 8000   │     │  Concurrency │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                     │
                     ┌──────┴───────┐     ┌──────┴───────┐
                     │    Redis     │     │  PostgreSQL  │
                     │  Cache/Broker│     │  / SQLite    │
                     └──────────────┘     └──────────────┘
                            │
                     ┌──────┴───────┐
                     │  S3/R2 Cloud │
                     │   Storage    │
                     └──────────────┘
```

### 3.2 Processing Pipeline

```
Upload → Preflight (ffprobe) → Transcribe (Groq/OpenAI Whisper)
    → Analyze (Groq LLaMA / GPT-4o-mini) → Align (cut snapping)
    → Render (ThreadPoolExecutor, 4 workers):
        ├─ Face tracking (MediaPipe)
        ├─ ASS subtitle generation + karaoke
        ├─ FFmpeg clip generation (sendcmd panning, watermark)
        └─ B-roll overlay (Pexels, optional)
    → Cloud upload (optional) → Usage billing
    → WebSocket progress broadcast (Redis Pub/Sub)
```

### 3.3 Scalability Bottlenecks

| Bottleneck | Severity | Detail |
|------------|----------|--------|
| Single flat Celery queue | 🟠 High | No task prioritization. A 2-hour video job blocks all others. |
| SQLite in dev/prod dual path | 🟡 Medium | `with_for_update()` silently ignored on SQLite. Dual-path complexity. |
| ThreadPoolExecutor(4) for rendering | 🟡 Medium | All 4 FFmpeg processes compete for CPU. Worker concurrency=4 means up to 16 FFmpeg instances. |
| Redis as single point of failure | 🟡 Medium | Broker, result backend, cache, rate limiter, circuit breaker, Pub/Sub — all on single Redis. |
| WebSocket scaling | 🟡 Medium | Redis Pub/Sub per-job channels work for single-instance but need sticky sessions for multi-instance. |
| No horizontal scaling config | 🟡 Medium | Worker designed for single instance. No task routing for distributed workers. |

### 3.4 Architecture Strengths

- **Durable checkpointing**: Job stages persisted to DB, enabling resume from any pipeline phase after crash
- **Circuit breaker pattern**: AI provider auto-fallback with Redis-based failure tracking
- **Idempotent billing**: `usage_minutes_charged` guard prevents double-charge
- **Thread-safe progress broadcasting**: Progress callback opens own short-lived DB session
- **Clean RBAC hierarchy**: Composable FastAPI dependencies, permission-based access
- **Job ownership enforcement**: Every endpoint filters by `user_id`, no IDOR vectors found
- **Preview URL signing**: HMAC-SHA256 with 15-minute TTL, timing-safe comparison

### 3.5 Hidden Coupling

- HTTP API and Celery workers communicate **only through DB and Redis** — no direct function calls
- `Base.metadata.create_all()` at import time in both `main.py` and `tasks.py` means both must agree on schema
- `schema_compat.py` ALTER TABLE hacks at startup are fragile and DB-engine-specific

### 3.6 Technical Debt Risks

- **Monolithic `main.py`** (1084 lines): All routes, WebSocket handling, upload/download/preview logic in one file
- **Dual credit systems**: `credits_remaining` vs `used_minutes` — only the second is actually charged
- **No API versioning**: All endpoints at `/api/` without `/v1/` prefix
- **No dedicated service layer**: Business logic inlined in route handlers

---

## 4. Reliability & Operations Audit

### 4.1 Startup Validation

**Excellent.** `validate_production_startup()` runs at import time and:
- Checks all required secrets are present and non-placeholder
- Enforces cross-boundary secret uniqueness
- Blocks `NEXT_PUBLIC_*` variables containing Stripe/Groq keys in production
- Crashes if `DEV_MODE=true` in production environment
- Test coverage: `tests/test_production_env_safety.py`

### 4.2 Health Checks

Three-tier system — well designed:
- `GET /health/live` — Kubernetes liveness probe
- `GET /health/ready` — DB + Redis readiness probe, returns 503 on failure
- `GET /api/health` — Detailed diagnostic with Celery worker check
- Docker HEALTHCHECK hits `/health/ready` every 30s with 3 retries

### 4.3 Logging

**Strong.** `app/core/logging_config.py` (300 lines):
- Structured JSON logging in production
- Request ID and correlation ID tracking via ContextVars
- PII/sanitization: redacts API keys, secrets, tokens, cookies, auth headers
- Value truncation at 4096 chars
- Sentry integration ready (via `SENTRY_DSN`)
- OpenTelemetry integration ready (via `OTEL_EXPORTER_OTLP_ENDPOINT`)

**Gap:** `print()` statements remain in `auth.py` — should be migrated to structured logger.

### 4.4 Failure Modes

| Scenario | Behavior | Risk |
|----------|----------|------|
| Redis down | Rate limiter fails open (inline) or closed (module). Circuit breaker state lost. | 🟠 High |
| Celery worker crash | Task **lost** (`task_acks_late=False`). Job stays `processing` indefinitely. | 🔴 Critical |
| FFmpeg render fails | Falls back to static center crop. Job succeeds if ≥1 clip. | ✅ Good |
| AI provider fails | Circuit breaker opens after 5 failures. Auto-fallbacks to alternate provider. | ✅ Good |
| DB connection lost | `handle_job_error()` rolls back, marks error in fresh query. | ✅ Good |
| Upload interrupted | Partially written file deleted. But orphaned files if process crashes mid-stream. | 🟡 Medium |

### 4.5 Observability Gaps

| Gap | Impact |
|-----|--------|
| No Prometheus metrics endpoint | No request rate, error rate, latency tracking |
| No alerting (PagerDuty/OpsGenie) | Silent failures possible |
| No log aggregation config | JSON-to-stderr present but no collector configured |
| No distributed tracing (beyond OTel hooks) | Can't trace request through API → Celery → external APIs |
| No Celery Flower | Can't monitor queue depth, worker status, task failures |

---

## 5. Performance Audit

### 5.1 Blocking Operations

| Operation | Location | Impact |
|-----------|----------|--------|
| `socket.getaddrinfo()` in async handler | `main.py:162` — `is_safe_url()` | 🟡 Blocks event loop during DNS resolution |
| `Base.metadata.create_all()` at import | `main.py:44`, `tasks.py` | 🟢 One-time startup cost |

### 5.2 N+1 Patterns

**None detected.** All job-fetching endpoints use single queries with appropriate filtering.

### 5.3 Polling Inefficiency

- Dashboard: polls `/api/jobs` every **3 seconds** when active — despite WebSocket support
- Clips page: polls every **5-12 seconds**
- **Recommendation:** Increase interval or prefer WebSocket events exclusively

### 5.4 Likely Scaling Ceiling

| Ceiling | At Approximately |
|---------|-----------------|
| First bottleneck | CPU — FFmpeg rendering with 4 concurrent workers |
| Second bottleneck | Redis — single instance for broker + cache + rate limiter |
| Third bottleneck | DB — missing `jobs.user_id` index on large job tables |
| Estimated concurrent users before degradation | ~20-30 active jobs simultaneously on single worker |

### 5.5 Frontend Performance Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| Google Fonts via CSS `@import` | 🔴 Critical | Render-blocking. Use `next/font/google`. |
| Unoptimized external images | 🟡 Medium | Unsplash hero image without `next/image` |
| No code splitting for modals | 🟡 Medium | EditorModal (1087 lines), UploadModal (873 lines) in main bundle |
| Monolithic dashboard | 🟡 Medium | 1432-line `page.tsx` |

---

## 6. Deployment Readiness

### 6.1 What Exists

| Component | Status |
|-----------|--------|
| Dockerfile | ✅ Present (Python 3.10-slim, Gunicorn + Uvicorn) |
| docker-compose.yml | ✅ Present (redis + web + worker, health checks) |
| .dockerignore | ✅ Present |
| .gitignore | ✅ Present |
| .env.example | ✅ Present (development template) |
| .env.production.example | ✅ Present (missing some keys) |
| scripts/check_env_contract.py | ✅ Present |
| docs/DEPLOYMENT_RUNBOOK.md | ✅ Present |

### 6.2 What's Missing

| Component | Severity | Detail |
|-----------|----------|--------|
| CI/CD pipeline | 🔴 Critical | No `.github/workflows/` |
| Reverse proxy config | 🔴 Critical | No nginx/traefik config |
| Database migration automation | 🟠 High | No Alembic, no migration runner at startup |
| Container resource limits | 🟠 High | No CPU/memory limits |
| Application metrics | 🟠 High | No Prometheus endpoint |
| Frontend `.env.example` | 🟡 Medium | No documented template |
| Database backup script | 🟡 Medium | No automated backup |

### 6.3 Verdict

**NOT deployable in current state.** The 10 critical blockers must be resolved first.

---

## 7. Code Quality Audit

### 7.1 Dead Code & Artifacts

| Item | Location |
|------|----------|
| Duplicate `resolve_job_file()` definition | `main.py:82-97` (identical function defined twice) |
| Empty `app/worker/` directory (singular) | Conflicts with `app/workers/` |
| `backend/` ghost directory with only `__pycache__/` | Root |
| `output/`, `temp/`, `uploads/` at root — unused | All data goes to `runtime/` |
| `mkdir/` and `$null` accidental artifacts | Root |
| `opus_pro.db` orphaned from rebrand | Root |
| Two smoke test files | `smoke_test.py` (root) and `scripts/smoke_test.py` |
| Unused `rate_limiter.py` module | Imported but never wired |
| Dead `enableHookOpt` checkbox | UploadModal |

### 7.2 Frontend Code Quality Issues

- **Monolithic components**: Dashboard (1432 lines), EditorModal (1087 lines), UploadModal (873 lines)
- **Inline `<style jsx>` blocks** — styles re-evaluated on every render
- **Mock data generation** in production code — `getMockWords()` fabricates transcript timestamps
- **`alert()` for user errors** — inaccessible, jarring
- **Hydration mismatch warnings** — Footer year, Framer Motion initial states
- **Missing `next/dynamic`** for heavy modals with `ssr: false`
- **`useSearchParams()` without `<Suspense>`** in clips page
- **`useLayoutEffect` misuse** where `useEffect` would work

### 7.3 Exception Handling

| Area | Assessment |
|------|-----------|
| Middleware catch-all | ✅ All unhandled exceptions → 500 JSON |
| Worker error handling | ✅ `handle_job_error()` persists to DB, rolls back, broadcasts |
| Circuit breaker | ✅ Auto-fallback on AI provider failures |
| Celery retry | ✅ Exponential backoff + jitter, max 3 retries |
| Generic 500 message | ⚠️ All errors return same `{"detail":"Internal Server Error"}` |
| `print()` debugging | ⚠️ Left in `auth.py` |

### 7.4 Test Coverage

| Area | Status |
|------|--------|
| Backend tests | `tests/` directory with production env safety tests |
| Pipeline tests | Integration tests in `tests/` |
| Frontend tests | ❌ None |
| Coverage measurement | ❌ Not configured |
| CI integration | ❌ No CI to run tests |

---

## 8. Final Risk Matrix

| # | Issue | Severity | Exploitability | Impact | Fix Complexity | Timeline |
|---|-------|----------|---------------|--------|----------------|----------|
| B-1 | Stripe webhook handler missing | Critical | Automatic | Financial — subscriptions never activate | High | Before launch |
| B-2 | Container runs as root | Critical | Any CVE | Full host compromise | Trivial | Before launch |
| B-3 | Missing `jobs.user_id` index | Critical | Under load | DB lock contention, slow queries | Trivial | Before launch |
| B-4 | Credit double-charge race | Critical | Concurrency | Incorrect billing | Medium | Before launch |
| B-5 | ASS subtitle injection | Critical | Crafted video | Rendered content manipulation | Low | Before launch |
| B-6 | No content safety | Critical | Any upload | Brand-damaging content | Medium | Before launch |
| B-7 | No CI/CD pipeline | Critical | N/A | Manual deploys, no gates | Medium | Before launch |
| B-8 | Task loss on worker crash | Critical | Worker crash | Jobs stuck indefinitely | Low | Before launch |
| B-9 | Hardcoded fallback secrets | Critical | Code visibility | Preview URL spoofing | Trivial | Before launch |
| B-10 | Prompt injection | Critical | Crafted audio | AI output manipulation | Medium | Before launch |
| H-1 | JWT in WS query string | High | Proxy log access | Token exposure | Medium | Before launch |
| H-2 | CSP unsafe-eval/inline | High | XSS | Session hijacking | Low | Before launch |
| H-3 | Rate limiting gaps | High | Scripted abuse | CPU/bandwidth exhaustion | Medium | 1-2 weeks |
| H-4 | CORS spec violation | High | Browser-dependent | Credential leakage | Trivial | Before launch |
| H-5 | DNS rebinding window | High | Attacker DNS | SSRF bypass | Medium | 1-2 weeks |
| H-6 | No reverse proxy | High | Direct exposure | DOS, no TLS | Medium | Before launch |
| H-7 | No resource limits | High | Memory/CPU | Host instability | Trivial | Before launch |
| H-8 | Missing pool_pre_ping | High | Idle timeout | DB connection errors | Trivial | Before launch |
| H-9 | AI cost no per-user cap | Medium | Heavy usage | Unexpected API bills | Medium | 1-2 weeks |
| H-10 | Frontend monolithic components | Medium | Maintenance | Slow feature dev | High | Post-launch |
| M-1 | Google Fonts @import | Medium | All users | Slow LCP | Low | 1-2 weeks |
| M-2 | No code splitting | Medium | Slow connections | Large bundle | Low | 1-2 weeks |
| M-3 | No API versioning | Medium | Future changes | Client breakage | Low | Before launch |
| M-4 | No data retention/cleanup | Medium | Storage growth | Disk exhaustion | Medium | Post-launch |
| M-5 | Frontend polling alongside WS | Medium | All users | Unnecessary traffic | Low | 1-2 weeks |

---

## 9. Prioritized Action Plan

### Phase 0: Immediate Fixes (Before Any Deployment) — ~12-15 hours

| # | Action | Effort |
|---|--------|--------|
| 1 | Implement Stripe webhook handler with signature verification, handle all subscription events | 4-6h |
| 2 | Add `USER` directive to Dockerfile, create non-root `appuser` | 15m |
| 3 | Add `jobs.user_id` index | 5m |
| 4 | Fix credit charge race condition — restructure lock order | 1h |
| 5 | Escape ASS special characters in clipper.py | 30m |
| 6 | Integrate content moderation API (OpenAI moderation or similar) | 2h |
| 7 | Create GitHub Actions CI/CD pipeline | 2h |
| 8 | Enable `task_acks_late=True` in Celery config | 10m |
| 9 | Remove all hardcoded fallback secrets | 30m |
| 10 | Harden LLM prompt with XML delimiters + instruction hierarchy | 1h |

### Phase 1: Launch Gates (Before Public Launch) — ~13 hours

| # | Action | Effort |
|---|--------|--------|
| 11 | Move WebSocket auth to post-connect message or Sec-WebSocket-Protocol | 2h |
| 12 | Tighten CSP — remove unsafe-eval, add nonce-based approach | 2h |
| 13 | Wire rate_limiter.py to all endpoints | 3h |
| 14 | Fix CORS headers — explicit allow_headers, tighten methods | 15m |
| 15 | Add pool_pre_ping=True for PostgreSQL | 5m |
| 16 | Add container resource limits in docker-compose | 15m |
| 17 | Add nginx reverse proxy config with TLS termination | 2h |
| 18 | Add API versioning — prefix /api/v1/ | 1h |
| 19 | Replace Google Fonts @import with next/font/google | 30m |
| 20 | Add next/dynamic code splitting for modals | 1h |
| 21 | Create frontend .env.example | 15m |

### Phase 2: Post-Launch (1-2 Weeks)

- Add DNS rebinding defense-in-depth
- Add per-user AI API spend tracking and caps
- Add Prometheus metrics endpoint
- Set up Sentry + UptimeRobot + Celery Flower
- Add rate limit on WebSocket connections
- Increase dashboard polling interval
- Drop stale credits_remaining columns
- Add subscription_status column and monthly reset logic
- Replace print() with structured logger
- Add MAX_CHUNKS limit to analyzer
- Add startup temp file cleanup

### Phase 3: Medium-Term (1 Month)

- Refactor monolithic frontend components
- Extract service layer from main.py route handlers
- Install Alembic, create migrations
- Add frontend test suite (Playwright)
- Add multi-stage Docker build
- Add database backup automation
- Implement GDPR account deletion/data export
- Add CSP report-uri

### Phase 4: Long-Term Architecture

- Migrate to PostgreSQL-only
- Add task prioritization and dedicated Celery queues
- Event-driven architecture for pipeline
- Redis sentinel/cluster for HA
- Horizontal worker scaling
- Feature flag system
- Comprehensive integration tests

---

**End of Audit Report**
