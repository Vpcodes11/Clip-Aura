# Clip Aura — Production Security Checklist

## Legend
- ☑️ Done
- ⬜ Not done
- 🔴 Urgent fix needed before launch
- 🟠 High priority
- 🟡 Medium priority

---

## 1. Secrets & Credential Management

| # | Item | Status | Notes |
|---|---|---|---|
| 1.1 | Rotate database password exposed in `.env.production` | 🔴 | Previously committed value redacted from docs |
| 1.2 | Rotate Supabase JWT secret exposed in `.env.production` | 🔴 | Previously committed value redacted from docs |
| 1.3 | Rotate Groq API key in `.env` | 🔴 | Historical local `.env` key reference removed; rotate in provider dashboard if it was ever shared |
| 1.4 | Rotate Stripe webhook secret in `.env` | 🔴 | Historical local `.env` secret reference removed; rotate in Stripe if it was ever shared |
| 1.5 | Verify `.env` and `.env.production` not in git history | 🔴 | `git log --all -- .env .env.production` — appears clean |
| 1.6 | Verify `frontend/.env.production` not in git history | 🔴 | Currently committed — contains Supabase URL + anon key |
| 1.7 | Remove hardcoded Supabase credentials from `frontend/lib/supabase.ts` | 🔴 | Fallback defaults expose real project URL + anon key |
| 1.8 | Remove hardcoded dev preview secret | 🔴 | `app/api/main.py:80` — `"dev-preview-signing-secret"` |
| 1.9 | Never commit `.env` or `.env.production` to git | ☑️ | `.gitignore` excludes `.env`, but `.env.production` is tracked |
| 1.10 | Add `.env.production` to `.gitignore` | 🔴 | Remove from tracking: `git rm --cached .env.production` |
| 1.11 | Add `frontend/.env.production` to `.gitignore` | 🔴 | Contains Supabase URL + anon key |
| 1.12 | Use environment variable injection (not file-based) for production | 🟠 | Railway/cloud should inject vars, not rely on committed files |

---

## 2. Authentication & Authorization

| # | Item | Status | Notes |
|---|---|---|---|
| 2.1 | Add `middleware.ts` for server-side route protection | 🔴 | Dashboard currently protected client-side only — HTML leaks |
| 2.2 | Remove/dev-lock `DEV_MODE` auth bypass in production | 🔴 | If `NEXT_PUBLIC_DEV_MODE=true` leaks, anyone gets PRO access |
| 2.3 | Lock `DEV_MODE` separately on frontend and backend | 🔴 | They are independent — both must be `false` |
| 2.4 | Fix WebSocket auth: trial expiry not checked | 🟠 | `get_websocket_user` calls `require_beta_access` but NOT `require_active_trial` |
| 2.5 | Add `is_beta_user` management interface | 🟡 | No way to grant beta access — new users default to `False` and are locked out |
| 2.6 | Implement proper password reset flow | 🟡 | Currently missing |
| 2.7 | Implement session timeout/expiry enforcement | 🟡 | Relies entirely on Supabase JWT expiry |
| 2.8 | Add rate limiting to login endpoint | 🟡 | No brute-force protection |
| 2.9 | Verify Supabase RLS policies on auth tables | 🟡 | Must check in Supabase dashboard directly |
| 2.10 | Audit all `Job.user_id == user.id` filters for completeness | ☑️ | Every endpoint filters by user — but human-reliant pattern |

---

## 3. API Security

| # | Item | Status | Notes |
|---|---|---|---|
| 3.1 | Add security headers middleware | 🔴 | CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy missing |
| 3.2 | Restrict CORS `allow_methods` from `["*"]` | 🟠 | Should be `["GET", "POST", "DELETE", "OPTIONS"]` |
| 3.3 | Restrict CORS `allow_headers` from `["*"]` | 🟠 | Should be `["Authorization", "Content-Type"]` |
| 3.4 | Add CSRF protection | 🟠 | No CSRF middleware on state-changing endpoints |
| 3.5 | Add rate limiting to ALL endpoints | 🟠 | Currently only `/api/upload` has rate limiting |
| 3.6 | Rate limit the retry endpoint specifically | 🟠 | `POST /api/job/{job_id}/retry` completely unrestricted |
| 3.7 | Rate limit the clip edit endpoint | 🟠 | `POST /api/clip/edit` triggers CPU-intensive FFmpeg |
| 3.8 | Rate limit WebSocket connections | 🟡 | No connection limit per user |
| 3.9 | Add rate limiter alerting on Redis failure | 🟡 | Rate limiter fails OPEN — alerts needed |
| 3.10 | Fix WebSocket auth token in query string | 🟡 | Move to `sec-websocket-protocol` header |
| 3.11 | Validate ALLOWED_ORIGINS is set in production | 🟠 | If unset, falls back to localhost origins |
| 3.12 | Add input length validation on all Pydantic models | 🟡 | `WordUpdate.word`, `EditClipRequest.title` have no max_length |

---

## 4. API Endpoint Security Audit

