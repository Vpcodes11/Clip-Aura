"""Video clipping and caption burning with FFmpeg"""
import subprocess
import os
import json
import functools
import logging
from pathlib import Path
from app.config import (
    BASE_DIR,
    CAPTION_STYLES,
    DEFAULT_CAPTION_STYLE,
    FFMPEG_TIMEOUT_SECONDS,
    FFPROBE_TIMEOUT_SECONDS,
    PRESETS,
    THUMBNAIL_TIMEOUT_SECONDS,
)
from app.core.plans import DEFAULT_PLAN, export_dimensions_for_plan, is_paid_plan
from app.tracking.face_processor import tracker

logger = logging.getLogger(__name__)


def escape_ass_text(text: str) -> str:
    if not text:
        return text
    text = text.replace("\\", "\\\\")
    text = text.replace("{", "\\{")
    text = text.replace("}", "\\}")
    return text


SAFE_FONT_FALLBACKS = {
    "Montserrat ExtraBold": ["Montserrat", "Arial Black", "Impact", "Arial"],
    "Montserrat Black": ["Montserrat", "Arial Black", "Impact", "Arial"],
    "Outfit": ["Arial", "Verdana", "Tahoma", "Sans"],
    "Komika Axis": ["Impact", "Arial Black", "Arial"],
    "The Bold Font": ["Impact", "Arial Black", "Arial"],
    "Segoe Script": ["Segoe UI", "Arial", "Verdana"],
    "Inter": ["Arial", "Verdana", "Tahoma"],
}
COMMON_FALLBACK_FONTS = ["Arial", "Verdana", "Tahoma", "Segoe UI", "Impact", "Sans"]
WATERMARK_FILTER = "drawtext=text='Created with Clip Aura':x=W-tw-20:y=H-th-20:fontsize=28:fontcolor=white@0.8:box=1:boxcolor=black@0.4:boxborderw=5"


def should_watermark(subscription_tier: str | None = None, is_pro: bool = False) -> bool:
    if subscription_tier is not None:
        return not is_paid_plan(subscription_tier)
    return not is_pro


def get_render_dimensions(preset: str, subscription_tier: str | None = None) -> tuple[int, int]:
    preset_config = PRESETS.get(preset, PRESETS['tiktok'])
    return export_dimensions_for_plan(
        int(preset_config['width']),
        int(preset_config['height']),
        subscription_tier or DEFAULT_PLAN,
    )


def append_watermark_filter(filter_prefix: str, subscription_tier: str | None = None, is_pro: bool = False) -> str:
    if should_watermark(subscription_tier, is_pro):
        return f"{filter_prefix},{WATERMARK_FILTER}[out]"
    return f"{filter_prefix}[out]"


@functools.lru_cache(maxsize=64)
def _system_font_names():
    names = set()
    # 1. Check our deterministic assets/fonts directory first
    local_fonts_dir = BASE_DIR / "assets" / "fonts"
    if local_fonts_dir.is_dir():
        for path in local_fonts_dir.rglob("*"):
            if path.suffix.lower() in (".ttf", ".otf", ".ttc") and path.is_file():
                names.add(path.stem.lower())
    
    # 2. Check OS fonts
    import platform
    if platform.system() == "Windows":
        fonts_dir = Path(os.environ.get("WINDIR", "C:\\Windows")) / "Fonts"
        if fonts_dir.is_dir():
            for path in fonts_dir.iterdir():
                if path.is_file():
                    names.add(path.stem.lower())
    else:
        for fonts_dir in [Path("/usr/share/fonts"), Path("/usr/local/share/fonts"), Path.home() / ".fonts"]:
            if fonts_dir.is_dir():
                for path in fonts_dir.rglob("*"):
                    if path.suffix.lower() in (".ttf", ".otf", ".ttc") and path.is_file():
                        names.add(path.stem.lower())
    return names


