"""Preflight checks for source media and local video tooling."""
import json
import shutil
import subprocess


class PreflightError(RuntimeError):
    """Raised when a source video cannot be processed safely."""


def require_video_tools():
    missing = [tool for tool in ("ffmpeg", "ffprobe") if not shutil.which(tool)]
    if missing:
        raise PreflightError(f"Missing required video tool(s): {', '.join(missing)}")


def probe_media(video_path):
    cmd = [
        "ffprobe", "-v", "quiet",
        "-show_entries", "stream=codec_type,width,height",
        "-show_entries", "format=duration",
        "-of", "json", video_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout or "{}")
    except Exception as exc:
        raise PreflightError(f"Unable to inspect source video: {exc}") from exc

    streams = data.get("streams", [])
    video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)
    duration = float(data.get("format", {}).get("duration") or 0)

    if not video_stream:
        raise PreflightError("Source file does not contain a video stream.")
    if not audio_stream:
        raise PreflightError("Source file does not contain an audio stream.")
    if duration <= 0:
        raise PreflightError("Source video duration is zero or unavailable.")

    return {
        "duration": duration,
        "width": int(video_stream.get("width") or 0),
        "height": int(video_stream.get("height") or 0),
        "has_audio": True,
        "has_video": True,
    }


def validate_rendered_video(output_path):
    info = probe_media(output_path)
    if info["duration"] <= 0:
        raise PreflightError("Rendered clip has zero duration.")
    return info


def preflight_source(video_path):
    require_video_tools()
    return probe_media(video_path)
