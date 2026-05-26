from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.plans import has_rollover_credits, spend_usage_minutes
from app.models.models import UsageRecord, User
from app.security.rbac import can_bypass_credits, record_audit_event


def check_credit_access(user: User, requested_minutes: int = 0) -> bool:
    if can_bypass_credits(user):
        return True
    if requested_minutes and available_minutes(user) < requested_minutes:
        return False
    return int(user.used_minutes or 0) < int(user.total_minutes_limit or 0) or has_rollover_credits(user)


def available_minutes(user: User) -> int:
    included = max(0, int(user.total_minutes_limit or 0) - int(user.used_minutes or 0))
    return included + int(user.rollover_credits or 0)


def record_usage(
    db: Session,
    user: User,
    minutes: int,
    job_id: str | None = None,
    reason: str | None = None,
) -> tuple[int, int]:
    minutes = max(0, int(minutes or 0))
    skipped = can_bypass_credits(user)
    plan_spent = 0
    credit_spent = 0

    if skipped:
        record_audit_event(
            db,
            "billing.bypass_usage",
            actor_user_id=user.id,
            target_user_id=user.id,
            metadata={"job_id": job_id, "minutes": minutes, "reason": reason or "internal_entitlement"},
        )
    else:
        plan_spent, credit_spent = spend_usage_minutes(user, minutes)

    db.add(UsageRecord(
        id=str(uuid.uuid4()),
        user_id=user.id,
        job_id=job_id,
        minutes=minutes,
        plan_spent=plan_spent,
        credit_spent=credit_spent,
        enforcement_skipped=skipped,
        reason=reason,
    ))
    return plan_spent, credit_spent


def require_credit_access(user: User) -> None:
    if not check_credit_access(user):
        raise HTTPException(status_code=403, detail="You have exhausted your minutes. Upgrade to continue.")
