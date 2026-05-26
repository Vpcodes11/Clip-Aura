# Clip Aura — Environment Variables Audit

**Date:** 2025-05-23
**Scope:** All env vars used across frontend and backend

---

## How This Audit Was Conducted

- Grepped entire codebase for `os.getenv`, `os.environ`, `process.env`, `NEXT_PUBLIC_`, `getenv`
- Compared `.env`, `.env.example`, `.env.production`, `frontend/.env.production`
- Traced every variable to its usage site
- Classified server vs client exposure

---

## Complete Variable Inventory

### Backend Variables (`app/`)

| Variable | Used In | Required | .env | .env.prod | Notes |
|---|---|---|---|---|---|
| `DATABASE_URL` | `config.py:279` | Prod only | Commented | **SET (LEAKED)** | Full connection string with password committed |
| `SUPABASE_URL` | `config.py:310`, `auth.py:15` | ✅ Always | ✅ | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | `config.py:311`, `auth.py:16` | ✅ Always | ✅ | ✅ | Anon key for JWT verification |
| `SUPABASE_JWT_SECRET` | `.env.example` only | **DEAD CONFIG** | ✅ | **SET (LEAKED)** | Listed in .env.example but NEVER USED in code. But committed in .env.production! |
| `GROQ_API_KEY` | `config.py:298`, `tasks.py` | ✅ Always | ✅ | **BLANK** 🔴 | Primary AI provider |
| `OPENAI_API_KEY` | `config.py:301`, `analyzer.py`, `transcriber.py` | Optional | ✅ | **BLANK** | Fallback AI provider |
| `PEXELS_API_KEY` | `config.py:305`, `broll.py` | Optional | ✅ | **BLANK** | B-roll footage source |
| `REDIS_URL` | `config.py:308`, `main.py` | ✅ Always | (computed) | **BLANK** 🔴 | Redis connection string |
| `REDIS_PASSWORD` | `config.py:306`, `docker-compose.yml` | ✅ Always | ✅ | **BLANK** 🔴 | Redis auth password |
| `STRIPE_SECRET_KEY` | `config.py:314`, `payments.py` | ✅ Prod | ✅ | **BLANK** 🔴 | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | `config.py:315`, `payments.py`, `main.py:71` | ✅ Prod | ✅ | **BLANK** 🔴 | Webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | `config.py:316` | ✅ Prod | ✅ | **BLANK** 🔴 | Pro tier price |
| `STRIPE_STUDIO_PRICE_ID` | `config.py:317` | ✅ Prod | ✅ | **BLANK** 🔴 | Studio tier price |
| `STRIPE_AGENCY_PRICE_ID` | `config.py:318` | ✅ Prod | ✅ | **BLANK** 🔴 | Agency tier price |
| `STRIPE_CREDIT_PACK_PRICE_ID` | `config.py:319` | ✅ Prod | ✅ | **BLANK** 🔴 | Credit pack price |
| `ALLOWED_ORIGINS` | `main.py:173` | ✅ Prod | ❌ | **BLANK** 🔴 | CORS origins |
| `FRONTEND_URL` | `config.py:303`, `payments.py:66` | ✅ Prod | ✅ | **BLANK** | Stripe redirect target |
| `ENVIRONMENT` | `config.py:291` | ✅ Prod | ✅ | **production** ✅ | Must be "production" |
| `DEV_MODE` | `config.py:289` | Dev only | ✅ | ✅ (false) | NEVER true in prod |
| `PREVIEW_SIGNING_SECRET` | `main.py:68` | Optional | ❌ | Not set | Falls back to S3_SECRET or Stripe webhook |
| `S3_BUCKET` | `config.py:328` | Optional (cloud) | ❌ | Not set | Cloud storage bucket |
| `S3_REGION` | `config.py:329` | Optional (cloud) | ❌ | Not set | Cloud storage region |
| `S3_KEY` | `config.py:330` | Optional (cloud) | ❌ | Not set | Cloud storage access key |
| `S3_SECRET` | `config.py:331`, `main.py:70` | Optional (cloud) | ❌ | Not set | Cloud storage secret key |
| `STORAGE_MODE` | `config.py:327` | Optional | ❌ | Not set | "local" or "cloud" |
| `MAX_UPLOAD_SIZE` | `config.py:295` | Optional | ❌ | Not set | Default 2048MB |
| `BASE_URL` | `config.py:302` | Optional | ❌ | Not set | Server base URL |

