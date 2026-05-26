import datetime
from sqlalchemy import Boolean, Column, String, Integer, DateTime, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.api.database import Base
from app.core.plans import DEFAULT_MINUTES_LIMIT, DEFAULT_PLAN

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # Supabase User ID
    email = Column(String, unique=True, index=True)
    razorpay_customer_id = Column(String, nullable=True, index=True)
    razorpay_subscription_id = Column(String, nullable=True, index=True)
    subscription_status = Column(String, default="trialing")
    subscription_tier = Column(String, default=DEFAULT_PLAN) # "trial", "pro", "studio", "agency"
    is_beta_user = Column(Boolean, default=False, nullable=False)

    # Backend-authoritative RBAC + entitlement fields.
    role = Column(String, default="user", nullable=False, index=True)
    subscription_plan = Column(String, default="free", nullable=False, index=True)
    credits_remaining = Column(Integer, default=0, nullable=False)
    monthly_credit_limit = Column(Integer, default=0, nullable=False)
    feature_flags = Column(JSON, default=dict)
    is_internal_account = Column(Boolean, default=False, nullable=False, index=True)
    created_by_admin = Column(String, ForeignKey("users.id"), nullable=True)
    last_role_change_at = Column(DateTime, nullable=True)
    role_changed_by = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Credit system (minutes)
    total_minutes_limit = Column(Integer, default=DEFAULT_MINUTES_LIMIT) # 60 one-time trial minutes by default
    used_minutes = Column(Integer, default=0)
    rollover_credits = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    next_billing_date = Column(DateTime, nullable=True)
    last_usage_reset_at = Column(DateTime, nullable=True)

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
    usage_minutes_charged = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationship
    owner = relationship("User", back_populates="jobs")


class RazorpayEvent(Base):
    __tablename__ = "razorpay_events"

    id = Column(String, primary_key=True)
    event_type = Column(String, nullable=True)
    processed_at = Column(DateTime, default=datetime.datetime.utcnow)


class LeadSubmission(Base):
    __tablename__ = "lead_submissions"

    id = Column(String, primary_key=True)
    kind = Column(String, nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    name = Column(String, nullable=True)
    message = Column(String, nullable=True)
    source = Column(String, nullable=True)
    ip_hash = Column(String, nullable=True, index=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True)
    actor_user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    target_user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, nullable=False, index=True)
    metadata_json = Column(JSON, default=dict)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=True, index=True)
    minutes = Column(Integer, default=0, nullable=False)
    plan_spent = Column(Integer, default=0, nullable=False)
    credit_spent = Column(Integer, default=0, nullable=False)
    enforcement_skipped = Column(Boolean, default=False, nullable=False, index=True)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


Index("idx_audit_logs_action_created_at", AuditLog.action, AuditLog.created_at)
Index("idx_usage_records_user_created_at", UsageRecord.user_id, UsageRecord.created_at)
