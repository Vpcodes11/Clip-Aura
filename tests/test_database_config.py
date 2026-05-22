from pathlib import Path

import pytest

from app.api.database import build_database_url, build_engine_options


def test_build_database_url_rejects_sqlite_fallback_in_production(tmp_path: Path):
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        build_database_url(None, "production", tmp_path)


def test_build_database_url_allows_sqlite_fallback_outside_production(tmp_path: Path):
    database_url = build_database_url(None, "development", tmp_path)

    assert database_url.replace("\\", "/") == f"sqlite:///{tmp_path / 'clip_aura.db'}".replace("\\", "/")


def test_build_engine_options_adds_pooling_for_postgres():
    options = build_engine_options("postgresql://user:pass@example.com:5432/db")

    assert options["pool_size"] == 10
    assert options["max_overflow"] == 20
    assert options["pool_recycle"] == 3600
