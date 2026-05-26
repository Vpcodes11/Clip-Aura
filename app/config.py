import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = Path(__file__).parent.parent
RUNTIME_DIR = BASE_DIR / "runtime"
UPLOAD_DIR = RUNTIME_DIR / "uploads"
OUTPUT_DIR = RUNTIME_DIR / "renders"
TEMP_DIR = RUNTIME_DIR / "temp"
LOGS_DIR = RUNTIME_DIR / "logs"
DB_DIR = RUNTIME_DIR / "db"
PREVIEWS_DIR = RUNTIME_DIR / "previews"

# Create dirs
for d in [UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR, LOGS_DIR, DB_DIR, PREVIEWS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Video output presets
PRESETS = {
    "tiktok": {"width": 1080, "height": 1920, "label": "TikTok / Reels (9:16)"},
    "youtube_shorts": {"width": 1080, "height": 1920, "label": "YouTube Shorts (9:16)"},
    "square": {"width": 1080, "height": 1080, "label": "Square (1:1)"},
    "landscape": {"width": 1920, "height": 1080, "label": "Landscape (16:9)"},
    "tiktok_4k": {"width": 2160, "height": 3840, "label": "TikTok / Reels 4K (9:16)"},
    "youtube_shorts_4k": {"width": 2160, "height": 3840, "label": "YouTube Shorts 4K (9:16)"},
    "square_4k": {"width": 2160, "height": 2160, "label": "Square 4K (1:1)"},
    "landscape_4k": {"width": 3840, "height": 2160, "label": "Landscape 4K (16:9)"},
}

DEFAULT_PRESET = "landscape"

# Clip settings
MIN_CLIP_DURATION = 5   # seconds
MAX_CLIP_DURATION = 90   # seconds
MAX_CLIPS = 8

# Whisper API file size limit (25MB)
WHISPER_MAX_FILE_SIZE = 24 * 1024 * 1024  # 24MB to be safe
AUDIO_CHUNK_DURATION = 600  # 10 minutes per chunk

# Upload safety limit (default 2GB)
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", str(2 * 1024 * 1024 * 1024)))

# Caption styles
CAPTION_STYLES = {
    "tiktok": {
        "font": "Montserrat ExtraBold",
        "fontsize": 85,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H0000FFFF", # Yellow
        "outline_color": "&H00000000",
        "back_color": "&H80000000",
        "bold": True,
        "outline": 6,
        "shadow": 4,
        "alignment": 2,
        "margin_v": 120, # Moved down from 576 to be below the video
    },
    "minimal": {
        "font": "Inter",
        "fontsize": 72,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H0000FF00", # Green
        "outline_color": "&H00000000",
        "back_color": "&H00000000",
        "bold": True,
        "outline": 4,
        "shadow": 2,
        "alignment": 2,
        "margin_v": 120,
    },
    "viral": {
        "font": "Montserrat Black", # Clip Aura favorite
        "fontsize": 110,
        "primary_color": "&H0000D4FF", # Active: Gold
        "highlight_color": "&H00FFFFFF", # Inactive: White
        "outline_color": "&H00000000",
        "back_color": "&H00000000",
        "bold": True,
        "outline": 10,
        "shadow": 0,
        "alignment": 2,
        "margin_v": 120,
    },
    "bold_impact": {
        "font": "Montserrat Black", 
        "fontsize": 100,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H000022FF", # Vibrant Red
        "outline_color": "&H00000000",
        "back_color": "&H40000000",
        "bold": True,
        "outline": 10,
        "shadow": 8,
        "alignment": 2,
        "margin_v": 120,
    },
    "neon_pulse": {
        "font": "Outfit",
        "fontsize": 85,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H00FF00FF", # Magenta
        "outline_color": "&H00000000",
        "back_color": "&H00000000",
        "bold": True,
        "outline": 6,
        "shadow": 12,
        "alignment": 2,
        "margin_v": 120,
    },
    "karaoke": {
        "font": "Komika Axis",
        "fontsize": 90,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H0000FFFF", # Yellow
        "outline_color": "&H00000000",
        "back_color": "&H00000000",
        "bold": True,
        "outline": 10,
        "shadow": 4,
        "alignment": 2,
        "margin_v": 120,
    },
    "high_intensity": {
        "font": "The Bold Font",
        "fontsize": 110,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H0000FFFF", # Yellow
        "outline_color": "&H00000000",
        "back_color": "&H00000000",
        "bold": True,
        "outline": 12,
        "shadow": 0,
        "alignment": 2,
        "margin_v": 120,
    },
    "minimal_modern": {
        "font": "Inter",
        "fontsize": 75,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H00FF00FF", # Magenta
        "outline_color": "&H00000000",
        "back_color": "&H00000000",
        "bold": True,
        "outline": 0,
        "shadow": 0,
        "alignment": 2,
        "margin_v": 576,
    },
    "premium_aesthetic": {
        "font": "Montserrat Black", 
        "fontsize": 110, # Bigger for more impact
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H0000FF00", # Neon Green
        "outline_color": "&H00000000",
        "back_color": "&H00000000",
        "bold": True,
        "outline": 12,
        "shadow": 0,
        "alignment": 2,
        "margin_v": 120, # Moved down from 576
    },
    "typography_motion": {
        "font": "Montserrat Black", # Base font for caps
        "secondary_font": "Segoe Script", # Standard Windows Cursive
        "fontsize": 85,
        "primary_color": "&H0000D4FF", # Active: Gold
        "highlight_color": "&H00FFFFFF", # Inactive: White
        "outline_color": "&H00000000",
        "back_color": "&H00000000",
        "bold": True,
        "outline": 10,
        "shadow": 0,
        "alignment": 2,
        "margin_v": 80, # Optimized bottom position (Below the video)
    },
    "stealth_pro": {
        "font": "Outfit", 
        "fontsize": 95,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H00F65C8B", # Vibrant Purple (Brand Accent)
        "outline_color": "&H00000000",
        "back_color": "&H40000000",
        "bold": True,
        "outline": 8,
        "shadow": 12,
        "alignment": 2,
        "margin_v": 120,
    },
    "hormozi": {
        # Alex Hormozi style: high-contrast yellow/white alternating, power pops
        "font": "Montserrat Black",
        "fontsize": 105,
        "primary_color": "&H0000FFFF",    # Yellow (inactive word)
        "highlight_color": "&H00FFFFFF",  # White (active/karaoke word)
        "outline_color": "&H00000000",
        "back_color": "&H00000000",
        "bold": True,
        "outline": 8,
        "shadow": 6,
        "alignment": 2,
        "margin_v": 120,
    },
    "ali_abdaal": {
        # Ali Abdaal style: clean, minimal, educational — centered on semi-transparent panel
        "font": "Inter",
        "fontsize": 72,
        "primary_color": "&H00FFFFFF",    # White active
        "highlight_color": "&H00CCCCCC",  # Light grey inactive
        "outline_color": "&H00000000",
        "back_color": "&H99000000",        # Semi-transparent dark box
        "bold": True,
        "outline": 0,
        "shadow": 0,
        "alignment": 5,                    # Center-aligned
        "margin_v": 200,
    },
    "beast_mode": {
        # MrBeast style: giant, bold, aggressive, max energy
        "font": "Montserrat Black",
        "fontsize": 130,
        "primary_color": "&H000000FF",    # Red active
        "highlight_color": "&H00FFFFFF",  # White inactive
        "outline_color": "&H00000000",
        "back_color": "&H00000000",
        "bold": True,
        "outline": 14,
        "shadow": 0,
        "alignment": 2,
        "margin_v": 80,
    },
}

# Power words for automatic capitalization and highlighting
POWER_WORDS = [
    "amazing", "secret", "never", "always", "money", "growth", "viral", "hacks", "life", "change", "fast", "easy",
    "simple", "power", "win", "lose", "stop", "start", "now", "today", "tomorrow", "don't", "can't", "must",
    "truth", "lies", "billion", "million", "rich", "poor", "success", "failure", "everything", "nothing",
    "insane", "crazy", "huge", "shocking", "exposed", "dangerous", "illegal", "hidden", "private", "dark",
    "light", "heaven", "hell", "god", "devil", "love", "hate", "fear", "brave", "strong", "weak",
    "wealth", "freedom", "prison", "breakout", "system", "matrix", "wake", "sleep", "dream", "real",
    "unlocked", "revealed", "leaked", "danger", "warning", "billionaire", "passive", "income", "quit",
    "boss", "fired", "empire", "legend", "warrior", "elite", "stealth", "intelligence", "neural",
]

DEFAULT_CAPTION_STYLE = "typography_motion"

# Dev mode flag for local UX only; it must not bypass backend authentication.
def _truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def is_production_environment() -> bool:
    """Detect common production signals across Railway, Vercel, Docker, and Node builds."""
    return any(
        (os.getenv(name) or "").strip().lower() in {"production", "prod"}
        for name in ("ENVIRONMENT", "NODE_ENV", "RAILWAY_ENVIRONMENT", "VERCEL_ENV")
    )


DEV_MODE = _truthy(os.getenv("DEV_MODE"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = is_production_environment()
if DEV_MODE and IS_PRODUCTION:
    raise RuntimeError("DEV_MODE must be false when any production environment signal is present.")

FFMPEG_TIMEOUT_SECONDS = int(os.getenv("FFMPEG_TIMEOUT_SECONDS", "300"))
FFPROBE_TIMEOUT_SECONDS = int(os.getenv("FFPROBE_TIMEOUT_SECONDS", "30"))
THUMBNAIL_TIMEOUT_SECONDS = int(os.getenv("THUMBNAIL_TIMEOUT_SECONDS", "30"))
CELERY_TASK_TIME_LIMIT = int(os.getenv("CELERY_TASK_TIME_LIMIT", "600"))
CELERY_TASK_SOFT_TIME_LIMIT = int(os.getenv("CELERY_TASK_SOFT_TIME_LIMIT", "540"))
AI_API_TIMEOUT_SECONDS = float(os.getenv("AI_API_TIMEOUT_SECONDS", "120"))
AI_API_MAX_RETRIES = int(os.getenv("AI_API_MAX_RETRIES", "2"))

# API Keys (stored in .env file, never committed to git)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger = __import__("logging").getLogger("clipaura.config")
    logger.warning("GROQ_API_KEY is not set in .env. AI Transcription will fail.")

if IS_PRODUCTION:
    public_env = {
        key: value
        for key, value in os.environ.items()
        if key.startswith("NEXT_PUBLIC_")
    }
    leaked = [
        key for key, value in public_env.items()
        if value and any(marker in value for marker in ("sk_live_", "sk_test_", "whsec_", "gsk_"))
    ]
    if leaked:
        raise RuntimeError(f"Secret-looking values must not be exposed through NEXT_PUBLIC_* variables: {', '.join(leaked)}")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

DEFAULT_PROVIDER = "groq"

# Cloud Storage (S3 / R2)
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
S3_REGION = os.getenv("S3_REGION", "us-east-1")
STORAGE_MODE = os.getenv("STORAGE_MODE", "local") # "local" or "cloud"

# Infrastructure
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
REDIS_URL = os.getenv(
    "REDIS_URL",
    f"redis://:{REDIS_PASSWORD}@redis:6379/0" if REDIS_PASSWORD else "redis://redis:6379/0",
)

# Lazy Redis connection — initialized on first use
_redis_async = None


def get_redis_async():
    global _redis_async
    if _redis_async is None:
        import redis.asyncio as aioredis
        _redis_async = aioredis.from_url(REDIS_URL)
    return _redis_async

# Subscription tiers
SUBSCRIPTION_TIERS = {
    "trial": {
        "label": "TRIAL",
        "minutes": 60,
        "price_monthly": 0,
        "monthly": False,
        "features": ["60 one-time source minutes", "Watermarked exports", "14-day expiry"],
    },
    "pro": {
        "label": "PRO",
        "minutes": 240,
        "price_monthly": 29,
        "monthly": True,
        "features": ["240 source minutes/month", "1080p export", "Standard brand kits", "No watermark"],
    },
    "studio": {
        "label": "STUDIO",
        "minutes": 600,
        "price_monthly": 69,
        "monthly": True,
        "features": ["600 source minutes/month", "4K export", "Premium cinematic templates", "Priority GPU rendering"],
    },
    "agency": {
        "label": "AGENCY",
        "minutes": 1500,
        "price_monthly": 149,
        "monthly": True,
        "features": ["1500 source minutes/month", "Team seats", "White-label review links", "XML/EDL export"],
    },
}

DEFAULT_TIER = "trial"
TRIAL_MINUTES = 60
TRIAL_DAYS = 14

# Credit packs
CREDIT_PACK_MINUTES = 60
CREDIT_PACK_PRICE = 15

# Payments (Razorpay)
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
RAZORPAY_PRO_PLAN_ID = os.environ.get("RAZORPAY_PRO_PLAN_ID", "")
RAZORPAY_STUDIO_PLAN_ID = os.environ.get("RAZORPAY_STUDIO_PLAN_ID", "")
RAZORPAY_AGENCY_PLAN_ID = os.environ.get("RAZORPAY_AGENCY_PLAN_ID", "")
RAZORPAY_CREDIT_PACK_ITEM_ID = os.getenv("RAZORPAY_CREDIT_PACK_ITEM_ID")


def _resolve_tier_from_plan(tier: str) -> str:
    # Example helper to resolve plan if needed later
    return {
        "pro": RAZORPAY_PRO_PLAN_ID,
        "studio": RAZORPAY_STUDIO_PLAN_ID,
        "agency": RAZORPAY_AGENCY_PLAN_ID,
    }.get((tier or "").lower())

# B-Roll (Pexels API — optional, leave blank to disable)
PEXELS_API_KEY = os.getenv('PEXELS_API_KEY', '')


def validate_production_startup() -> None:
    if not IS_PRODUCTION:
        return

    required = {
        "DATABASE_URL": os.getenv("DATABASE_URL"),
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_ANON_KEY": os.getenv("SUPABASE_ANON_KEY"),
        "GROQ_API_KEY": GROQ_API_KEY,
        "REDIS_URL": REDIS_URL,
        "RAZORPAY_KEY_ID": RAZORPAY_KEY_ID,
        "RAZORPAY_KEY_SECRET": RAZORPAY_KEY_SECRET,
        "RAZORPAY_WEBHOOK_SECRET": RAZORPAY_WEBHOOK_SECRET,
        "PREVIEW_SIGNING_SECRET": os.getenv("PREVIEW_SIGNING_SECRET"),
    }
    missing = [name for name, value in required.items() if not value or str(value).startswith("<")]
    if missing:
        raise RuntimeError(f"Missing required production secret/config values: {', '.join(sorted(missing))}")

    preview_secret = os.getenv("PREVIEW_SIGNING_SECRET", "")
    if len(preview_secret) < 32:
        raise RuntimeError("PREVIEW_SIGNING_SECRET must be at least 32 characters in production")
    if "dev-preview" in preview_secret.lower():
        raise RuntimeError("PREVIEW_SIGNING_SECRET must not be a placeholder value in production")

    lead_salt = os.getenv("LEAD_HASH_SALT", "")
    if not lead_salt or len(lead_salt) < 16:
        raise RuntimeError("LEAD_HASH_SALT must be set and at least 16 characters in production")

    if STORAGE_MODE == "cloud":
        cloud_required = {
            "S3_ENDPOINT_URL": S3_ENDPOINT_URL,
            "S3_ACCESS_KEY": S3_ACCESS_KEY,
            "S3_SECRET_KEY": S3_SECRET_KEY,
            "S3_BUCKET_NAME": S3_BUCKET_NAME,
        }
        missing_cloud = [name for name, value in cloud_required.items() if not value or str(value).startswith("<")]
        if missing_cloud:
            raise RuntimeError(f"Missing required cloud storage values: {', '.join(sorted(missing_cloud))}")
    _enforce_secret_uniqueness()


def _enforce_secret_uniqueness() -> None:
    secrets = {}
    env_keys = [
        "PREVIEW_SIGNING_SECRET",
        "RAZORPAY_KEY_SECRET",
        "RAZORPAY_WEBHOOK_SECRET",
        "LEAD_HASH_SALT",
        "REDIS_PASSWORD",
        "SUPABASE_JWT_SECRET",
        "S3_SECRET_KEY",
    ]
    for key in env_keys:
        value = (os.getenv(key) or "").strip()
        if value and not value.startswith("<"):
            secrets[key] = value

    seen = {}
    for name, value in secrets.items():
        if value in seen:
            raise RuntimeError(
                f"Secret collision detected: {name} and {seen[value]} share the same value. "
                "Every trust-boundary secret must be unique."
            )
        seen[value] = name



validate_production_startup()
