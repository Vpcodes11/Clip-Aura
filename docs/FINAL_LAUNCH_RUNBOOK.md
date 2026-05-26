# FINAL LAUNCH RUNBOOK: CLIP AURA

**STATUS**: 🟢 GO FOR LAUNCH  
**SCOPE**: Live Deployment Execution Support

---

## 1. Pre-Deployment Lock

Before executing the deployment, ensure the following conditions are strictly met:

- [ ] **Main Branch is Clean**: No pending commits, unmerged PRs, or WIP changes in the deployment branch.
- [ ] **Latest Tests Passing**: GitHub Actions CI pipeline must show a green checkmark for `backend-tests`, `frontend-build`, `frontend-lint`, `secret-check-pwsh`, and all security audits.
- [ ] **Environment Contract**: Confirm `.env.production` exists ONLY on the production server. Verify it is safely ignored in `.gitignore` and `.dockerignore`.
- [ ] **Razorpay Keys**: Confirm `RAZORPAY_KEY_ID` and `RAZORPAY_WEBHOOK_SECRET` in `.env.production` are the **LIVE** keys.
- [ ] **Production Flags**: Confirm `DEV_MODE=false` in the backend and `NEXT_PUBLIC_DEV_MODE=false` in the Vercel frontend environment variables.

### Pre-Migration Backup Checkpoint
- [ ] **Confirm Backup**: Confirm Supabase PITR or latest backup is available before running migrations. Database rollback should only be used if migrations corrupt data or cause a critical schema issue.
- [ ] **Record Timestamp**: Record the exact UTC timestamp before migrations:
  ```bash
  date -u
  ```
- [ ] **Designated Owner**: Confirm who is responsible for the database restore if a rollback is needed.

---

## 2. Production Deployment Order

Execute the deployment in this exact sequence to prevent race conditions or schema mismatch errors:

1. **Apply Supabase Migrations**: Update the database schema to match the application layer.
2. **Deploy Backend Docker Containers**: Bring up the FastAPI core API.
3. **Deploy Celery Worker**: Bring up the async video processing workers.
4. **Configure Nginx Reverse Proxy**: Mount the Nginx config to expose the API and WebSockets safely to the internet.
5. **Deploy Frontend to Vercel**: Trigger the Next.js production build linked to the new backend API URL.
6. **Configure Razorpay Live Webhook**: Register the live webhook URL in the Razorpay dashboard to start receiving payment events.
7. **Verify Health Endpoints**: Ensure the backend services are responding with 200 OK.

---

## 3. Launch-Day Commands

Execute these exact commands on the production host server:

### Pulling Latest Code
```bash
git fetch origin main
git reset --hard origin/main
```

### Checking Environment Contract
```bash
# Verify no secrets leaked in tracked files
pwsh ./scripts/check-secrets.ps1
```

### Applying Migrations
```bash
# Apply migrations sequentially
psql $DATABASE_URL -f supabase/migrations/20260523000000_add_rollover_credits.sql
psql $DATABASE_URL -f supabase/migrations/20260523010000_beta_integrity_tables.sql
psql $DATABASE_URL -f supabase/migrations/20260523020000_rbac_entitlements.sql
psql $DATABASE_URL -f supabase/migrations/20260526000000_add_performance_indexes.sql
```

### Building and Starting Docker Containers
```bash
# Build the production image and start all services (web, redis, worker) in detached mode
docker compose -f docker-compose.yml --env-file .env.production up -d --build
```

### Checking Logs
```bash
# Monitor all services
docker compose -f docker-compose.yml logs -f

# Monitor just the API
docker compose -f docker-compose.yml logs -f web

# Monitor just the background workers
docker compose -f docker-compose.yml logs -f worker
```

### Checking Backend & Worker Health
```bash
# Check internal API health (Confirms backend container is alive)
curl -f http://localhost:8000/health/ready

# Check public API health (Confirms Nginx + SSL + routing + backend are working together)
curl -f https://<your-domain>/health/ready

# Check worker status
docker compose exec worker celery -A app.workers.celery_app inspect ping
```

