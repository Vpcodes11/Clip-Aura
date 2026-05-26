# Clip Aura — Tech Debt Register

**Date:** 2025-05-23
**Updated after:** Full production audit
**Total Items:** 51

---

## Debt Severity Legend
- 🔴 **P0 — Production Blocker** — Must fix before any traffic
- 🟠 **P1 — Launch Gate** — Must fix before public launch
- 🟡 **P2 — Post-Launch Immediate** — First sprint after launch
- 🟢 **P3 — Technical Debt** — Scheduled refactor
- ⚪ **P4 — Future Scale** — Monitor, address when needed

---

## 1. Architecture Debt

| # | Item | Severity | Effort | Notes |
|---|---|---|---|---|
| TD-1 | `backend/` ghost directory with only `__pycache__/` | 🔴 | T: 5min | Confusing for new devs. Delete entire directory. |
| TD-2 | `app/worker/` vs `app/workers/` naming conflict | 🔴 | T: 5min | Empty `app/worker/` dir. `retry_job.py` imports from wrong path. Delete empty dir, fix import. |
| TD-3 | Root-level redundant dirs: `output/`, `temp/`, `uploads/` | 🟢 | T: 10min | All actual data goes to `runtime/`. Delete root dupes or sync docker volumes. |
| TD-4 | `mkdir/` and `$null` accidental artifacts | 🔴 | T: 2min | Delete. Embarrassing in repo. |
| TD-5 | `opus_pro.db` orphaned from rebrand | 🟢 | T: 1min | Delete old database file. |
| TD-6 | `app/schemas/` and `app/services/` empty packages | 🟢 | L: 1hr | Either populate with Pydantic schemas / service layer, or delete. |
| TD-7 | No Alembic migrations — `create_all()` at import time | 🟠 | M: 4hr | Adding a column requires `schema_compat.py` runtime hacks. Install Alembic, create initial migration, convert future changes to migration files. |
| TD-8 | `schema_compat.py` is SQLite-only | 🟡 | S: 2hr | If Postgres needs a migration, there's no mechanism. Alembic solves this. |

---

## 2. Frontend Debt

| # | Item | Severity | Effort | Notes |
|---|---|---|---|---|
| TD-9 | Hydration mismatch in `WAVEFORM_DATA` computation | 🔴 | S: 30min | Move to `useMemo` or `useState` with `useEffect`. Current module-level computation runs during SSR. |
| TD-10 | No `middleware.ts` — client-only auth | 🔴 | M: 2hr | Dashboard HTML leaks. Implement Supabase session cookie check in middleware. |
| TD-11 | `DEV_MODE` bypass in `AuthContext.tsx` | 🔴 | S: 30min | Add build-time check: `if (process.env.NEXT_PUBLIC_DEV_MODE === 'true' && process.env.NODE_ENV === 'production') throw Error()`. |
| TD-12 | `useSearchParams()` without `<Suspense>` in clips page | 🟠 | S: 15min | Wrap in `<Suspense>` or restructure to server component. |
| TD-13 | No `loading.tsx` files on any route | 🟠 | M: 3hr | Create skeleton loading states for all routes. 13 routes × ~15min each. |
| TD-14 | `EditorModal` leaked `setInterval` on modal close | 🔴 | S: 20min | Store interval ID in ref, clear in useEffect cleanup, add `isMounted` guard. |
| TD-15 | Hardcoded Supabase URL + anon key fallbacks | 🔴 | S: 10min | Remove fallback defaults — throw hard error if env vars missing. |
| TD-16 | 8 pages with zero SEO metadata | 🟠 | M: 2hr | Move metadata to `layout.tsx` or `generateMetadata` in server components alongside client pages. |
| TD-17 | Dead waitlist form on homepage | 🟠 | M: 2hr | Wire to Supabase table or third-party waitlist service. |
| TD-18 | Contact form uses `alert()` | 🟠 | M: 2hr | Wire to email API or ticket system. |
| TD-19 | Two icon libraries (lucide-react + @phosphor-icons/react) | 🟡 | M: 2hr | Pick one, migrate all icons. lucide-react recommended (already used in dashboard). |
| TD-20 | No `next/dynamic` for heavy modals | 🟡 | S: 1hr | Lazy-load `UploadModal`, `EditorModal`, `ExportModal` with `ssr: false`. |
| TD-21 | Fonts via `@import` instead of `next/font/google` | 🟡 | S: 30min | Convert to `next/font` for automatic optimization + no FOUT. |
| TD-22 | CSS `height` animation on waveform — layout thrashing | 🟢 | S: 15min | Change to `transform: scaleY()`. |
| TD-23 | `NEXT_PUBLIC_API_URL` falls back to `localhost:8000` in 5 files | 🟠 | S: 20min | Create a shared config constant with hard error if missing in prod. |
| TD-24 | Missing `not-found.tsx` | 🟡 | S: 20min | Create branded 404 page. |
| TD-25 | No mobile hamburger nav menu | 🟠 | M: 3hr | Implement responsive nav with drawer. |
| TD-26 | Dashboard sidebar not responsive | 🟠 | M: 2hr | Add collapsible sidebar with mobile toggle. |
| TD-27 | `confirm()` used for delete — inaccessible | 🟡 | S: 30min | Replace with custom confirmation modal. |
| TD-28 | `enableHookOpt` checkbox is dead code in UploadModal | 🟢 | S: 5min | Wire to FormData or remove. |
| TD-29 | XHR upload has no abort on unmount | 🟡 | S: 30min | Add `xhr.abort()` in useEffect cleanup. |
| TD-30 | Billing + Projects + Settings pages are placeholders | 🟠 | L: 2d | Build out real billing management, project CRUD, and settings pages. |