| Endpoint | Auth | Rate Limit | Input Validation | Notes |
|---|---|---|---|---|
| `GET /health/*` | ❌ | ❌ | N/A | OK for health probes |
| `POST /api/upload` | ✅ | ✅ (5/min) | ✅ | Good |
| `GET /api/jobs` | ✅ | ❌ | N/A | Add rate limit |
| `GET /api/status/{id}` | ✅ | ❌ | N/A | Add rate limit |
| `GET /api/download/{id}/{file}` | ✅ | ❌ | ✅ | Add rate limit |
| `GET /api/preview-url/{id}/{file}` | ✅ | ❌ | N/A | Add rate limit |
| `DELETE /api/job/{id}` | ✅ | ❌ | N/A | Add rate limit |
| `POST /api/job/{id}/retry` | ✅ | ❌ | N/A | **URGENT: Add rate limit** |
| `POST /api/clip/edit` | ✅ | ❌ | ⚠️ | **URGENT: Add rate limit + input validation** |
| `POST /api/billing/create-checkout-session` | ✅ | ❌ | ✅ | Add rate limit |
| `POST /api/billing/create-credit-pack-session` | ✅ | ❌ | ✅ | Add rate limit |
| `POST /api/billing/webhook` | ⚠️ | ❌ | ✅ | Signature-verified, needs rate limit |
| `WS /ws/{id}` | ⚠️ | ❌ | N/A | Partial auth check, needs rate limit |

---

## 5. Data Protection

| # | Item | Status | Notes |
|---|---|---|---|
| 5.1 | Remove PII from `print()` statements | 🟠 | Auth emails logged via `print()` — GDPR/CCPA concern |
| 5.2 | Implement structured logging (no raw `print()`) | 🟡 | Use `structlog` or `python-json-logger` |
| 5.3 | Encrypt sensitive data at rest | 🟡 | Job transcripts, user emails in SQLite/Postgres |
| 5.4 | Add data retention policy | 🟡 | No automated cleanup of old jobs/uploads |
| 5.5 | Add data export capability (GDPR) | 🟡 | No account data export flow |
| 5.6 | Add account deletion capability (GDPR) | 🟡 | No account deletion flow |
| 5.7 | Audit error message verbosity | 🟡 | Health endpoint leaks DB/Redis error details |
| 5.8 | Verify Stripe webhook event data is not logged | ☑️ | Webhook handler doesn't log payload |

---

## 6. Infrastructure Security

| # | Item | Status | Notes |
|---|---|---|---|
| 6.1 | Add `.env.production` to `.dockerignore` | 🔴 | Currently baked into Docker image |
| 6.2 | Expand `.dockerignore` to exclude tests, docs, frontend, .git | 🟠 | 17 lines vs 69 lines in `.gitignore` |
| 6.3 | Add non-root `USER` to Dockerfile | 🟡 | Container runs as root |
| 6.4 | Add container resource limits (CPU/memory) | 🟡 | No `deploy.resources.limits` in docker-compose |
| 6.5 | Add read-only root filesystem in Docker | 🟡 | `read_only: true` with tmpfs for writable paths |
| 6.6 | Add Redis persistence volume | 🟠 | Celery tasks, rate limit state, Stripe idempotency lost on restart |
| 6.7 | Pin all Python dependency versions | 🟠 | Only `mediapipe==0.10.11` is pinned |
| 6.8 | Pin Docker base image digest | 🟡 | `python:3.10-slim` without `@sha256:...` |
| 6.9 | Add `--require-hashes` to pip install | 🟡 | Supply chain integrity |
| 6.10 | Configure HTTPS/TLS termination | 🔴 | Gunicorn exposes plain HTTP — no TLS config |
| 6.11 | Add worker healthcheck to docker-compose | 🟡 | If Celery dies, Docker won't detect it |
| 6.12 | Add Redis password to docker-compose | ☑️ | Use `${REDIS_PASSWORD:?required}` — good |

---

## 7. Payment Security

| # | Item | Status | Notes |
|---|---|---|---|
| 7.1 | Verify Stripe webhook signature | ☑️ | `stripe.Webhook.construct_event()` with secret |
| 7.2 | Webhook idempotency | ☑️ | Redis `SET NX` with 7-day TTL |
| 7.3 | Fix idempotency fail-open on Redis error | 🟡 | Duplicate events possible if Redis is down |
| 7.4 | Fix `spend_usage_minutes` race condition | 🔴 | Read-modify-write without atomic UPDATE |
| 7.5 | Fix credit pack purchase race condition | 🔴 | Same pattern — use `UPDATE ... SET credits = credits + :amount` |
| 7.6 | Add `stripe_subscription_id` to User model | 🟠 | Can't distinguish multiple subscriptions |
| 7.7 | Handle `invoice.payment_failed` webhook | 🟠 | No dunning/recovery logic |
| 7.8 | Add idempotency key to checkout session creation | 🟡 | Double-click could create two sessions |
| 7.9 | Verify Stripe is in live mode (not test) for launch | 🔴 | Production must use live keys |

---

## 8. SSRF / Injection Protection

