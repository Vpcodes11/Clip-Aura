import sys
from unittest.mock import MagicMock, patch

sys.modules.setdefault("mediapipe", MagicMock())
sys.modules.setdefault("cv2", MagicMock())

from app.rendering import clipper


def test_safe_create_clip_succeeds_with_dynamic(tmp_path, monkeypatch):
    output_path = tmp_path / "clip_1.mp4"

    def fake_create_clip(*args, **kwargs):
        output_path.write_bytes(b"fake video")
        return str(output_path)

    monkeypatch.setattr(clipper, "create_clip", fake_create_clip)

    result = clipper.safe_create_clip(
        "source.mp4",
        {"start_time": 0, "end_time": 10, "title": "Test"},
        [],
        str(output_path),
        0,
    )

    assert result["ok"] is True
    assert result["attempt"] == "dynamic"


def test_safe_create_clip_falls_back_to_static_on_dynamic_failure(tmp_path, monkeypatch):
    output_path = tmp_path / "clip_1.mp4"
    call_count = [0]

    def fake_create_clip(*args, **kwargs):
        call_count[0] += 1
        raise RuntimeError("dynamic render failed")

    monkeypatch.setattr(clipper, "create_clip", fake_create_clip)
    monkeypatch.setattr(clipper, "get_video_info", lambda path: (1920, 1080, 30.0))

    with patch("subprocess.run") as mock_run:
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_run.return_value = mock_result

        result = clipper.safe_create_clip(
            "source.mp4",
            {"start_time": 0, "end_time": 10, "title": "Test"},
            [],
            str(output_path),
            0,
        )

        assert result["ok"] is True
        assert result["attempt"] == "static_fallback"
        assert call_count[0] == 1


def test_safe_create_clip_fails_when_both_dynamic_and_static_fail(tmp_path, monkeypatch):
    output_path = tmp_path / "clip_1.mp4"

    def fake_create_clip(*args, **kwargs):
        raise RuntimeError("dynamic render failed")

    monkeypatch.setattr(clipper, "create_clip", fake_create_clip)
    monkeypatch.setattr(clipper, "get_video_info", lambda path: (1920, 1080, 30.0))

    with patch("subprocess.run") as mock_run:
        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stderr = "ffmpeg error output"
        mock_run.return_value = mock_result

        result = clipper.safe_create_clip(
            "source.mp4",
            {"start_time": 0, "end_time": 10, "title": "Test"},
            [],
            str(output_path),
            0,
        )

        assert result["ok"] is False
