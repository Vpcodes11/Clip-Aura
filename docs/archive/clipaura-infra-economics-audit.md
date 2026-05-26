# ClipAura — Infrastructure Economics & Scaling Audit

**Audit type:** SaaS CTO infrastructure economics + scaling model  
**Date:** 2026-05-23  
**Pricing model:** Free (30 min) / Creator $19 (150 min) / Studio $49 (500 min) / Scale $119 (1200 min)  
**Stack:** FastAPI + Celery + Redis + Supabase PostgreSQL + Railway → IndiaAI GPU  
**Minutes = source upload duration, not render time**

---

## PART 1: ARCHITECTURE AUDIT FOR SCALE

### 1.1 Pipeline Cost Per Minute of Source Video

Every minute of uploaded video triggers a fixed-cost pipeline before rendering even begins:

| Stage | CPU Time (per min) | API Cost (per min) | Notes |
|---|---|---|---|
| **Download** (URL jobs) | 5-15s | — | yt-dlp. Zero for file uploads. |
| **Preflight** (ffprobe) | <1s | — | Negligible. |
| **Transcribe** (Whisper) | 2-5s | $0.004/min (Groq) or $0.006/min (OpenAI) | Groq Whisper Large v3 Turbo. Audio extraction FFmpeg ~2s per min. |
| **Analyze** (LLM) | <1s | ~$0.001/min (Groq) or ~$0.003/min (OpenAI) | Groq LLaMA 3.1-8B Instant. Chunked per 400 words. |
| **Align** (silence snap) | <1s | — | Pure Python, negligible. |
| **Render** (FFmpeg) | 40-120s per clip minute | — | THIS IS THE BOTTLENECK. CPU libx264. |

**Key insight:** The API costs (Whisper + LLM) are $0.005–$0.009 per source minute. The **compute cost** (FFmpeg rendering) is 20–60× that in CPU time, and it scales with number of clips generated, not just source duration.

### 1.2 Realistic Render Cost Model

A 10-minute source video produces ~3–5 clips of ~30–60 seconds each. That's 2.5–5 minutes of rendered output. With CPU `libx264` at `superfast` preset:

```
Render time per output minute: 1.5–3.0 CPU-minutes
Average clips per 10-min source: 4 clips × 45s = 3 output minutes
CPU time: 3 × 2 = 6 CPU-minutes per 10 source minutes
```

But face tracking adds cost:

```
Face tracking (MediaPipe): 0.5–1.0 CPU-minute per source minute
Face tracking per 10-min source: 5–10 CPU-minutes
```

**Total CPU time per 10-minute source video:** ~11–16 CPU-minutes.

### 1.3 Current Worker Capacity Ceiling

With `--concurrency=4` and `ThreadPoolExecutor(max_workers=4)`, one worker can process **one job at a time** (the 4 concurrency is for parallel clip rendering within a job, not parallel jobs):

```
Jobs per worker per hour (10-min source): ~3–5 jobs
Jobs per worker per hour (30-min source): ~1–2 jobs
Jobs per worker per hour (60-min source): ~0.5–1 job (TIMEOUT RISK)
```

**The 600-second `task_time_limit` is the hard ceiling.** A 60-minute source video will hit it. The pipeline MUST be split for long content.

### 1.4 GPU vs CPU Economics

| Metric | CPU (4 vCPU, 8GB) | GPU (1× NVIDIA T4, 4 vCPU) |
|---|---|---|
| Render speed per output minute | 1.5–3.0 min | 0.1–0.2 min (15-20× faster) |
| Face tracking speed | 0.5–1.0 min per source min | 0.02–0.05 min (20× faster with CUDA) |
| Monthly cost (Railway) | ~$20/vCPU → $80/mo | Not available on Railway |
| Monthly cost (IndiaAI) | ~$30/vCPU → $120/mo | ~$200-400/GPU → $200-400/mo |
| Jobs/hour (10-min source) | 3–5 | 40–60 |
| Cost per job (10-min) | ~$0.50–$0.80 | ~$0.10–$0.20 |

**GPU is 5-10× cheaper per job at scale, but has a higher fixed monthly cost.** At ~50 jobs/day, GPU becomes cheaper. At ~200 jobs/day, GPU is overwhelmingly cheaper.

### 1.5 Redis Capacity

