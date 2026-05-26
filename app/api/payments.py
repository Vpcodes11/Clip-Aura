import logging
import os
import uuid
from datetime import datetime, timezone

import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.auth import get_beta_user
from app.api.database import get_db
from app.api.rate_limiter import rate_limit_by_ip
from app.config import (
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET,
    SUBSCRIPTION_TIERS,
    CREDIT_PACK_MINUTES,
    RAZORPAY_PRO_PLAN_ID,
    RAZORPAY_STUDIO_PLAN_ID,
    RAZORPAY_AGENCY_PLAN_ID,
)
from app.models.models import RazorpayEvent, User

logger = logging.getLogger("clipaura.payments")

# Initialize Razorpay Client
rzp_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

router = APIRouter(prefix="/api/billing", tags=["billing"])

PLAN_MINUTES = {
    tier: int(config["minutes"])
    for tier, config in SUBSCRIPTION_TIERS.items()
    if config.get("monthly")
}


def _get_user_by_razorpay_customer(db: Session, customer_id: str):
    return db.query(User).filter(User.razorpay_customer_id == customer_id).first()


def _activate_subscription(
    db: Session,
    user: User,
    subscription_id: str,
    customer_id: str,
    tier: str,
    current_period_end: datetime | None = None,
):
    tier_lower = tier.lower() if tier else "pro"
    plan_minutes = PLAN_MINUTES.get(tier_lower, PLAN_MINUTES.get("pro", 240))

    user.razorpay_customer_id = customer_id
    user.razorpay_subscription_id = subscription_id
    user.subscription_tier = tier_lower
    user.subscription_plan = tier_lower
    user.subscription_status = "active"
    user.total_minutes_limit = plan_minutes
    user.used_minutes = 0
    user.rollover_credits = 0
    if current_period_end:
        user.next_billing_date = current_period_end
    db.commit()


def _cancel_subscription(db: Session, user: User):
    user.subscription_status = "canceled"
    user.razorpay_subscription_id = None
    db.commit()


def _mark_past_due(db: Session, user: User):
    user.subscription_status = "past_due"
    db.commit()


def _handle_credit_pack(db: Session, user: User):
    user.rollover_credits = (user.rollover_credits or 0) + CREDIT_PACK_MINUTES
    db.commit()


def _handle_invoice_paid(db: Session, user: User, current_period_end: datetime | None = None):
    user.used_minutes = 0
    user.subscription_status = "active"
    user.last_usage_reset_at = datetime.now(timezone.utc)
    if current_period_end:
        user.next_billing_date = current_period_end
    db.commit()


@router.get("/status")
async def billing_status(user: User = Depends(get_beta_user)):
    return {
        "tier": user.subscription_tier,
        "role": user.role,
        "subscription_plan": user.subscription_plan,
        "subscription_status": user.subscription_status or "unknown",
        "total_limit": user.total_minutes_limit or 0,
        "used_minutes": user.used_minutes or 0,
        "minutes_remaining": max(0, int(user.total_minutes_limit or 0) - int(user.used_minutes or 0)),
        "rollover_credits": user.rollover_credits or 0,
        "credits_remaining": getattr(user, "credits_remaining", 0) or 0,
        "monthly_credit_limit": getattr(user, "monthly_credit_limit", 0) or 0,
        "is_internal_account": bool(getattr(user, "is_internal_account", False)),
        "next_billing_date": user.next_billing_date.isoformat() if getattr(user, "next_billing_date", None) else None,
    }


