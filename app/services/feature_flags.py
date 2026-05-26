from __future__ import annotations

from functools import lru_cache

from app.models.models import User
from app.security.rbac import (
    PLAN_ENTERPRISE,
    PLAN_INTERNAL,
    PLAN_PRO,
    ROLE_ADMIN,
    ROLE_BETA,
    ROLE_STAFF,
    ROLE_SUPER_ADMIN,
    has_role,
    normalize_subscription_plan,
)

FEATURE_FLAGS = {
    "unlimited_generation": {
        "roles": {ROLE_STAFF, ROLE_ADMIN, ROLE_SUPER_ADMIN},
        "plans": {PLAN_INTERNAL},
    },
    "experimental_rendering": {
        "roles": {ROLE_STAFF, ROLE_ADMIN, ROLE_SUPER_ADMIN},
        "plans": {PLAN_ENTERPRISE, PLAN_INTERNAL},
    },
    "internal_dashboard": {
        "roles": {ROLE_STAFF, ROLE_ADMIN, ROLE_SUPER_ADMIN},
        "plans": {PLAN_INTERNAL},
    },
    "beta_ai_model": {
        "roles": {ROLE_BETA, ROLE_STAFF, ROLE_ADMIN, ROLE_SUPER_ADMIN},
        "plans": {PLAN_PRO, PLAN_ENTERPRISE, PLAN_INTERNAL},
    },
    "admin_tools": {
        "roles": {ROLE_ADMIN, ROLE_SUPER_ADMIN},
        "plans": set(),
    },
}


@lru_cache(maxsize=128)
def _flag_config(feature_name: str) -> dict:
    return FEATURE_FLAGS.get(feature_name, {"roles": set(), "plans": set()})


def is_feature_enabled(user: User, feature_name: str) -> bool:
    overrides = getattr(user, "feature_flags", None) or {}
    if isinstance(overrides, dict) and feature_name in overrides:
        return bool(overrides[feature_name])

    config = _flag_config(feature_name)
    if normalize_subscription_plan(getattr(user, "subscription_plan", None)) in config["plans"]:
        return True
    return any(has_role(user, role) for role in config["roles"])