def is_font_available(font_name: str) -> bool:
    if not font_name:
        return False
    normalized = font_name.lower().replace(" ", "").replace("-", "").replace("_", "")
    for font_name_text in _system_font_names():
        candidate = font_name_text.lower().replace(" ", "").replace("-", "").replace("_", "")
        if normalized in candidate or candidate in normalized:
            return True
    import shutil
    fc_list = shutil.which("fc-list")
    if fc_list:
        try:
            result = subprocess.run([fc_list, ":family"], capture_output=True, text=True, timeout=4)
            if result.returncode == 0:
                return font_name.lower() in result.stdout.lower()
        except Exception:
            pass
    return False


def resolve_ass_font(font_name: str) -> str:
    if not font_name:
        return "Arial"
    if is_font_available(font_name):
        return font_name
    for fallback in SAFE_FONT_FALLBACKS.get(font_name, []):
        if is_font_available(fallback):
            return fallback
    for fallback in COMMON_FALLBACK_FONTS:
        if is_font_available(fallback):
            return fallback
    return font_name


@functools.lru_cache(maxsize=32)
def get_video_info(video_path):
    """Get video width, height, and duration"""
    cmd = [
        'ffprobe', '-v', 'quiet',
        '-show_entries', 'stream=width,height,codec_type',
        '-show_entries', 'format=duration',
        '-of', 'json', video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=FFPROBE_TIMEOUT_SECONDS)
    data = json.loads(result.stdout)

    width, height = 1920, 1080
    for stream in data.get('streams', []):
        if stream.get('codec_type') == 'video':
            width = int(stream.get('width', 1920))
            height = int(stream.get('height', 1080))
            break

    duration = float(data.get('format', {}).get('duration', 0))
    return width, height, duration


