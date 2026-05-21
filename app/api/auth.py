import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from sqlalchemy.orm import Session
from app.api.database import get_db
from app.api.models import User

# Configuration from .env
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Initialize Supabase Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

security = HTTPBearer()

async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Verifies the token using the official Supabase client.
    Supports a DEV_MODE bypass for rapid testing.
    """
    DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"
    
    if DEV_MODE:
        # Bypass Supabase and return a mock 'Dev Architect' user
        user_id = "dev-architect-id"
        email = "dev@clipaura.local"
        print(f"DEBUG: [DEV_MODE ACTIVE] Bypassing auth for: {email}")
    else:
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            # Ask Supabase directly if this token is valid and who it belongs to
            res = supabase.auth.get_user(token.credentials)
            
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
        is_dev = email == "dev@clipaura.local"
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
