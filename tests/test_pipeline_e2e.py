import os
from app.api.database import SessionLocal
from app.api.models import Job, User
from app.worker.tasks import process_video_job_impl

def run_e2e_test():
    db = SessionLocal()
    try:
        # 1. Ensure dev user exists
        user_id = "dev-architect-id"
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = User(
                id=user_id,
                email="dev@clip-aura.local",
                subscription_tier="pro",
                total_minutes_limit=100,
                used_minutes=0
            )
            db.add(user)
            db.commit()
            print("[OK] Created simulated Pro dev user.")
        else:
            # Reset used minutes so rate limit or quota never blocks the test
            user.used_minutes = 0
            db.commit()
            print("[OK] Reset dev user minutes limit.")

        # 2. Configure video path
        video_path = "/app/uploads/test_video.mp4"
        if not os.path.exists(video_path):
            video_path = "uploads/test_video.mp4"
            if not os.path.exists(video_path):
                print(f"[ERROR] test_video.mp4 not found in uploads/ !")
                return

        # 3. Create a test job
        job_id = "test-e2e-pipeline-job"
        # Delete old test job if it exists to avoid primary key conflicts
        db.query(Job).filter(Job.id == job_id).delete()
        db.commit()

        test_job = Job(
            id=job_id,
            user_id=user_id,
            status='queued',
            stage='queued',
            video_path=video_path,
            provider='groq',
            preset='landscape',
            caption_style='typography_motion',
            message='Queuing test run...',
            source='test_video.mp4',
            clips=[],
            errors=[],
            transcript=None
        )
        db.add(test_job)
        db.commit()
        print(f"[OK] Queued test job: {job_id}")

        # 4. Execute the background worker routine synchronously
        print("Executing video processing pipeline (Transcribe -> Analyze -> Clip)...")
        result = process_video_job_impl(job_id)
        print(f"Result: {result}")

        # 5. Verify results
        job = db.query(Job).filter(Job.id == job_id).first()
        print(f"\n--- E2E PIPELINE REPORT FOR {job_id} ---")
        print(f"Status: {job.status}")
        print(f"Message: {job.message}")
        print(f"Progress: {job.progress}%")
        
        if job.status == 'complete':
            print(f"SUCCESS: Created {len(job.clips)} viral clips!")
            for i, clip in enumerate(job.clips):
                print(f"  Clip {i+1}: {clip['title']} (Virality Score: {clip['virality_score']})")
                print(f"  Filename: {clip['filename']}")
                print(f"  Duration: {clip['duration']}s ({clip['start_time']} -> {clip['end_time']})")
        else:
            print(f"FAIL: Job failed with error: {job.message}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[ERROR] Exception during test: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_e2e_test()
