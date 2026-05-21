import sqlite3
import sys
import os

# Add current working directory to python path
sys.path.insert(0, os.getcwd())

def retry_job(job_id):
    # Auto-detect Docker environment vs Host environment
    is_docker = "DATABASE_URL" in os.environ
    
    if is_docker:
        db_path = '/db/clip_aura.db'
        print("Running inside Docker container. Using database:", db_path)
    else:
        db_path = 'clip_aura.db'
        os.environ["REDIS_URL"] = "redis://localhost:6380/0"
        print("Running on Host. Using database:", db_path, "and Redis on port 6380")

    from app.worker.celery_app import celery_app

    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Verify the job exists and has a transcript
    cursor.execute("SELECT transcript, video_path FROM jobs WHERE id = ?;", (job_id,))
    row = cursor.fetchone()
    if not row:
        print(f"Job {job_id} not found.")
        conn.close()
        return
        
    transcript, video_path = row
    if not transcript:
        print("Warning: Job does not have a transcript yet. It will start from the beginning.")
        stage = 'queued'
        progress = 5
    else:
        print("Found transcript in database. Will bypass transcription stage to save time and API tokens.")
        stage = 'transcribed'
        progress = 55

    # Update database
    cursor.execute("""
        UPDATE jobs 
        SET status = 'queued', stage = ?, progress = ?, message = 'Re-queuing job on dev branch...', clips = NULL, errors = NULL, clip_candidates = NULL
        WHERE id = ?;
    """, (stage, progress, job_id))
    
    conn.commit()
    conn.close()
    print(f"Database updated successfully for job {job_id}.")

    # Trigger Celery task
    print("Sending task tasks.process_video_job to Celery queue...")
    celery_app.send_task("tasks.process_video_job", args=[job_id])
    print("Task queued successfully!")

if __name__ == '__main__':
    job_id = sys.argv[1] if len(sys.argv) > 1 else '2e599fe3'
    retry_job(job_id)
