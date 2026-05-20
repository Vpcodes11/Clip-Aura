"""Video clipping and caption burning with FFmpeg"""
import subprocess
import os
import json
import functools
from app.config import CAPTION_STYLES, DEFAULT_CAPTION_STYLE, PRESETS
from app.core.face_processor import tracker
from app.core.preflight import validate_rendered_video


@functools.lru_cache(maxsize=1)
def check_nvenc_available():
    """Check if NVIDIA NVENC encoder is available and can successfully initialize in FFmpeg"""
    try:
        # Run a quick 1-frame test encoding to null to verify CUDA and drivers are functional
        cmd = ['ffmpeg', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:d=1', '-c:v', 'h264_nvenc', '-t', '0.1', '-f', 'null', '-']
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode == 0
    except Exception:
        return False


@functools.lru_cache(maxsize=32)
def get_video_info(video_path):
    """Get video width, height, and duration"""
    cmd = [
        'ffprobe', '-v', 'quiet',
        '-show_entries', 'stream=width,height,codec_type',
        '-show_entries', 'format=duration',
        '-of', 'json', video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
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
    result = subprocess.run(cmd, capture_output=True, text=True)
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


def generate_ass_subtitles(words, clip_start, clip_end, output_path, caption_style=None, preset="tiktok", hook_headline=None):
    """
    Generate ASS subtitle file with word-by-word karaoke animation.
    Now includes the Viral Hook Headline at the top.
    """
    if caption_style is None:
        caption_style = DEFAULT_CAPTION_STYLE
    style = CAPTION_STYLES.get(caption_style, CAPTION_STYLES[DEFAULT_CAPTION_STYLE])

    clip_words = [
        w for w in words
        if w['start'] >= clip_start - 0.3 and w['end'] <= clip_end + 0.3
    ]

    preset_config = PRESETS.get(preset, PRESETS['tiktok'])
    tw = preset_config['width']
    th = preset_config['height']

    font = style.get('font', 'Montserrat Black')
    fontsize = style.get('fontsize', 85)
    primary_color = style.get('primary_color', '&H00FFFFFF')
    highlight_color = style.get('highlight_color', '&H0000FFFF')
    outline_color = style.get('outline_color', '&H00000000')
    back_color = style.get('back_color', '&H80000000')
    bold_flag = -1 if style.get('bold', True) else 0
    outline = style.get('outline', 6)
    shadow = style.get('shadow', 4)
    alignment = style.get('alignment', 2)

    # Dynamically calculate margin_v
    if tw < th:
        video_h = tw * 9 / 16
        space_below = (th - video_h) / 2
        margin_v = int(space_below - 120) 
    else:
        margin_v = style.get('margin_v', 80)
    
    ass_content = f"""[Script Info]
Title: Clip Aura Captions
ScriptType: v4.00+
PlayResX: {tw}
PlayResY: {th}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font},{fontsize},{primary_color},{highlight_color},{outline_color},{back_color},{bold_flag},0,0,0,100,100,0,0,1,{outline},{shadow},{alignment},40,40,{margin_v},1
Style: Hook,Montserrat Black,80,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,10,0,8,40,40,100,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    # 1. Add Hook Headline (Persistent for first 5 seconds)
    if hook_headline:
        headline_end = format_ass_time(5.0)
        ass_content += f"Dialogue: 0,0:00:00.00,{headline_end},Hook,,0,0,0,,{{\\fad(200,200) \\an8}}{hook_headline.upper()}\n"

    # 2. Add Word Captions
    if clip_words:
        groups = []
        current_group = []
        for word in clip_words:
            current_group.append(word)
            w_text = word['word'].strip()
            if len(current_group) >= 2 or (
                len(current_group) >= 1 and w_text and w_text[-1] in '.!?,;:'
            ):
                groups.append(current_group)
                current_group = []
        if current_group:
            groups.append(current_group)

        from app.config import POWER_WORDS
        import random
        EMOJIS = ["🚀", "🔥", "💎", "💰", "😱", "✅", "🛑", "👀", "🤯", "📈", "🎯", "🤫", "🦁", "👑"]

        for i, group in enumerate(groups):
            if not group: continue

            group_start = group[0]['start'] - clip_start
            group_end = group[-1]['end'] - clip_start
            
            if i < len(groups) - 1:
                next_start = groups[i+1][0]['start'] - clip_start
                display_end = min(group_end + 0.2, next_start)
            else:
                display_end = group_end + 0.2

            if group_start < 0: group_start = 0
            start_ts = format_ass_time(group_start)
            end_ts = format_ass_time(display_end)

            karaoke_parts = []
            for word in group:
                duration_cs = int((word['end'] - word['start']) * 100)
                if duration_cs < 8: duration_cs = 8
                raw_word = word['word'].strip()
                clean_word = raw_word.lower().strip('.,!?:;"()')
                
                if caption_style == "typography_motion":
                    sec_font = style.get('secondary_font', 'Segoe Script')
                    if clean_word in POWER_WORDS:
                        display_word = raw_word.upper()
                        if random.random() < 0.2: display_word += " " + random.choice(EMOJIS)
                        part = f"{{\\fn{font}}}{{\\c&H00D4FF&}}{{\\k{duration_cs}}}{display_word} "
                    else:
                        display_word = raw_word.lower()
                        part = f"{{\\fn{sec_font}}}{{\\c&HFFFFFF&}}{{\\k{duration_cs}}}{display_word} "
                else:
                    display_word = raw_word.upper()
                    if clean_word in POWER_WORDS and random.random() < 0.3: display_word += " " + random.choice(EMOJIS)
                    part = f"{{\\k{duration_cs}}}{display_word} "
                    
                karaoke_parts.append(part)

            text = "".join(karaoke_parts).strip()
            # Professional Bouncy Animation: Pop in, slight overshoot, then settle
            animation = f"{{\\an{alignment}\\fad(50,50)\\t(0,80,\\fscx120\\fscy120)\\t(80,160,\\fscx100\\fscy100)}}"
            ass_content += f"Dialogue: 0,{start_ts},{end_ts},Default,,0,0,0,,{animation}{text}\n"

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ass_content)

    return output_path


def create_clip(video_path, clip_info, words, output_path, clip_index,
                progress_callback=None, caption_style=None, preset="tiktok", is_pro=False,
                force_software=False, render_mode="normal"):
    """
    Create a single clip with True Dynamic Face Tracking and Viral Hook Headlines.

    Upgrades implemented:
    - Upgrade 1: True dynamic panning via FFmpeg sendcmd file (camera follows speaker)
    - Upgrade 2: Active speaker detection (picks the talking face, not just the biggest)
    """
    start = clip_info['start_time']
    end = clip_info['end_time']
    duration = end - start

    preset_config = PRESETS.get(preset, PRESETS['tiktok'])
    tw = preset_config['width']
    th = preset_config['height']

    if progress_callback:
        progress_callback(f"Analyzing AI face tracking for clip {clip_index+1}...", 72 + clip_index * 2)

    # 1. Get Dynamic Tracking Data (now uses active speaker + Gaussian smoothing)
    tracking = None
    if render_mode in ("normal", "static"):
        tracking = tracker.get_dynamic_crop_coordinates(video_path, start, end, tw, th)

    if progress_callback:
        progress_callback(f"Creating viral clip {clip_index + 1}: {clip_info['title']}...", 73 + clip_index * 2)

    # 2. Generate ASS subtitles (including headline)
    work_dir = os.path.dirname(output_path)
    ass_path = os.path.join(work_dir, f"subs_{clip_index}.ass")
    hook_headline = clip_info.get('hook_caption', clip_info['title'])
    generate_ass_subtitles(words, start, end, ass_path, caption_style, preset, hook_headline)

    ass_escaped = ass_path.replace('\\', '/').replace(':', '\\:')
    src_w, src_h, _ = get_video_info(video_path)

    watermark = (
        "" if is_pro
        else ",drawtext=text='Created with Clip Aura':x=W-text_w-20:y=H-text_h-20:"
             "fontsize=28:fontcolor=white@0.8:box=1:boxcolor=black@0.4:boxborderw=5"
    )

    # 3. Build Filter Complex
    if tracking and preset in ("tiktok", "youtube_shorts") and render_mode == "normal":
        cw = tracking['crop_w']
        ch = tracking['crop_h']
        coords = tracking['coords']

        # ---------------------------------------------------------------
        # UPGRADE 1: TRUE DYNAMIC PANNING via sendcmd
        # Instead of locking to first_x, we write a sendcmd script that
        # instructs FFmpeg to update crop x at every 0.2s sample point.
        # ---------------------------------------------------------------
        sendcmd_path = os.path.join(work_dir, f"pan_{clip_index}.txt")
        tracker.generate_sendcmd_file(tracking, sendcmd_path)
        sendcmd_escaped = sendcmd_path.replace('\\', '/').replace(':', '\\:')

        # We use crop with a starting x of first coord; sendcmd updates it in real time
        first_x = coords[sorted(coords.keys())[0]]

        filter_complex = (
            f"[0:v]sendcmd=f='{sendcmd_escaped}',crop={cw}:{ch}:{first_x}:0,"
            f"scale={tw}:{th}[vid];"
            f"[vid]ass='{ass_escaped}'{watermark}[out]"
        )
    elif tracking and preset in ("tiktok", "youtube_shorts") and render_mode == "static":
        cw = tracking['crop_w']
        ch = tracking['crop_h']
        first_x = list(tracking['coords'].values())[0]
        filter_complex = (
            f"[0:v]crop={cw}:{ch}:{first_x}:0,"
            f"scale={tw}:{th}[vid];"
            f"[vid]ass='{ass_escaped}'{watermark}[out]"
        )
    elif preset in ("tiktok", "youtube_shorts") and src_w > src_h and render_mode != "letterbox":
        # Standard landscape-on-blur fallback if face tracking found nothing
        filter_complex = (
            f"[0:v]scale={tw}:{th}:force_original_aspect_ratio=increase,"
            f"crop={tw}:{th},boxblur=25:5[bg];"
            f"[0:v]scale={tw}:-2[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2[vid];"
            f"[vid]ass='{ass_escaped}'{watermark}[out]"
        )
    else:
        # Standard letterbox fit
        filter_complex = (
            f"[0:v]scale={tw}:{th}:force_original_aspect_ratio=decrease,"
            f"pad={tw}:{th}:(ow-iw)/2:(oh-ih)/2:black[vid];"
            f"[vid]ass='{ass_escaped}'{watermark}[out]"
        )

    video_encoder = 'libx264'
    encoder_args = ['-preset', 'superfast', '-crf', '20']
    
    if not force_software and check_nvenc_available():
        video_encoder = 'h264_nvenc'
        encoder_args = ['-preset', 'fast', '-cq', '22']

    cmd = [
        'ffmpeg',
        '-ss', str(start),
        '-i', video_path,
        '-t', str(duration),
        '-filter_complex', filter_complex,
        '-map', '[out]',
        '-map', '0:a?',
        '-c:v', video_encoder
    ] + encoder_args + [
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '160k',
        '-y',
        output_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        # sendcmd may not be available — fall back to static crop
        print(f"[Clipper] sendcmd failed, falling back to static crop: {result.stderr[-300:]}")
        first_x = list(tracking['coords'].values())[0] if tracking else src_w // 2 - (tw // 2)
        filter_complex_fallback = (
            f"[0:v]crop={tracking['crop_w']}:{tracking['crop_h']}:{first_x}:0,"
            f"scale={tw}:{th}[vid];"
            f"[vid]ass='{ass_escaped}'{watermark}[out]"
        ) if tracking else (
            f"[0:v]scale={tw}:{th}:force_original_aspect_ratio=decrease,"
            f"pad={tw}:{th}:(ow-iw)/2:(oh-ih)/2:black[vid];"
            f"[vid]ass='{ass_escaped}'{watermark}[out]"
        )
        cmd[-2] = output_path
        cmd[cmd.index('-filter_complex') + 1] = filter_complex_fallback
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg failed: {result.stderr[-500:]}")

    return output_path


def safe_create_clip(video_path, clip_info, words, output_path, clip_index,
                     progress_callback=None, caption_style=None, preset="tiktok", is_pro=False):
    """Create a clip with progressively safer render settings."""
    attempts = [
        ("dynamic", {"force_software": False, "render_mode": "normal"}),
        ("software_dynamic", {"force_software": True, "render_mode": "normal"}),
        ("static_crop", {"force_software": True, "render_mode": "static"}),
        ("letterbox", {"force_software": True, "render_mode": "letterbox"}),
    ]
    failures = []
    log_dir = os.path.join(os.path.dirname(output_path), "logs")

    for label, options in attempts:
        try:
            path = create_clip(
                video_path, clip_info, words, output_path, clip_index,
                progress_callback, caption_style, preset, is_pro, **options
            )
            validate_rendered_video(path)
            return {
                "ok": True,
                "path": path,
                "attempt": label,
                "error": None,
            }
        except Exception as exc:
            failures.append(f"{label}: {str(exc)[-500:]}")
            check_nvenc_available.cache_clear()

    try:
        os.makedirs(log_dir, exist_ok=True)
        with open(os.path.join(log_dir, f"clip_{clip_index + 1}_render_errors.log"), "w", encoding="utf-8") as f:
            f.write("\n\n".join(failures))
    except Exception:
        pass

    return {
        "ok": False,
        "path": output_path,
        "attempt": None,
        "error": " | ".join(failures)[-1500:],
    }

