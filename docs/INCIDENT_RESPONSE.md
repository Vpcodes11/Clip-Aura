# ClipAura — Incident Response Procedures

---

## Incident: AI Provider Outage (Groq/OpenAI)

**Symptoms:** Jobs stuck in "processing" status, error logs showing `AIServiceError`, circuit breaker opens.

**Automatic mitigation:** Circuit breaker opens after 5 consecutive failures and auto-falls back to alternate provider (Groq → OpenAI or vice versa).

**Manual steps:**
1. Check provider status pages:
   - Groq: https://status.groq.com
   - OpenAI: https://status.openai.com
2. Check circuit breaker state via Redis: `redis-cli GET ai_circuit:groq` and `redis-cli GET ai_circuit:groq:open`
3. If BOTH providers are down:
   - Pause the Celery worker: `docker compose stop worker`
   - This prevents new jobs from failing and wasting retries
4. When provider recovers:
   - Restart worker: `docker compose start worker`
   - Failed jobs can be retried via dashboard or `POST /api/job/{id}/retry`
   - Circuit breaker auto-closes on first successful call
5. If one provider is up but circuit breaker hasn't auto-closed:
   - Manually reset circuit: `redis-cli DEL ai_circuit:groq ai_circuit:groq:open`
   - Or wait for cooldown (60s) and the next job will probe

**User communication:** No automated notification. If outage > 30 min, post to admin dashboard or email beta users.

---

## Incident: Payment Outage (Stripe)

**Symptoms:** Checkout sessions fail, webhooks not arriving, subscription status desync.

**Steps:**
1. Check Stripe status: https://status.stripe.com
2. Check webhook delivery in Stripe Dashboard → Developers → Webhooks → Recent deliveries
3. If webhooks were missed during outage:
   - Use Stripe Dashboard "Resend" button for critical events
   - Or replay all missed events via Stripe API
4. Verify subscription status in local DB:
   ```sql
   SELECT id, email, subscription_tier, subscription_status, stripe_subscription_id
   FROM users WHERE subscription_status IN ('active', 'past_due', 'requires_action');
   ```
5. Compare with Stripe Dashboard → Customers → Subscriptions
6. Fix desync manually if needed:
   - Update `subscription_status` and `subscription_tier` in DB to match Stripe
   - Or trigger `customer.subscription.updated` webhook replay
7. If webhook signature verification fails:
   - Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
   - Rotate webhook secret if compromised

**User impact:** New subscriptions and cancellations won't process during outage. Existing access continues based on local DB state.

---

## Incident: Redis Outage

**Symptoms:** Jobs stuck, progress broadcasts silent, webhook idempotency degrades, circuit breaker unavailable.

**Steps:**
1. Check Redis: `docker compose ps redis`
2. Check Redis logs: `docker compose logs redis`
3. Restart Redis: `docker compose restart redis`
4. Verify connectivity: `redis-cli -a $REDIS_PASSWORD PING`
5. After Redis recovers:
   - Celery workers auto-reconnect (autoretry_for includes RedisError)
   - Circuit breaker state resets (ephemeral Redis keys)
   - Webhook idempotency falls back to DB-only (StripeEvent table PK constraint)
6. If Redis data is lost (no persistence):
   - Circuit breaker starts fresh (no provider history)
   - Rate limit counters reset (no big impact for small beta)
   - Celery task queue is in-memory — no message loss if broker was Redis

**Recovery time:** < 2 minutes if Redis restart succeeds. Circuit breaker and rate limits cold-start.

---

## Incident: Supabase Outage

**Symptoms:** Users can't log in, API auth fails, database queries fail.

**Steps:**
1. Check Supabase status: https://status.supabase.com
2. Check your project dashboard: https://supabase.com/dashboard/project/{your-ref}
3. Verify database connectivity:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```
4. If auth only is down: users with valid sessions (JWT < 1hr old) may still access dashboard
5. If database is down: all API endpoints fail. Celery workers can't read/write job state.
6. **No app-level failover exists.** Wait for Supabase to recover.
7. After recovery:
   - Verify auth works: `curl https://api.yourdomain.com/api/me -H "Authorization: Bearer <token>"`
   - Verify DB works: `curl https://api.yourdomain.com/api/health`
   - Retry any failed jobs

**User communication:** Post status update. This is a hard dependency — no degraded mode available.

---

## Incident: Deployment Rollback

**When:** New deployment causes errors, broken functionality, or user-visible issues.

**Steps:**
1. Identify the bad deployment: check `docker images` for recent tags
2. Stop all services: `docker compose down`
3. Revert to previous image:
   ```bash
   docker tag clip-aura-web:v1.0.0 clip-aura-web:latest
   ```
4. If .env changes were part of the problem:
   - Restore `.env.production` from backup
5. Restart: `docker compose up -d`
6. Verify all 3 services healthy: `docker compose ps`
7. Smoke test: upload + process + download
8. If database migration was part of bad deploy:
   - Roll back Supabase migration via Supabase Dashboard
   - Or restore from backup (manual Supabase process)

**Rollback time target:** < 5 minutes for Docker image revert. Add time for DB migration rollback if needed.

---

## Incident: Webhook Failure

**Symptoms:** Subscription status not updating, credits not being added, cancellations not processing.

**Steps:**
1. Check Stripe webhook delivery logs: Stripe Dashboard → Developers → Webhooks
2. Look at recent events — any with non-200 status?
3. Check app logs for webhook errors:
   ```bash
   docker compose logs web | grep webhook
   ```
4. If webhook secret mismatch:
   - Verify `STRIPE_WEBHOOK_SECRET` in `.env.production` matches Stripe Dashboard
   - Rotate in Stripe Dashboard and update `.env.production`
   - Restart web service: `docker compose restart web`
5. Replay missed events:
   - In Stripe Dashboard, select missed event → "Resend"
   - Or use Stripe CLI: `stripe events resend <event_id>`
6. Verify events processed after replay:
   ```sql
   SELECT event_id, event_type, created_at FROM stripe_events ORDER BY created_at DESC LIMIT 20;
   ```
7. Manual fix for any remaining desync:
   - Compare `users` table subscription fields with Stripe customer data
   - Update DB directly for emergency fixes: `UPDATE users SET subscription_status = 'active' WHERE ...`

---

## On-Call Contact Information

*(Fill in before launch)*
- **Primary engineer:** [Name] — [Phone] — [Email]
- **Stripe support:** https://support.stripe.com
- **Supabase support:** https://supabase.com/support
- **Hosting provider:** [Railway/Vercel/AWS] — [Dashboard URL]
