"""Transcription module — supports Groq Whisper (free) and OpenAI Whisper"""
import subprocess
import os
import json
import time
import logging
from openai import OpenAI
from app.config import AUDIO_CHUNK_DURATION, AI_API_MAX_RETRIES, AI_API_TIMEOUT_SECONDS, FFMPEG_TIMEOUT_SECONDS, FFPROBE_TIMEOUT_SECONDS, WHISPER_MAX_FILE_SIZE

logger = logging.getLogger(__name__)

# Provider configs
PROVIDERS = {
    'openai': {
        'base_url': None,
        'whisper_model': 'whisper-1',
        'supports_word_timestamps': True,
    },
    'groq': {
        'base_url': 'https://api.groq.com/openai/v1',
        'whisper_model': 'whisper-large-v3-turbo',
        'supports_word_timestamps': True,
    }
}


def get_client(api_key, provider='groq'):
    """Create OpenAI-compatible client for the chosen provider"""
    config = PROVIDERS.get(provider, PROVIDERS['groq'])
    kwargs = {'api_key': api_key}
    if config['base_url']:
        kwargs['base_url'] = config['base_url']
    return OpenAI(timeout=AI_API_TIMEOUT_SECONDS, max_retries=0, **kwargs), config


def extract_audio(video_path, audio_path):
    """Extract audio from video as mono MP3 at 64kbps (small files for API)"""
    cmd = [
        'ffmpeg', '-i', video_path,
        '-vn', '-ac', '1', '-ab', '64k',
        '-f', 'mp3', '-y', audio_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=FFMPEG_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("Audio extraction timed out.") from exc
    if result.returncode != 0:
        raise RuntimeError(f"Audio extraction failed: {result.stderr[-300:]}")


def get_media_duration(path):
    """Get audio or video duration in seconds using ffprobe"""
    cmd = [
        'ffprobe', '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'json', path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=FFPROBE_TIMEOUT_SECONDS)
    data = json.loads(result.stdout)
    return float(data['format']['duration'])


def split_audio(audio_path, chunk_dir, chunk_duration=AUDIO_CHUNK_DURATION):
    """Split audio into chunks to stay under API file size limit"""
    duration = get_media_duration(audio_path)
    chunks = []
    start = 0
    i = 0
    while start < duration:
        chunk_path = os.path.join(chunk_dir, f"chunk_{i:03d}.mp3")
        cmd = [
            'ffmpeg', '-i', audio_path,
            '-ss', str(start), '-t', str(chunk_duration),
            '-acodec', 'copy', '-y', chunk_path
        ]
        try:
            subprocess.run(cmd, capture_output=True, check=True, timeout=FFMPEG_TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError("Audio chunk split timed out.") from exc
        chunks.append((chunk_path, start))
        start += chunk_duration
        i += 1
    return chunks


def _transcribe_file(client, config, file_path):
    """Transcribe a single audio file, handling provider differences"""
    with open(file_path, 'rb') as f:
        kwargs = {
            'model': config['whisper_model'],
            'file': f,
            'response_format': 'verbose_json',
        }
        # Add word timestamps if supported
        if config['supports_word_timestamps']:
            kwargs['timestamp_granularities'] = ["word", "segment"]

        response = None
        for attempt in range(AI_API_MAX_RETRIES + 1):
            try:
                response = client.audio.transcriptions.create(**kwargs)
                break
            except Exception as exc:
                if attempt >= AI_API_MAX_RETRIES:
                    raise
                delay = min(8, 2 ** attempt)
                logger.warning("Transcription retry attempt=%s file=%s error=%s", attempt + 1, os.path.basename(file_path), exc)
                time.sleep(delay)

    if response is None:
        raise RuntimeError("Transcription API returned no response.")

    words = []
    segments = []

    # Extract words
    if hasattr(response, 'words') and response.words:
        for word in response.words:
            words.append({
                'word': word.word,
                'start': word.start,
                'end': word.end
            })

    # Extract segments
    if hasattr(response, 'segments') and response.segments:
        for seg in response.segments:
            segments.append({
                'text': seg.text if hasattr(seg, 'text') else seg.get('text', ''),
                'start': seg.start if hasattr(seg, 'start') else seg.get('start', 0),
                'end': seg.end if hasattr(seg, 'end') else seg.get('end', 0)
            })

    # If no word-level timestamps, generate them from segments
    if not words and segments:
        for seg in segments:
            seg_words = seg['text'].strip().split()
            if not seg_words:
                continue
            duration = seg['end'] - seg['start']
            word_dur = duration / len(seg_words) if seg_words else 0
            for j, w in enumerate(seg_words):
                words.append({
                    'word': w,
                    'start': seg['start'] + j * word_dur,
                    'end': seg['start'] + (j + 1) * word_dur
                })

    return words, segments


def _run_transcribe(video_path, api_key, progress_callback=None, provider='groq'):
    """Helper to run the transcription steps"""
    client, config = get_client(api_key, provider)

    # Setup work directory
    work_dir = os.path.join(os.path.dirname(video_path), "work")
    os.makedirs(work_dir, exist_ok=True)
    audio_path = os.path.join(work_dir, "audio.mp3")

    # Step 1: Extract audio
    if progress_callback:
        progress_callback("Extracting audio from video...", 5)
    extract_audio(video_path, audio_path)

    file_size = os.path.getsize(audio_path)
    all_words = []
    all_segments = []

    if file_size > WHISPER_MAX_FILE_SIZE:
        # Large file — split into chunks
        if progress_callback:
            progress_callback("Audio is large, splitting into chunks...", 10)
        chunks = split_audio(audio_path, work_dir)
        total_chunks = len(chunks)

        for idx, (chunk_path, offset) in enumerate(chunks):
            if progress_callback:
                pct = 15 + int((idx / total_chunks) * 40)
                progress_callback(f"Transcribing chunk {idx+1}/{total_chunks}...", pct)

            words, segments = _transcribe_file(client, config, chunk_path)

            # Adjust timestamps with chunk offset
            for w in words:
                all_words.append({
                    'word': w['word'],
                    'start': w['start'] + offset,
                    'end': w['end'] + offset
                })
            for s in segments:
                all_segments.append({
                    'text': s['text'],
                    'start': s['start'] + offset,
                    'end': s['end'] + offset
                })
    else:
        # Small file — transcribe directly
        if progress_callback:
            progress_callback("Transcribing audio...", 15)

        words, segments = _transcribe_file(client, config, audio_path)
        all_words = words
        all_segments = segments

    if progress_callback:
        progress_callback("Transcription complete!", 55)

    # Get video duration
    try:
        duration = get_media_duration(video_path)
    except Exception:
        duration = all_segments[-1]['end'] if all_segments else 0

    full_text = " ".join([w['word'] for w in all_words])

    return {
        'words': all_words,
        'segments': all_segments,
        'full_text': full_text,
        'duration': duration
    }


def transcribe(video_path, api_key, progress_callback=None, provider='groq'):
    """
    Full transcription pipeline with OpenAI fallback on rate limits:
    1. Extract audio from video
    2. Split if needed (>24MB)
    3. Transcribe via Whisper API with word-level timestamps
    4. Merge results
    """
    try:
        return _run_transcribe(video_path, api_key, progress_callback, provider)
    except Exception as e:
        err_msg = str(e).lower()
        if provider == 'groq' and ("rate_limit" in err_msg or "429" in err_msg or "rate limit" in err_msg):
            from app.config import OPENAI_API_KEY
            if OPENAI_API_KEY:
                if progress_callback:
                    progress_callback("Groq Whisper rate limit hit. Falling back to OpenAI Whisper...", 12)
                print("[Transcriber] Groq rate limit hit. Falling back to OpenAI Whisper...")
                try:
                    return _run_transcribe(video_path, OPENAI_API_KEY, progress_callback, provider='openai')
                except Exception as openai_err:
                    raise RuntimeError(f"Transcription failed: Groq rate limit exceeded and OpenAI fallback also failed: {openai_err}")
            else:
                raise RuntimeError(
                    f"Groq Whisper rate limit exceeded. Please wait a few minutes, or set "
                    f"OPENAI_API_KEY in your .env file to enable automatic fallback. Details: {e}"
                )
        raise e
