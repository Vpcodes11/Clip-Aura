"""Small schema compatibility helpers for local SQLite deployments."""
from sqlalchemy import inspect, text


JOB_COLUMNS = {
    "clip_candidates": "JSON",
    "errors": "JSON",
    "stage": "VARCHAR",
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
