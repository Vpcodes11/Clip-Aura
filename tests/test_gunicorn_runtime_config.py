from pathlib import Path


def test_dockerfile_uses_gunicorn_uvicorn_workers():
    dockerfile = Path("Dockerfile").read_text(encoding="utf-8")

    assert '"gunicorn"' in dockerfile
    assert '"uvicorn.workers.UvicornWorker"' in dockerfile
    assert '"-w", "4"' in dockerfile
    assert '"-b", "0.0.0.0:8000"' in dockerfile
    assert '"--timeout", "120"' in dockerfile
    assert '"--graceful-timeout", "30"' in dockerfile
    assert "app.api.main:app" in dockerfile


def test_compose_forces_production_dev_mode_off():
    compose = Path("docker-compose.yml").read_text(encoding="utf-8")

    assert "ENVIRONMENT=${ENVIRONMENT:-production}" in compose
    assert compose.count("DEV_MODE=false") >= 2
