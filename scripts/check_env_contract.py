import argparse
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent

REQUIRED_PRODUCTION_KEYS = [
    "GROQ_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_JWT_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRO_PRICE_ID",
    "REDIS_PASSWORD",
    "DATABASE_URL",
]

REQUIRED_DEVELOPMENT_KEYS = [
    "GROQ_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_JWT_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRO_PRICE_ID",
    "REDIS_PASSWORD",
    "DATABASE_URL",
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

    load_dotenv(env_file)
    all_keys = list(set(REQUIRED_PRODUCTION_KEYS + REQUIRED_DEVELOPMENT_KEYS + OPTIONAL_KEYS))
    sources = {k: os.getenv(k) for k in all_keys}

    print("=== ClipAura Environment Contract Check ===")
    print("File: {}".format(env_file))
    print()

    production_present, production_missing = check_keys(
        REQUIRED_PRODUCTION_KEYS, sources
    )

    print("--- Required (all targets) ---")
    for key in sorted(REQUIRED_PRODUCTION_KEYS):
        status = "PRESENT" if key in production_present else "MISSING"
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
    print("--- STATIC (compose-enforced) ---")
    print("  [OK] DEV_MODE=false (compose force-override)")
    print("  [OK] ENVIRONMENT=production (compose default)")

    print()
    print("--- Results ---")
    total_required = len(REQUIRED_PRODUCTION_KEYS)
    print("Keys present: {}/{}".format(len(production_present), total_required))
    print("Keys missing: {}/{}".format(len(production_missing), total_required))
    print()

    if production_missing:
        print("MISSING REQUIRED KEYS:")
        for key in production_missing:
            print("  - {}".format(key))
        print()
        print("Set these values in .env before starting production containers.")
        sys.exit(1)
    else:
        print("All required keys are present. Ready for Docker compose.")
        sys.exit(0)


if __name__ == "__main__":
    main()
