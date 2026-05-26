from __future__ import annotations

import datetime
import uuid
from typing import Callable, Iterable

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.database import get_db
from app.api.auth import get_current_user
from app.models.models import AuditLog, User

ROLE_USER = "user"
ROLE_BETA = "beta"
ROLE_STAFF = "staff"
ROLE_ADMIN = "admin"
ROLE_SUPER_ADMIN = "super_admin"

PLAN_FREE = "free"
PLAN_PRO = "pro"
PLAN_ENTERPRISE = "enterprise"
PLAN_INTERNAL = "internal"

ROLE_ORDER = {
    ROLE_USER: 0,
    ROLE_BETA: 1,
    ROLE_STAFF: 2,
    ROLE_ADMIN: 3,
    ROLE_SUPER_ADMIN: 4,
}

VALID_ROLES = set(ROLE_ORDER)
VALID_SUBSCRIPTION_PLANS = {PLAN_FREE, PLAN_PRO, PLAN_ENTERPRISE, PLAN_INTERNAL}

PERMISSIONS_BY_ROLE = {
    ROLE_USER: set(),
    ROLE_BETA: {"retry_failed_jobs"},
    ROLE_STAFF: {
        "bypass_credits",
        "access_internal_metrics",
        "retry_failed_jobs",
        "view_system_logs",
    },
    ROLE_ADMIN: {
        "manage_users",
        "bypass_credits",
        "access_admin_dashboard",
        "access_internal_metrics",
        "manage_feature_flags",
        "retry_failed_jobs",
        "view_system_logs",
    },
    ROLE_SUPER_ADMIN: {
        "manage_users",
        "bypass_credits",
        "access_admin_dashboard",
        "access_internal_metrics",
        "manage_feature_flags",
        "retry_failed_jobs",
        "view_system_logs",
    },
}

INTERNAL_ROLES = {ROLE_STAFF, ROLE_ADMIN, ROLE_SUPER_ADMIN}


def normalize_role(role: str | None) -> str:
    value = (role or ROLE_USER).lower()
    return value if value in VALID_ROLES else ROLE_USER


def normalize_subscription_plan(plan: str | None) -> str:
    value = (plan or PLAN_FREE).lower()
    return value if value in VALID_SUBSCRIPTION_PLANS else PLAN_FREE


def has_role(user: User, role: str) -> bool:
    required = ROLE_ORDER.get(normalize_role(role), 0)
    actual = ROLE_ORDER.get(normalize_role(getattr(user, "role", None)), 0)
    return actual >= required


def has_permission(user: User, permission: str) -> bool:
    role = normalize_role(getattr(user, "role", None))
    return permission in PERMISSIONS_BY_ROLE.get(role, set())


def can_bypass_credits(user: User) -> bool:
    return (
        normalize_subscription_plan(getattr(user, "subscription_plan", None)) == PLAN_INTERNAL
        or bool(getattr(user, "is_internal_account", False))
        or has_permission(user, "bypass_credits")
    )


def can_access_admin_panel(user: User) -> bool:
    return has_permission(user, "access_admin_dashboard")


def require_role(*roles: str) -> Callable[[User], User]:
    minimum = max((normalize_role(role) for role in roles), key=lambda item: ROLE_ORDER[item])

    def dependency(user: User = Depends(get_current_user)) -> User:
        if has_role(user, minimum):
            return user
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role.")

    return dependency


def require_permission(permission: str) -> Callable[[User], User]:
    def dependency(user: User = Depends(get_current_user)) -> User:
        if has_permission(user, permission):
            return user
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission.")

    return dependency


def require_internal_access(user: User = Depends(get_current_user)) -> User:
    if normalize_subscription_plan(getattr(user, "subscription_plan", None)) == PLAN_INTERNAL or has_role(user, ROLE_STAFF):
        return user
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Internal access required.")


def can_modify_role(actor: User, target: User, new_role: str) -> bool:
    actor_role = normalize_role(getattr(actor, "role", None))
    target_role = normalize_role(getattr(target, "role", None))
    new_role = normalize_role(new_role)

    if actor.id == target.id and ROLE_ORDER[new_role] > ROLE_ORDER[actor_role]:
        return False
    if new_role == ROLE_SUPER_ADMIN and actor_role != ROLE_SUPER_ADMIN:
        return False
    if actor_role == ROLE_STAFF:
        return False
    if actor_role == ROLE_ADMIN and ROLE_ORDER[target_role] >= ROLE_ORDER[ROLE_ADMIN]:
        return False
    return ROLE_ORDER[actor_role] > ROLE_ORDER[target_role] or actor_role == ROLE_SUPER_ADMIN


def record_audit_event(
    db: Session,
    action: str,
    actor_user_id: str | None = None,
    target_user_id: str | None = None,
    metadata: dict | None = None,
    request: Request | None = None,
) -> AuditLog:
    ip_address = None
    user_agent = None
    if request is not None:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    event = AuditLog(
        id=str(uuid.uuid4()),
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        action=action,
        metadata_json=metadata or {},
        ip_address=ip_address,
        user_agent=user_agent,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(event)
    return event


def audit_authorization_failure(
    db: Session,
    user: User | None,
    action: str,
    request: Request | None = None,
    metadata: dict | None = None,
) -> None:
    event_metadata = {"attempted_action": action}
    if metadata:
        event_metadata.update(metadata)
    record_audit_event(
        db,
        "authorization.failed",
        actor_user_id=getattr(user, "id", None),
        metadata=event_metadata,
        request=request,
    )
    db.commit()
