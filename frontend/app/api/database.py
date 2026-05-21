from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

import os
from app.config import BASE_DIR

# Priority: Environment variable (Postgres) > Local SQLite
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Build a local SQLite URL as fallback
    DATABASE_URL = f"sqlite:///{BASE_DIR}/clip_aura.db"

# SQLite requires different arguments than PostgreSQL
connect_args = {"check_same_thread": False, "timeout": 30} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

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
