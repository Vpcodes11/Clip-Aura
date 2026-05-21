"""Clip Aura — AI Video Clipper | FastAPI Server"""
import asyncio
import hashlib
import hmac
import os
import uuid
import shutil
import json
import socket
import time
import urllib.parse
import ipaddress
import re
import redis.asyncio as redis
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect, Depends, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import UPLOAD_DIR, OUTPUT_DIR, BASE_DIR, PRESETS, CAPTION_STYLES, DEFAULT_PROVIDER, DEFAULT_CAPTION_STYLE, STORAGE_MODE, DEV_MODE, S3_SECRET_KEY, STRIPE_WEBHOOK_SECRET
from app.api.database import engine, Base, get_db, SessionLocal
from app.api.models import Job, User
from app.api.schema_compat import ensure_job_columns
from app.worker.celery_app import celery_app
from app.core.storage import storage
from app.api.auth import get_current_user, get_supabase_client
from app.api import payments

# Create database tables
Base.metadata.create_all(bind=engine)
ensure_job_columns(engine)

app = FastAPI(title="Clip Aura — AI Video Clipper")

# Security Constraints
ALLOWED_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}
PREVIEW_URL_TTL_SECONDS = 15 * 60


def resolve_job_file(directory: Path, filename: str) -> Path:
    """Resolve a user-supplied job filename without allowing path traversal."""
    safe_name = os.path.basename(filename)
    if safe_name != filename or not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")

    filepath = (directory / safe_name).resolve()
    base = directory.resolve()
    if base not in filepath.parents:
        raise HTTPException(status_code=400, detail="Invalid filename")
    return filepath


def get_preview_signing_secret() -> bytes:
    secret = (
        os.getenv("PREVIEW_SIGNING_SECRET")
        or S3_SECRET_KEY
        or STRIPE_WEBHOOK_SECRET
    )
    if not secret:
        if DEV_MODE:
            secret = "dev-preview-signing-secret"
        else:
            raise HTTPException(status_code=503, detail="Preview signing is not configured.")
    return secret.encode("utf-8")


def sign_preview_url(job_id: str, filename: str, user_id: str, expires_at: Optional[int] = None) -> str:
    safe_name = os.path.basename(filename)
    if safe_name != filename or not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")
    exp = expires_at or int(time.time()) + PREVIEW_URL_TTL_SECONDS
    payload = f"{job_id}:{safe_name}:{user_id}:{exp}".encode("utf-8")
    sig = hmac.new(get_preview_signing_secret(), payload, hashlib.sha256).hexdigest()
    return f"/api/preview/{job_id}/{urllib.parse.quote(safe_name)}?exp={exp}&sig={sig}"


def verify_preview_signature(job_id: str, filename: str, user_id: str, exp: Optional[int], sig: Optional[str]) -> None:
    if not exp or not sig:
        raise HTTPException(status_code=403, detail="Missing preview signature.")
    if exp < int(time.time()):
        raise HTTPException(status_code=403, detail="Preview link expired.")
    expected = sign_preview_url(job_id, filename, user_id, exp).split("sig=", 1)[1]
    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=403, detail="Invalid preview signature.")


def add_preview_urls(job_id: str, user_id: str, clips):
    enriched = []
    for clip in clips or []:
        if isinstance(clip, dict) and clip.get("filename"):
            enriched.append({**clip, "preview_url": sign_preview_url(job_id, clip["filename"], user_id)})
        else:
            enriched.append(clip)
    return enriched


def serialize_job(job: Job) -> dict:
    return {
        "id": job.id,
        "user_id": job.user_id,
        "status": job.status,
        "stage": job.stage,
        "progress": job.progress,
        "message": job.message,
        "source": job.source,
        "provider": job.provider,
        "preset": job.preset,
        "caption_style": job.caption_style,
        "clips": add_preview_urls(job.id, job.user_id, job.clips),
        "errors": job.errors or [],
        "transcript": job.transcript,
        "created_at": job.created_at,
    }


def sanitize_filename(filename: str) -> str:
    """
    Sanitizes a filename to protect against path traversal (../) attacks
    and only allows secure, alphanumeric characters.
    """
    base = os.path.basename(filename)
    name, ext = os.path.splitext(base)
    ext = ext.lower()
    name = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
    name = name.strip('_-')
    if not name:
        name = "uploaded_source"
    return f"{name}{ext}"

