from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

import os
from app.config import BASE_DIR

# Priority: Environment variable (Postgres) > Local SQLite
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Build a local SQLite URL as fallback
    DATABASE_URL = f"sqlite:///{BASE_DIR}/clipaura.db"

# SQLite requires different arguments than PostgreSQL
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
