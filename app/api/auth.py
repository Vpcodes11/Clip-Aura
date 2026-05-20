import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from sqlalchemy.orm import Session
from app.api.database import get_db
from app.api.models import User
from app.config import DEV_MODE

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
supabase: Client | None = None


def get_supabase_client() -> Client:
    """Create the Supabase client lazily so DEV_MODE and tests can import safely."""
    global supabase
    if supabase is None:
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be configured.")
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return supabase

security = HTTPBearer()

async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Verifies the token using the official Supabase client.
    Supports a DEV_MODE bypass for rapid testing.
    """
    if DEV_MODE:
        # Bypass Supabase and return a mock 'Dev Architect' user
        user_id = "dev-architect-id"
        email = "dev@clip-aura.local"
        print(f"DEBUG: [DEV_MODE ACTIVE] Bypassing auth for: {email}")
    else:
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

        try:
            # Ask Supabase directly if this token is valid and who it belongs to
            res = get_supabase_client().auth.get_user(token.credentials)

            if not res.user:
                print(f"DEBUG ERROR: Supabase could not find user for this token.")
                raise credentials_exception

            sb_user = res.user
            user_id = sb_user.id
            email = sb_user.email
            print(f"DEBUG: Successfully verified user via Supabase API: {email}")

        except Exception as e:
            print(f"DEBUG ERROR: Supabase Auth failed: {str(e)}")
            raise credentials_exception

    # Check if user exists in our local DB
    user = db.query(User).filter(User.id == user_id).first()
    
    # Create user if they don't exist yet
    if not user:
        is_dev = email == "dev@clip-aura.local"
        user = User(
            id=user_id,
            email=email,
            subscription_tier="pro" if is_dev else "free",
            total_minutes_limit=1000 if is_dev else 15
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    return user
