# Clip Aura — Deployment Runbook

**Target:** Railway (primary) / Docker Compose (fallback)
**Stack:** FastAPI + Celery + Redis + Supabase PostgreSQL + Next.js

---

## Phase 0: Pre-Deploy (Day Before Launch)

### 0.1 Secrets Audit
```bash
# Verify no secrets in git history
git log --all --full-history -- .env .env.production frontend/.env.production
# Should return EMPTY. If not, rotate all exposed secrets immediately.

# Verify .env.production is gitignored
git check-ignore .env.production frontend/.env.production
# Should return both paths.
```
- [ ] Rotate database password if `.env.production` was ever committed
- [ ] Rotate Supabase JWT secret if ever committed
- [ ] Rotate Groq API key
- [ ] Rotate Stripe webhook secret
- [ ] Generate fresh `PREVIEW_SIGNING_SECRET`
- [ ] Move `frontend/.env.production` to `.gitignore`

### 0.2 Environment Variables (Railway Dashboard)
Set ALL of these in Railway:
```
# Required
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
REDIS_PASSWORD=...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
GROQ_API_KEY=gsk_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_STUDIO_PRICE_ID=price_...
STRIPE_AGENCY_PRICE_ID=price_...
STRIPE_CREDIT_PACK_PRICE_ID=price_...
ENVIRONMENT=production
DEV_MODE=false
ALLOWED_ORIGINS=https://clipaura.com,https://www.clipaura.com
FRONTEND_URL=https://clipaura.com
NEXT_PUBLIC_API_URL=https://api.clipaura.com
NEXT_PUBLIC_WS_URL=wss://api.clipaura.com
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_DEV_MODE=false

# Optional but recommended
OPENAI_API_KEY=sk-...
PEXELS_API_KEY=...
STORAGE_MODE=cloud
S3_BUCKET=...
S3_REGION=...
S3_KEY=...
S3_SECRET=...
PREVIEW_SIGNING_SECRET=...
```

### 0.3 Pre-Deploy Checks
```bash
# Run test suite
pytest tests/ -v

# Check environment contract
python scripts/check_env_contract.py

# Build Docker image locally (verify it compiles)
docker build -t clipaura-api:test .

# Run type check on backend
# (if mypy is installed: mypy app/)

# Build frontend
cd frontend && npm run build -- --webpack
```
- [ ] All tests pass
- [ ] Environment contract check passes
- [ ] Docker build succeeds (no missing libs)
- [ ] Frontend build succeeds
- [ ] `psycopg2-binary` compiles without error

### 0.4 Infrastructure Readiness
- [ ] Supabase project in production mode (not paused)
- [ ] Supabase database has migrations applied
- [ ] Stripe account in live mode (not test)
- [ ] Stripe webhook endpoint configured to `https://api.clipaura.com/api/billing/webhook`
- [ ] Stripe webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] Railway project created
- [ ] Redis service provisioned (Railway Redis plugin)
- [ ] DNS configured: `api.clipaura.com` → Railway, `clipaura.com` → Vercel/Netlify
- [ ] SSL certificates active

---

## Phase 1: Deploy

### 1.1 Create `railway.json`
```json
{
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 1.2 Deploy Backend (Railway)
```bash
# Link to Railway project
railway link

# Deploy
railway up

# View logs
railway logs -f
```

### 1.3 Deploy Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

### 1.4 Start Celery Worker
On Railway, add a separate service from the same Docker image with this command:
```
celery -A app.workers.celery_app worker --loglevel=warning --concurrency=4 --max-tasks-per-child=10 --soft-time-limit=540 --time-limit=600
```

---

## Phase 2: Verification (Smoke Tests)

### 2.1 Health Checks
```bash
# Liveness
curl -s https://api.clipaura.com/health/live
# Expected: 200 OK

# Readiness
curl -s https://api.clipaura.com/health/ready
# Expected: 200 OK, {"database": "ok", "redis": "ok"}

# Deep health
curl -s https://api.clipaura.com/api/health
# Expected: 200 OK, {"database": "ok", "redis": "ok", "celery": "ok"}
```

### 2.2 Auth Flow
- [ ] Can sign in with valid Supabase credentials
- [ ] Invalid credentials return error
- [ ] JWT token is issued and valid
- [ ] Dashboard loads for authenticated user
- [ ] Unauthenticated user cannot access `/dashboard`

### 2.3 Upload Flow
- [ ] File upload returns `job_id`
- [ ] URL download returns `job_id`
- [ ] Rate limiting works (6th request in 60s returns 429)
- [ ] Invalid URLs rejected with proper error
- [ ] Files over size limit rejected

### 2.4 Pipeline Flow
- [ ] Job progresses through stages (WebSocket)
- [ ] Transcriber works with Groq
- [ ] Analyzer produces clips
- [ ] Clips render with FFmpeg
- [ ] Clips appear in dashboard
- [ ] Clip download works
- [ ] Clip edit/regenerate works

### 2.5 Payment Flow
```bash
# Test checkout session creation
curl -X POST https://api.clipaura.com/api/billing/create-checkout-session \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"tier": "pro"}'
# Expected: Returns Stripe Checkout URL

