# ClipAura Billing Integrity Report

**Date:** 2026-05-23

## Atomicity Fixes

- Added `spend_usage_minutes_atomic(db, user_id, minutes)` with row locking for PostgreSQL production.
- Monthly plan minutes are still consumed before rollover credits.
- Added `jobs.usage_minutes_charged` so each job can charge source minutes only once.
- Worker now charges minutes only after at least one clip renders successfully.
- Duplicate job retry or duplicate completion paths skip already charged jobs.

## Subscription Logic

- Added `subscription_status`, `stripe_subscription_id`, and `last_usage_reset_at` to `users`.
- Paid subscription activation sets tier, limit, status, and resets monthly usage.
- `invoice.paid` / `invoice.payment_succeeded` reset `used_minutes` and update renewal date.
- `invoice.payment_failed` marks users `past_due`.
- Subscription deletion/downgrade returns the account to TRIAL and resets used plan minutes.
- Checkout creation now rejects users with an existing active/past-due/canceling subscription to prevent multi-plan stacking.

## Webhook Protections

- Stripe signature verification required.
- Redis idempotency protects normal duplicate deliveries.
- `stripe_events` table protects against replay/duplicate events if Redis is unavailable or flushed.
- Credit pack fulfillment uses a locked user row and increments `rollover_credits` once per Stripe event.

## Cancellation Handling

- Added `/api/billing/cancel-subscription`.
- Cancellation uses Stripe `cancel_at_period_end=true`.
- Local status changes to `canceling`.
- User keeps access until Stripe sends terminal lifecycle events.

## Remaining Billing Risks

- Plan upgrades/downgrades are not self-service yet.
- Cancellation portal UX is basic and does not expose Stripe-hosted invoice history.
- Production correctness depends on applying `20260523010000_beta_integrity_tables.sql`.
- Webhook endpoint must be configured with checkout, subscription, and invoice events before launch.
- Stripe Dashboard product/price IDs still need to be created and inserted into host secrets.
