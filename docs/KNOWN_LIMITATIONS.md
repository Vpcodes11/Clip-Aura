# ClipAura — Known Limitations (Beta Stage)

These limitations are temporary compromises for closed beta. None block the beta launch, but beta users and operators should be aware of them.

---

## Architecture & Scaling

- **Single-machine deployment**: All components (FastAPI, Celery, Redis) run on one Docker host. No horizontal scaling. Supports ~20 concurrent beta users before resource pressure.
- **No video CDN**: Clips and previews are served directly from the app server. Large downloads may saturate bandwidth during peak usage. Filesystem-based storage (`STORAGE_MODE=local`) means data is tied to the Docker host.
- **No S3/R2 storage configured**: Cloud storage path exists in code but is untested for beta. All uploads and renders live on the local filesystem.

## Database & Migrations

- **No Alembic migrations**: Schema changes are applied via Python `ALTER TABLE` at startup (`schema_compat.py`). Production PostgreSQL has only one proper migration (`add_rollover_credits.sql`). Manual Supabase migration deployment required for schema changes.
- **No automated backups**: Supabase project backups are manual. Database is a single point of failure for all user data, job history, and billing state.
- **SQLite in dev, PostgreSQL in prod**: Schema compatibility maintained by `schema_compat.py` but edge cases possible (e.g., `SELECT FOR UPDATE` is no-op on SQLite).

## Authentication

- **No enterprise SSO**: Only email/password and Google OAuth. No SAML, OIDC, or organization-level auth.
- **Token in query string for WebSocket**: WebSocket auth passes Supabase access token as a URL query parameter. URLs are logged by some proxies. Token is short-lived (1 hour) but still a minor concern.
- **No session revocation**: Signing out only clears the local session. Supabase sessions remain valid until expiry.

## Billing & Payments

- **No annual plans**: Advertised in SAAS_STRATEGY.md but not implemented. Only monthly subscriptions available.
- **No usage alerts**: Users must check dashboard manually to see remaining minutes. No email/SMS/push notification when minutes are low.
- **No dunning management**: Stripe handles failed payment retries, but the app sends no reminders or notifications to users when payment fails.
- **Credit pack minutes never expire**: Rollover credits purchased via credit packs persist indefinitely. No usage window or expiry.
- **No usage-based billing beyond plan minutes**: All tiers are flat-rate monthly. No pay-as-you-go option for users who exceed plan limits (only credit packs).

## AI Pipeline

- **No chunk count limit**: A 3-hour video could generate 35+ LLM API calls. No per-job cost cap. Monitor Groq/OpenAI usage closely.
- **Fallback clips are blind**: When no viral moments are detected, deterministic fallback generates clips at fixed positions (start, middle). These are generic and not guaranteed to contain good content.
- **Provider fallback limited to OpenAI**: Circuit breaker only falls back Groq→OpenAI. No third provider. If both are down, all jobs fail.
- **Rate limit detection via string matching**: Groq rate limit detection searches for "rate_limit" or "429" in error messages. Fragile if Groq changes error format.
- **No face-tracking fallback provider**: If MediaPipe fails to import, face tracking silently degrades to static center crop. Root cause is invisible in logs until a specific warning is added.

## Frontend

- **All pages are client-rendered**: Every page uses `"use client"` directive. No server-side rendering for SEO, no static generation.
- **No `loading.tsx` files**: During data fetching, components show inline spinners rather than Next.js loading states and Suspense boundaries (except ClipsPage).
- **Two icon libraries**: Lucide React and Phosphor Icons both bundled. Increases JS bundle size.
- **No `next/dynamic` for modals**: UploadModal, EditorModal, and ExportModal are eagerly loaded even when never opened.
- **Font via `@import`**: Plus Jakarta Sans loaded via Google Fonts CSS import. Causes Flash of Unstyled Text (FOUT) on first load. Should use `next/font/google`.
- **Admin toggle not in UI**: `is_beta_user` flag must be set via direct DB update. No admin panel.

## Operations

- **No monitoring dashboard**: No Grafana, Datadog, or similar. Rely on `docker compose logs` and Stripe/Supabase dashboards.
- **No alerting**: No PagerDuty, OpsGenie, or even email alerts. Operator must actively monitor.
- **No Celery Flower**: Worker visibility requires checking logs. No UI for queue depth, task status, or worker health.
- **No CI/CD pipeline**: Deployments are manual. No automated tests on push. Production Docker image built locally.
- **No Redis persistence**: Redis is ephemeral (in-memory only). On restart: circuit breaker state lost, rate limit counters reset, Celery task queue cleared (if Redis was the broker).

## Features Not Yet Built

- Team seats (AGENCY tier advertised feature)
- White-label review links (AGENCY tier)
- XML/EDL export (AGENCY tier)
- Brand kits / custom fonts
- Custom caption style configuration
- Video chapter / marker import
- Multi-language transcription
- Social media direct publishing

---

## Manual Processes

- **Beta user onboarding**: `is_beta_user` flag set via `UPDATE users SET is_beta_user = true WHERE email = '...'`
- **Secret rotation**: All keys rotated via provider dashboards — no automated rotation
- **Database backups**: Manual via Supabase Dashboard
- **Failed job triage**: Check logs, retry via dashboard button
- **Subscription recovery**: Compare local DB with Stripe Dashboard, fix desync manually if needed
- **Deployment**: `docker compose up --build -d` from local machine