# Test webhook (using Stripe CLI)
stripe trigger checkout.session.completed
# Verify: User tier updated in database
```
- [ ] Checkout session creates Stripe URL
- [ ] Webhook activates subscription
- [ ] Webhook downgrades subscription
- [ ] Webhook grants credit pack
- [ ] Duplicate webhook events are idempotent
- [ ] Subscription tier reflected in UI

### 2.6 Frontend Checks
- [ ] Landing page loads without hydration errors
- [ ] All pages render (no broken pages)
- [ ] Navigation works on desktop and mobile
- [ ] Forms submit correctly
- [ ] Animations run smoothly (no jank)
- [ ] SEO meta tags present on all pages
- [ ] Loading states appear during data fetch
- [ ] Error states display gracefully

---

## Phase 3: Post-Deploy Monitoring

### 3.1 Immediate (First Hour)
```bash
# Watch Railway logs for errors
railway logs -f | grep -i "error\|exception\|traceback"

# Check Celery worker is processing tasks
celery -A app.workers.celery_app inspect active

# Monitor Stripe dashboard for webhook deliveries
# https://dashboard.stripe.com/webhooks

# Check database connection
railway run python -c "from app.models.models import engine; engine.connect()"
```

- [ ] No errors in API logs
- [ ] Celery worker consuming tasks
- [ ] Stripe webhooks delivering successfully
- [ ] Database reachable
- [ ] Redis reachable
- [ ] First real user signs in successfully
- [ ] First real job completes successfully

### 3.2 First 24 Hours
- [ ] Monitor error rate (Sentry if configured)
- [ ] Monitor API latency
- [ ] Monitor Groq API usage/cost
- [ ] Check for rate limit errors in logs
- [ ] Verify subscription activations are working
- [ ] Check for minutes/credit accounting errors
- [ ] Monitor server resource usage (CPU, memory, disk)

### 3.3 First Week
- [ ] Review all failed jobs
- [ ] Check for orphaned files in S3/storage
- [ ] Verify billing accuracy (no double charges)
- [ ] Review user feedback
- [ ] Check mobile usability metrics
- [ ] Audit access logs for suspicious activity

---

## Phase 4: Rollback

### If Critical Issue Detected

#### Option A: Railway Rollback
```bash
# Rollback to previous deployment
railway rollback

# Verify rollback
railway status
```

#### Option B: Docker Compose Rollback
```bash
# Stop current containers
docker compose down

# Start with previous image tag
IMAGE_TAG=previous-tag docker compose up -d

# Verify
docker compose ps
```

### Rollback Decision Matrix
| Symptom | Action |
|---|---|
| DB connection errors | Check `DATABASE_URL`, rollback if recent change |
| Auth failures for all users | Check Supabase status, rollback if app change |
| Payment double-charging | Pause Stripe webhooks, rollback, investigate |
| Data corruption | Stop Celery workers, rollback, restore DB backup |
| Security breach | Shut down immediately, rotate all secrets |
| CPU/memory exhaustion | Scale up resources OR rollback to stable version |
| Silent AI failures | Rollback, fix `_run_analyze_transcript` bug |

---

## Phase 5: Launch Day Checklist

### Morning
- [ ] All secrets confirmed fresh/rotated
- [ ] `.env.production` confirmed gitignored
- [ ] `DEV_MODE=false` confirmed in Railway
- [ ] `ENVIRONMENT=production` confirmed
- [ ] Stripe LIVE mode confirmed (not test)
- [ ] DNS propagated and verified
- [ ] SSL certificates valid

### During Launch
- [ ] Monitor #production channel
- [ ] Watch real-time logs
- [ ] Monitor Stripe dashboard for payments
- [ ] Monitor Groq API dashboard for rate limits
- [ ] Keep one engineer on standby

### Evening
- [ ] Review all errors from the day
- [ ] Verify all payments processed correctly
- [ ] Check for any stuck/pending jobs
- [ ] Backup database (if not automated)

---

## Emergency Contacts

| Role | Contact | When |
|---|---|---|
| **Lead Engineer** | TBD | Any production issue |
| **DevOps** | TBD | Infrastructure/deployment issues |
| **Stripe Support** | support.stripe.com | Payment failures |
| **Supabase Support** | supabase.com/dashboard/support | Auth/DB issues |
| **Groq Support** | console.groq.com/support | API issues |
| **Railway Support** | railway.app/help | Deployment issues |

## Quick Reference Commands

```bash
# Check deployment status
railway status

# View service logs (last 100 lines)
railway logs --lines 100

# SSH into service
railway shell

# Check Celery queue length
celery -A app.workers.celery_app inspect active_queues

# Purge stuck tasks
celery -A app.workers.celery_app purge

# Database query (via Railway shell)
python -c "
from app.models.models import SessionLocal, User, Job
db = SessionLocal()
print('Users:', db.query(User).count())
print('Jobs:', db.query(Job).count())
db.close()
"

# Stripe webhook test (local)
stripe listen --forward-to https://api.clipaura.com/api/billing/webhook
```
