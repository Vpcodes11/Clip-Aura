import datetime
from sqlalchemy import Boolean, Column, String, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.api.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # Supabase User ID
    email = Column(String, unique=True, index=True)
    stripe_customer_id = Column(String, nullable=True)
    subscription_tier = Column(String, default="free") # "free", "pro", "unlimited"
    is_beta_user = Column(Boolean, default=False, nullable=False)
    
    # Credit system (minutes)
    total_minutes_limit = Column(Integer, default=15) # 15 free mins/month
    used_minutes = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    next_billing_date = Column(DateTime, nullable=True)

    # Relationships
    jobs = relationship("Job", back_populates="owner")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    
    status = Column(String, default="queued")
    progress = Column(Integer, default=0)
    message = Column(String, default="Initializing...")
    
    video_path = Column(String, nullable=True)
    source = Column(String, nullable=True)
    provider = Column(String, nullable=True)
    preset = Column(String, nullable=True)
    caption_style = Column(String, nullable=True)
    
    transcript = Column(JSON, nullable=True)
    clip_candidates = Column(JSON, nullable=True)
    clips = Column(JSON, nullable=True)
    errors = Column(JSON, nullable=True)
    stage = Column(String, default="queued")

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationship
    owner = relationship("User", back_populates="jobs")