Single Redis instance handling:
- Celery broker (task messages ~1KB each)
- Celery result backend (task results ~5KB each)
- Pub/sub for WebSocket progress (messages ~500B each, 10-20 per job)
- Rate limiting (keys with TTL)
- Stripe idempotency (7-day TTL keys)

**Breakpoint:** ~500 concurrent jobs before Redis memory exceeds 1GB. Not your bottleneck.

### 1.6 Database Load Projections

Each job creates:
- 1 `Job` row (~5KB including transcript JSON and clip metadata)
- No separate per-clip rows (clips stored as JSON array in Job)

| Users | Jobs/user/month | DB growth/month |
|---|---|---|
| 100 | 10 | 5MB |
| 1,000 | 10 | 50MB |
| 10,000 | 10 | 500MB |

Database is not the bottleneck. Supabase Pro (8GB DB) supports ~16M job records.

---

## PART 2: STORAGE & BANDWIDTH ECONOMICS

### 2.1 Storage Growth Per User

Per job lifecycle:
- **Source video (upload):** Average 200MB (3-min to 10-min HD clip). Maximum 2GB (cap).
- **Rendered clips:** 4 clips × 15MB avg = 60MB per job
- **Thumbnails:** 4 × 200KB = ~1MB
- **Temp files:** Transient (cleaned up)

Total storage per completed job: ~260MB.

**Monthly storage per active user (10 jobs):** 2.6GB

| Users | Monthly new storage | Cumulative (3-month retention) |
|---|---|---|
| 100 | 260GB | 780GB |
| 1,000 | 2.6TB | 7.8TB |
| 10,000 | 26TB | 78TB |

### 2.2 S3-Compatible Storage Costs

Using **Cloudflare R2** (cheapest S3-compatible):

| Scale | Monthly storage | Storage cost | Bandwidth (downloads) | Total R2 |
|---|---|---|---|---|
| 100 users | 780GB | $11.70/mo | 50GB free | ~$12/mo |
| 1,000 users | 7.8TB | $117/mo | 500GB (est.) | ~$130/mo |
| 10,000 users | 78TB | $1,170/mo | 5TB (est.) | ~$1,250/mo |

R2 has zero egress fees. This is critical — AWS S3 would be 3-5× more expensive at scale.

**Retention policy is THE lever.** Moving from 90-day to 30-day retention cuts storage cost by 60%. Moving to 7-day cuts by 80%.

### 2.3 Source Video Retention Is the Storage Killer

Source videos (200MB avg) are 75% of total storage. Rendered clips (60MB) are 23%. A simple policy:

- **Delete source video immediately after rendering** → 75% storage reduction
- **Keep rendered clips for 7 days (free), 30 days (paid)** → another 50% reduction

At 10,000 users with source deletion: 78TB → 20TB. R2 cost: $1,170 → $300/mo.

---

## PART 3: INFRASTRUCTURE COST MODELING

### 3.1 Per-User Monthly Costs

Assumptions:
- Average: 60% of minute quota used per paying user
- Average source video: 8 minutes
- Clips per job: 4
- Upload:render ratio: 70% file upload, 30% URL (download cost)

| Cost Category | Per Job (8-min source) | Per Active User (10 jobs/mo) |
|---|---|---|
| **Groq Whisper** | $0.032 | $0.32 |
| **Groq LLaMA** | $0.008 | $0.08 |
| **CPU compute** (Railway $80/mo per 4vCPU) | $0.60 (allocated) | $6.00 |
| **Storage** (R2, 30-day retention) | $0.015 | $0.15 |
| **Database** (Supabase Pro) | $0.0005 | $0.005 |
| **Redis** (Railway plugin ~$10/mo) | $0.02 | $0.20 |
| **Bandwidth** (R2 egress) | $0.00 | $0.00 |
| **Total per user/mo** | | **~$6.75** |

### 3.2 Total Infrastructure Cost at Scale

| Scale | Users (paying) | Monthly infra cost | Per-user cost |
|---|---|---|---|
| **100 users** (70 paying) | 70 | ~$310/mo | $4.40 |
| **1,000 users** (700 paying) | 700 | ~$1,150/mo | $1.64 |
| **10,000 users** (7,000 paying) | 7,000 | ~$5,800/mo | $0.83 |

