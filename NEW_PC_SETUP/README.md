# New PC Setup Runbook

Use this folder as the handoff checklist after cloning the latest GitHub code on a new machine.

## 1. Install Required Software

- Git
- Docker Desktop with Docker Compose v2
- Node.js 20 LTS or newer
- Python 3.10
- FFmpeg, only needed for non-Docker local backend runs
- Supabase project access
- Razorpay dashboard access
- Groq API key

## 2. Clone The Repo

```powershell
git clone https://github.com/Vpcodes11/Clip-Aura.git
cd Clip-Aura
git status
```

Expected result: clean working tree after clone.

## 3. Create Local Environment

Copy the example file and fill real values locally:

```powershell
Copy-Item .env.example .env
```

Do not commit `.env`. Required local values:

- `GROQ_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `REDIS_PASSWORD`
- `DATABASE_URL`
- `PREVIEW_SIGNING_SECRET`
- `LEAD_HASH_SALT`

Generate strong local secrets:

```powershell
openssl rand -hex 32
```

Use different values for `REDIS_PASSWORD`, `PREVIEW_SIGNING_SECRET`, and `LEAD_HASH_SALT`.

## 4. Run With Docker

Docker is the most reliable way to reproduce the app on the new PC.

```powershell
docker compose up --build
```

Backend URLs:

- API: `http://localhost:8000`
- Liveness: `http://localhost:8000/health/live`
- Readiness: `http://localhost:8000/health/ready`

## 5. Run Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:

- `http://localhost:3000`

## 6. Validate Setup

From the repo root:

```powershell
python scripts/check_env_contract.py
pytest tests -q
```

From `frontend`:

```powershell
npm run build
```

Note: the frontend build script already passes `--webpack` in `package.json`.
If you use `frontend/.env.local`, make sure `NEXT_PUBLIC_DEV_MODE=false` before running a production build. The app intentionally fails production builds when dev mode is enabled.

## 7. Database And Migrations

Apply the SQL files in `supabase/migrations` to the Supabase database in timestamp order. Confirm these tables/columns exist before beta traffic:

- `razorpay_events`
- `lead_submissions`
- `audit_logs`
- `usage_records`
- user entitlement columns such as `role`, `subscription_plan`, `rollover_credits`, and Razorpay customer/subscription IDs

## 8. Payment Webhooks

Configure Razorpay webhook URL:

```text
https://<api-domain>/api/billing/webhook
```

For local testing, expose the backend with a tunnel such as ngrok and point Razorpay to:

```text
https://<ngrok-domain>/api/billing/webhook
```

Events handled by the backend include:

- `subscription.charged`
- `subscription.updated`
- `subscription.cancelled`
- `subscription.halted`
- `payment.captured`

## 9. Files Intentionally Not Migrated Through Git

These are local/runtime artifacts and should be recreated on the new PC:

- `.env`
- `runtime/`
- `uploads/`
- `output/`
- `.refact/buddy/`
- `_docker_build.log`
- `$null`
- `fix.py`
