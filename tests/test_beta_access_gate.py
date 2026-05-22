import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api import auth
from app.api.main import app
from app.models.models import User


def make_user(is_beta_user: bool) -> User:
    return User(id="user-1", email="user@example.com", is_beta_user=is_beta_user)


def test_beta_gate_allows_beta_user(monkeypatch):
    monkeypatch.setattr(auth, "DEV_MODE", False)
    user = make_user(True)

    assert auth.require_beta_access(user) is user


def test_beta_gate_blocks_non_beta_user(monkeypatch):
    monkeypatch.setattr(auth, "DEV_MODE", False)

    with pytest.raises(HTTPException) as exc:
        auth.require_beta_access(make_user(False))

    assert exc.value.status_code == 403
    assert "private beta" in exc.value.detail


def test_beta_gate_allows_dev_mode(monkeypatch):
    monkeypatch.setattr(auth, "DEV_MODE", True)
    user = make_user(False)

    assert auth.require_beta_access(user) is user


def test_jobs_endpoint_blocks_non_beta_user(monkeypatch):
    monkeypatch.setattr(auth, "DEV_MODE", False)

    async def override_current_user():
        return make_user(False)

    app.dependency_overrides[auth.get_current_user] = override_current_user
    try:
        response = TestClient(app).get("/api/jobs")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
    assert "private beta" in response.json()["detail"]
