# Stripe Production Setup

> Manual steps to create live prices and wire them into Clip Aura production.

## 1. Create Products & Prices in Stripe Dashboard

Go to [dashboard.stripe.com/products](https://dashboard.stripe.com/products).

### PRO — $29/month recurring

1. Click **+ Add product**.
2. Name: `Clip Aura PRO`
3. Description: `240 minutes/month, 1080p exports`
4. Pricing model: **Standard pricing**
5. Price: **USD 29.00**, recurrence: **Monthly**
6. Click **Save product**.
7. Copy the `price_...` ID from the pricing table.

### STUDIO — $69/month recurring

1. Click **+ Add product**.
2. Name: `Clip Aura STUDIO`
3. Description: `600 minutes/month, 4K exports, Priority GPU`
4. Pricing model: **Standard pricing**
5. Price: **USD 69.00**, recurrence: **Monthly**
6. Click **Save product**.
7. Copy the `price_...` ID.

### AGENCY — $149/month recurring

1. Click **+ Add product**.
2. Name: `Clip Aura AGENCY`
3. Description: `1500 minutes/month, 4K exports, Team Seats, XML/EDL`
4. Pricing model: **Standard pricing**
5. Price: **USD 149.00**, recurrence: **Monthly**
6. Click **Save product**.
7. Copy the `price_...` ID.

### CREDIT PACK — $15 one-time

1. Click **+ Add product**.
2. Name: `Clip Aura Credit Pack`
3. Description: `60 one-time rendering minutes`
4. Pricing model: **Standard pricing**
5. Price: **USD 15.00**, uncheck **Recurring**
6. Click **Save product**.
7. Copy the `price_...` ID.

---

## 2. Set Webhook Endpoint

1. Go to [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks).
2. Click **+ Add endpoint**.
3. Endpoint URL: `https://api.clipaura.com/api/billing/webhook` (or your Railway domain).
4. Events to send:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**.
6. Reveal and copy the **Signing secret** (`whsec_...`).

---

## 3. Set Environment Variables

Add these to your platform env (Railway, Vercel, etc.) — **never commit real values**:

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` from [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from webhook endpoint above |
| `STRIPE_PRO_PRICE_ID` | `price_...` for PRO product |
| `STRIPE_STUDIO_PRICE_ID` | `price_...` for STUDIO product |
| `STRIPE_AGENCY_PRICE_ID` | `price_...` for AGENCY product |
| `STRIPE_CREDIT_PACK_PRICE_ID` | `price_...` for credit pack product |

---

## 4. Verify

```bash
python scripts/check_env_contract.py --env-file .env.production
```

All 12 required keys must show `PRESENT`. If any are missing, the script exits with code 1.

---

## 5. Redeploy

After env vars are set:
- Railway: services auto-redeploy on env change
- Vercel: manual redeploy or push to trigger

---

## Metadata Contract (checkout sessions)

The code sends these metadata fields — do not remove or rename them:

- **Subscriptions:** `{ user_id, tier: "pro"|"studio"|"agency" }`
- **Credit packs:** `{ user_id, purchase_type: "credit_pack" }`

Webhook handler in `app/api/payments.py` uses these to activate plans and add rollover credits.