Infra cost breakdown at 1,000 users:
```
Compute (3× workers @ $80): $240
Whisper API:              $200
LLM API:                  $50
Storage (R2):             $130
Supabase Pro:             $25
Redis:                    $10
Railway platform:         $20
Misc (DNS, monitoring):   $50
─────────────────────────────
Total:                    ~$725
```

### 3.3 The Real Compute Bottleneck at Scale

At 1,000 users generating ~7,000 jobs/month = ~230 jobs/day = ~10 jobs/hour continuously.

With CPU-only encoding (3-5 jobs/hour per worker):
```
Workers needed: 10 / 4 = ~3 workers (12 vCPU total)
Monthly compute: 3 × $80 = $240
```

At 10,000 users generating ~70,000 jobs/month = ~2,300 jobs/day = ~100 jobs/hour:
```
Workers needed (CPU): 100 / 4 = ~25 workers (100 vCPU)
Monthly compute (CPU): 25 × $80 = $2,000
Monthly compute (GPU): 5 × $400 = $2,000 but handles 5× more throughput
```

**The crossover where GPU becomes cheaper than CPU is at ~1,000–2,000 paying users.**

---

## PART 4: MARGIN ANALYSIS

### 4.1 Gross Margin Per Tier

Assumes 60% minute utilization, 8-min average source, 4 clips per job.

| Tier | Price | Quota | Avg Used | Cost/User | Gross Margin |
|---|---|---|---|---|---|
| **Free** | $0 | 30 min | 20 min | $2.10 | -$2.10 (loss leader) |
| **Creator** | $19 | 150 min | 90 min | $6.20 | **67%** |
| **Studio** | $49 | 500 min | 300 min | $15.50 | **68%** |
| **Scale** | $119 | 1200 min | 720 min | $32.00 | **73%** |

**These are healthy SaaS margins.** 67-73% gross margin is strong for an AI-heavy product.

### 4.2 Free Tier Cost Exposure

30 free minutes × 10 free users = 300 minutes/month free. At $0.08/min (API + storage), that's $24/mo for 10 free users. At 100 free users: $240/mo.

**This is manageable.** The free tier acts as a funnel. You're paying ~$2 per free user per month for acquisition. At a 7% conversion rate to Creator, customer acquisition cost (CAC) is ~$30 — excellent for a $19/mo product.

### 4.3 The Heavy User Problem

A Scale user who actually uses 1,200 minutes:
- 150 jobs × 8 min = 1,200 min
- Cost: ~$80
- Revenue: $119
- Margin: 33% (down from 73% at average usage)

**The risk isn't average users — it's the top 5% of power users.** With no hard overage enforcement, a single Scale user at full utilization costs $80/mo. At 100% utilization across all tiers:

| Tier | Revenue | Cost at 100% Usage | Margin |
|---|---|---|---|
| Creator | $19 | $9.30 | 51% |
| Studio | $49 | $30.90 | 37% |
| Scale | $119 | $82.50 | 31% |

**Margins compress 20-40 points at full utilization.** This is acceptable for a premium SaaS (many AI SaaS products operate at 30-50% at full tilt), but it needs monitoring.

### 4.4 The Real Margin Killer: Unknown

You don't know:
1. Actual average source duration (8 min is an assumption)
2. Actual utilization rate (60% is an assumption)
3. Actual number of clips generated per job (4 is an assumption)
4. Actual conversion rate from free to paid (7% is aggressive)

**These four variables swing margin by ±30 points.** The first 90 days of beta will reveal the actual numbers.

---

## PART 5: ABUSE VECTORS & PROTECTION

### 5.1 Identified Abuse Vectors

