import os
import stripe
import redis.asyncio as redis
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.api.database import get_db
from app.api.models import User
from app.config import STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRO_PRICE_ID
from app.api.auth import get_current_user

stripe.api_key = STRIPE_SECRET_KEY
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_async = redis.from_url(REDIS_URL)

router = APIRouter(prefix="/api/billing", tags=["billing"])


async def mark_event_processing(event_id: str) -> bool:
    """Return False when Stripe has already delivered this event recently."""
    if not event_id:
        return True
    try:
        return bool(await redis_async.set(f"stripe_event:{event_id}", "1", ex=7 * 24 * 60 * 60, nx=True))
    except Exception:
        # Do not reject valid Stripe webhooks just because Redis is unavailable.
        return True


def activate_pro_subscription(db: Session, user: User, customer_id: str | None = None):
    if customer_id:
        user.stripe_customer_id = customer_id
    user.subscription_tier = "pro"
    user.total_minutes_limit = 200
    db.commit()


def downgrade_subscription(db: Session, user: User):
    user.subscription_tier = "free"
    user.total_minutes_limit = 15
    db.commit()


def find_user_by_customer(db: Session, customer_id: str | None):
    if not customer_id:
        return None
    return db.query(User).filter(User.stripe_customer_id == customer_id).first()

@router.post("/create-checkout-session")
async def create_checkout_session(user: User = Depends(get_current_user)):
    """Create a Stripe Checkout session for subscription"""
    if not STRIPE_SECRET_KEY or not STRIPE_PRO_PRICE_ID:
        raise HTTPException(status_code=503, detail="Billing is not configured.")

    try:
        checkout_session = stripe.checkout.Session.create(
            customer_email=user.email,
            payment_method_types=['card'],
            line_items=[
                {
                    'price': STRIPE_PRO_PRICE_ID,
                    'quantity': 1,
                },
            ],
            mode='subscription',
            success_url=f"{BASE_URL}/static/index.html?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{BASE_URL}/static/index.html",
            metadata={
                'user_id': user.id
            }
        )
        return {"url": checkout_session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None), db: Session = Depends(get_db)):
    """Stripe webhook to handle subscription lifecycle events"""
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Stripe webhook is not configured.")
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature.")

    payload = await request.body()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty webhook payload.")

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid webhook payload.")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature.")

    event_id = event.get("id")
    if not await mark_event_processing(event_id):
        return {"status": "duplicate_ignored"}

    event_type = event.get("type")
    event_object = event.get("data", {}).get("object", {})

    if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"}:
        session = event_object
        user_id = (session.get("metadata") or {}).get("user_id") or session.get("client_reference_id")
        customer_id = session.get('customer')

        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                activate_pro_subscription(db, user, customer_id)

    elif event_type == "customer.subscription.updated":
        subscription = event_object
        user = find_user_by_customer(db, subscription.get("customer"))
        if user:
            status = subscription.get("status")
            if status in {"active", "trialing"}:
                activate_pro_subscription(db, user)
            elif status in {"canceled", "incomplete_expired", "unpaid"}:
                downgrade_subscription(db, user)

    elif event_type == "customer.subscription.deleted":
        subscription = event_object
        user = find_user_by_customer(db, subscription.get("customer"))
        if user:
            downgrade_subscription(db, user)

    return {"status": "success"}
