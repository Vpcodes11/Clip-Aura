# 📒 Clip Aura: Project Ledger

This is the central log of all development actions, feature updates, and usage guides.

---

## 🗓️ May 23, 2026

### 🚦 Production Rollout Status
**Smoke tests blocked** until manual Stripe + Supabase steps are completed.

#### Env Blockers — `.env.production`
All 12 required keys are declared in `.env.production` but the following are **empty** and must be set in the platform env (Railway) before production launch:

| Key | Status | Source |
|-----|--------|--------|
| `REDIS_URL` | **EMPTY** | Railway Redis plugin |
| `REDIS_PASSWORD` | **EMPTY** | Match Redis password |
| `GROQ_API_KEY` | **EMPTY** | Groq console |
| `STRIPE_SECRET_KEY` | **EMPTY** | Stripe dashboard → API keys → `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | **EMPTY** | Stripe dashboard → Webhooks → `whsec_...` |
| `STRIPE_PRO_PRICE_ID` | **EMPTY** | Stripe dashboard → Products → PRO `price_...` |
| `STRIPE_STUDIO_PRICE_ID` | **EMPTY** | Stripe dashboard → Products → STUDIO `price_...` |
| `STRIPE_AGENCY_PRICE_ID` | **EMPTY** | Stripe dashboard → Products → AGENCY `price_...` |
| `STRIPE_CREDIT_PACK_PRICE_ID` | **EMPTY** | Stripe dashboard → Products → Credit Pack `price_...` |

Keys that are **set** (Supabase infra):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL`, `ALLOWED_ORIGINS`, `DEV_MODE`, `ENVIRONMENT`

#### Migration Blocker
- `supabase/migrations/20260523000000_add_rollover_credits.sql` — **needs manual apply** via Supabase SQL Editor. See `docs/SUPABASE_MIGRATION_RUNBOOK.md`.

#### Stripe Setup
- All 4 price IDs need to be created in the Stripe Dashboard. See `docs/STRIPE_PRODUCTION_SETUP.md`.

#### Build Status
- `npm run build` — PASS (15/15 static pages)

#### check_env_contract.py
- Already covers all 12 required production keys including STUDIO, AGENCY, and CREDIT_PACK. No script changes needed.

### 🐛 Lint Fixes (Build-Blocking)
- **`frontend/app/contact/page.tsx`** — Fixed `react/no-unescaped-entities` (line 53): changed `won't` to `won&apos;t`
- **`frontend/app/login/page.tsx`** — Fixed `@typescript-eslint/no-explicit-any` (lines 53, 71): changed `err: any` → `err: unknown` with `instanceof Error` type narrowing
- **`frontend/lib/AuthContext.tsx`** — Fixed `react-hooks/set-state-in-effect` (dev mode branch): wrapped synchronous `setUser`/`setSession`/`setLoading` calls in `queueMicrotask()` to defer state updates out of synchronous useEffect execution
- **`npm run build`** — PASS (compiled successfully, TypeScript OK, all 15 static pages generated)

### ✅ Completed Actions
1. **Premium Pricing Migration**: Updated public-facing pricing model to reflect premium cinematic positioning.
   - **TRIAL**: $0 (60 one-time mins, watermarked).
   - **PRO**: $29/mo (240 mins, 1080p).
   - **STUDIO**: $69/mo (600 mins, 4K, Priority GPU).
   - **AGENCY**: $149/mo (1500 mins, Team Seats, XML/EDL).
   - Introduced credit pack logic ($15/60m) to remove workflow cutoff anxiety.
   - Added annual plan nudges.
   - Replaced "Creator Edition" card on landing page with "Studio Edition".
   - Adjusted global SEO schema base price to 29.00.
2. **Production Database Preparation**: Added raw Postgres SQL migration (`supabase/migrations/20260523000000_add_rollover_credits.sql`) to safely introduce `rollover_credits` without relying exclusively on SQLite schema syncs.
3. **Test Suite Hygiene**: Fixed stale test imports (`app.rendering.clipper`, `app.models.models`, `app.subtitles.transcriber`) to greenlight the backend test suite. Confirmed 27 tests passing including the `test_pricing_enforcement.py` and `test_env_contract.py`.

### 🛠️ Follow-ups Needed
- **Stripe Dashboard Configuration (Manual Step)**: Operations team must manually create the following Products and Prices in the Stripe Dashboard and place the resulting `price_...` IDs in production secrets:
  - `STRIPE_PRO_PRICE_ID` ($29/mo)
  - `STRIPE_STUDIO_PRICE_ID` ($69/mo)
  - `STRIPE_AGENCY_PRICE_ID` ($149/mo)
  - `STRIPE_CREDIT_PACK_PRICE_ID` ($15 one-time)
