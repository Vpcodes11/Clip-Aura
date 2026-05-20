import os
import stripe
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.api.database import get_db
from app.api.models import User
from app.config import STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRO_PRICE_ID
from app.api.auth import get_current_user

stripe.api_key = STRIPE_SECRET_KEY
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

router = APIRouter(prefix="/api/billing", tags=["billing"])

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

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the checkout.session.completed event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session['metadata'].get('user_id')
        customer_id = session.get('customer')

        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.stripe_customer_id = customer_id
                user.subscription_tier = "pro"
                user.total_minutes_limit = 200 # Pro tier: 200 mins/mo
                db.commit()

    return {"status": "success"}