---

## 3. Backend Debt

| # | Item | Severity | Effort | Notes |
|---|---|---|---|---|
| TD-31 | `spend_usage_minutes` read-modify-write race | 🔴 | S: 1hr | Use `UPDATE users SET used_minutes = used_minutes + :spent WHERE id = :id AND ...`. Add rowcount check. |
| TD-32 | Credit pack `rollover_credits` race condition | 🔴 | S: 30min | Same atomic UPDATE pattern. |
| TD-33 | Silent exception swallow in `_run_analyze_transcript` | 🔴 | S: 30min | Re-raise rate-limit exceptions so fallback triggers. Add explicit error categories. |
| TD-34 | No API timeout on LLM calls | 🔴 | S: 15min | Add `timeout=120` to all `client.chat.completions.create()` and `client.audio.transcriptions.create()` calls. |
| TD-35 | No chunk count limit in analyzer | 🔴 | S: 30min | Add `MAX_CHUNKS = 20` and implement strategy for long videos (increase words/chunk or truncate). |
| TD-36 | ASS subtitle injection via unsanitized LLM output | 🔴 | S: 30min | Strip/escape `{`, `}`, `\` from LLM-generated text before ASS insertion. |
| TD-37 | `print()` used everywhere instead of structured logging | 🟠 | M: 4hr | Replace with `structlog` or at minimum `logging.getLogger()`. Add correlation IDs. |
| TD-38 | Rate limiter fails OPEN on Redis failure | 🟠 | S: 30min | Add alert/metric on failures. Consider circuit-breaker pattern. |
| TD-39 | `socket.getaddrinfo` blocking in async handler | 🟡 | S: 30min | Run in threadpool executor: `await loop.run_in_executor(None, socket.getaddrinfo, hostname, None)`. |
| TD-40 | Inconsistent API resource naming (`/api/job/` vs `/api/jobs/`) | 🟡 | S: 1hr | Standardize on plural: `/api/jobs/{id}`. Add redirects for old paths. |
| TD-41 | Inconsistent error response shapes (`{"error"}` vs `{"detail"}`) | 🟡 | S: 1hr | Standardize on FastAPI's `HTTPException(detail=...)`. Fix manual `JSONResponse` calls. |
| TD-42 | Preview signing falls back to Stripe webhook secret | 🟠 | S: 15min | Remove Stripe/Stripe fallback. Require dedicated `PREVIEW_SIGNING_SECRET`. |
| TD-43 | `handle_job_error` rolls back before querying job | 🟡 | S: 20min | Restructure to record error state before rollback, or use separate session. |
| TD-44 | No request ID / correlation tracing | 🟡 | M: 2hr | Add middleware to generate `X-Request-ID`, pass to Celery tasks, include in logs. |

---

## 4. Database & Data Debt

| # | Item | Severity | Effort | Notes |
|---|---|---|---|---|
| TD-45 | `jobs.user_id` has no index | 🔴 | S: 5min | `CREATE INDEX idx_jobs_user_id ON jobs(user_id)`. Most common query pattern. |
| TD-46 | `users.stripe_customer_id` has no index | 🟠 | S: 2min | `CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id)`. Every webhook query. |
| TD-47 | `jobs.status` and `jobs.created_at` have no indexes | 🟡 | S: 3min | Add indexes for filtering and ordering. |
| TD-48 | No CHECK constraints on numeric columns | 🟡 | S: 30min | Add constraints on `used_minutes >= 0`, `total_minutes_limit > 0`, `progress BETWEEN 0 AND 100`. |
| TD-49 | `next_billing_date` never populated | 🟠 | S: 1hr | Set on subscription activation from Stripe data. Use for UI display + monthly reset trigger. |
| TD-50 | `is_beta_user` has no admin toggle | 🟠 | S: 1hr | Add admin endpoint or Supabase dashboard procedure. Otherwise all new users locked out. |
| TD-51 | No `subscription_status` column | 🟡 | M: 1hr | Add column to distinguish active/past_due/trialing/canceled states. |

---

## 5. Payment Debt

| # | Item | Severity | Effort | Notes |
|---|---|---|---|---|
| TD-52 | No monthly `used_minutes` reset on renewal | 🔴 | S: 30min | In `activate_subscription`, reset `used_minutes = 0` when same-tier renewal detected. |
| TD-53 | `downgrade_subscription` doesn't reset `used_minutes` | 🟠 | S: 15min | Reset to 0 or cap at new limit on downgrade. |
| TD-54 | No `stripe_subscription_id` on User model | 🟠 | M: 1hr | Add column, populate from webhooks, use for correlation. |
| TD-55 | No `invoice.payment_failed` webhook handler | 🟠 | M: 2hr | Add handler: notify user, mark subscription `past_due`, downgrade after N retries. |
| TD-56 | No Stripe Customer Portal | 🟠 | M: 2hr | Add portal link to billing page for self-service cancellation + payment method management. |
| TD-57 | No idempotency key on checkout creation | 🟢 | S: 10min | Generate `idempotency_key` from `user_id + tier` for checkout sessions. |
| TD-58 | Credit-back on failed renders not implemented | 🟡 | S: 1hr | Track minutes spent per job; refund on failure. Refund policy promises this. |
| TD-59 | Trial "one-time minutes" model is unusual | 🟢 | S: 30min | Clarify in UI: "60 one-time minutes (no monthly refresh)" or switch to monthly model. |

---

## 6. AI Pipeline Debt

| # | Item | Severity | Effort | Notes |
|---|---|---|---|---|
| TD-60 | Fallback clips are blind duration guesses | 🔴 | M: 2hr | Instead of `[0, 60]` and `[duration/2]`, detect audio activity or visual changes as fallback. |
| TD-61 | No inter-request delay between chunk API calls | 🟠 | S: 10min | Add `time.sleep(2.0)` between chunks to stay under Groq 30 RPM limit. |
| TD-62 | Job `provider` field never updated on fallback | 🟠 | S: 15min | Update `job.provider = "openai"` after successful fallback so retries use correct provider. |
| TD-63 | No API cost cap per job/user | 🟠 | M: 2hr | Track API token usage per job; enforce monthly spend cap at user level. |
| TD-64 | FaceTracker singleton not thread-safe | 🟠 | S: 30min | Add `threading.Lock` around model initialization. Or use per-call instantiation. |
| TD-65 | No file size limit on URL downloads | 🟠 | S: 15min | Add `max_filesize` to yt-dlp options matching `MAX_UPLOAD_SIZE`. |
| TD-66 | No prompt injection guard on transcript | 🟡 | S: 30min | Add system prompt hardening. Wrap transcript in delimiters. |
| TD-67 | No provider health check at startup | 🟡 | S: 20min | Ping Groq API at startup, log warning if unreachable. |
| TD-68 | Hardcoded model names | 🟢 | S: 15min | Move to config: `GROQ_LLM_MODEL`, `GROQ_WHISPER_MODEL`, `OPENAI_LLM_MODEL`, `OPENAI_WHISPER_MODEL`. |
| TD-69 | No retry on AI API errors (only Redis retries) | 🟡 | S: 30min | Add `autoretry_for=(APIError, APITimeoutError)` or implement manual retry in analysis loop. |
| TD-70 | Two Celery workers could process same job race | 🟡 | S: 30min | Add optimistic lock to task dispatch: `UPDATE jobs SET status='processing' WHERE id=:id AND status='queued'`. |

---

## 7. Security Debt

| # | Item | Severity | Effort | Notes |
|---|---|---|---|---|
| TD-71 | `.env.production` committed with live secrets | 🔴 | S: 30min | Rotate DB password + JWT secret. `git rm --cached`. Add to `.gitignore`. |
| TD-72 | `.env` contains live Groq + Stripe keys on disk | 🔴 | S: 15min | Rotate if ever pushed. Verify not in git history. |
| TD-73 | No security headers (CSP, HSTS, X-Frame-Options, etc.) | 🟠 | S: 1hr | Add security headers middleware to FastAPI. |
| TD-74 | CORS `allow_methods=["*"]`, `allow_headers=["*"]` | 🟠 | S: 10min | Restrict to `["GET", "POST", "DELETE", "OPTIONS"]` and `["Authorization", "Content-Type"]`. |
| TD-75 | No CSRF protection | 🟠 | S: 1hr | Add CSRF middleware or custom header requirement for state-changing endpoints. |
| TD-76 | Docker runs as root | 🟡 | S: 10min | Add `USER 1000` to Dockerfile. |
| TD-77 | `.dockerignore` missing critical exclusions | 🟠 | S: 15min | Add `.env.production`, `frontend/.env*`, `.git/`, `tests/`, `docs/`, `node_modules/`. |
| TD-78 | Unpinned Python dependencies | 🟠 | M: 1hr | Pin all versions in `requirements.txt`. Generate hashes for `--require-hashes`. |
| TD-79 | `SUPABASE_JWT_SECRET` is dead config but has a value | 🟡 | S: 5min | Remove from `.env.example` and `.env.production`. Rotate Supabase JWT secret. |

---

## 8. DevOps & Infrastructure Debt

| # | Item | Severity | Effort | Notes |
|---|---|---|---|---|
| TD-80 | `psycopg2-binary` won't build on `python:3.10-slim` | 🔴 | S: 5min | Add `libpq-dev gcc` to Dockerfile apt-get install. |
| TD-81 | Docker volume mounts mismatch | 🔴 | S: 5min | Fix `docker-compose.yml` mounts to match `app/config.py` paths. |
| TD-82 | No CI/CD pipeline | 🔴 | M: 3hr | Create `.github/workflows/ci.yml` with test, lint, build, deploy stages. |
| TD-83 | No `railway.json` or `Procfile` | 🟠 | S: 5min | Create `railway.json` with Dockerfile builder. |
| TD-84 | No Redis persistence volume | 🟠 | S: 5min | Add named volume to docker-compose for Redis data. |
| TD-85 | No worker healthcheck in docker-compose | 🟡 | S: 10min | Add `celery inspect ping` healthcheck. |
| TD-86 | No container resource limits | 🟡 | S: 5min | Add `deploy.resources.limits` to prevent OOM. |
| TD-87 | No monitoring/alerting | 🟠 | M: 4hr | Add Sentry + UptimeRobot + Celery Flower. |
| TD-88 | No multi-stage Docker build | 🟢 | S: 1hr | Separate builder stage for pip installs, final stage only copies `/app`. |
| TD-89 | Frontend build requires `--webpack` flag | 🟡 | ? | Investigate Turbopack incompatibility. This is a Next.js 16 issue. |
| TD-90 | `frontend/.env.production` points to nonexistent API | 🔴 | S: 5min | Must be updated to actual production API URL before deployment. |

---

## 9. Testing Debt

| # | Item | Severity | Effort | Notes |
|---|---|---|---|---|
| TD-91 | No integration tests for payment flow | 🟠 | L: 1d | Test Stripe webhook → subscription activation end-to-end. |
| TD-92 | No integration tests for full AI pipeline | 🟠 | L: 1d | Test upload → transcribe → analyze → render end-to-end with mock APIs. |
| TD-93 | No frontend tests | 🟡 | L: 2d | Add basic smoke tests with Playwright or Cypress. |
| TD-94 | `smoke_test.py` at root has broken import | 🟢 | S: 5min | Fix import from `app.worker` to `app.workers` or delete the root file. |
| TD-95 | Two different smoke test files | 🟢 | S: 5min | Consolidate `smoke_test.py` (root) and `scripts/smoke_test.py`. |
| TD-96 | No test coverage for `spend_usage_minutes` race condition | 🟠 | S: 1hr | Write concurrent test that spawns 2 threads to verify atomicity. |

---

## 10. Documentation Debt

| # | Item | Severity | Effort | Notes |
|---|---|---|---|---|
| TD-97 | No inline API documentation (OpenAPI descriptions) | 🟡 | M: 2hr | Add `description=` to FastAPI route decorators. |
| TD-98 | No CHANGELOG.md | 🟢 | S: 30min | Start tracking changes for v1.0. |
| TD-99 | No CONTRIBUTING.md | 🟢 | S: 30min | Document PR process, code style, testing requirements. |
| TD-100 | `AGENTS.md` references `node_modules/next/dist/docs/` | 🟢 | S: 5min | Verify this Next.js 16 guide path is correct. |

---

## Summary by Severity

| Severity | Count | Total Effort (Estimated) |
|---|---|---|
| 🔴 P0 — Production Blocker | 20 | ~12 hours |
| 🟠 P1 — Launch Gate | 25 | ~35 hours |
| 🟡 P2 — Post-Launch Immediate | 30 | ~30 hours |
| 🟢 P3 — Technical Debt | 18 | ~8 hours |
| ⚪ P4 — Future Scale | 7 | Monitor |

**Total estimated effort to clear all debt: ~85 hours (~2 developer-weeks)**

---

## Refactor Recommendations (Future)

1. **Service Layer Extraction** — Move business logic from `api/main.py` into `app/services/`. The empty `app/services/` package is ready for this. Every endpoint handler should delegate to a service function.

2. **Repository Pattern** — Wrap SQLAlchemy queries in repository classes. Currently queries are scattered across endpoints, tasks, and payment handlers with inconsistent patterns.

3. **Event-Driven Decoupling** — Replace direct function calls in the pipeline with events. Job status changes, subscription changes, and credit spending should emit events that handlers subscribe to.

4. **API Versioning** — Add `/api/v1/` prefix before public launch. This avoids breaking changes later.

5. **Feature Flags** — Implement a feature flag system (LaunchDarkly or simple Redis-based) for gradual rollouts of billing, demo page, and waitlist features.

6. **WebSocket Auth Upgrade** — Move from query-string tokens to proper WebSocket auth handshake using `sec-websocket-protocol` or connection message auth.

7. **Migration to PostgreSQL-only** — Drop SQLite support in production envs. The dual-database abstraction adds complexity without value. SQLite can remain for local dev.