| # | Item | Status | Notes |
|---|---|---|---|
| 8.1 | URL validation via `is_safe_url()` | ☑️ | DNS resolution, blocks private IPs |
| 8.2 | TOCTOU: URL check → download gap | 🟡 | DNS rebinding possible between check and yt-dlp download |
| 8.3 | FFmpeg path traversal via filename | ☑️ | `sanitize_filename()` + `os.path.basename()` |
| 8.4 | ASS subtitle injection via LLM output | 🔴 | `{`, `}`, `\` not sanitized before ASS file insert |
| 8.5 | SQL injection via ORM | ☑️ | SQLAlchemy ORM used throughout, no raw SQL in endpoints |
| 8.6 | Prompt injection via adversarial transcript | 🟡 | Transcript text injected into LLM prompt unsanitized |
| 8.7 | `yt-dlp` command injection | 🟡 | yt-dlp downloads arbitrary URLs — need content validation |

---

## 9. Dependency Security

| # | Item | Status | Notes |
|---|---|---|---|
| 9.1 | Pin all Python dependencies | 🟠 | `requirements.txt` has ~20 unpinned packages |
| 9.2 | Run `pip-audit` or `safety check` | 🟡 | Check for known CVEs |
| 9.3 | Run `npm audit` on frontend | 🟡 | Check NPM dependencies |
| 9.4 | Review yt-dlp for known vulnerabilities | 🟡 | Downloads + executes FFmpeg on arbitrary URLs |
| 9.5 | Review mediapipe for CVEs | 🟡 | Version pinned at `0.10.11` |
| 9.6 | Upgrade Celery if needed | 🟡 | No version pinned |
| 9.7 | Check Supabase SDK version | 🟡 | No version pinned |

---

## 10. Frontend Security

| # | Item | Status | Notes |
|---|---|---|---|
| 10.1 | Check for XSS vectors | ☑️ | No `dangerouslySetInnerHTML` with user content (only static JSON-LD) |
| 10.2 | Verify `NEXT_PUBLIC_*` env vars are intentional public | ☑️ | Supabase anon key is designed to be public |
| 10.3 | Add Content-Security-Policy headers | 🟠 | Not set anywhere |
| 10.4 | Verify no API keys in client bundle | ⚠️ | Supabase anon key is normal; check for others |
| 10.5 | Add `rel="noopener noreferrer"` on external links | 🟡 | Check all external links |
| 10.6 | Verify `strict-dynamic` CSP or nonce-based | 🟡 | framer-motion, Google Fonts need allowed |

---

## 11. Monitoring & Incident Response

| # | Item | Status | Notes |
|---|---|---|---|
| 11.1 | Add Sentry error tracking | 🟠 | Free tier: 5K errors/month |
| 11.2 | Add UptimeRobot on `/health/live` | 🟠 | Free tier: 1 monitor |
| 11.3 | Add Celery Flower for worker monitoring | 🟡 | Password-protected |
| 11.4 | Set up Groq API cost alerting | 🟡 | Alert at $50/day threshold |
| 11.5 | Set up Stripe revenue alerting | 🟡 | Alert on payment failures, disputes |
| 11.6 | Create incident response runbook | 🟡 | Who to contact, what to check, how to rollback |
| 11.7 | Set up log aggregation (Loki, CloudWatch, etc.) | 🟡 | Currently only `print()` to stdout |
| 11.8 | Add request ID / correlation tracing | 🟡 | No way to trace a request through all services |

---

## 12. Deployment Hardening

| # | Item | Status | Notes |
|---|---|---|---|
| 12.1 | Disable debug mode in production | 🔴 | `ENVIRONMENT=production, DEV_MODE=false` |
| 12.2 | Use production Stripe keys | 🔴 | Not test keys |
| 12.3 | Set `STORAGE_MODE=cloud` on Railway | 🔴 | Local storage is ephemeral |
| 12.4 | Configure HTTPS termination on Railway | 🔴 | Railway provides this by default |
| 12.5 | Set `ALLOWED_ORIGINS` to production domain | 🔴 | Not localhost |
| 12.6 | Set `FRONTEND_URL` to production domain | 🔴 | For Stripe redirect URLs |
| 12.7 | Create `railway.json` | 🟠 | Railway needs a service definition |
| 12.8 | Add database backup schedule | 🟠 | Supabase PITR or pg_dump cron |
| 12.9 | Test rollback procedure | 🟠 | Documented but never tested |
| 12.10 | Configure health check alerts | 🟡 | Notify on health check failures |

---

## Urgent Fixes (Before Any Traffic)

1. **Rotate all secrets** (blocker-001)
2. **Remove `.env.production` from git tracking** (blocker-013)
3. **Add `middleware.ts` for auth** (blocker-002)
4. **Fix `DEV_MODE` bypass** (blocker-009)
5. **Fix hardcoded Supabase credentials** (blocker-010)
6. **Add security headers** (3.1)
7. **Fix CORS wildcards** (3.2, 3.3)
8. **Set `ENVIRONMENT=production, DEV_MODE=false`** (12.1)
9. **Use live Stripe keys** (12.2)
10. **Configure HTTPS**

## Not Yet Completed: 37 of 64 items
## Urgent (must fix before launch): 15 items
## High priority: 16 items
## Medium priority: 33 items
