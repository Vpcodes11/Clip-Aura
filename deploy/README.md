# Clip Aura Deployment Architecture

This document outlines the production architecture and deployment requirements for Clip Aura.

## Architecture Topology

Clip Aura follows a decoupled full-stack architecture:

```mermaid
graph TD
    Client[Browser/Client]
    
    subindex Frontend
        Vercel[Vercel / Next.js]
    end
    
    subindex Backend (Docker host)
        Nginx[Nginx Reverse Proxy]
        FastAPI[FastAPI Web Server]
        Celery[Celery Worker]
        Redis[Redis Cache & Queue]
    end
    
    Client -->|HTTPS / WSS| Vercel
    Client -->|HTTPS / WSS| Nginx
    Nginx -->|HTTP 8000| FastAPI
    Nginx -->|WS 8000| FastAPI
    FastAPI <-->|Tasks/PubSub| Redis
    Celery <-->|Consume/Result| Redis
```

**Frontend:** Deployed on Vercel (or similar Edge network) for global CDN distribution, SSR, and serverless API routing.
**Backend:** Deployed via Docker Compose on a compute instance (e.g., AWS EC2, DigitalOcean Droplet, Railway) behind a reverse proxy (Nginx or Traefik).

---

## TLS Termination
TLS is terminated at the reverse proxy layer (Nginx). 
- Use Let's Encrypt / Certbot to generate certificates.
- Update `deploy/nginx.conf` with the real paths to your `.crt` and `.key` files.
- The internal Docker network communicates over plain HTTP on port 8000.

---

## Environment Variables

### ⚠️ Secret Hygiene
**NEVER COMMIT REAL SECRETS TO GIT.**
If any real secrets (Supabase keys, Stripe keys, etc.) were ever committed to this repository, you must **rotate them immediately** in their respective dashboards.

### Required Production Variables
Reference `.env.production.example` for the complete list. Key requirements:
- `ENVIRONMENT=production`
- `NODE_ENV=production`
- `GROQ_API_KEY` (Required for video analysis)
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` (Required for Auth/DB)
- `DATABASE_URL` (Required: Production MUST use PostgreSQL, not SQLite)
- `REDIS_PASSWORD` (Required: Must be cryptographically secure)
- `PREVIEW_SIGNING_SECRET` (Required: ≥32 chars random string)
- `LEAD_HASH_SALT` (Required: ≥16 chars random string)

---

## Docker Compose Production Setup
Use the provided `docker-compose.yml` but ensure you:
1. Provide a hardened `.env` file that is in `.dockerignore`.
2. Do not expose Redis ports to the public internet.
3. Configure the `worker` concurrency based on your instance CPU (default is 4).
4. Remove SQLite volume mounts and ensure `DATABASE_URL` points to your managed PostgreSQL database.

---

## Upload Limits
Video files are large. The system is configured to allow up to 2GB uploads.
Both layers must agree on this limit:
- **Nginx:** `client_max_body_size 2G;`
- **FastAPI:** `MAX_UPLOAD_SIZE` env var (Defaults to 2GB)

---

## WebSocket Support
The Clip Aura editor and job status tracker rely on real-time WebSockets (`/ws/`).
- The reverse proxy **must** upgrade the connection.
- In Nginx, this requires `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "upgrade";`.
- Timeout settings must be long enough so the connection isn't dropped during a long video render (e.g., 600s).

---

## Rate Limiting Architecture
Clip Aura employs a dual-layer defense against abuse:
1. **Network Edge (Nginx):** A `limit_req_zone` protects against volumetric attacks (e.g., 30 req/s per IP).
2. **Application (FastAPI):** Redis-based rate limiting enforces strict business logic (e.g., 5 uploads/min per user, expensive operation throttles).