### Backend Variables — Dead Config

| Variable | Status | Notes |
|---|---|---|
| `SUPABASE_JWT_SECRET` | **NEVER USED** | In `.env.example` and `.env.production` but no code references it. Rotate anyway. |
| `PREVIEW_SIGNING_SECRET` | Rarely set | Falls back through S3_SECRET → STRIPE_WEBHOOK_SECRET → hardcoded dev secret |

### Frontend Variables (`frontend/`)

| Variable | Used In | Required | `.env.production` | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `supabase.ts:3` | ✅ Always | **SET (hardcoded fallback)** | Exposed to browser — anon key is normal |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `supabase.ts:4` | ✅ Always | **SET (hardcoded fallback)** | Exposed to browser — anon key is normal |
| `NEXT_PUBLIC_API_URL` | `dashboard/page.tsx`, `clips/page.tsx`, `UploadModal.tsx`, `EditorModal.tsx` | ✅ Always | `https://api.clipaura.com` | Falls back to `http://localhost:8000` if unset |
| `NEXT_PUBLIC_WS_URL` | `dashboard/page.tsx` | ✅ Always | Not explicitly set | Autocomputed from `NEXT_PUBLIC_API_URL` |
| `NEXT_PUBLIC_DEV_MODE` | `AuthContext.tsx:10` | Dev only | **NOT SET** | Should be `false` in production |

---

## Exposure Analysis

### Server-Only Variables (should NEVER appear in client bundle)

| Variable | Properly Server-Only? |
|---|---|
| `DATABASE_URL` | ✅ Only in `config.py` (backend Python) |
| `STRIPE_SECRET_KEY` | ✅ Only in `config.py`, `payments.py` |
| `STRIPE_WEBHOOK_SECRET` | ✅ Only in `config.py`, `payments.py`, `main.py` |
| `GROQ_API_KEY` | ✅ Only in backend Python |
| `OPENAI_API_KEY` | ✅ Only in backend Python |
| `REDIS_URL` | ✅ Only in backend Python |
| `REDIS_PASSWORD` | ✅ Only in backend Python |
| `SUPABASE_JWT_SECRET` | ✅ Only in `.env.example` (never used in code) |
| `S3_SECRET` | ✅ Only in `config.py` |

### Client-Exposed Variables (visible in browser)

| Variable | File | Acceptable? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `supabase.ts` | ✅ Anon key — public by design |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `supabase.ts` | ✅ Anon key — public by design |
| `NEXT_PUBLIC_API_URL` | Multiple | ✅ API endpoint URL — public |
| `NEXT_PUBLIC_WS_URL` | `dashboard/page.tsx` | ✅ WebSocket URL — public |
| `NEXT_PUBLIC_DEV_MODE` | `AuthContext.tsx` | ⚠️ Risky — enables full auth bypass if `true` |

---

## Missing Variables (Production Cannot Start)

### `.env.production` — BLANK REQUIRED KEYS

| # | Variable | Impact of Missing |
|---|---|---|
| 1 | `REDIS_URL` | Docker compose crashes on `${REDIS_PASSWORD:?required}` |
| 2 | `REDIS_PASSWORD` | Docker compose crashes |
| 3 | `GROQ_API_KEY` | AI pipeline won't work |
| 4 | `STRIPE_SECRET_KEY` | Payments won't work |
| 5 | `STRIPE_WEBHOOK_SECRET` | Webhooks won't verify |
| 6 | `STRIPE_PRO_PRICE_ID` | Cannot create Pro checkout |
| 7 | `STRIPE_STUDIO_PRICE_ID` | Cannot create Studio checkout |
| 8 | `STRIPE_AGENCY_PRICE_ID` | Cannot create Agency checkout |
| 9 | `STRIPE_CREDIT_PACK_PRICE_ID` | Cannot create credit pack checkout |
| 10 | `ALLOWED_ORIGINS` | CORS falls back to localhost origins |
| 11 | `FRONTEND_URL` | Stripe redirect URLs will be broken |
| 12 | `OPENAI_API_KEY` | No fallback if Groq rate limits |
| 13 | `PEXELS_API_KEY` | B-roll silently disabled |

