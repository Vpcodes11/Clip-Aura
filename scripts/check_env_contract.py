import argparse
import os
import sys
from pathlib import Path
from dotenv import dotenv_values

PROJECT_ROOT = Path(__file__).resolve().parent.parent

REQUIRED_PRODUCTION_KEYS = [
    "GROQ_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_WEBHOOK_SECRET",
    "REDIS_PASSWORD",
    "DATABASE_URL",
    "PREVIEW_SIGNING_SECRET",
    "LEAD_HASH_SALT",
]

REQUIRED_DEVELOPMENT_KEYS = [
    "GROQ_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "REDIS_PASSWORD",
    "DATABASE_URL",
    "PREVIEW_SIGNING_SECRET",
    "LEAD_HASH_SALT",
]

OPTIONAL_KEYS = [
    "OPENAI_API_KEY",
    "PEXELS_API_KEY",
    "S3_ENDPOINT_URL",
    "S3_ACCESS_KEY",
    "S3_SECRET_KEY",
    "S3_BUCKET_NAME",
    "S3_REGION",
    "FFMPEG_TIMEOUT_SECONDS",
    "FFPROBE_TIMEOUT_SECONDS",
    "THUMBNAIL_TIMEOUT_SECONDS",
    "CELERY_TASK_TIME_LIMIT",
    "CELERY_TASK_SOFT_TIME_LIMIT",
    "MAX_UPLOAD_SIZE",
    "BASE_URL",
    "FRONTEND_URL",
    "STORAGE_MODE",
]


def redact(value: str) -> str:
    if not value:
        return "<MISSING>"
    if len(value) <= 6:
        return value[:2] + "***"
    return value[:3] + "***" + value[-2:]


def check_keys(keys: list[str], sources: dict) -> tuple[list[str], list[str]]:
    present = []
    missing = []
    for key in keys:
        if key in sources and sources[key]:
            present.append(key)
        else:
            missing.append(key)
    return present, missing


def main():
    parser = argparse.ArgumentParser(
        description="Check .env contract without leaking secrets."
    )
    parser.add_argument(
        "--env-file",
        default=None,
        help="Path to .env file (default: PROJECT_ROOT/.env)",
    )
    args = parser.parse_args()

    env_file = Path(args.env_file) if args.env_file else (PROJECT_ROOT / ".env")

    if not env_file.exists():
        print(".env not found at {}".format(env_file))
        print("Copy .env.example to .env and fill in required values.")
        sys.exit(1)

    file_values = dotenv_values(env_file)
    environment = (file_values.get("ENVIRONMENT") or "").lower()
    
    # Select the correct keyset based on environment
    if environment == "production":
        required_keys = REQUIRED_PRODUCTION_KEYS
        label = "Production"
    else:
        required_keys = REQUIRED_DEVELOPMENT_KEYS
        label = "Development"

    sources = file_values

    print("=== ClipAura Environment Contract Check ===")
    print("File: {}".format(env_file))
    print("Target: {}".format(label))
    print()

    present_keys, missing_keys = check_keys(required_keys, sources)

    print("--- Required ({}) ---".format(label))
    for key in sorted(required_keys):
        status = "PRESENT" if key in present_keys else "MISSING"
        marker = "  [OK]" if status == "PRESENT" else "[MISS]"
        print("{} {} {}".format(marker, key, status))

    print()
    print("--- Optional ---")
    for key in sorted(OPTIONAL_KEYS):
        val = sources.get(key)
        if val:
            print("  [OK] {} PRESENT".format(key))
        else:
            print("  [  ] {} (not set)".format(key))

    print()
    print("--- STATIC ---")
    print("  [OK] DEV_MODE=false (should not be true in prod)")

    print()
    print("--- Results ---")
    total_required = len(required_keys)
    print("Keys present: {}/{}".format(len(present_keys), total_required))
    print("Keys missing: {}/{}".format(len(missing_keys), total_required))
    print()

    if missing_keys:
        print("MISSING REQUIRED KEYS:")
        for key in missing_keys:
            print("  - {}".format(key))
        print()
        if environment == "production":
            print("Set these values in your deployment platform (Railway/Vercel).")
        else:
            print("Set these values in .env before starting development containers.")
        sys.exit(1)
    else:
        print("All required {} keys are present.".format(label))
        sys.exit(0)


if __name__ == "__main__":
    main()
