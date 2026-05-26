# ClipAura — Closed Beta Launch Checklist

**Target:** 10-20 beta users with real payments  
**Stripe mode:** Test mode for first week, then live  

---

## Pre-Deployment

### Secrets & Environment
- [ ] **ROTATE ALL LEAKED SECRETS** (CRITICAL — do first):
  - [ ] Supabase JWT secret → Supabase Dashboard → Settings → API → Generate new JWT secret
  - [ ] Supabase database password → Supabase Dashboard → Database → Reset password
  - [ ] Groq API key → Groq Console → API Keys → Revoke old, create new
  - [ ] Stripe secret key → Stripe Dashboard → Developers → API Keys → Roll key
  - [ ] Stripe webhook secret → Stripe Dashboard → Developers → Webhooks → Re-generate signing secret
- [ ] Copy `.env.production.example` to `.env.production` and fill in ALL values
- [ ] Verify `.env.production` is gitignored: `git status` should NOT show `.env.production`
- [ ] Copy `frontend/.env.production.example` or create `frontend/.env.production` with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_URL` (must be real production API URL, not localhost)
  - `NEXT_PUBLIC_DEV_MODE=false`
- [ ] Run `python scripts/check_env_contract.py` to validate all env keys present and non-empty
- [ ] Verify `DEV_MODE=false` is explicit in `.env` (not empty, not missing, not any other value)

### Stripe Configuration
- [ ] Create Stripe Products & Prices in Stripe Dashboard
- [ ] Set up Stripe webhook endpoint pointing to `https://api.yourdomain.com/api/billing/webhook`
- [ ] Webhook events enabled: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] Configure Stripe Customer Portal in Stripe Dashboard
- [ ] Set `STRIPE_PRO_PRICE_ID`, `STRIPE_STUDIO_PRICE_ID`, `STRIPE_AGENCY_PRICE_ID`, `STRIPE_CREDIT_PACK_PRICE_ID` in `.env.production`

### Supabase Configuration
- [ ] Verify Supabase project is on a paid plan (not paused after inactivity)
- [ ] Enable Row Level Security (RLS) on all public tables
- [ ] Configure auth providers: Email/Password, Google OAuth
- [ ] Set site URL and redirect URLs in Supabase Auth settings
- [ ] Run `supabase/migrations/20260523000000_add_rollover_credits.sql` if not already applied

### Deployment
- [ ] Build Docker image: `docker compose build`
- [ ] Verify no build errors, especially `psycopg2-binary` compilation
- [ ] Start all services: `docker compose up -d`
- [ ] Verify all 3 services healthy: `docker compose ps` (web, worker, redis all running)
- [ ] Check health endpoint: `curl https://api.yourdomain.com/api/health`
- [ ] Check readiness endpoint: `curl https://api.yourdomain.com/health/ready`
- [ ] Verify frontend builds and deploys: `cd frontend && npm run build` (0 errors)

---

## Smoke Testing

### Auth
- [ ] Visit landing page → loads without errors
- [ ] Navigate to `/login` → login form visible
- [ ] Create account via email/password signup
- [ ] Verify email confirmation (Supabase sends confirmation email)
- [ ] Login with confirmed email → redirected to `/dashboard`
- [ ] Direct access to `/dashboard` without session → redirected to `/login`
- [ ] Google OAuth sign-in works (if configured)
- [ ] Logout → redirected to landing page
- [ ] Browser back button after logout → does NOT show dashboard
- [ ] Verify no dashboard HTML flashes before redirect for unauthenticated users

### Upload + Processing
- [ ] Upload a short video (30-60s MP4) via dashboard
- [ ] Verify upload progress indicator shows during upload
- [ ] Job appears in dashboard with "processing" status
- [ ] WebSocket progress updates appear (transcription, analysis, rendering)
- [ ] Job completes → clips appear in dashboard
- [ ] Each clip has: title, hook caption, preview video, virality score
- [ ] Download a clip → MP4 file downloads correctly
- [ ] Check clip has correct aspect ratio, subtitles, no watermark (if on paid tier, watermark if trial)
- [ ] Upload via URL (YouTube link) → processing works same as file upload
- [ ] Test with a 5-minute video (verifies multi-chunk AI analysis)

### AI Pipeline Verification
- [ ] Verify transcription is accurate (spot-check a few lines)
- [ ] Verify clips are at viral-worthy moments (not random or all at start)
- [ ] If Groq rate limit hits, verify fallback to OpenAI works
- [ ] Circuit breaker: simulate 5 consecutive Groq failures → verify auto-fallback
- [ ] After circuit opens, verify job still succeeds via OpenAI
- [ ] Verify failed jobs show clear error messages in dashboard

### Billing (Stripe Test Mode)
- [ ] Subscribe to PRO plan → Stripe Checkout loads
- [ ] Use test card `4242 4242 4242 4242` → payment succeeds
- [ ] Dashboard shows PRO tier, 240 minutes total
- [ ] `used_minutes` resets to 0 after subscription activation
- [ ] Upload and process videos → verify `used_minutes` increments correctly
- [ ] Purchase credit pack → `rollover_credits` increments by 60
- [ ] Process video that exceeds plan minutes → rollover credits consumed
- [ ] Cancel subscription → status shows "canceling"
- [ ] Wait for period end (or simulate via Stripe test clock) → user downgraded to trial
- [ ] Stripe Customer Portal opens correctly
- [ ] Payment failure → status shows "past_due", portal link still works
- [ ] `invoice.payment_action_required` → status shows "requires_action"

### Edge Cases
- [ ] Refresh page during upload → job list still loads
- [ ] Upload very large file (>2GB) → rejected with clear error
- [ ] Upload non-video file → rejected with clear error
- [ ] Submit empty file → rejected with clear error
- [ ] Delete a job → confirmed, disappears from list
- [ ] Retry a failed job → restarts processing
- [ ] Two browsers/tabs with same user → both show dashboard

---

## Rollback Preparation

### Before Going Live
- [ ] Document current Docker image tag: `docker images clip-aura-web --format '{{.Tag}}'`
- [ ] Keep previous working `.env.production` backup
- [ ] Keep previous Docker image available (do not prune immediately)
- [ ] Note current Supabase migration version

### Rollback Procedure
1. Stop all services: `docker compose down`
2. Restore previous `.env.production` if env changes caused issue
3. Revert Docker image: `docker tag clip-aura-web:previous clip-aura-web:latest`
4. Restart: `docker compose up -d`
5. Verify health: `curl https://api.yourdomain.com/api/health`
6. Run smoke test (upload + process + download)

---

## Safe Beta User Capacity

**Recommended: 10-20 users** with current single-machine deployment.

Limiting factors:
- Single web worker (4 Gunicorn workers)
- 4 Celery workers for video processing
- No CDN — video downloads served from app server
- No horizontal scaling

Monitor: CPU, memory, disk space, Redis memory, Celery queue length.