| Vector | Risk | Current Protection | Gap |
|---|---|---|---|
| **Free tier farming** | Create accounts, burn 30 min, create new account | Rate limiting (5 uploads/min/user). No account-level daily cap. | No device fingerprinting. No phone verification. |
| **URL download abuse** | Submit malicious URLs, spam jobs | SSRF protection (RFC 1918 block). | No domain allowlist. No URL reputation check. yt-dlp accepts any URL with a video. |
| **API key abuse** | Extract Groq key from client-side (it's server-side, so low risk) | Keys are server-side only. | Monitor Groq usage for anomalies. |
| **Storage bombing** | Upload 2GB files, never process, fill storage | 2GB max upload. No job abandoned timeout. | Orphaned uploads from failed/cancelled jobs accumulate indefinitely. |
| **Render queue DoS** | Submit 100 long jobs simultaneously | Rate limiting (5/min). No per-user concurrent job limit. | One user could occupy all 4 worker slots for hours. |
| **Clip leeching** | Download clips, share direct URLs, bypass auth | HMAC-signed URLs (15-min TTL). | Long enough to share widely. Consider 5-minute TTL + referrer check. |
| **Stripe dispute fraud** | Subscribe, use service, chargeback | Stripe Radar included. | Low risk for B2C SaaS with digital goods. |
| **Prompt injection via transcript** | Malicious text in Whisper output → LLM prompt | Strict JSON parsing in analyzer. | Low risk but untested. |

### 5.2 Minimum Protections Before Beta

1. **Per-user concurrent job limit: 2** (currently none)
2. **Free tier daily cap: 10 minutes** (currently 30 total, all usable at once)
3. **Orphaned upload TTL: 24 hours** (delete uploads from abandoned jobs)
4. **Email verification required for all accounts** (via Supabase Auth — check if enforced)
5. **Abuse rate: no more than 20 failed jobs in 24 hours per user** (auto-flag)

### 5.3 Heavy-User Protection System

The biggest margin risk isn't abuse — it's honest heavy users at 100% utilization. Recommendations:

```
Tier:        Free   Creator   Studio   Scale
Soft cap:    20min   120min    400min   960min   (80% of quota)
Warning:     Email   Email     Email     Email
Hard cap:    30min   150min    500min   1200min  (quota)
Overage:     Block   Block     Block     Block   (until rollout)
```

**No overage billing initially.** Block at quota with a friendly upsell message. Overage credits added in v2 once actual usage patterns are known.

---

## PART 6: RENDER CONCURRENCY ARCHITECTURE

### 6.1 Current Architecture

```
User → POST /api/upload → FastAPI → DB insert → Celery task → Worker
                                                         │
                                              ┌──────────┴──────────┐
                                              │  ThreadPoolExecutor  │
                                              │  max_workers=4       │
                                              │  Renders 4 clips     │
                                              │  in parallel         │
                                              └─────────────────────┘
```

**Problem:** Jobs are FIFO. No prioritization. One long job blocks all short jobs.

### 6.2 Recommended v2 Architecture

```
User → POST /api/upload → FastAPI → DB insert
                                        │
                          ┌─────────────┴─────────────┐
                          │     Celery Routing         │
                          │  ┌─────────┐ ┌─────────┐  │
                          │  │  fast   │ │  slow   │  │
                          │  │ <5min   │ │ 5-30min │  │
                          │  │ source  │ │ source  │  │
                          │  └────┬────┘ └────┬────┘  │
                          │       │           │       │
                          │  ┌────▼────┐ ┌────▼────┐  │
                          │  │Worker 1 │ │Worker 2 │  │
                          │  │ 2 slots │ │ 2 slots │  │
                          │  └─────────┘ └─────────┘  │
                          └───────────────────────────┘
```

- **Fast queue:** Source videos <5 min → 2 dedicated workers → quick turnaround
- **Slow queue:** Source videos 5-30 min → 2 dedicated workers → prevents blocking
- **Long videos (>30 min):** Split into sub-tasks (render chunks, concat later)

**Cost:** Same 4 workers, just routed. No additional infrastructure.

### 6.3 Parallel Clip Rendering Is Correct

The `ThreadPoolExecutor(max_workers=4)` pattern for rendering 4 clips in parallel within a single job is the right approach. FFmpeg encoding is CPU-bound and benefits from parallelism. Don't change this — it's the per-job parallelism that matters, plus the per-worker concurrency.

---

## PART 7: AUTO-CLEANUP & RETENTION STRATEGY

### 7.1 Storage Lifecycle

```
Upload source → Process → Delete source after 24h ────────────────┐
                    │                                                │
                    ├→ Rendered clips: keep 7 days (free)           │
                    │                  keep 30 days (paid)           │
                    │                  keep 90 days (Scale)          │
                    │                                                │
                    ├→ Thumbnails: keep as long as clips             │
                    │                                                │
                    └→ Temp files: delete immediately after job      │
```

### 7.2 Cleanup Worker

Add a lightweight Celery Beat scheduled task:

```python
# Every 6 hours
@celery_app.task
def cleanup_expired():
    # 1. Delete source videos >24h old
    # 2. Delete rendered clips past retention for tier
    # 3. Delete orphaned uploads (no job record, >24h old)
    # 4. Purge temp directory
```

**Cost:** Negligible. Runs in seconds, not minutes.

### 7.3 Database Cleanup

- **Failed jobs:** Delete after 30 days (keep for debugging)
- **Free user data:** Delete 30 days after last login (GDPR-friendly)
- **Paid user data:** Retain indefinitely while subscribed; 90 days after cancellation

---

## PART 8: MONITORING & OBSERVABILITY REQUIREMENTS

### 8.1 Minimum Viable Monitoring (Day 1)

| Signal | Tool | Cost |
|---|---|---|
| API uptime | Railway health checks + UptimeRobot | Free |
| Worker health | Celery Flower (read-only, password-protected) | Free (sidecar) |
| Error tracking | Sentry (free tier: 5K errors/month) | Free |
| Cost tracking | Groq dashboard + Railway dashboard | Free |
| Abuse detection | Redis-based rate limit counters | Already built |

### 8.2 Pre-Revenue Alerting

| Alert | Trigger | Channel |
|---|---|---|
| Worker down >2 min | Celery ping fails | Email |
| API error rate >5% | Sentry spike | Email |
| Groq spend >$50/day | Groq dashboard threshold | Email |
| Storage >80% of plan | R2 dashboard | Email |
| Redis memory >80% | Redis INFO | Email |

### 8.3 Post-Revenue (Before 1,000 Users)

- Structured logging (JSON format, ship to Grafana Loki or similar)
- Per-user cost tracking (tag jobs with user tier, calculate margin per user)
- FFmpeg performance metrics (encoding time, failures, timeout rate)
- Queue depth monitoring (Celery queue length over time)

---

## PART 9: MIGRATION PATH: RAILWAY → IndiaAI GPU

### 9.1 Current State: Railway CPU-Only

```
Railway
├── Web (FastAPI): 2 vCPU, 2GB RAM → ~$40/mo
├── Worker (Celery): 4 vCPU, 8GB RAM → ~$80/mo
├── Redis plugin: → ~$10/mo
└── Total Railway: ~$130/mo
```

### 9.2 Phase 1: Hybrid (Railway + IndiaAI GPU)

```
Railway                          IndiaAI GPU
├── Web (FastAPI): 2 vCPU        ├── GPU Worker 1: 1× T4, 4 vCPU
├── Redis plugin                 ├── GPU Worker 2: 1× T4, 4 vCPU
├── Supabase (external)          └── Shared S3 storage (R2)
└── CPU Worker: REMOVED
                                  GPU Workers run:
                                  - FFmpeg NVENC encoding
                                  - Face tracking (CUDA)
                                  - Everything else stays on Railway web tier
```

**Migration steps:**
1. Build GPU Dockerfile (`nvidia/cuda:12.4-runtime-ubuntu22.04` base)
2. Add NVENC encoding path to `clipper.py` (detect GPU, fallback to CPU)
3. Deploy GPU worker to IndiaAI
4. Point GPU worker to same Redis and Supabase (via secure tunnel or public endpoints)
5. Route Celery tasks to `gpu_render` queue
6. Decommission Railway CPU worker

**Latency concern:** IndiaAI GPU → Supabase (Seoul) is ~80-120ms. Acceptable for async tasks. Not for API requests (that stays on Railway).

### 9.3 Phase 2: Full IndiaAI

```
IndiaAI
├── Web (FastAPI): 4 vCPU, 8GB → ~$120/mo
├── GPU Worker Pool: 3× T4 → ~$900/mo
├── Redis: Managed or self-hosted → ~$30/mo
├── PostgreSQL: Managed → ~$50/mo
└── S3-compatible storage: MinIO or R2 → ~$100/mo
    Total: ~$1,200/mo (handles ~5,000 paying users)

Railway
└── Retired
```

### 9.4 When to Migrate

| Trigger | Action |
|---|---|
| 100 paying users | Stay on Railway CPU-only. GPU not needed yet. |
| 500 paying users | Deploy Phase 1 hybrid. One GPU worker for rendering only. |
| 2,000 paying users | Full Phase 2 migration. All compute on IndiaAI. |
| 5,000+ paying users | Multi-GPU pool with autoscaling. |

---

## PART 10: PRODUCTION-READINESS VERDICT

### 10.1 What Must Be Fixed Before Beta (Repeated for Emphasis)

| # | Fix | Impact |
|---|---|---|
| 1 | Fix psycopg2 build | Blocking deploy |
| 2 | Fill 6 blank env vars | Blocking startup |
| 3 | Deploy with TLS | Blocking security |
| 4 | Switch to cloud storage (S3) | Blocking data persistence |
| 5 | Enable Supabase backups | Blocking data safety |
| 6 | Rotate leaked secrets | Blocking security |
| 7 | Deploy frontend | Blocking user access |
| 8 | Add per-user concurrent job limit (2) | Blocking fairness |
| 9 | Add free tier daily cap (10 min) | Blocking abuse |
| 10 | Add orphaned upload TTL cleanup | Blocking storage waste |

### 10.2 Architecture Scalability Score

| Area | Score | Notes |
|---|---|---|
| **API tier** | 7/10 | FastAPI + Gunicorn handles thousands of requests. Needs HTTPS and WAF. |
| **Worker tier** | 5/10 | Celery is correct. CPU-only encoding is the bottleneck. Queue routing missing. |
| **Database** | 7/10 | Supabase scales to millions of rows. Connection pooling done right. No migrations. |
| **Storage** | 6/10 | S3 abstraction built. Not configured. No retention policy. No CDN. |
| **Queue** | 6/10 | Redis is correct. Single instance. No persistence. No routing. |
| **AI pipeline** | 8/10 | Durable checkpoints, fallbacks, partial success. Production-quality. |
| **Pricing architecture** | 8/10 | Tiers are well-structured. Minute tracking exists. No overage (yet — right call). |
| **Security** | 5/10 | Auth is solid. No HTTPS. Leaked secrets. Basic SSRF protection. |

**Overall: 6.5/10 — Functional architecture, incomplete infrastructure. Beta-viable after the 10 fixes above.**

### 10.3 Biggest Technical Risks (Ranked)

1. **CPU rendering cannot scale past 50 concurrent users** — Needs GPU before 500 paying users.
2. **No task splitting for long videos** — 600s timeout means 60-min videos fail silently.
3. **Single Redis instance** — Failure takes down queuing, progress, and rate limiting.
4. **Local storage on ephemeral Railway disk** — All user media lost on restart if not on S3.
5. **No margin monitoring** — You don't know your actual per-user cost. Surprises at scale.

### 10.4 The Architecture IS Production-Scalable For AI Video Rendering...

...**if** you:
- Migrate rendering to GPU before 500 users
- Split long videos into sub-tasks
- Move to cloud storage now
- Add queue routing before 100 concurrent users
- Monitor per-user cost from day one

The core architecture (Celery + Redis + S3 + durable checkpoints + parallel rendering) is exactly right. It needs scaling work, not a rewrite.

---

## PART 11: SUMMARY SCORECARD

| Metric | Status |
|---|---|
| **Beta-ready** | ❌ No — 10 blockers |
| **Beta-viable after fixes** | ✅ Yes — 48 hours of work |
| **100 paying users** | ✅ Current architecture handles this |
| **500 paying users** | ⚠️ Needs GPU worker for rendering |
| **1,000 paying users** | ⚠️ Needs queue routing + GPU pool |
| **5,000 paying users** | ⚠️ Needs IndiaAI migration |
| **10,000 paying users** | ⚠️ Needs multi-GPU autoscaling + CDN |
| **Pricing model** | ✅ Healthy 67-73% margins at avg usage |
| **Free tier cost** | ✅ $2/user/mo — acceptable CAC |
| **Abuse surface** | ⚠️ Manageable with per-user limits |
| **Storage economics** | ✅ Cloudflare R2 is cost-efficient |
| **IndiaAI readiness** | ❌ 2/10 — needs GPU Dockerfile + NVENC path |

**Bottom line:** The pricing model works. The margins are healthy. The architecture is correct. You're 10 fixes away from beta, 3 months from GPU scaling, and 6-12 months from needing IndiaAI migration. Ship the beta first — the infrastructure will tell you what to optimize next.
