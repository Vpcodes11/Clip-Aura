import os
import json
import redis
import math
import logging
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from celery.exceptions import SoftTimeLimitExceeded
from app.workers.celery_app import celery_app
from app.api.database import SessionLocal, engine, Base
from app.models.models import Job, User
from app.api.schema_compat import ensure_job_columns
from app.config import CAPTION_STYLES, GROQ_API_KEY, DEFAULT_PROVIDER, DEFAULT_CAPTION_STYLE, OUTPUT_DIR, STORAGE_MODE, PEXELS_API_KEY
from app.subtitles.transcriber import transcribe
from app.core.analyzer import analyze_transcript
from app.rendering.clipper import generate_thumbnail, get_video_info, safe_create_clip
from app.core.downloader import download_video
from app.core.storage import storage
from app.core.cut_aligner import align_clip_boundaries
from app.core.broll import apply_broll
from app.core.preflight import preflight_source

logger = logging.getLogger(__name__)

# Ensure tables exist for the worker
Base.metadata.create_all(bind=engine)
ensure_job_columns(engine)

# Initialize Redis for progress broadcasting
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(REDIS_URL)

def publish_message(channel, data):
    """Publish message to Redis, ignoring errors if Redis is not running."""
    try:
        redis_client.publish(channel, json.dumps(data))
    except Exception as e:
        print(f"[Warning] Failed to publish message to Redis: {e}")


def make_progress_cb(job_id):
    """Factory that returns a progress callback bound to a specific job_id.
    Opens its own short-lived DB session so it is safe to call from any thread."""
    def progress_cb(message, progress):
        db_cb = SessionLocal()
        try:
            j = get_job_or_none(db_cb, job_id)
            if j:
                j.message = message
                j.progress = progress
                db_cb.commit()
            broadcast_progress(job_id, message, progress)
        finally:
            db_cb.close()
    return progress_cb

STAGE_PROCESSING = "processing"
STAGE_PREFLIGHTED = "preflighted"
STAGE_TRANSCRIBED = "transcribed"
STAGE_ANALYZED = "analyzed"
STAGE_ALIGNED = "aligned"
STAGE_RENDERING = "clips_rendering"
STAGE_RENDERED = "clips_rendered"
STAGE_COMPLETE = "complete"

def broadcast_progress(job_id, message, progress):
    """Broadcast progress update via Redis Pub/Sub"""
    data = {
        'type': 'progress',
        'message': message,
        'progress': progress
    }
    publish_message(f"job_progress_{job_id}", data)


def set_job_state(db, job, stage=None, status=None, message=None, progress=None, **fields):
    if stage is not None:
        job.stage = stage
    if status is not None:
        job.status = status
    if message is not None:
        job.message = message
    if progress is not None:
        job.progress = progress
    for key, value in fields.items():
        setattr(job, key, value)
    db.commit()


def append_job_error(db, job, stage, message, clip_index=None, detail=None):
    errors = list(job.errors or [])
    error = {
        "stage": stage,
        "message": str(message)[:500],
    }
    if clip_index is not None:
        error["clip_index"] = clip_index
    if detail:
        error["detail"] = str(detail)[-1500:]
    errors.append(error)
    job.errors = errors
    db.commit()


def format_job_error_message(exc):
    if isinstance(exc, SoftTimeLimitExceeded):
        return "Celery task soft time limit exceeded."
    return str(exc)


def handle_job_error(db, job_id, stage, exc, tb):
    """Mark a job as errored in the DB and broadcast the failure over Redis."""
    message = format_job_error_message(exc)
    if isinstance(exc, SoftTimeLimitExceeded):
        logger.warning("Celery task soft time limit exceeded for job_id=%s stage=%s", job_id, stage or "unknown")
    db.rollback()
    job = get_job_or_none(db, job_id)
    if job:
        append_job_error(db, job, stage or "unknown", message, detail=tb)
        job.status = 'error'
        job.message = message
        job.progress = 0
        db.commit()
    publish_message(f"job_progress_{job_id}", {
        'type': 'error',
        'message': message
    })


def get_job_or_none(db, job_id):
    return db.query(Job).filter(Job.id == job_id).first()

