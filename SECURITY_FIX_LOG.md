# ClipAura Security Fix Log

**Date:** 2026-05-23

## Secrets

- Replaced `.env`, `.env.production`, and `.env.example` values with placeholders.
- Removed hardcoded Supabase URL and anon key fallback from `frontend/lib/supabase.ts`.
- Removed partial historical secret references from `docs/SECURITY_CHECKLIST.md`.
- Verified the repo with credential regex scans. No full Groq, Stripe, webhook, or JWT-style secrets were found outside intentional test/example strings.

## Environment Hardening

- Backend refuses to start when `ENVIRONMENT=production` and `DEV_MODE=true`.
- Backend now rejects secret-looking values exposed through `NEXT_PUBLIC_*` in production.
- Frontend throws during production builds if `NEXT_PUBLIC_DEV_MODE=true`.
- `.env.production` is placeholder-only and documents that real values must live in secret managers.

## Auth Protections

- Added `frontend/proxy.ts` to protect `/dashboard/*` route rendering.
- Proxy redirects unauthenticated requests to `/login?next=<route>`.
- Dashboard APIs remain protected by backend Supabase JWT validation and beta-access checks.
- Added a frontend session hint cookie after successful auth to support proxy route gating for the current Supabase client setup.

## Webhook Protections

- Stripe webhook signature verification remains mandatory.
- Added Redis replay protection plus durable `stripe_events` table idempotency.
- Duplicate Stripe events are ignored safely.
- Webhook handlers are idempotent for credit pack purchases and subscription lifecycle updates.

## Remaining Manual Security Steps

- Rotate Groq, Stripe, Supabase JWT, Redis, S3/R2, and preview-signing secrets in the provider dashboards.
- Set production secrets only in Railway/Vercel/Supabase secret managers.
- Apply the Supabase migration before receiving live webhooks.
- Confirm Vercel/Railway have `NEXT_PUBLIC_DEV_MODE=false` and `DEV_MODE=false`.