def is_safe_url(url: str) -> bool:
    """
    Validates that a URL points to a public server and is not trying to trigger
    a Server-Side Request Forgery (SSRF) attack on local or private networks.
    """
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return False
            
        hostname = parsed.hostname
        if not hostname:
            return False
            
        # Resolve DNS to check all target IP addresses
        addr_info = socket.getaddrinfo(hostname, None)
        for info in addr_info:
            ip_str = info[4][0]
            ip_obj = ipaddress.ip_address(ip_str)
            
            # Block private (RFC 1918), loopback, link-local, and reserved IP ranges
            if (ip_obj.is_private or 
                ip_obj.is_loopback or 
                ip_obj.is_link_local or 
                ip_obj.is_reserved or 
                ip_obj.is_multicast):
                return False
        return True
    except Exception:
        return False

# Configure production-ready CORS origins
ALLOWED_ORIGINS_ENV = os.getenv("ALLOWED_ORIGINS")
if ALLOWED_ORIGINS_ENV:
    origins = [o.strip() for o in ALLOWED_ORIGINS_ENV.split(",") if o.strip()]
else:
    origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include Billing Router
app.include_router(payments.router)

# Redis for Pub/Sub updates
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_async = redis.from_url(REDIS_URL)

# Serve static files
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


@app.get("/")
async def root():
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(url=frontend_url)


@app.get("/api/health")
async def health_check():
    """Production health check: verifies API, DB, Redis, and Celery worker connectivity."""
    import time
    checks = {}

    # 1. Database check
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = {"error": str(e)[:200]}

    # 2. Redis check
    try:
        await redis_async.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = {"error": str(e)[:200]}

    # 3. Celery worker check
    try:
        inspect = celery_app.control.inspect()
        worker_stats = inspect.ping()
        if worker_stats:
            checks["celery"] = {"status": "ok", "workers": len(worker_stats)}
        else:
            checks["celery"] = {"status": "warning", "message": "No workers responded"}
    except Exception as e:
        checks["celery"] = {"status": "warning", "message": f"Inspect failed: {str(e)[:200]}"}

    all_ok = all(
        v == "ok" or (isinstance(v, dict) and v.get("status") == "ok")
        for v in checks.values()
    )

    return JSONResponse({
        "status": "healthy" if all_ok else "degraded",
        "timestamp": time.time(),
        "checks": checks,
    })


@app.get("/health/live")
async def health_live():
    """Liveness probe: the API process is running."""
    return {"status": "ok"}


@app.get("/health/ready")
async def health_ready():
    """Readiness probe: required backing services are reachable."""
    checks = {"database": "unknown", "redis": "unknown"}

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = f"error: {exc.__class__.__name__}"

    try:
        await redis_async.ping()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"error: {exc.__class__.__name__}"

    if any(value != "ok" for value in checks.values()):
        raise HTTPException(status_code=503, detail={"status": "not_ready", "checks": checks})

    return {"status": "ok", "checks": checks}


@app.get("/api/me")
async def get_me(user: User = Depends(get_current_user)):
    """Return current user info and usage stats"""
    return {
        "email": user.email,
        "tier": user.subscription_tier,
        "minutes_remaining": user.total_minutes_limit - user.used_minutes,
        "total_limit": user.total_minutes_limit
    }


@app.get("/api/presets")
async def get_presets():
    """Return available export presets and caption styles"""
    return JSONResponse({
        "presets": PRESETS,
        "caption_styles": {k: {"name": k.replace("_", " ").title()} for k in CAPTION_STYLES},
    })


async def check_rate_limit(user_id: str, limit: int = 5, window_seconds: int = 60) -> bool:
    """
    Redis-based rolling rate limiter to prevent DoS attacks on resource-intensive endpoints.
    Allows up to `limit` requests per `window_seconds`.
    """
    try:
        key = f"rate_limit:{user_id}"
        current = await redis_async.get(key)
        if current is None:
            await redis_async.set(key, 1, ex=window_seconds)
            return True
        
        count = int(current)
        if count >= limit:
            return False
            
        await redis_async.incr(key)
        return True
    except Exception as e:
        # Fail open in case of Redis failure to maintain user experience
        print(f"RATE LIMITER WARNING: Redis communication failed: {str(e)}")
        return True