@celery_app.task(
    name="tasks.process_video_job",
    bind=True,
    autoretry_for=(redis.RedisError,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def process_video_job(self, job_id):
    """Celery task to run the full pipeline: transcribe → analyze → clip"""
    return process_video_job_impl(job_id)


def process_video_job_impl(job_id):
    """Run the full pipeline with durable stage checkpoints and partial clip success."""
    db = SessionLocal()
    try:
        job = get_job_or_none(db, job_id)
        if not job:
            return f"Job {job_id} not found"

        set_job_state(db, job, stage=job.stage or STAGE_PROCESSING, status='processing',
                      message='Starting processing...', progress=max(job.progress or 0, 1))

        # Local cache for processing
        video_path = job.video_path
        provider = job.provider or DEFAULT_PROVIDER
        caption_style = job.caption_style or DEFAULT_CAPTION_STYLE
        if caption_style not in CAPTION_STYLES:
            raise RuntimeError(f"Invalid caption style stored in job metadata: {caption_style}")
        preset = job.preset or 'tiktok'

        # Check if user is Pro
        user = db.query(User).filter(User.id == job.user_id).first()
        is_pro = user.subscription_tier == "pro" if user else False

        progress_cb = make_progress_cb(job_id)

        complete_or_resume_stages = (
            STAGE_PREFLIGHTED, STAGE_TRANSCRIBED, STAGE_ANALYZED,
            STAGE_ALIGNED, STAGE_RENDERING, STAGE_RENDERED, STAGE_COMPLETE
        )
        if job.stage not in complete_or_resume_stages:
            progress_cb("Checking source video and local tools...", 4)
            media_info = preflight_source(video_path)
            set_job_state(db, job, stage=STAGE_PREFLIGHTED, status='processing',
                          message='Source video validated.', progress=5)
        else:
            media_info = None

        if job.transcript and job.stage in (
            STAGE_TRANSCRIBED, STAGE_ANALYZED, STAGE_ALIGNED,
            STAGE_RENDERING, STAGE_RENDERED, STAGE_COMPLETE
        ):
            transcript_data = job.transcript
            transcript = {
                'segments': transcript_data.get('segments', []),
                'full_text': transcript_data.get('full_text', ''),
                'duration': transcript_data.get('duration', 0),
                'words': transcript_data.get('words', []),
            }
        else:
            transcript = transcribe(video_path, GROQ_API_KEY, progress_cb, provider)
            duration = media_info["duration"] if media_info else get_video_info(video_path)[2]
            transcript_data = {
                'segments': transcript['segments'],
                'full_text': transcript['full_text'],
                'duration': duration,
                'word_count': len(transcript['words']),
                'words': transcript['words'],
            }
            set_job_state(db, job, stage=STAGE_TRANSCRIBED, progress=55,
                          message='Transcription complete.', transcript=transcript_data)
            publish_message(f"job_progress_{job_id}", {
                'type': 'transcript',
                'transcript': transcript_data
            })

        minutes_used = math.ceil(float(transcript_data.get('duration') or 0) / 60)

        if job.clip_candidates and job.stage in (
            STAGE_ANALYZED, STAGE_ALIGNED, STAGE_RENDERING, STAGE_RENDERED, STAGE_COMPLETE
        ):
            clips_info = job.clip_candidates
        else:
            clips_info = analyze_transcript(transcript, GROQ_API_KEY, progress_cb, provider)
            set_job_state(db, job, stage=STAGE_ANALYZED, progress=70,
                          message=f"Found {len(clips_info)} candidate clips.",
                          clip_candidates=clips_info)

        if job.stage not in (STAGE_ALIGNED, STAGE_RENDERING, STAGE_RENDERED, STAGE_COMPLETE):
            progress_cb("Aligning clip cuts to natural speech pauses...", 72)
            clips_info = align_clip_boundaries(clips_info, transcript['words'])
            set_job_state(db, job, stage=STAGE_ALIGNED, progress=72,
                          message='Clip boundaries aligned.', clip_candidates=clips_info)

        output_dir = OUTPUT_DIR / job_id
        output_dir.mkdir(parents=True, exist_ok=True)

        set_job_state(db, job, stage=STAGE_RENDERING, status='processing',
                      progress=75, message='Creating clips in parallel...')

        clip_results = []
        render_failures = []

        for i, clip_info in enumerate(clips_info):
            thumb_path = str(output_dir / f"thumb_{i+1}.jpg")
            if not generate_thumbnail(video_path, clip_info['start_time'], thumb_path):
                append_job_error(db, job, STAGE_RENDERING, "Thumbnail generation failed", clip_index=i + 1)

        with ThreadPoolExecutor(max_workers=min(4, os.cpu_count() or 1)) as executor:
            futures = {}
            for i, clip_info in enumerate(clips_info):
                output_path = str(output_dir / f"clip_{i+1}.mp4")
                future = executor.submit(
                    safe_create_clip,
                    video_path, clip_info, transcript['words'],
                    output_path, i, None,
                    caption_style, preset, is_pro
                )
                futures[future] = (i, clip_info)

            completed = 0
            for future in as_completed(futures):
                i, clip_info = futures[future]
                completed += 1
                try:
                    result = future.result()
                except Exception as exc:
                    result = {"ok": False, "error": str(exc)}

                if result.get("ok"):
                    if result.get("attempt") not in (None, "dynamic"):
                        append_job_error(db, job, STAGE_RENDERING,
                                         f"Clip rendered with fallback: {result.get('attempt')}",
                                         clip_index=i + 1)
                else:
                    render_failures.append((i, clip_info, result.get("error", "Render failed")))
                    append_job_error(db, job, STAGE_RENDERING, "Clip render failed",
                                     clip_index=i + 1, detail=result.get("error"))

                pct = 75 + int((completed / max(len(clips_info), 1)) * 18)
                progress_cb(f"Rendered {completed} of {len(clips_info)} clips...", pct)

        for i, clip_info in enumerate(clips_info):
            output_path = str(output_dir / f"clip_{i+1}.mp4")
            thumb_path = str(output_dir / f"thumb_{i+1}.jpg")
            if not os.path.exists(output_path):
                continue

            if PEXELS_API_KEY:
                try:
                    progress_cb(f"Adding B-Roll to clip {i+1}...", min(96, 93 + i))
                    work_dir = str(output_dir)
                    final_path = apply_broll(
                        output_path, clip_info, transcript['words'],
                        transcript_data['full_text'], work_dir, PEXELS_API_KEY
                    )
                    if final_path != output_path:
                        import shutil
                        shutil.move(final_path, output_path)
                except Exception as exc:
                    append_job_error(db, job, "broll", "B-Roll overlay failed; keeping base clip",
                                     clip_index=i + 1, detail=exc)

            if STORAGE_MODE == "cloud":
                try:
                    storage.upload_file(output_path, f"jobs/{job_id}/clip_{i+1}.mp4")
                    if os.path.exists(thumb_path):
                        storage.upload_file(thumb_path, f"jobs/{job_id}/thumb_{i+1}.jpg")
                except Exception as exc:
                    append_job_error(db, job, "storage", "Cloud upload failed",
                                     clip_index=i + 1, detail=exc)
                    continue

            clip_results.append({
                'filename': f"clip_{i+1}.mp4",
                'thumbnail': f"thumb_{i+1}.jpg",
                'title': clip_info['title'],
                'hook_caption': clip_info.get('hook_caption', ''),
                'virality_score': clip_info.get('virality_score', 0),
                'reason': clip_info.get('reason', ''),
                'category': clip_info.get('category', ''),
                'hashtags': clip_info.get('hashtags', []),
                'start_time': clip_info['start_time'],
                'end_time': clip_info['end_time'],
                'duration': round(clip_info['end_time'] - clip_info['start_time'], 1),
                'words': [
                    {'word': w['word'], 'start': w['start'], 'end': w['end']}
                    for w in transcript['words']
                    if w['start'] >= clip_info['start_time'] - 0.3 and w['end'] <= clip_info['end_time'] + 0.3
                ]
            })

        if not clip_results:
            raise RuntimeError("All clip renders failed. " + "; ".join(err for _, _, err in render_failures)[-1000:])

        set_job_state(db, job, stage=STAGE_RENDERED, progress=98,
                      message=f"Rendered {len(clip_results)} clip(s).", clips=clip_results)

        # user is already loaded at the start of this function
        if user:
            user.used_minutes += minutes_used

        suffix = "" if not render_failures else f" {len(render_failures)} clip(s) failed and were skipped."
        set_job_state(db, job, stage=STAGE_COMPLETE, status='complete', progress=100,
                      message=f'Done! {len(clip_results)} viral clips created.{suffix}')

        publish_message(f"job_progress_{job_id}", {
            'type': 'complete',
            'message': job.message,
            'clips': job.clips,
            'transcript': job.transcript
        })

        return f"Job {job_id} completed successfully"

    except Exception as e:
        handle_job_error(db, job_id, job.stage if job else "unknown", e, traceback.format_exc())
        return f"Job {job_id} failed: {format_job_error_message(e)}"
    finally:
        db.close()

@celery_app.task(
    name="tasks.download_and_process_job",
    bind=True,
    autoretry_for=(redis.RedisError,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def download_and_process_job(self, job_id, url, job_dir):
    """Celery task to download video from URL, then process"""
    db = SessionLocal()
    try:
        job = get_job_or_none(db, job_id)
        if not job:
            return f"Job {job_id} not found"

        dl_progress = make_progress_cb(job_id)

        video_path = download_video(url, job_dir, dl_progress)
        
        if STORAGE_MODE == "cloud":
            dl_progress("Uploading original to cloud...", 10)
            filename = os.path.basename(video_path)
            storage.upload_file(video_path, f"jobs/{job_id}/source/{filename}")

        set_job_state(db, job, stage='downloaded', status='queued',
                      message='Download complete, queuing processing...',
                      video_path=video_path)
        
        process_video_job_impl(job_id)

    except Exception as e:
        handle_job_error(db, job_id, "download", e, traceback.format_exc())
        return f"Job {job_id} failed: {format_job_error_message(e)}"
    finally:
        db.close()
