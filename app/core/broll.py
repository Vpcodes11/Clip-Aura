"""
B-Roll Overlay Module — Fetches royalty-free clips from Pexels
and overlays them as short cutaways to boost viewer retention.

Requires PEXELS_API_KEY in .env. If not set, this module is a no-op.
"""
import os
import re
import subprocess
import requests
from app.config import FFMPEG_TIMEOUT_SECONDS

# High-visual-impact keywords mapped to better Pexels search terms
BROLL_KEYWORD_MAP = {
    # Finance / Business
    "money": "cash money", "rich": "luxury lifestyle", "billion": "city skyline",
    "million": "stock market", "wealth": "luxury car", "invest": "stock market chart",
    "startup": "office team", "business": "business meeting",
    # Health / Fitness
    "gym": "gym workout", "workout": "fitness training", "run": "running athlete",
    "diet": "healthy food", "muscle": "bodybuilding", "sleep": "sleeping person",
    # Technology
    "ai": "artificial intelligence", "robot": "robot technology",
    "space": "space galaxy", "rocket": "rocket launch", "code": "programming code",
    # Emotion / Motivation
    "success": "success celebration", "fail": "frustration", "fear": "dark forest",
    "dream": "sunrise nature", "love": "couple sunset",
    # Nature / World
    "ocean": "ocean waves", "mountain": "mountain landscape",
    "city": "city timelapse", "fire": "fire flames",
}

# Min confidence: only inject B-roll if keyword appears in this many words
MIN_KEYWORD_FREQUENCY = 1


def extract_broll_keywords(transcript_text: str) -> list:
    """
    Scan transcript for high-visual keywords and return ranked list of search terms.
    Returns a list of (search_term, char_position) tuples, deduped by search term.
    """
    text_lower = transcript_text.lower()
    found = {}
    for keyword, search_term in BROLL_KEYWORD_MAP.items():
        matches = [m.start() for m in re.finditer(r'\b' + re.escape(keyword) + r'\b', text_lower)]
        if len(matches) >= MIN_KEYWORD_FREQUENCY and search_term not in found:
            found[search_term] = matches[0]  # Store first occurrence position

    # Sort by position in transcript
    sorted_terms = sorted(found.items(), key=lambda x: x[1])
    return [(term, pos) for term, pos in sorted_terms]


def keyword_to_timestamp(keyword_char_pos: int, full_text: str, words: list) -> float:
    """
    Maps a character position in the full transcript text to an approximate timestamp
    by counting words up to that position and looking up the word's start time.
    """
    if not words:
        return -1.0
    # Estimate word index from char position
    chars_so_far = 0
    for word_data in words:
        chars_so_far += len(word_data['word']) + 1
        if chars_so_far >= keyword_char_pos:
            return word_data['start']
    return words[-1]['start']


