import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.database import get_db
from app.models.models import User
from app.security.rbac import (
    ROLE_SUPER_ADMIN,
    VALID_ROLES,
    VALID_SUBSCRIPTION_PLANS,
    can_modify_role,
    record_audit_event,
    require_permission,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


class RoleUpdateRequest(BaseModel):
    role: str


class PlanUpdateRequest(BaseModel):
    subscription_plan: str


class FeatureFlagUpdateRequest(BaseModel):
    feature_flags: dict[str, bool]


@router.patch("/users/{target_user_id}/role")
async def update_user_role(
    target_user_id: str,
    req: RoleUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("manage_users")),
):
    new_role = req.role.lower()
    if new_role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role.")

    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    if not can_modify_role(actor, target, new_role):
        record_audit_event(
            db,
            "role_change.denied",
            actor_user_id=actor.id,
            target_user_id=target.id,
            metadata={"old_role": target.role, "new_role": new_role},
            request=request,
        )
        db.commit()
        raise HTTPException(status_code=403, detail="You cannot assign that role.")

    old_role = target.role
    target.role = new_role
    target.is_beta_user = target.is_beta_user or new_role != "user"
    target.last_role_change_at = datetime.datetime.utcnow()
    target.role_changed_by = actor.id
    record_audit_event(
        db,
        "role_change.updated",
        actor_user_id=actor.id,
        target_user_id=target.id,
        metadata={"old_role": old_role, "new_role": new_role},
        request=request,
    )
    db.commit()
    return {"status": "ok", "user_id": target.id, "role": target.role}


@router.patch("/users/{target_user_id}/plan")
async def update_user_plan(
    target_user_id: str,
    req: PlanUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("manage_users")),
):
    plan = req.subscription_plan.lower()
    if plan not in VALID_SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid subscription plan.")

    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.role == ROLE_SUPER_ADMIN and actor.role != ROLE_SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super_admin can modify a super_admin account.")

    old_plan = target.subscription_plan
    target.subscription_plan = plan
    target.is_internal_account = plan == "internal"
    record_audit_event(
        db,
        "plan_change.updated",
        actor_user_id=actor.id,
        target_user_id=target.id,
        metadata={"old_plan": old_plan, "new_plan": plan},
        request=request,
    )
    db.commit()
    return {"status": "ok", "user_id": target.id, "subscription_plan": target.subscription_plan}


@router.patch("/users/{target_user_id}/feature-flags")
async def update_user_feature_flags(
    target_user_id: str,
    req: FeatureFlagUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("manage_feature_flags")),
):
    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.role == ROLE_SUPER_ADMIN and actor.role != ROLE_SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super_admin can modify a super_admin account.")

    old_flags = target.feature_flags or {}
    target.feature_flags = {**old_flags, **req.feature_flags}
    record_audit_event(
        db,
        "feature_flags.updated",
        actor_user_id=actor.id,
        target_user_id=target.id,
        metadata={"old_flags": old_flags, "new_flags": target.feature_flags},
        request=request,
    )
    db.commit()
    return {"status": "ok", "user_id": target.id, "feature_flags": target.feature_flags}
