import pytest
from fastapi import HTTPException

from app.api.main import enforce_upload_size_limit
from app.config import MAX_UPLOAD_SIZE


def test_enforce_upload_size_limit_rejects_oversized_content_length():
    with pytest.raises(HTTPException) as exc_info:
        enforce_upload_size_limit(MAX_UPLOAD_SIZE + 1)

    assert exc_info.value.status_code == 413


def test_enforce_upload_size_limit_allows_missing_content_length():
    enforce_upload_size_limit(None)


def test_enforce_upload_size_limit_rejects_oversized_streamed_bytes():
    with pytest.raises(HTTPException) as exc_info:
        enforce_upload_size_limit(None, bytes_received=MAX_UPLOAD_SIZE + 1)

    assert exc_info.value.status_code == 413
