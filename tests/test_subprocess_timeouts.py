import subprocess
from unittest.mock import MagicMock

from app.rendering import clipper
from app.subtitles import transcriber


def test_thumbnail_generation_uses_short_ffmpeg_timeout(monkeypatch, tmp_path):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(kwargs)
        result = MagicMock()
        result.returncode = 0
        return result

    monkeypatch.setattr(subprocess, "run", fake_run)

    assert clipper.generate_thumbnail("source.mp4", 0, str(tmp_path / "thumb.jpg"))
    assert calls[0]["timeout"] == 30


def test_audio_extraction_uses_ffmpeg_timeout(monkeypatch):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(kwargs)
        result = MagicMock()
        result.returncode = 0
        return result

    monkeypatch.setattr(subprocess, "run", fake_run)

    transcriber.extract_audio("source.mp4", "audio.mp3")
    assert calls[0]["timeout"] == 300
