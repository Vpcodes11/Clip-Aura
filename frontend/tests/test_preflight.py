import json
import subprocess

import pytest

from app.core.preflight import PreflightError, probe_media


def test_probe_media_rejects_missing_audio(monkeypatch):
    payload = {
        "streams": [
            {"codec_type": "video", "width": 1920, "height": 1080}
        ],
        "format": {"duration": "12.5"},
    }

    def fake_run(*args, **kwargs):
        return subprocess.CompletedProcess(args[0], 0, stdout=json.dumps(payload), stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)

    with pytest.raises(PreflightError, match="audio stream"):
        probe_media("source.mp4")


def test_probe_media_rejects_zero_duration(monkeypatch):
    payload = {
        "streams": [
            {"codec_type": "video", "width": 1920, "height": 1080},
            {"codec_type": "audio"},
        ],
        "format": {"duration": "0"},
    }

    def fake_run(*args, **kwargs):
        return subprocess.CompletedProcess(args[0], 0, stdout=json.dumps(payload), stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)

    with pytest.raises(PreflightError, match="duration"):
        probe_media("source.mp4")