### Restarting Services Safely
```bash
# Gracefully restart the web API without dropping active connections
docker compose restart web

# Gracefully restart workers (allows running tasks to finish within timeout limits)
docker compose restart worker
```

---

## 4. Live Smoke Test

Assign an engineer to run through this exact sequence on the live production URL immediately post-deployment.

- [ ] **Signup**: Create a brand new test user via the signup flow.
- [ ] **Login**: Log out and log back in to ensure session tokens persist securely.
- [ ] **Upload**: Upload a small video (e.g., 5-10MB).
- [ ] **Process**: Wait for the AI analysis and clipping jobs to complete. Ensure the Celery worker picks up the job.
- [ ] **Preview**: Open the generated clip and verify the video plays in the browser.
- [ ] **Edit**: Edit the clip caption and verify the change saves successfully.
- [ ] **Download**: Download the generated clip and verify the MP4 file is not corrupted.
- [ ] **Usage Charging**: Verify that your usage minutes were deducted correctly by 1 minute (or the length of the video).
- [ ] **Razorpay Checkout**: Navigate to Pricing, select a plan, and complete a live Razorpay checkout (using a real card, which you can refund later).
- [ ] **Webhook 200 OK**: Ensure the webhook is received (`200 OK` in Razorpay dashboard).
- [ ] **Plan Upgrade**: Refresh the Clip Aura dashboard and confirm the user's plan is instantly upgraded to the paid tier.
- [ ] **Cancellation**: Cancel the subscription from the billing portal.
- [ ] **Log Security Check**: Check the backend Docker logs and Vercel logs to ensure NO environment variables, Bearer tokens, or passwords are being printed.

---

## 5. Rollback Procedures

If a critical failure occurs during launch, execute these steps immediately to rollback safely:

### Vercel Frontend Rollback
1. Go to your Vercel project dashboard -> **Deployments**.
2. Find the previous stable deployment.
3. Click the ellipsis (`...`) and select **"Promote to Production"**.

### Backend Rollback
```bash
# Revert to the last known stable commit
git checkout <previous-stable-commit-hash>

# Rebuild and restart services with the old code
docker compose -f docker-compose.yml --env-file .env.production up -d --build
```

### Docker Service Restart
```bash
# If a specific service hangs, restart it
docker compose restart web
docker compose restart worker
```

### Database Restore (Emergency Only)
*(Note: Database rollbacks should be avoided unless migrations corrupted data. Schema additions rarely break old code).*
1. Go to the Supabase Dashboard.
2. Select your project -> **Database** -> **Backups**.
3. Restore to the automated pre-launch point-in-time backup.

---

## 6. Final Launch Notes

> **FINAL DEPLOYMENT FREEZE**: During launch, do not change UI spacing, prompts, AI logic, pricing logic, database schema, Vercel env vars, or Razorpay products unless rollback is required.

- **Safe to Deploy**: The `main` branch code, the environment files as documented, the Docker setup, and the Supabase migrations are fully locked and safe to deploy.
- **Do Not Change During Launch**:
  - Do NOT alter the database schema manually.
  - Do NOT change Vercel environment variables mid-deployment.
  - Do NOT manually edit UI code, spacing, padding, or layout compactness.
- **Logs to Monitor (First 24 Hours)**:
  - Monitor `docker compose logs -f worker` for `OOMKilled` or `Timeout` errors on large video renders.
  - Monitor Nginx error logs (`/var/log/nginx/error.log`) for `413 Request Entity Too Large` (indicating upload limits might need tweaking) or `502 Bad Gateway` (indicating backend crashes).
- **Post-Launch Verification**: The designated DevOps/Billing Engineer must actively monitor the Razorpay Dashboard for the first 5 real customer transactions to ensure webhooks return `200 OK` and customer accounts are correctly upgraded without manual intervention.
