import sys
from unittest.mock import MagicMock

sys.modules.setdefault("mediapipe", MagicMock())
sys.modules.setdefault("cv2", MagicMock())

from app.core import clipper


def test_safe_create_clip_falls_back_and_succeeds(tmp_path, monkeypatch):
    output_path = tmp_path / "clip_1.mp4"
    attempts = []

    def fake_create_clip(*args, **kwargs):
        attempts.append(kwargs)
        if len(attempts) < 3:
            raise RuntimeError("render failed")
        output_path.write_bytes(b"fake video")
        return str(output_path)

    monkeypatch.setattr(clipper, "create_clip", fake_create_clip)
    monkeypatch.setattr(clipper, "validate_rendered_video", lambda path: {"duration": 1.0})

    result = clipper.safe_create_clip(
        "source.mp4",
        {"start_time": 0, "end_time": 10, "title": "Test"},
        [],
        str(output_path),
        0,
    )

    assert result["ok"] is True
    assert result["attempt"] == "static_crop"
    assert len(attempts) == 3


def test_safe_create_clip_records_error_log_when_all_attempts_fail(tmp_path, monkeypatch):
    output_path = tmp_path / "clip_1.mp4"

    def fake_create_clip(*args, **kwargs):
        raise RuntimeError(f"failed {kwargs['render_mode']}")

    monkeypatch.setattr(clipper, "create_clip", fake_create_clip)

    result = clipper.safe_create_clip(
        "source.mp4",
        {"start_time": 0, "end_time": 10, "title": "Test"},
        [],
        str(output_path),
        0,
    )

    log_path = tmp_path / "logs" / "clip_1_render_errors.log"
    assert result["ok"] is False
    assert log_path.exists()
    assert "letterbox" in log_path.read_text(encoding="utf-8")
