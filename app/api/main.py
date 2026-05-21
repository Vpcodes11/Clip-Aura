"""Opus Pro — AI Video Clipper | FastAPI Server"""
import asyncio
import os
import uuid
import shutil
import json
import redis.asyncio as redis
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import UPLOAD_DIR, OUTPUT_DIR, BASE_DIR, PRESETS, CAPTION_STYLES, GROQ_API_KEY, DEFAULT_PROVIDER, DEFAULT_CAPTION_STYLE, STORAGE_MODE
from app.api.database import engine, Base, get_db, SessionLocal
from app.api.models import Job, User
from app.worker.celery_app import celery_app
from app.core.storage import storage
from app.api.auth import get_current_user
from app.api import payments

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Opus Pro — AI Video Clipper")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Billing Router
app.include_router(payments.router)

# Redis for Pub/Sub updates
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_async = redis.from_url(REDIS_URL)

# Active WebSocket connections
ws_connections = {}

# Serve static files
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


@app.get("/")
async def root():
    return FileResponse(str(BASE_DIR / "static" / "index.html"))


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


@app.post("/api/upload")
async def upload_video(
    file: UploadFile = File(None),
    url: str = Form(None),
    provider: str = Form(None),
    preset: str = Form('landscape'),
    caption_style: str = Form('typography_motion'),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Accept video upload or URL and start processing pipeline (Authenticated)"""
    
    # Check usage limits
    if user.used_minutes >= user.total_minutes_limit:
        raise HTTPException(status_code=403, detail="You have exhausted your limit. Please upgrade to Pro to continue.")

    if not provider:
        provider = DEFAULT_PROVIDER
    job_id = str(uuid.uuid4())[:8]
    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    if url and url.strip():
        # URL download mode
        new_job = Job(
            id=job_id,
            user_id=user.id,
            status='downloading',
            provider=provider,
            preset=preset,
            caption_style=caption_style,
            message='Queuing download...',
            source=url.strip(),
            clips=[],
            transcript=None
        )
        db.add(new_job)
        db.commit()
        celery_app.send_task("tasks.download_and_process_job", args=[job_id, url.strip(), str(job_dir)])
        
    elif file:
        # File upload mode
        video_path = job_dir / file.filename
        with open(video_path, 'wb') as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)

        new_job = Job(
            id=job_id,
            user_id=user.id,
            status='queued',
            video_path=str(video_path),
            provider=provider,
            preset=preset,
            caption_style=caption_style,
            message='Upload complete, queuing processing...',
            source=file.filename,
            clips=[],
            transcript=None
        )
        db.add(new_job)
        db.commit()

        if STORAGE_MODE == "cloud":
            # ⚡ Bolt Optimization: Offload blocking S3 upload to thread pool
            await asyncio.to_thread(storage.upload_file, str(video_path), f"jobs/{job_id}/source/{file.filename}")

        celery_app.send_task("tasks.process_video_job", args=[job_id])
    else:
        return JSONResponse({'error': 'No file or URL provided'}, status_code=400)

    return JSONResponse({'job_id': job_id})


@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str, db: Session = Depends(get_db)):
    """WebSocket for real-time progress updates via Redis Pub/Sub"""
    await websocket.accept()
    ws_connections[job_id] = websocket

    job = db.query(Job).filter(Job.id == job_id).first()
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
        ws_connections.pop(job_id, None)


@app.get("/api/jobs")
async def get_my_jobs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """List all jobs for the current user"""
    jobs = db.query(Job).filter(Job.user_id == user.id).order_by(Job.created_at.desc()).all()
    return jobs


@app.get("/api/status/{job_id}")
async def get_status(job_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Polling fallback for progress updates"""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JSONResponse({
        'status': job.status,
        'progress': job.progress,
        'message': job.message,
        'clips': job.clips or [],
        'transcript': job.transcript,
    })


@app.get("/api/download/{job_id}/{filename}")
async def download_clip(job_id: str, filename: str, user: User = Depends(get_current_user)):
    """Download a generated clip"""
    if STORAGE_MODE == "cloud":
        url = await asyncio.to_thread(storage.generate_signed_url, f"jobs/{job_id}/{filename}")
        if url:
            return RedirectResponse(url)
    
    filepath = OUTPUT_DIR / job_id / filename
    if not filepath.exists():
        return JSONResponse({'error': 'File not found'}, status_code=404)
    return FileResponse(str(filepath), filename=filename, media_type='video/mp4')


@app.get("/api/preview/{job_id}/{filename}")
async def preview_clip(job_id: str, filename: str):
    """Stream clip for in-browser preview (No auth required for simple preview)"""
    if STORAGE_MODE == "cloud":
        url = await asyncio.to_thread(storage.generate_signed_url, f"jobs/{job_id}/{filename}")
        if url:
            return RedirectResponse(url)

    filepath = OUTPUT_DIR / job_id / filename
    if not filepath.exists():
        return JSONResponse({'error': 'File not found'}, status_code=404)

    media_type = 'video/mp4'
    if filename.endswith('.jpg') or filename.endswith('.jpeg'):
        media_type = 'image/jpeg'
    elif filename.endswith('.png'):
        media_type = 'image/png'

    return FileResponse(str(filepath), media_type=media_type)


@app.delete("/api/job/{job_id}")
async def delete_job(job_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Clean up job data"""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if job:
        if STORAGE_MODE == "cloud":
            if job.clips:
                # ⚡ Bolt Optimization: Concurrently delete all S3 files using gather + threads
                tasks = []
                for clip in job.clips:
                    tasks.append(asyncio.to_thread(storage.delete_file, f"jobs/{job_id}/{clip['filename']}"))
                    tasks.append(asyncio.to_thread(storage.delete_file, f"jobs/{job_id}/{clip['thumbnail']}"))
                await asyncio.gather(*tasks)

        db.delete(job)
        db.commit()

    # Clean up local files
    for d in [UPLOAD_DIR / job_id, OUTPUT_DIR / job_id]:
        if d.exists():
            shutil.rmtree(d, ignore_errors=True)

    return JSONResponse({'success': True})
