"""Resume a saved processing job from its durable stage."""
import argparse

from app.workers.tasks import process_video_job_impl


def main():
    parser = argparse.ArgumentParser(description="Resume a Clip Aura processing job.")
    parser.add_argument("--job-id", required=True, help="Job ID to resume")
    args = parser.parse_args()
    result = process_video_job_impl(args.job_id)
    print(result)


if __name__ == "__main__":
    main()
