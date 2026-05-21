"""YouTube / URL video downloader using yt-dlp (Python API)"""
import os
import re
import yt_dlp

# Optional: path to cookies.txt file for YouTube bot bypass
# Mount your exported cookies file at /app/cookies.txt in Docker
COOKIES_FILE = "/app/cookies.txt"


def is_valid_url(url):
    """Check if the string looks like a valid video URL"""
    patterns = [
        r'https?://(www\.)?youtube\.com/watch',
        r'https?://youtu\.be/',
        r'https?://(www\.)?twitch\.tv/',
        r'https?://(www\.)?vimeo\.com/',
        r'https?://(www\.)?dailymotion\.com/',
        r'https?://(www\.)?facebook\.com/.+/videos/',
        r'https?://(www\.)?twitter\.com/.+/status/',
        r'https?://(www\.)?x\.com/.+/status/',
        r'https?://.+\.(mp4|mkv|mov|avi|webm)',
    ]
    return any(re.match(p, url, re.IGNORECASE) for p in patterns)


def get_video_info_url(url):
    """Get video title and duration from URL without downloading"""
    try:
        with yt_dlp.YoutubeDL({'quiet': True, 'no_warnings': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                'title': info.get('title', 'Unknown'),
                'duration': info.get('duration', 0) or 0
            }
    except Exception:
        return {'title': 'Unknown', 'duration': 0}


def download_video(url, output_dir, progress_callback=None):
    """
    Download video from URL using yt-dlp Python API.
    Returns the path to the downloaded file.
    """
    if progress_callback:
        progress_callback("Fetching video info...", 1)

    # Get info first
    info = get_video_info_url(url)

    if progress_callback:
        progress_callback(f"Downloading: {info['title'][:50]}...", 2)

    output_template = os.path.join(output_dir, '%(title)s.%(ext)s')

    # Track the downloaded filename
    downloaded_file = [None]

    def progress_hook(d):
        if d['status'] == 'finished':
            downloaded_file[0] = d.get('filename')
        elif d['status'] == 'downloading' and progress_callback:
            pct = d.get('_percent_str', '').strip()
            progress_callback(f"Downloading: {pct}", 3)

    ydl_opts = {
        'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best',
        'merge_output_format': 'mp4',
        'outtmpl': output_template,
        'noplaylist': True,
        'no_overwrites': True,
        'quiet': True,
        'no_warnings': True,
        'progress_hooks': [progress_hook],
        # Mimic a real browser to avoid bot detection
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        },
    }

    # Use cookies file if available (bypasses YouTube bot detection)
    if os.path.isfile(COOKIES_FILE):
        ydl_opts['cookiefile'] = COOKIES_FILE
        print(f"[Downloader] Using cookies file: {COOKIES_FILE}")

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        raise RuntimeError(f"Download failed: {str(e)[:300]}")

    # Return the tracked file or find it
    if downloaded_file[0] and os.path.isfile(downloaded_file[0]):
        if progress_callback:
            progress_callback("Download complete!", 4)
        return downloaded_file[0]

    # Fallback: scan directory
    for f in os.listdir(output_dir):
        if f.endswith(('.mp4', '.mkv', '.webm', '.mov')):
            filepath = os.path.join(output_dir, f)
            if os.path.isfile(filepath):
                if progress_callback:
                    progress_callback("Download complete!", 4)
                return filepath

    raise RuntimeError("Download completed but file not found")
