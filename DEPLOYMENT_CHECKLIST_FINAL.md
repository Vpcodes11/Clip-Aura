# ClipAura Final Deployment Checklist

## 1. Secrets

- [ ] Rotate Groq API key.
- [ ] Rotate Supabase JWT secret if previously shared.
- [ ] Rotate Stripe webhook secret if previously shared.
- [ ] Generate `PREVIEW_SIGNING_SECRET`.
- [ ] Generate `LEAD_HASH_SALT`.
- [ ] Store all backend secrets in Railway or the chosen backend host.
- [ ] Store only intentional public frontend vars in Vercel or frontend host.
- [ ] Confirm `DEV_MODE=false`.
- [ ] Confirm `NEXT_PUBLIC_DEV_MODE=false`.

## 2. Database

- [ ] Apply `supabase/migrations/20260523010000_beta_integrity_tables.sql`.
- [ ] Verify `users.stripe_subscription_id` exists.
- [ ] Verify `users.subscription_status` exists.
- [ ] Verify `jobs.usage_minutes_charged` exists.
- [ ] Verify `stripe_events` table exists.
- [ ] Verify `lead_submissions` table exists.

## 3. Backend Deploy

- [ ] Build Docker image in deployment environment.
- [ ] Confirm `gcc` and `libpq-dev` are installed during build.
- [ ] Set `DATABASE_URL` to PostgreSQL.
- [ ] Set `REDIS_URL` to managed Redis.
- [ ] Set `STORAGE_MODE=cloud`.
- [ ] Configure S3/R2 credentials.
- [ ] Start API service.
- [ ] Start Celery worker.
- [ ] Verify `/health/live`.
- [ ] Verify `/health/ready`.

## 4. Frontend Deploy

- [ ] Set `NEXT_PUBLIC_API_URL`.
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`.
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Deploy frontend.
- [ ] Verify `/`, `/pricing`, `/contact`, `/login`.
- [ ] Verify `/dashboard` redirects when signed out.
- [ ] Verify signed-in user can reach `/dashboard`.

## 5. Stripe

- [ ] Create PRO $29/mo price.
- [ ] Create STUDIO $69/mo price.
- [ ] Create AGENCY $149/mo price.
- [ ] Create Credit Pack $15 one-time price.
- [ ] Set all `STRIPE_*_PRICE_ID` values in backend secrets.
- [ ] Configure webhook endpoint `/api/billing/webhook`.
- [ ] Enable events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`.
- [ ] Send Stripe test webhook and verify `stripe_events` row.

## 6. Product Smoke Test

- [ ] Submit waitlist form and verify `lead_submissions` row.
- [ ] Submit contact form and verify `lead_submissions` row.
- [ ] Create/sign in Supabase test user.
- [ ] Mark test user `is_beta_user=true`.
- [ ] Upload a short MP4.
- [ ] Verify job progresses through WebSocket or polling.
- [ ] Verify clips render.
- [ ] Verify preview URL works.
- [ ] Verify download works.
- [ ] Verify `used_minutes` increments once.
- [ ] Retry completed/failed job and verify credits are not double-spent.

## 7. Rollback Readiness

- [ ] Keep previous frontend deployment available.
- [ ] Keep previous backend image tag available.
- [ ] Confirm database migration is additive-only.
- [ ] Confirm Redis flush is not required for rollback.
- [ ] Confirm Stripe webhook can be disabled quickly.
