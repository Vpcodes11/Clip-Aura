# New PC Checklist

- [ ] Clone `https://github.com/Vpcodes11/Clip-Aura.git`
- [ ] Install Docker Desktop, Git, Node.js 20 LTS, and Python 3.10
- [ ] Copy `.env.example` to `.env`
- [ ] Fill all required environment variables
- [ ] Generate fresh `PREVIEW_SIGNING_SECRET`
- [ ] Generate fresh `LEAD_HASH_SALT`
- [ ] Set a unique `REDIS_PASSWORD`
- [ ] Run `python scripts/check_env_contract.py`
- [ ] Run `docker compose up --build`
- [ ] Confirm `http://localhost:8000/health/ready` returns OK
- [ ] Run `cd frontend && npm install`
- [ ] Run `cd frontend && npm run dev`
- [ ] Confirm `http://localhost:3000` loads
- [ ] Apply Supabase migrations in timestamp order
- [ ] Configure Razorpay webhook endpoint
- [ ] Run `pytest tests -q`
- [ ] Run `cd frontend && npm run build`
