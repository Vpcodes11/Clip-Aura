import importlib

import pytest


def test_production_rejects_dev_mode(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DEV_MODE", "true")

    with pytest.raises(RuntimeError, match="DEV_MODE"):
        import app.config as config
        importlib.reload(config)

    monkeypatch.setenv("DEV_MODE", "false")
    import app.config as config
    importlib.reload(config)