@router.post("/cancel-subscription")
async def cancel_subscription(user: User = Depends(get_beta_user), db: Session = Depends(get_db)):
    if not user.razorpay_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription found.")
    
    if rzp_client:
        try:
            # Cancel at cycle end
            rzp_client.subscription.cancel(user.razorpay_subscription_id, {"cancel_at_cycle_end": 1})
        except Exception as e:
            logger.error(f"Failed to cancel Razorpay subscription: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to communicate with payment provider.")

    # We do not immediately mark as canceled in DB. We wait for the webhook `subscription.cancelled` 
    # or let the frontend display a message. But for user feedback we can mark it 'canceling'
    return {"message": "Subscription will cancel at period end."}


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    await rate_limit_by_ip(request, "razorpay_webhook", limit=100, window_seconds=60)

    payload_body = await request.body()
    sig_header = request.headers.get("X-Razorpay-Signature", "")

    if not RAZORPAY_WEBHOOK_SECRET:
        logger.error("Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not configured")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    if not rzp_client:
        logger.error("Razorpay client not initialized.")
        raise HTTPException(status_code=500, detail="Payment provider not initialized")

    try:
        rzp_client.utility.verify_webhook_signature(
            payload_body.decode("utf-8"),
            sig_header,
            RAZORPAY_WEBHOOK_SECRET
        )
    except razorpay.errors.SignatureVerificationError:
        logger.warning("Invalid Razorpay webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.error(f"Error parsing Razorpay webhook: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")

    payload = await request.json()
    event_id = payload.get("account_id", "") + "_" + payload.get("event", "") + "_" + str(payload.get("created_at", ""))
    
    # Razorpay doesn't provide a unique event ID for the webhook delivery itself like Stripe does. 
    # We construct a pseudo-id or use the associated entity ID combined with the event.
    
    existing = db.query(RazorpayEvent).filter(RazorpayEvent.id == event_id).first()
    if existing:
        logger.info("Duplicate Razorpay event skipped", extra={"_structured_fields": {"event_id": event_id}})
        return {"status": "ok", "duplicate": True}

    db.add(RazorpayEvent(id=event_id, event_type=payload.get("event")))
    db.commit()

    try:
        _process_razorpay_event(db, payload)
    except Exception:
        db.rollback()
        try:
            db.query(RazorpayEvent).filter(RazorpayEvent.id == event_id).delete()
            db.commit()
        except Exception:
            db.rollback()
        raise

    db.commit()
    return {"status": "ok"}


def _process_razorpay_event(db: Session, event):
    event_type = event.get("event")
    
    logger.info(
        "Processing Razorpay event",
        extra={
            "_structured_fields": {
                "event_type": event_type,
            }
        },
    )

    if event_type == "subscription.charged":
        _handle_subscription_charged(db, event)

    elif event_type == "subscription.updated":
        _handle_subscription_updated(db, event)

    elif event_type == "subscription.cancelled":
        _handle_subscription_cancelled(db, event)

    elif event_type == "subscription.halted":
        _handle_subscription_halted(db, event)
        
    elif event_type == "payment.captured":
        _handle_payment_captured(db, event)


def _handle_subscription_charged(db: Session, event):
    subscription = event.get("payload", {}).get("subscription", {}).get("entity", {})
    customer_id = subscription.get("customer_id")
    subscription_id = subscription.get("id")
    plan_id = subscription.get("plan_id")
    notes = subscription.get("notes", {})
    client_reference_id = notes.get("user_id")

    if not customer_id and not client_reference_id:
        return

    user = _get_user_by_razorpay_customer(db, customer_id)
    if not user and client_reference_id:
        user = db.query(User).filter(User.id == client_reference_id).first()

    if not user:
        logger.error(
            "No user found for Razorpay subscription",
            extra={"_structured_fields": {"customer_id": customer_id, "subscription_id": subscription_id}},
        )
        return

    tier = _resolve_tier_from_plan(plan_id)
    current_period_end = None
    if subscription.get("current_end"):
        current_period_end = datetime.fromtimestamp(subscription["current_end"], tz=timezone.utc)

    # Note: Using activate handles both new setup and renewal resets
    _activate_subscription(db, user, subscription_id, customer_id, tier, current_period_end)


def _handle_subscription_updated(db: Session, event):
    subscription = event.get("payload", {}).get("subscription", {}).get("entity", {})
    customer_id = subscription.get("customer_id")
    if not customer_id:
        return

    user = _get_user_by_razorpay_customer(db, customer_id)
    if not user:
        return

    status = subscription.get("status", "")
    if status == "active":
        plan_id = subscription.get("plan_id")
        tier = _resolve_tier_from_plan(plan_id)
        current_period_end = None
        if subscription.get("current_end"):
            current_period_end = datetime.fromtimestamp(subscription["current_end"], tz=timezone.utc)
        _activate_subscription(db, user, subscription["id"], customer_id, tier, current_period_end)
    elif status == "halted":
        _mark_past_due(db, user)
    elif status == "cancelled":
        _cancel_subscription(db, user)


def _handle_subscription_cancelled(db: Session, event):
    subscription = event.get("payload", {}).get("subscription", {}).get("entity", {})
    customer_id = subscription.get("customer_id")
    if not customer_id:
        return

    user = _get_user_by_razorpay_customer(db, customer_id)
    if user:
        _cancel_subscription(db, user)


def _handle_subscription_halted(db: Session, event):
    subscription = event.get("payload", {}).get("subscription", {}).get("entity", {})
    customer_id = subscription.get("customer_id")
    if not customer_id:
        return

    user = _get_user_by_razorpay_customer(db, customer_id)
    if user:
        _mark_past_due(db, user)


def _handle_payment_captured(db: Session, event):
    payment = event.get("payload", {}).get("payment", {}).get("entity", {})
    notes = payment.get("notes", {})
    customer_id = payment.get("customer_id")
    user_id = notes.get("user_id")

    # Only process standalone payments (like credit packs) here
    # Subscriptions are handled by subscription events
    if payment.get("invoice_id") or payment.get("order_id", "").startswith("order_"):
        # For Razorpay, subscriptions generate invoices. We skip invoice payments here
        # to avoid double-processing, unless it's a one-time order for a credit pack.
        pass

    if notes.get("type") == "credit_pack":
        user = None
        if customer_id:
            user = _get_user_by_razorpay_customer(db, customer_id)
        if not user and user_id:
            user = db.query(User).filter(User.id == user_id).first()
        
        if user:
            _handle_credit_pack(db, user)
            if customer_id:
                user.razorpay_customer_id = customer_id
            db.commit()


def _resolve_tier_from_plan(plan_id: str) -> str:
    tier_map = {
        RAZORPAY_PRO_PLAN_ID: "pro",
        RAZORPAY_STUDIO_PLAN_ID: "studio",
        RAZORPAY_AGENCY_PLAN_ID: "agency",
    }
    return tier_map.get(plan_id, "pro")
