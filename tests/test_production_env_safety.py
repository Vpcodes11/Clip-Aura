import importlib

import pytest


def test_production_rejects_dev_mode(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DEV_MODE", "true")

    import app.config as config

    with pytest.raises(RuntimeError, match="DEV_MODE"):
        importlib.reload(config)

    monkeypatch.setenv("DEV_MODE", "false")
    importlib.reload(config)
