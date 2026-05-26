"""Small schema compatibility helpers for local SQLite deployments."""
from sqlalchemy import inspect, text


JOB_COLUMNS = {
    "clip_candidates": "JSON",
    "errors": "JSON",
    "stage": "VARCHAR",
    "usage_minutes_charged": "INTEGER DEFAULT 0",
}

USER_COLUMNS = {
    "is_beta_user": "BOOLEAN DEFAULT 0 NOT NULL",
    "rollover_credits": "INTEGER DEFAULT 0",
    "razorpay_customer_id": "VARCHAR",
    "razorpay_subscription_id": "VARCHAR",
    "subscription_status": "VARCHAR DEFAULT 'trialing'",
    "last_usage_reset_at": "DATETIME",
    "role": "VARCHAR DEFAULT 'user' NOT NULL",
    "subscription_plan": "VARCHAR DEFAULT 'free' NOT NULL",
    "credits_remaining": "INTEGER DEFAULT 0 NOT NULL",
    "monthly_credit_limit": "INTEGER DEFAULT 0 NOT NULL",
    "feature_flags": "JSON",
    "is_internal_account": "BOOLEAN DEFAULT 0 NOT NULL",
    "created_by_admin": "VARCHAR",
    "last_role_change_at": "DATETIME",
    "role_changed_by": "VARCHAR",
}


def ensure_job_columns(engine):
    """Add newly introduced Job columns when SQLite create_all cannot alter tables."""
    if not str(engine.url).startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "jobs" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("jobs")}
    missing = [(name, kind) for name, kind in JOB_COLUMNS.items() if name not in existing]
    if not missing:
        return

    with engine.begin() as conn:
        for name, kind in missing:
            conn.execute(text(f"ALTER TABLE jobs ADD COLUMN {name} {kind}"))


def ensure_user_columns(engine):
    """Add newly introduced User columns when SQLite create_all cannot alter tables."""
    if not str(engine.url).startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("users")}
    missing = [(name, kind) for name, kind in USER_COLUMNS.items() if name not in existing]
    if not missing:
        return

    with engine.begin() as conn:
        for name, kind in missing:
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {kind}"))