### `frontend/.env.production`
- `NEXT_PUBLIC_DEV_MODE` not set — defaults to `undefined` (falsy, safe)

---

## Unsafe Patterns

### 1. `.env.production` contains LIVE secrets and IS tracked by git
```
DATABASE_URL=<redacted-previously-exposed-database-url>
SUPABASE JWT secret: <redacted-previously-exposed-jwt-secret>
```
**Action:** `git rm --cached .env.production`, rotate all credentials, add to `.gitignore`.

### 2. `frontend/.env.production` is tracked by git
Contains Supabase project URL and anon key. While anon keys are designed to be public, having them committed ties the codebase to one project. **Action:** `git rm --cached frontend/.env.production`, add to `.gitignore`.

### 3. Hardcoded fallback values in source code
- `frontend/lib/supabase.ts:3-4` — Falls back to specific Supabase project
- Multiple frontend files — `NEXT_PUBLIC_API_URL \|\| 'http://localhost:8000'`
- `app/api/main.py:68-78` — Preview signing falls back through chain to Stripe secret

### 4. `SUPABASE_JWT_SECRET` is dead config
Listed in `.env.example` and set in `.env.production` but never read by any code. Confusing and dangerous.

### 5. Docker `env_file: .env` exposes all secrets to all containers
Worker and web containers both get all 20+ env vars. Consider explicit `environment:` blocks for least-privilege.

### 6. `PREVIEW_SIGNING_SECRET` cryptographic key reuse
Falls back to `S3_SECRET_KEY` then `STRIPE_WEBHOOK_SECRET`. Different keys serving different purposes sharing the same value.

---

## Variable Duplication

| Variable | Files |
|---|---|
| `DATABASE_URL` | `.env.production`, `docker-compose.yml`, possibly Railway dashboard |
| `REDIS_URL` | `.env`, `config.py:308` (computed), `main.py` (alternative read) |
| `SUPABASE_URL` | `.env`, `.env.production`, `frontend/.env.production`, Railway |
| `SUPABASE_ANON_KEY` | `.env`, `.env.production`, `frontend/.env.production`, Railway |

---

## Recommended .env.production Template

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Supabase Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...

# AI Providers
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...         # Optional fallback
PEXELS_API_KEY=...             # Optional B-roll

# Redis
REDIS_URL=redis://:password@host:6379/0
REDIS_PASSWORD=...

# Stripe Billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_STUDIO_PRICE_ID=price_...
STRIPE_AGENCY_PRICE_ID=price_...
STRIPE_CREDIT_PACK_PRICE_ID=price_...

# Deployment
ENVIRONMENT=production
DEV_MODE=false
ALLOWED_ORIGINS=https://clipaura.com,https://www.clipaura.com
FRONTEND_URL=https://clipaura.com

# Storage (if cloud mode)
STORAGE_MODE=cloud
S3_BUCKET=clipaura-renders
S3_REGION=ap-south-1
S3_KEY=AKIA...
S3_SECRET=...

# Security
PREVIEW_SIGNING_SECRET=<random-32-byte-hex>
```

## Recommended `frontend/.env.production` Template

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_API_URL=https://api.clipaura.com
NEXT_PUBLIC_WS_URL=wss://api.clipaura.com
NEXT_PUBLIC_DEV_MODE=false
```

---

## Summary

- **Total variables:** 28 distinct env vars
- **Required in production:** 12
- **Missing/blank in `.env.production`:** 13
- **Leaked/hardcoded in source:** 4 (DB URL, JWT secret, Supabase URL, Supabase anon key)
- **Dead config:** 1 (`SUPABASE_JWT_SECRET`)
- **Unsafe fallback patterns:** 5
- **Duplicate definitions:** 3 variable families