- **Known Unrelated Tech Debt**: 
  - `npm run lint` throws preexisting formatting/hook warnings in `AuthContext.tsx`, `login/page.tsx`, `contact/page.tsx`, etc.
  - Test `tests/test_pipeline_e2e.py` may still need data setup tweaks to run robustly in CI, but import errors are resolved.

### Pricing Enforcement Completed
- **Trial expiry**: TRIAL users are blocked from beta-protected app actions after 14 days.
- **Trial watermarking**: Existing FFmpeg watermark branch remains active for TRIAL/non-paid exports.
- **Tier quality caps**: TRIAL and PRO cap at 1080p long-edge output; STUDIO and AGENCY allow 4K long-edge output when a 4K preset is used.
- **4K presets**: Added minimal 4K preset entries so STUDIO and AGENCY can request 4K exports.
- **Rollover credit spending**: Usage now spends monthly plan minutes first, then rollover credits.
- **Stripe env names verified**: `STRIPE_PRO_PRICE_ID`, `STRIPE_STUDIO_PRICE_ID`, `STRIPE_AGENCY_PRICE_ID`, and `STRIPE_CREDIT_PACK_PRICE_ID`.

### Files Changed
- `app/core/plans.py`
- `app/models/models.py`
- `app/api/auth.py`
- `app/api/main.py`
- `app/api/schema_compat.py`
- `app/workers/tasks.py`
- `app/rendering/clipper.py`
- `scripts/check_env_contract.py`
- `tests/test_pricing_enforcement.py`
- `tests/test_env_contract.py`

### Validation Run
- `python -m pytest tests/test_pricing_enforcement.py tests/test_env_contract.py tests/test_clipper_robustness.py tests/test_subprocess_timeouts.py` — PASS, 23 tests.
- `python -m pytest` — FAIL during collection on stale imports in `tests/test_clipper.py`, `tests/test_pipeline_e2e.py`, and `tests/test_transcriber.py` (46 items discovered before interruption).
- `npm run build` — PASS.
- `npm run lint` — FAIL on unrelated existing frontend lint issues in contact, login, ExportModal, dashboard, and AuthContext files.

### Manual Stripe Dashboard Steps
- Create/confirm live monthly price IDs for PRO, STUDIO, and AGENCY.
- Create/confirm one-time price ID for the $15 credit pack.
- Set all four Stripe price IDs in production secrets.
- Confirm Checkout metadata preserves `tier` for subscriptions and `purchase_type=credit_pack` for credit packs.

---

## 🗓️ May 17, 2026

### ✅ Completed Actions
1. **Global Rebrand to Clip Aura**: Rebranded all frontend pages, layouts, configuration comments, backend Swagger documents, custom ASS subtitle scripts, and video overlay watermarks.
2. **Premium Stealth Logo Deployment**: Deployed a luxury, platinum-outlined dark-stealth monogram logo matching the high-end dark slate user interface.

## 🗓️ May 16, 2026

### ✅ Completed Actions
1.  **Next.js 14 Migration**: Transitioned from a static site to a high-performance App Router architecture.
2.  **Stealth Mode Design**: Implemented a cinematic minimalism UI with bento grids and glassmorphism.
3.  **Modern SaaS Branding**: Globally purged niche terminology (Intelligence/Neural) for standard industry language.
4.  **Professional Dev Flow**: Added a `DEV_MODE` bypass to skip authentication and speed up local testing.
5.  **Viral Engine 2.0**: Upgraded physics-based caption animations and brand-aligned highlighting.
6.  **Supabase Auth Wiring**: Fully connected the frontend to the backend's secure authentication context.

### 🛠️ Current System Status
*   **Backend**: Running in Docker (FastAPI + Celery + Redis).
*   **Database**: SQLite (`clip_aura.db`) tracking users and jobs.
*   **Payments**: Connected to Stripe Test Mode.
*   **Auth**: Connected to Supabase.

---

## 📖 How to Use Everything

### 🚀 Running the Project
Use the new helper script:
```powershell
.\scripts\dev.ps1 run
```

### 💳 Testing Payments
1.  Open the app and log in.
2.  Click the **TRIAL** tier badge.
3.  Click **Join Waitlist**.
4.  Use test card `4242 4242 4242 4242` on the Stripe page.
5.  **Important**: Keep `stripe listen` running in a separate terminal to confirm the payment.

### 🔍 Running Health Checks
Before merging or deploying, run the smoke test:
```powershell
.\scripts\dev.ps1 test
```

### 📜 Viewing Logs
To see real-time backend activity and errors:
```powershell
.\scripts\dev.ps1 logs
```

---

## 📝 Pending Items
- [ ] Enable Google OAuth in Supabase Dashboard (User Action).
- [ ] Add real Price IDs for Production.
- [ ] Implement face-tracking sensitivity settings.