def generate_thumbnail(video_path, start_time, output_path):
    """Generate a thumbnail from the video at the given timestamp"""
    cmd = [
        'ffmpeg', '-ss', str(start_time + 2),
        '-i', video_path,
        '-vframes', '1',
        '-vf', f'scale=360:-2',
        '-q:v', '4',
        '-y', output_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=THUMBNAIL_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired:
        return False
    return result.returncode == 0


def format_ass_time(seconds):
    """Convert seconds to ASS time format H:MM:SS.cc"""
    if seconds < 0:
        seconds = 0
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds % 1) * 100))
    if cs == 100:
        cs = 0
        s += 1
        if s == 60:
            s = 0
            m += 1
            if m == 60:
                m = 0
                h += 1
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def generate_ass_subtitles(words, clip_start, clip_end, output_path, caption_style=None, preset="tiktok", hook_headline=None, subscription_tier=None):
    """
    Generate ASS subtitle file with word-by-word karaoke animation.
    Now includes the Viral Hook Headline at the top.
    """

    def _deterministic_emoji_roll(seed_text, threshold):
        digest = hashlib.md5(seed_text.encode()).digest()
        value = int.from_bytes(digest[:4], "big") / 0xFFFFFFFF
        return value < threshold

    def _deterministic_emoji_pick(seed_text):
        digest = hashlib.md5(seed_text.encode()).digest()
        idx = int.from_bytes(digest[:4], "big") % len(EMOJIS)
        return EMOJIS[idx];
    if not caption_style:
        caption_style = DEFAULT_CAPTION_STYLE
    if caption_style not in CAPTION_STYLES:
        raise ValueError(f"Unsupported caption style: {caption_style}")
    style = CAPTION_STYLES[caption_style]

    clip_words = [
        w for w in words
        if w['start'] >= clip_start - 0.3 and w['end'] <= clip_end + 0.3
    ]

    tw, th = get_render_dimensions(preset, subscription_tier)

    # Dynamically calculate margin_v
    if tw < th:
        video_h = tw * 9 / 16
        space_below = (th - video_h) / 2
        margin_v = max(int(space_below - 120), style.get('margin_v', 80))
    else:
        margin_v = style.get('margin_v', 80)
    margin_v = max(margin_v, 40)
    
    bold_flag = -1 if style['bold'] else 0
    default_font = resolve_ass_font(style['font'])
    secondary_font = resolve_ass_font(style.get('secondary_font', default_font))
    hook_font = resolve_ass_font("Montserrat Black")

    ass_content = f"""[Script Info]
Title: Clip Aura Captions
ScriptType: v4.00+
PlayResX: {tw}
PlayResY: {th}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{default_font},{style['fontsize']},{style['primary_color']},{style['highlight_color']},{style['outline_color']},{style['back_color']},{bold_flag},0,0,0,100,100,0,0,1,{style['outline']},{style['shadow']},{style['alignment']},40,40,{margin_v},1
Style: Hook,{hook_font},80,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,10,0,8,40,40,100,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    # 1. Add Hook Headline (Persistent for first 5 seconds)
    if hook_headline:
        headline_end = format_ass_time(5.0)
        ass_content += f"Dialogue: 0,0:00:00.00,{headline_end},Hook,,0,0,0,,{{\\fad(200,200) \\an8}}{escape_ass_text(hook_headline.upper())}\n"

    # 2. Add Word Captions
    if clip_words:
        groups = []
        current_group = []

        target_group_size = 2
        if caption_style == "hormozi":
            target_group_size = 1
        elif caption_style == "minimal_modern":
            target_group_size = 3

        for word in clip_words:
            current_group.append(word)
            w_text = word['word'].strip()
            if len(current_group) >= target_group_size or (
                len(current_group) >= 1 and w_text and w_text[-1] in '.!?,;:'
            ):
                groups.append(current_group)
                current_group = []
        if current_group:
            groups.append(current_group)

        from app.config import POWER_WORDS
        import hashlib
        EMOJIS = ["🚀", "🔥", "💎", "💰", "😱", "✅", "🛑", "👀", "🤯", "📈", "🎯", "🤫", "🦁", "👑"]

        for i, group in enumerate(groups):
            if not group:
                continue

            group_start = group[0]['start'] - clip_start
            group_end = group[-1]['end'] - clip_start
            if i < len(groups) - 1:
                next_start = groups[i+1][0]['start'] - clip_start
                if caption_style == "minimal_modern":
                    display_end = min(group_end + 0.35, next_start)
                else:
                    display_end = min(group_end + 0.2, next_start)
            else:
                display_end = group_end + (0.35 if caption_style == "minimal_modern" else 0.2)

            if group_start < 0:
                group_start = 0
            start_ts = format_ass_time(group_start)
            end_ts = format_ass_time(display_end)

            karaoke_parts = []
            emphasis_index = 1 if caption_style == "minimal_modern" and len(group) > 1 else 0

            for j, word in enumerate(group):
                duration_cs = int((word['end'] - word['start']) * 100)
                if duration_cs < 8:
                    duration_cs = 8

                raw_word = word['word'].strip()
                clean_word = raw_word.lower().strip('.,!?:;"()')

                if caption_style == "typography_motion":
                    if clean_word in POWER_WORDS:
                        display_word = raw_word.upper()
                        if _deterministic_emoji_roll(word["word"], 0.25):
                            display_word += " " + _deterministic_emoji_pick(word["word"])
                        part = f"{{\\fn{default_font}}}{{\\c{style['primary_color']}}}{{\\k{duration_cs}}}{escape_ass_text(display_word)} "
                    else:
                        display_word = raw_word.lower()
                        part = f"{{\\fn{secondary_font}}}{{\\c{style['highlight_color']}}}{{\\k{duration_cs}}}{escape_ass_text(display_word)} "
                elif caption_style == "hormozi":
                    display_word = raw_word.upper()
                    if clean_word in POWER_WORDS and _deterministic_emoji_roll(word["word"], 0.35):
                        display_word += " " + _deterministic_emoji_pick(word["word"])
                    color_tag = style['highlight_color'] if (j % 2 == 0) else style['primary_color']
                    part = f"{{\\c{color_tag}}}{{\\k{duration_cs}}}{escape_ass_text(display_word)} "
                elif caption_style == "minimal_modern":
                    display_word = raw_word.capitalize()
                    color_tag = style['highlight_color'] if j == emphasis_index else style['primary_color']
                    part = f"{{\\c{color_tag}}}{{\\k{duration_cs}}}{escape_ass_text(display_word)} "
                else:
                    display_word = raw_word.upper()
                    if clean_word in POWER_WORDS and _deterministic_emoji_roll(word["word"], 0.3):
                        display_word += " " + _deterministic_emoji_pick(word["word"])
                    part = f"{{\\k{duration_cs}}}{escape_ass_text(display_word)} "

                karaoke_parts.append(part)

            text = "".join(karaoke_parts).strip()
            if caption_style == "hormozi":
                animation = f"{{\\an{style['alignment']}\\fad(80,80)\\t(0,120,\\fscx110\\fscy110)\\t(120,240,\\fscx100\\fscy100)}}"
            elif caption_style == "minimal_modern":
                animation = f"{{\\an{style['alignment']}\\fad(180,180)}}"
            else:
                animation = f"{{\\an{style['alignment']}\\fad(50,50)\\t(0,80,\\fscx120\\fscy120)\\t(80,160,\\fscx100\\fscy100)}}"

            ass_content += f"Dialogue: 0,{start_ts},{end_ts},Default,,0,0,0,,{animation}{text}\n"

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ass_content)

    return output_path


def create_clip(video_path, clip_info, words, output_path, clip_index,
                progress_callback=None, caption_style=None, preset="tiktok", is_pro=False, subscription_tier=None):
    """
    Create a single clip with Dynamic Face Tracking and Viral Hook Headlines.
    """
    start = clip_info['start_time']
    end = clip_info['end_time']
    duration = end - start

    tw, th = get_render_dimensions(preset, subscription_tier)

    if progress_callback:
        progress_callback(f"Analyzing AI face tracking for clip {clip_index+1}...", 72 + clip_index * 2)

    # 1. Get Dynamic Tracking Data
    tracking = tracker.get_dynamic_crop_coordinates(video_path, start, end, tw, th)

    if progress_callback:
        progress_callback(f"Creating viral clip {clip_index + 1}: {clip_info['title']}...", 73 + clip_index * 2)

    # 2. Generate ASS subtitles (including headline)
    work_dir = os.path.dirname(output_path)
    ass_path = os.path.join(work_dir, f"subs_{clip_index}.ass")
    hook_headline = clip_info.get('hook_caption', clip_info['title'])
    generate_ass_subtitles(words, start, end, ass_path, caption_style, preset, hook_headline, subscription_tier)

    ass_escaped = ass_path.replace('\\', '/').replace(':', '\\:')
    src_w, src_h, _ = get_video_info(video_path)

    # 3. Build Filter Complex
    if tracking and preset in ("tiktok", "youtube_shorts"):
        cw = tracking['crop_w']
        ch = tracking['crop_h']

        sendcmd_path = os.path.join(work_dir, f"crop_cmd_{clip_index}.txt")
        tracker.generate_sendcmd_file(tracking, sendcmd_path)
        sendcmd_escaped = sendcmd_path.replace('\\', '/').replace(':', '\\:')

        centers = list(tracking['coords'].values())
        median_x = sorted(centers)[len(centers) // 2]

        filter_complex = (
            f"[0:v]crop={cw}:{ch}:{median_x}:0:sendcmd=f='{sendcmd_escaped}',"
            f"scale={tw}:{th}[vid];"
            + append_watermark_filter(f"[vid]ass='{ass_escaped}'", subscription_tier, is_pro)
        )
    elif preset in ("tiktok", "youtube_shorts") and src_w > src_h:
        # Standard Landscape-on-Blur if tracking fails
        filter_complex = (
            f"[0:v]scale={tw}:{th}:force_original_aspect_ratio=increase,"
            f"crop={tw}:{th},boxblur=25:5[bg];"
            f"[0:v]scale={tw}:-2[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2[vid];"
            + append_watermark_filter(f"[vid]ass='{ass_escaped}'", subscription_tier, is_pro)
        )
    else:
        # Standard fit
        filter_complex = (
            f"[0:v]scale={tw}:{th}:force_original_aspect_ratio=decrease,"
            f"pad={tw}:{th}:(ow-iw)/2:(oh-ih)/2:black[vid];"
            + append_watermark_filter(f"[vid]ass='{ass_escaped}'", subscription_tier, is_pro)
        )

    cmd = [
        'ffmpeg',
        '-ss', str(start),
        '-i', video_path,
        '-t', str(duration),
        '-filter_complex', filter_complex,
        '-map', '[out]',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-preset', 'superfast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '160k',
        '-y',
        output_path
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=FFMPEG_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f"FFmpeg render timed out after {FFMPEG_TIMEOUT_SECONDS}s") from exc
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {result.stderr[-500:]}")

    return output_path


def safe_create_clip(video_path, clip_info, words, output_path, clip_index,
                     progress_callback=None, caption_style=None, preset="tiktok", is_pro=False, subscription_tier=None):
    """
    Fault-tolerant wrapper around create_clip.
    Falls back to a static center crop if dynamic sendcmd rendering fails.

    Returns a result dict: {"ok": True, "attempt": "dynamic"} on success,
    {"ok": True, "attempt": "static_fallback"} if dynamic failed but static succeeded,
    or {"ok": False, "error": str} on total failure.
    """
    try:
        create_clip(
            video_path=video_path,
            clip_info=clip_info,
            words=words,
            output_path=output_path,
            clip_index=clip_index,
            progress_callback=progress_callback,
            caption_style=caption_style,
            preset=preset,
            is_pro=is_pro,
            subscription_tier=subscription_tier,
        )
        return {"ok": True, "attempt": "dynamic"}
    except Exception as exc:
        logger.warning(
            "Dynamic render failed for clip %d (start=%.2f, end=%.2f), "
            "falling back to static: %s",
            clip_index,
            clip_info.get("start_time", 0),
            clip_info.get("end_time", 0),
            exc,
        )

    # Fallback: retry with a static center crop
    try:
        start = clip_info['start_time']
        end = clip_info['end_time']
        duration = end - start

        tw, th = get_render_dimensions(preset, subscription_tier)

        work_dir = os.path.dirname(output_path)
        ass_path = os.path.join(work_dir, f"subs_{clip_index}.ass")

        # Reuse existing ASS file if present, otherwise regenerate
        if not os.path.exists(ass_path):
            hook_headline = clip_info.get('hook_caption', clip_info['title'])
            generate_ass_subtitles(words, start, end, ass_path, caption_style, preset, hook_headline, subscription_tier)
        ass_escaped = ass_path.replace('\\', '/').replace(':', '\\:')

        src_w, src_h, _ = get_video_info(video_path)
        crop_w = int(src_h * (tw / th))
        center_x = max(0, (src_w - crop_w) // 2)

        filter_complex = (
            f"[0:v]crop={crop_w}:{src_h}:{center_x}:0,scale={tw}:{th}[vid];"
            + append_watermark_filter(f"[vid]ass='{ass_escaped}'", subscription_tier, is_pro)
        )

        cmd = [
            'ffmpeg', '-ss', str(start), '-i', video_path,
            '-t', str(duration), '-filter_complex', filter_complex,
            '-map', '[out]', '-map', '0:a?',
            '-c:v', 'libx264', '-preset', 'superfast', '-crf', '20',
            '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
            '-y', output_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=FFMPEG_TIMEOUT_SECONDS)
        if result.returncode != 0:
            return {"ok": False, "error": f"Static fallback failed: {result.stderr[-300:]}"}

        return {"ok": True, "attempt": "static_fallback"}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
