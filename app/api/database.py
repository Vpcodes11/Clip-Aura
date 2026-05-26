from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

import os
from app.config import BASE_DIR, is_production_environment


def build_database_url(database_url: str | None, environment: str, db_dir):
    if database_url:
        return database_url

    if environment.lower() in {"production", "prod"} or is_production_environment():
        raise RuntimeError("DATABASE_URL must be set in production; SQLite fallback is not allowed.")

    db_dir.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{db_dir}/clip_aura.db"


def build_engine_options(database_url: str):
    if database_url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False, "timeout": 30}}

    if database_url.startswith("postgresql"):
        return {"pool_size": 10, "max_overflow": 20, "pool_recycle": 3600}

    return {}


# Priority: Environment variable (Postgres) > Local SQLite outside production
DATABASE_URL = build_database_url(
    os.getenv("DATABASE_URL"),
    os.getenv("ENVIRONMENT", "development"),
    BASE_DIR / "runtime" / "db",
)

engine = create_engine(DATABASE_URL, **build_engine_options(DATABASE_URL))

from sqlalchemy.event import listens_for
@listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if DATABASE_URL.startswith("sqlite"):
        try:
            cursor = dbapi_connection.cursor()
            try:
                cursor.execute("PRAGMA journal_mode=WAL")
            except Exception:
                cursor.execute("PRAGMA journal_mode=DELETE")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.close()
        except Exception as e:
            import sys
            print(f"[Warning] Failed to set SQLite pragmas: {e}", file=sys.stderr)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