@app.post("/api/upload")
async def upload_video(
    file: UploadFile = File(None),
    url: str = Form(None),
    provider: str = Form(None),
    preset: str = Form('landscape'),
    caption_style: str = Form(DEFAULT_CAPTION_STYLE),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Accept video upload or URL and start processing pipeline (Authenticated)"""
    
    # Check usage limits
    if user.used_minutes >= user.total_minutes_limit:
        raise HTTPException(status_code=403, detail="You have exhausted your limit. Please upgrade to Pro to continue.")

    # Apply Rate Limiter (Max 5 uploads/imports per minute per user)
    is_allowed = await check_rate_limit(user.id, limit=5, window_seconds=60)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. You are allowed a maximum of 5 video uploads/imports per minute."
        )

    if not provider:
        provider = DEFAULT_PROVIDER
    job_id = str(uuid.uuid4())[:8]
    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    if url and url.strip():
        # URL download mode
        clean_url = url.strip()
        
        # Enforce SSRF safety validation
        if not is_safe_url(clean_url):
            raise HTTPException(
                status_code=400,
                detail="Invalid or forbidden video URL. Access to internal, loopback, or private networks is strictly prohibited."
            )
            
        # Enforce file extension check if the URL path points to a file
        parsed_url = urllib.parse.urlparse(clean_url)
        url_path = parsed_url.path
        if url_path:
            suffix = Path(url_path).suffix.lower()
            if suffix and suffix not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid video file format in URL. Only the following extensions are allowed: {', '.join(ALLOWED_EXTENSIONS)}"
                )

        new_job = Job(
            id=job_id,
            user_id=user.id,
            status='downloading',
            stage='downloading',
            provider=provider,
            preset=preset,
            caption_style=caption_style,
            message='Queuing download...',
            source=clean_url,
            clips=[],
            errors=[],
            transcript=None
        )
        db.add(new_job)
        db.commit()
        celery_app.send_task("tasks.download_and_process_job", args=[job_id, clean_url, str(job_dir)])
        
    elif file:
        # File upload mode
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file format. Only the following video extensions are allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
            
        safe_name = sanitize_filename(file.filename)
        video_path = job_dir / safe_name
        
        with open(video_path, 'wb') as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)

        new_job = Job(
            id=job_id,
            user_id=user.id,
            status='queued',
            stage='queued',
            video_path=str(video_path),
            provider=provider,
            preset=preset,
            caption_style=caption_style,
            message='Upload complete, queuing processing...',
            source=safe_name,
            clips=[],
            errors=[],
            transcript=None
        )
        db.add(new_job)
        db.commit()

        if STORAGE_MODE == "cloud":
            storage.upload_file(str(video_path), f"jobs/{job_id}/source/{safe_name}")

        celery_app.send_task("tasks.process_video_job", args=[job_id])
    else:
        return JSONResponse({'error': 'No file or URL provided'}, status_code=400)

    return JSONResponse({'job_id': job_id})



async def get_websocket_user(token: str, db: Session):
    """
    Authenticate a user over WebSockets using the Supabase token.
    Respects local DEV_MODE settings.
    """
    if DEV_MODE:
        user_id = "dev-architect-id"
        return db.query(User).filter(User.id == user_id).first()

    if not token or token in ("null", "undefined", ""):
        return None

    try:
        res = get_supabase_client().auth.get_user(token)
        if not res.user:
            return None
        user_id = res.user.id
    except Exception:
        return None

    return db.query(User).filter(User.id == user_id).first()


@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str, token: str = None, db: Session = Depends(get_db)):
    """WebSocket for real-time progress updates via Redis Pub/Sub (Authenticated)"""
    await websocket.accept()
    
    # Authenticate WebSocket connection
    user = await get_websocket_user(token, db)
    if not user:
        await websocket.send_json({"type": "error", "message": "Authentication failed. Invalid or missing token."})
        await websocket.close(code=1008)  # Policy Violation
        return
        
    # Verify ownership of requested job
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        await websocket.send_json({"type": "error", "message": "Unauthorized access to this project."})
        await websocket.close(code=1008)  # Policy Violation
        return

    if job:
        initial_msg = {
            'type': 'progress',
            'message': job.message,
            'progress': job.progress
        }
        if job.status == 'complete':
            initial_msg = {
                'type': 'complete',
                'message': job.message,
                'clips': job.clips or [],
                'transcript': job.transcript
            }
        await websocket.send_json(initial_msg)

    pubsub = redis_async.pubsub()
    await pubsub.subscribe(f"job_progress_{job_id}")

    async def listen_to_redis():
        try:
            async for message in pubsub.listen():
                if message['type'] == 'message':
                    data = json.loads(message['data'])
                    await websocket.send_json(data)
                    if data['type'] in ['complete', 'error']:
                        break
        except Exception:
            pass

    listen_task = asyncio.create_task(listen_to_redis())

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        listen_task.cancel()
        await pubsub.unsubscribe(f"job_progress_{job_id}")


@app.get("/api/jobs")
async def get_my_jobs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """List all jobs for the current user"""
    jobs = db.query(Job).filter(Job.user_id == user.id).order_by(Job.created_at.desc()).all()
    return [serialize_job(job) for job in jobs]


@app.get("/api/status/{job_id}")
async def get_status(job_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Polling fallback for progress updates"""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JSONResponse({
        'status': job.status,
        'stage': job.stage,
        'progress': job.progress,
        'message': job.message,
        'clips': add_preview_urls(job.id, user.id, job.clips),
        'transcript': job.transcript,
        'errors': job.errors or [],
    })


@app.get("/api/preview-url/{job_id}/{filename}")
async def get_preview_url(job_id: str, filename: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Return a short-lived signed preview URL after validating ownership."""
    safe_name = os.path.basename(filename)
    if safe_name != filename or not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")

    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    clip_names = {clip.get("filename") for clip in (job.clips or []) if isinstance(clip, dict)}
    if safe_name not in clip_names:
        raise HTTPException(status_code=404, detail="Clip not found")

    return {"preview_url": sign_preview_url(job_id, safe_name, user.id)}



def _cloud_redirect(job_id: str, safe_name: str):
    """Return a cloud storage redirect response, or None if not applicable."""
    if STORAGE_MODE == "cloud":
        url = storage.generate_signed_url(f"jobs/{job_id}/{safe_name}")
        if url:
            return RedirectResponse(url)
    return None


@app.get("/api/download/{job_id}/{filename}")
async def download_clip(job_id: str, filename: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Download a generated clip"""
    safe_name = os.path.basename(filename)
    if safe_name != filename or not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")

    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    redirect = _cloud_redirect(job_id, safe_name)
    if redirect:
        return redirect

    filepath = resolve_job_file(OUTPUT_DIR / job_id, safe_name)
    if not filepath.exists():
        return JSONResponse({'error': 'File not found'}, status_code=404)
    return FileResponse(
        str(filepath),
        filename=safe_name,
        media_type='video/mp4',
        headers={"Cache-Control": "no-store, max-age=0"},
    )


@app.get("/api/preview/{job_id}/{filename}")
async def preview_clip(job_id: str, filename: str, exp: Optional[int] = None, sig: Optional[str] = None, db: Session = Depends(get_db)):
    """Stream clip for in-browser preview (ownership enforced via signed URL)"""
    safe_name = os.path.basename(filename)
    if safe_name != filename or not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    verify_preview_signature(job_id, safe_name, job.user_id, exp, sig)

    redirect = _cloud_redirect(job_id, safe_name)
    if redirect:
        return redirect

    filepath = resolve_job_file(OUTPUT_DIR / job_id, safe_name)
    if not filepath.exists():
        return JSONResponse({'error': 'File not found'}, status_code=404)

    media_type = 'video/mp4'
    if filename.endswith('.jpg') or filename.endswith('.jpeg'):
        media_type = 'image/jpeg'
    elif filename.endswith('.png'):
        media_type = 'image/png'

    return FileResponse(
        str(filepath),
        media_type=media_type,
        headers={"Cache-Control": "no-store, max-age=0"},
    )


@app.delete("/api/job/{job_id}")
async def delete_job(job_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Clean up job data"""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if job:
        if STORAGE_MODE == "cloud":
            if job.clips:
                for clip in job.clips:
                    storage.delete_file(f"jobs/{job_id}/{clip['filename']}")
                    storage.delete_file(f"jobs/{job_id}/{clip['thumbnail']}")

        db.delete(job)
        db.commit()

    # Clean up local files
    for d in [UPLOAD_DIR / job_id, OUTPUT_DIR / job_id]:
        if d.exists():
            shutil.rmtree(d, ignore_errors=True)

    return JSONResponse({'success': True})


@app.post("/api/job/{job_id}/retry")
async def retry_job(job_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Retry a failed or partially completed job from its latest durable checkpoint."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    has_errors = bool(job.errors)
    if job.status not in {"error", "complete"} or (job.status == "complete" and not has_errors):
        raise HTTPException(status_code=409, detail="Only failed or partially completed jobs can be retried.")

    job.errors = []
    job.clips = []

    if job.video_path:
        if job.clip_candidates:
            job.stage = "clips_rendering"
            job.progress = 75
            job.message = "Retrying clip rendering from saved candidates..."
        elif job.transcript:
            job.stage = "transcribed"
            job.progress = 55
            job.message = "Retrying analysis from saved transcript..."
        else:
            job.stage = "queued"
            job.progress = 0
            job.message = "Retrying processing from source video..."

        job.status = "queued"
        db.commit()
        celery_app.send_task("tasks.process_video_job", args=[job_id])
    elif job.source:
        job.stage = "downloading"
        job.status = "downloading"
        job.progress = 0
        job.message = "Retrying source download..."
        db.commit()
        job_dir = UPLOAD_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        celery_app.send_task("tasks.download_and_process_job", args=[job_id, job.source, str(job_dir)])
    else:
        raise HTTPException(status_code=409, detail="Job has no source video or URL to retry.")

    await redis_async.publish(f"job_progress_{job_id}", json.dumps({
        "type": "progress",
        "message": job.message,
        "progress": job.progress,
    }))

    return {"status": job.status, "stage": job.stage, "message": job.message}


class WordUpdate(BaseModel):
    word: str
    start: float
    end: float

class EditClipRequest(BaseModel):
    job_id: str
    filename: str
    title: str
    hook_caption: str
    words: List[WordUpdate]
    caption_style: Optional[str] = None
    preset: Optional[str] = None

async def regenerate_clip_in_background(
    job_id: str, filename: str, words_list: list, caption_style: str, preset: str, is_pro: bool, title: str, hook_caption: str
):
    db = SessionLocal()
    temp_output_path = None
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return
            
        target_clip = None
        for clip in (job.clips or []):
            if clip['filename'] == filename:
                target_clip = dict(clip)
                break

        if not target_clip:
            raise RuntimeError("Clip no longer exists.")

        job.status = 'processing' # Set to processing so the UI shows regeneration status
        job.stage = "clip_regenerating"
        job.message = f"Regenerating captions for {title}..."
        db.commit()
        
        # Publish progress update to Redis
        await redis_async.publish(f"job_progress_{job_id}", json.dumps({
            'type': 'progress',
            'message': job.message,
            'progress': 90
        }))
        
        # Re-run create_clip to a temp file first; commit metadata only after replacement succeeds.
        video_path = job.video_path
        output_path = os.path.join(OUTPUT_DIR, job_id, filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        temp_output_path = f"{output_path}.tmp-{uuid.uuid4().hex}.mp4"
        
        clip_info = {
            'start_time': target_clip['start_time'],
            'end_time': target_clip['end_time'],
            'title': title,
            'hook_caption': hook_caption
        }
        
        # Run create_clip in a thread-pool executor to avoid blocking the event loop
        loop = asyncio.get_running_loop()
        from app.core.clipper import create_clip
        await loop.run_in_executor(
            None,
            lambda: create_clip(
                video_path=video_path,
                clip_info=clip_info,
                words=words_list,
                output_path=temp_output_path,
                clip_index=int(filename.split('_')[-1].split('.')[0]) - 1,
                progress_callback=None,
                caption_style=caption_style,
                preset=preset,
                is_pro=is_pro
            )
        )

        if not os.path.exists(temp_output_path) or os.path.getsize(temp_output_path) == 0:
            raise RuntimeError("Regenerated clip file was not created.")

        os.replace(temp_output_path, output_path)
        temp_output_path = None

        if STORAGE_MODE == "cloud":
            uploaded = storage.upload_file(output_path, f"jobs/{job_id}/{filename}")
            if not uploaded:
                raise RuntimeError("Regenerated clip could not be uploaded to cloud storage.")
        
        # Mark job as complete again
        # Fetch fresh ref
        job = db.query(Job).filter(Job.id == job_id).first()
        updated_clips = []
        for clip in (job.clips or []):
            if clip['filename'] == filename:
                previous_version = int(clip.get('render_version') or 0)
                updated_clips.append({
                    **clip,
                    'title': title,
                    'hook_caption': hook_caption,
                    'words': words_list,
                    'render_version': previous_version + 1,
                })
            else:
                updated_clips.append(clip)

        job.clips = updated_clips
        job.status = 'complete'
        job.stage = "complete"
        job.message = "Clip caption regeneration complete!"
        job.progress = 100
        db.commit()
        
        # Notify clients over WebSocket
        await redis_async.publish(f"job_progress_{job_id}", json.dumps({
            'type': 'complete',
            'message': job.message,
            'clips': add_preview_urls(job_id, job.user_id, job.clips),
            'transcript': job.transcript
        }))
        
    except Exception as e:
        print("CAPTION REGENT ERROR:", e)
        if temp_output_path and os.path.exists(temp_output_path):
            try:
                os.remove(temp_output_path)
            except OSError:
                pass
        # Failed edits must be visible as failures; do not commit edited metadata.
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                errors = list(job.errors or [])
                errors.append({
                    "stage": "edit_failed",
                    "message": str(e)[:500],
                })
                job.errors = errors
                job.status = 'error'
                job.stage = 'edit_failed'
                job.message = f"Failed to edit captions: {str(e)}"
                job.progress = 100
                db.commit()
                await redis_async.publish(f"job_progress_{job_id}", json.dumps({
                    'type': 'error',
                    'message': job.message,
                }))
        except Exception:
            pass
    finally:
        db.close()

@app.post("/api/clip/edit")
async def edit_clip(
    req: EditClipRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Regenerates a specific clip's subtitle captions and text overlays.
    Enforces subscription tier privileges and runs asynchronously in the background.
    """
    job = db.query(Job).filter(Job.id == req.job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Project not found")
    if job.status != "complete":
        raise HTTPException(status_code=409, detail="This clip is already rendering. Wait for the current render to finish.")
        
    # Verify clip exists
    clips = job.clips or []
    clip_exists = any(c['filename'] == req.filename for c in clips)
    if not clip_exists:
        raise HTTPException(status_code=404, detail="Clip not found")
        
    # Enforce video path exists
    if not job.video_path or not os.path.exists(job.video_path):
        raise HTTPException(status_code=400, detail="Source video has been archived or removed from local storage.")
        
    # Map WordUpdate list to normal lists of dicts
    words_list = [{'word': w.word, 'start': w.start, 'end': w.end} for w in req.words]
    
    caption_style = req.caption_style or job.caption_style
    preset = req.preset or job.preset
    is_pro = user.subscription_tier == "pro"

    updated = db.query(Job).filter(
        Job.id == req.job_id,
        Job.user_id == user.id,
        Job.status == "complete",
    ).update({
        Job.status: 'processing',
        Job.stage: "clip_regenerating",
        Job.progress: max(job.progress or 0, 90),
        Job.message: f"Regenerating captions for {req.title}...",
    }, synchronize_session=False)
    db.commit()
    if not updated:
        raise HTTPException(status_code=409, detail="This clip is already rendering. Wait for the current render to finish.")
    
    # Trigger background regeneration
    background_tasks.add_task(
        regenerate_clip_in_background,
        req.job_id,
        req.filename,
        words_list,
        caption_style,
        preset,
        is_pro,
        req.title,
        req.hook_caption
    )
    
    return {"status": "processing", "message": "Regenerating captions in the background..."}