def fetch_broll_clip(search_term: str, output_path: str, api_key: str,
                     min_duration: int = 5, max_duration: int = 15) -> bool:
    """
    Fetch a short royalty-free video from Pexels API.

    Args:
        search_term: What to search for.
        output_path: Where to save the downloaded .mp4.
        api_key: Pexels API key.
        min_duration/max_duration: Filter by clip length in seconds.

    Returns:
        True if a clip was downloaded, False on any error.
    """
    try:
        headers = {"Authorization": api_key}
        params = {"query": search_term, "per_page": 5, "orientation": "portrait"}
        resp = requests.get("https://api.pexels.com/videos/search",
                            headers=headers, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        videos = data.get("videos", [])
        for video in videos:
            duration = video.get("duration", 0)
            if not (min_duration <= duration <= max_duration):
                continue

            # Prefer HD portrait video file
            video_files = sorted(
                video.get("video_files", []),
                key=lambda f: f.get("width", 0)
            )
            portrait_files = [f for f in video_files if f.get("width", 999) <= f.get("height", 0)]
            chosen = portrait_files[0] if portrait_files else (video_files[0] if video_files else None)
            if not chosen:
                continue

            # Download the clip
            dl_resp = requests.get(chosen["link"], stream=True, timeout=30)
            dl_resp.raise_for_status()
            with open(output_path, 'wb') as f:
                for chunk in dl_resp.iter_content(chunk_size=65536):
                    f.write(chunk)
            print(f"[BRoll] Downloaded '{search_term}' → {output_path}")
            return True

        print(f"[BRoll] No suitable clip found for '{search_term}'")
        return False

    except Exception as e:
        print(f"[BRoll] Error fetching '{search_term}': {e}")
        return False


def overlay_broll_on_clip(main_clip_path: str, broll_entries: list,
                          output_path: str, clip_start_time: float) -> bool:
    """
    Overlays B-roll clips onto the main clip at specified timestamps using FFmpeg.

    Args:
        main_clip_path: Path to the rendered main clip.
        broll_entries: List of dicts: {'broll_path': str, 'timestamp': float, 'duration': float}
        output_path: Where to write the final clip with B-roll.
        clip_start_time: The start time of this clip in the original video (to offset timestamps).

    Returns:
        True if overlay succeeded, False otherwise.
    """
    if not broll_entries:
        return False

    try:
        # Build a filter_complex chain
        # Each B-roll: scale to match main video, then overlay at given time
        inputs = ['-i', main_clip_path]
        for entry in broll_entries:
            inputs += ['-i', entry['broll_path']]

        filter_parts = []
        current_video = "[0:v]"

        for i, entry in enumerate(broll_entries):
            broll_idx = i + 1
            offset = entry['timestamp'] - clip_start_time
            duration = entry['duration']

            if offset < 0:
                offset = 0

            # Scale B-roll to match main clip dimensions
            filter_parts.append(
                f"[{broll_idx}:v]scale=iw:ih:force_original_aspect_ratio=increase,"
                f"crop=iw:ih,setpts=PTS-STARTPTS[br{i}]"
            )

            # Overlay with fade in/out
            out_label = f"[v{i}]"
            filter_parts.append(
                f"{current_video}[br{i}]overlay=0:0:"
                f"enable='between(t,{offset:.2f},{offset+duration:.2f})':"
                f"format=auto{out_label}"
            )
            current_video = out_label

        filter_parts[-1] = filter_parts[-1].removesuffix(f"[v{len(broll_entries)-1}]") + "[vout]"

        filter_complex = ";".join(filter_parts)

        cmd = [
            'ffmpeg',
            *inputs,
            '-filter_complex', filter_complex,
            '-map', '[vout]',
            '-map', '0:a?',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '22',
            '-c:a', 'aac', '-b:a', '128k',
            '-y', output_path
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=FFMPEG_TIMEOUT_SECONDS)
        if result.returncode != 0:
            print(f"[BRoll] FFmpeg overlay failed: {result.stderr[-400:]}")
            return False

        print(f"[BRoll] Overlay complete → {output_path}")
        return True

    except Exception as e:
        print(f"[BRoll] Overlay error: {e}")
        return False


def apply_broll(clip_path: str, clip_info: dict, transcript_words: list,
                transcript_text: str, work_dir: str, api_key: str,
                max_brolls: int = 2) -> str:
    """
    High-level function: extracts keywords → fetches B-roll → overlays.
    Returns the path to the final clip (original if no B-roll applied).
    """
    if not api_key:
        return clip_path

    keywords = extract_broll_keywords(transcript_text)
    clip_start = clip_info['start_time']
    clip_end = clip_info['end_time']

    broll_entries = []
    used_terms = set()

    for search_term, char_pos in keywords[:max_brolls * 2]:
        if search_term in used_terms:
            continue

        # Map to timestamp inside the clip
        ts = keyword_to_timestamp(char_pos, transcript_text, transcript_words)
        if not (clip_start + 3 <= ts <= clip_end - 8):
            continue  # B-roll target not inside this clip

        broll_filename = f"broll_{len(broll_entries)}_{search_term.replace(' ', '_')}.mp4"
        broll_path = os.path.join(work_dir, broll_filename)

        if fetch_broll_clip(search_term, broll_path, api_key):
            broll_entries.append({
                'broll_path': broll_path,
                'timestamp': ts,
                'duration': 4.0
            })
            used_terms.add(search_term)

        if len(broll_entries) >= max_brolls:
            break

    if not broll_entries:
        return clip_path

    broll_output = clip_path.replace('.mp4', '_broll.mp4')
    success = overlay_broll_on_clip(clip_path, broll_entries, broll_output, clip_start)
    return broll_output if success else clip_path
