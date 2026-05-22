import subprocess
from unittest.mock import MagicMock

import pytest

from app.core import broll, preflight
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


def test_render_timeout_raises_runtime_error(monkeypatch, tmp_path):
    monkeypatch.setattr(clipper.tracker, "get_dynamic_crop_coordinates", lambda *args, **kwargs: None)
    monkeypatch.setattr(clipper, "generate_ass_subtitles", lambda *args, **kwargs: str(tmp_path / "subs.ass"))
    monkeypatch.setattr(clipper, "get_video_info", lambda path: (1920, 1080, 30.0))

    def fake_run(cmd, **kwargs):
        assert kwargs["timeout"] == 300
        raise subprocess.TimeoutExpired(cmd, kwargs["timeout"])

    monkeypatch.setattr(subprocess, "run", fake_run)

    with pytest.raises(RuntimeError, match="timed out"):
        clipper.create_clip(
            "source.mp4",
            {"start_time": 0, "end_time": 10, "title": "Test"},
            [],
            str(tmp_path / "clip.mp4"),
            0,
        )


def test_static_fallback_timeout_returns_failure(monkeypatch, tmp_path):
    monkeypatch.setattr(clipper, "create_clip", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("dynamic failed")))
    monkeypatch.setattr(clipper, "get_video_info", lambda path: (1920, 1080, 30.0))

    def fake_run(cmd, **kwargs):
        assert kwargs["timeout"] == 300
        raise subprocess.TimeoutExpired(cmd, kwargs["timeout"])

    monkeypatch.setattr(subprocess, "run", fake_run)

    result = clipper.safe_create_clip(
        "source.mp4",
        {"start_time": 0, "end_time": 10, "title": "Test"},
        [],
        str(tmp_path / "clip.mp4"),
        0,
    )

    assert result["ok"] is False
    assert "timed out" in result["error"].lower()


def test_preflight_probe_uses_ffprobe_timeout(monkeypatch):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(kwargs)
        raise subprocess.TimeoutExpired(cmd, kwargs["timeout"])

    monkeypatch.setattr(subprocess, "run", fake_run)

    with pytest.raises(preflight.PreflightError, match="Unable to inspect source video"):
        preflight.probe_media("source.mp4")
    assert calls[0]["timeout"] == 30


def test_audio_split_timeout_raises_runtime_error(monkeypatch, tmp_path):
    monkeypatch.setattr(transcriber, "get_media_duration", lambda path: 10)

    def fake_run(cmd, **kwargs):
        assert kwargs["timeout"] == 300
        raise subprocess.TimeoutExpired(cmd, kwargs["timeout"])

    monkeypatch.setattr(subprocess, "run", fake_run)

    with pytest.raises(RuntimeError, match="Audio chunk split timed out"):
        transcriber.split_audio("audio.mp3", str(tmp_path), chunk_duration=5)


def test_broll_overlay_timeout_returns_false(monkeypatch, tmp_path):
    def fake_run(cmd, **kwargs):
        assert kwargs["timeout"] == 300
        raise subprocess.TimeoutExpired(cmd, kwargs["timeout"])

    monkeypatch.setattr(subprocess, "run", fake_run)

    result = broll.overlay_broll_on_clip(
        "clip.mp4",
        [{"broll_path": "broll.mp4", "timestamp": 5.0, "duration": 4.0}],
        str(tmp_path / "out.mp4"),
        0.0,
    )

    assert result is False
