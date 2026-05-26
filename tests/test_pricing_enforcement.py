import datetime
import sys
from unittest.mock import MagicMock

import pytest

sys.modules.setdefault("mediapipe", MagicMock())
sys.modules.setdefault("cv2", MagicMock())

from app.core.plans import export_dimensions_for_plan, is_trial_expired, spend_usage_minutes
from app.models.models import User
from app.rendering import clipper


def make_user(**overrides):
    values = {
        "id": "user-1",
        "email": "user@example.com",
        "subscription_tier": "trial",
        "total_minutes_limit": 60,
        "used_minutes": 0,
        "rollover_credits": 0,
        "created_at": datetime.datetime.utcnow(),
    }
    values.update(overrides)
    return User(**values)


def test_trial_expires_after_fourteen_days():
    user = make_user(created_at=datetime.datetime.utcnow() - datetime.timedelta(days=15))

    assert is_trial_expired(user) is True


def test_paid_plan_does_not_expire_like_trial():
    user = make_user(
        subscription_tier="pro",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=60),
    )

    assert is_trial_expired(user) is False


def test_spend_usage_consumes_plan_minutes_before_rollover_credits():
    user = make_user(subscription_tier="pro", total_minutes_limit=240, used_minutes=230, rollover_credits=20)

    plan_spent, credit_spent = spend_usage_minutes(user, 15)

    assert (plan_spent, credit_spent) == (10, 5)
    assert user.used_minutes == 240
    assert user.rollover_credits == 15


def test_spend_usage_allows_rollover_when_plan_minutes_are_exhausted():
    user = make_user(subscription_tier="studio", total_minutes_limit=600, used_minutes=600, rollover_credits=60)

    plan_spent, credit_spent = spend_usage_minutes(user, 12)

    assert (plan_spent, credit_spent) == (0, 12)
    assert user.used_minutes == 600
    assert user.rollover_credits == 48


def test_spend_usage_rejects_when_plan_and_rollover_are_insufficient():
    user = make_user(subscription_tier="pro", total_minutes_limit=240, used_minutes=240, rollover_credits=2)

    with pytest.raises(ValueError, match="Insufficient"):
        spend_usage_minutes(user, 3)


def test_trial_exports_are_watermarked_and_paid_exports_are_not():
    assert clipper.should_watermark("trial") is True
    assert clipper.should_watermark("pro") is False
    assert clipper.should_watermark("studio") is False
    assert clipper.should_watermark("agency") is False


def test_export_dimensions_cap_trial_and_pro_at_1080p_long_edge():
    assert export_dimensions_for_plan(3840, 2160, "trial") == (1920, 1080)
    assert export_dimensions_for_plan(2160, 3840, "pro") == (1080, 1920)


def test_export_dimensions_allow_4k_for_studio_and_agency():
    assert export_dimensions_for_plan(3840, 2160, "studio") == (3840, 2160)
    assert export_dimensions_for_plan(2160, 3840, "agency") == (2160, 3840)


def test_4k_presets_are_capped_for_pro_but_available_to_studio():
    assert clipper.get_render_dimensions("landscape_4k", "pro") == (1920, 1080)
    assert clipper.get_render_dimensions("landscape_4k", "studio") == (3840, 2160)
