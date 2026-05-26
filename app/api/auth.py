import logging
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from sqlalchemy.orm import Session
from app.api.database import get_db
from app.core.plans import AGENCY, DEFAULT_MINUTES_LIMIT, DEFAULT_PLAN, PRO, is_trial_expired, minutes_for_plan
from app.models.models import User
from app.config import DEV_MODE

logger = logging.getLogger("clipaura.auth")

# Configuration from .env. Initialize lazily so tests and local tooling can
# import backend modules before real Supabase credentials are set.
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
supabase: Client | None = None

security = HTTPBearer()
BETA_ACCESS_DENIED_DETAIL = "ClipAura is in private beta. Join the waitlist at clipaura.com."
LEGACY_PLAN_ALIASES = {
    "free": DEFAULT_PLAN,
    "creator": PRO,
    "scale": AGENCY,
}

def get_supabase_client() -> Client:
    global supabase
    if supabase is None:
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase authentication is not configured.",
            )
        try:
            supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        except Exception as exc:
            logger.error("Failed to initialize Supabase client: %s", str(exc))
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase authentication is not configured.",
            ) from exc
    return supabase


def require_beta_access(user: User) -> User:
    role = (getattr(user, "role", None) or "user").lower()
    role_rank = {"user": 0, "beta": 1, "staff": 2, "admin": 3, "super_admin": 4}
    if user.is_beta_user or role_rank.get(role, 0) >= role_rank["beta"]:
        return user
    raise HTTPException(status_code=403, detail=BETA_ACCESS_DENIED_DETAIL)


def require_active_trial(user: User) -> User:
    if is_trial_expired(user):
        raise HTTPException(status_code=403, detail="Your TRIAL has expired. Upgrade to PRO, STUDIO, or AGENCY to continue.")
    return user


async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if DEV_MODE and token.credentials == "dev-token":
        user_id = "00000000-0000-0000-0000-000000000000"
        email = "dev@example.com"
    else:
        try:
            res = get_supabase_client().auth.get_user(token.credentials)

            if not res.user:
                logger.warning("Supabase could not find user for token")
                raise credentials_exception

            sb_user = res.user
            user_id = sb_user.id
            email = sb_user.email

        except HTTPException:
            raise
        except Exception as e:
            logger.warning("Supabase Auth failed: %s", str(e))
            raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        user = User(
            id=user_id,
            email=email,
            subscription_tier=DEFAULT_PLAN,
            subscription_plan="free",
            total_minutes_limit=DEFAULT_MINUTES_LIMIT,
            monthly_credit_limit=DEFAULT_MINUTES_LIMIT,
        )
        if DEV_MODE and user_id == "00000000-0000-0000-0000-000000000000":
            user.role = "admin"
            user.is_beta_user = True

        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        current_tier = (user.subscription_tier or DEFAULT_PLAN).lower()
        normalized_tier = LEGACY_PLAN_ALIASES.get(current_tier, current_tier)
        expected_limit = minutes_for_plan(normalized_tier)
        changed = False
        if user.subscription_tier != normalized_tier or user.total_minutes_limit != expected_limit:
            user.subscription_tier = normalized_tier
            user.total_minutes_limit = expected_limit
            changed = True
        if not user.role:
            user.role = "beta" if user.is_beta_user else "user"
            changed = True
        if not user.subscription_plan:
            user.subscription_plan = "free"
            changed = True
        if user.monthly_credit_limit is None:
            user.monthly_credit_limit = user.total_minutes_limit or DEFAULT_MINUTES_LIMIT
            changed = True
        if user.credits_remaining is None:
            user.credits_remaining = max(0, int(user.total_minutes_limit or 0) - int(user.used_minutes or 0))
            changed = True
        if DEV_MODE and user_id == "00000000-0000-0000-0000-000000000000":
            if user.role != "admin" or not user.is_beta_user:
                user.role = "admin"
                user.is_beta_user = True
                changed = True

        if changed:
            db.commit()
            db.refresh(user)

    return user


async def get_beta_user(user: User = Depends(get_current_user)) -> User:
    return require_active_trial(require_beta_access(user))
