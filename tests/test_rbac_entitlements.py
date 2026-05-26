import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api import auth
from app.api.database import SessionLocal
from app.api.main import app
from app.models.models import AuditLog, UsageRecord, User
from app.security.rbac import (
    can_access_admin_panel,
    can_bypass_credits,
    can_modify_role,
    has_permission,
    has_role,
)
from app.services.credits import check_credit_access, record_usage
from app.services.feature_flags import is_feature_enabled


def make_user(**overrides):
    values = {
        "id": "user-rbac",
        "email": "user@example.com",
        "role": "user",
        "subscription_plan": "free",
        "subscription_tier": "trial",
        "is_beta_user": True,
        "total_minutes_limit": 60,
        "used_minutes": 0,
        "rollover_credits": 0,
        "credits_remaining": 60,
        "monthly_credit_limit": 60,
        "feature_flags": {},
    }
    values.update(overrides)
    return User(**values)


def test_role_hierarchy_and_permissions():
    staff = make_user(role="staff")
    admin = make_user(role="admin")

    assert has_role(staff, "beta") is True
    assert has_permission(staff, "bypass_credits") is True
    assert can_access_admin_panel(staff) is False
    assert can_access_admin_panel(admin) is True


def test_staff_and_internal_plan_can_bypass_credits():
    staff = make_user(role="staff", used_minutes=60)
    internal = make_user(subscription_plan="internal", used_minutes=60)
    normal = make_user(used_minutes=60)

    assert can_bypass_credits(staff) is True
    assert check_credit_access(internal) is True
    assert check_credit_access(normal) is False


def test_internal_usage_bypass_still_logs_usage_and_audit_event():
    db = SessionLocal()
    user = make_user(id="internal-usage", role="staff", subscription_plan="internal", used_minutes=60)
    try:
        db.query(UsageRecord).filter(UsageRecord.user_id == user.id).delete()
        db.query(AuditLog).filter(AuditLog.actor_user_id == user.id).delete()
        db.merge(user)
        db.commit()

        managed_user = db.query(User).filter(User.id == user.id).one()
        record_usage(db, managed_user, 12, job_id="job-internal", reason="test")
        db.commit()

        usage = db.query(UsageRecord).filter(UsageRecord.user_id == user.id).one()
        audit = db.query(AuditLog).filter(AuditLog.actor_user_id == user.id, AuditLog.action == "billing.bypass_usage").one()
        assert usage.minutes == 12
        assert usage.enforcement_skipped is True
        assert managed_user.used_minutes == 60
        assert audit.metadata_json["minutes"] == 12
    finally:
        db.query(UsageRecord).filter(UsageRecord.user_id == user.id).delete()
        db.query(AuditLog).filter(AuditLog.actor_user_id == user.id).delete()
        db.query(User).filter(User.id == user.id).delete()
        db.commit()
        db.close()


def test_admin_cannot_create_super_admin_or_self_promote():
    admin = make_user(id="admin", role="admin")
    normal = make_user(id="normal", role="user")

    assert can_modify_role(admin, normal, "super_admin") is False
    assert can_modify_role(admin, admin, "super_admin") is False


def test_feature_flags_are_backend_evaluated():
    beta = make_user(role="beta", subscription_plan="free")
    explicit = make_user(role="user", feature_flags={"experimental_rendering": True})
    normal = make_user(role="user", feature_flags={"admin_tools": True})

    assert is_feature_enabled(beta, "beta_ai_model") is True
    assert is_feature_enabled(explicit, "experimental_rendering") is True
    assert is_feature_enabled(normal, "admin_tools") is True
    assert is_feature_enabled(make_user(role="user"), "internal_dashboard") is False


def test_normal_user_cannot_access_admin_api_even_with_spoofed_role_header():
    async def override_current_user():
        return make_user(role="user")

    app.dependency_overrides[auth.get_current_user] = override_current_user
    try:
        response = TestClient(app).patch(
            "/api/admin/users/target/role",
            json={"role": "admin"},
            headers={"X-Role": "super_admin"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403


def test_deleted_cookies_or_missing_bearer_token_fail_auth():
    response = TestClient(app).get("/api/jobs")

    assert response.status_code in {401, 403}
