import datetime

from app.config import DEFAULT_TIER, SUBSCRIPTION_TIERS, TRIAL_DAYS

TRIAL = "trial"
PRO = "pro"
STUDIO = "studio"
AGENCY = "agency"

PAID_TIERS = {PRO, STUDIO, AGENCY}

PLAN_LIMITS = {tier: int(config["minutes"]) for tier, config in SUBSCRIPTION_TIERS.items()}
PLAN_LABELS = {tier: str(config["label"]) for tier, config in SUBSCRIPTION_TIERS.items()}

DEFAULT_PLAN = DEFAULT_TIER
DEFAULT_MINUTES_LIMIT = PLAN_LIMITS[DEFAULT_PLAN]


def minutes_for_plan(plan: str | None) -> int:
    return PLAN_LIMITS.get((plan or DEFAULT_PLAN).lower(), DEFAULT_MINUTES_LIMIT)


def is_paid_plan(plan: str | None) -> bool:
    return (plan or "").lower() in PAID_TIERS


def is_trial_plan(plan: str | None) -> bool:
    return (plan or DEFAULT_PLAN).lower() == TRIAL


def trial_expires_at(created_at: datetime.datetime | None) -> datetime.datetime | None:
    if not created_at:
        return None
    return created_at + datetime.timedelta(days=TRIAL_DAYS)


def is_trial_expired(user, now: datetime.datetime | None = None) -> bool:
    if not is_trial_plan(getattr(user, "subscription_tier", None)):
        return False
    expires_at = trial_expires_at(getattr(user, "created_at", None))
    if not expires_at:
        return False
    return (now or datetime.datetime.utcnow()) >= expires_at


def has_rollover_credits(user) -> bool:
    return int(getattr(user, "rollover_credits", 0) or 0) > 0


def spend_usage_minutes(user, minutes: int) -> tuple[int, int]:
    """Spend included plan minutes first, then rollover credits. Returns (plan_spent, credit_spent)."""
    minutes = max(0, int(minutes or 0))
    included_remaining = max(0, int(user.total_minutes_limit or 0) - int(user.used_minutes or 0))
    plan_spent = min(minutes, included_remaining)
    credit_spent = minutes - plan_spent

    available_credits = int(getattr(user, "rollover_credits", 0) or 0)
    if credit_spent > available_credits:
        raise ValueError("Insufficient monthly minutes and rollover credits.")

    user.used_minutes = int(user.used_minutes or 0) + plan_spent
    user.rollover_credits = available_credits - credit_spent
    return plan_spent, credit_spent


def spend_usage_minutes_atomic(db, user_id: str, minutes: int) -> tuple[int, int]:
    """
    Spend included minutes first, then rollover credits under a row lock.

    PostgreSQL enforces the row lock via SELECT ... FOR UPDATE. SQLite ignores it,
    but local dev remains functionally correct and production avoids double-spend.
    """
    minutes = max(0, int(minutes or 0))
    if minutes == 0:
        return (0, 0)

    from app.models.models import User

    user = db.query(User).filter(User.id == user_id).with_for_update().one_or_none()
    if not user:
        raise ValueError("User not found.")

    return spend_usage_minutes(user, minutes)


def max_export_long_edge_for_plan(plan: str | None) -> int:
    return 3840 if (plan or "").lower() in {STUDIO, AGENCY} else 1920


def export_dimensions_for_plan(width: int, height: int, plan: str | None) -> tuple[int, int]:
    max_long_edge = max_export_long_edge_for_plan(plan)
    long_edge = max(width, height)
    if long_edge <= max_long_edge:
        return width, height
    ratio = max_long_edge / long_edge
    capped_width = max(2, int(width * ratio))
    capped_height = max(2, int(height * ratio))
    if capped_width % 2:
        capped_width -= 1
    if capped_height % 2:
        capped_height -= 1
    return capped_width, capped_height
