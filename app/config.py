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

# Dev mode bypass — single source of truth for all modules
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
if DEV_MODE and ENVIRONMENT in {"production", "prod"}:
    raise RuntimeError("DEV_MODE must be false when ENVIRONMENT=production.")

FFMPEG_TIMEOUT_SECONDS = int(os.getenv("FFMPEG_TIMEOUT_SECONDS", "300"))
FFPROBE_TIMEOUT_SECONDS = int(os.getenv("FFPROBE_TIMEOUT_SECONDS", "30"))
THUMBNAIL_TIMEOUT_SECONDS = int(os.getenv("THUMBNAIL_TIMEOUT_SECONDS", "30"))
CELERY_TASK_TIME_LIMIT = int(os.getenv("CELERY_TASK_TIME_LIMIT", "600"))
CELERY_TASK_SOFT_TIME_LIMIT = int(os.getenv("CELERY_TASK_SOFT_TIME_LIMIT", "540"))

# API Keys (stored in .env file, never committed to git)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("CRITICAL WARNING: GROQ_API_KEY is not set in .env. AI Transcription will fail.")

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

# Payments (Stripe)
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')
STRIPE_PRO_PRICE_ID = os.getenv('STRIPE_PRO_PRICE_ID')

# B-Roll (Pexels API — optional, leave blank to disable)
PEXELS_API_KEY = os.getenv('PEXELS_API_KEY', '')
