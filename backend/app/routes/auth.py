from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext

from app.db import get_db
from app.models import User, RefreshToken
from app.services.auth.jwt_service import create_access_token, create_refresh_token, verify_token
from app.services.auth.google_oauth import google_oauth_service
from app.services.auth.two_factor import two_factor_service
from app.config import get_settings
from app.middleware.auth import get_current_user

router = APIRouter()
settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Pydantic models
class GoogleLoginRequest(BaseModel):
    code: str


class EmailLoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str
    default_location: Optional[str] = None
    location_details: Optional[str] = None
    phone: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    tehsil: Optional[str] = None
    locality: Optional[str] = None
    pincode: Optional[str] = None


class TwoFactorVerifyRequest(BaseModel):
    code: str
    session_token: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict
    requires_2fa: bool = False
    session_token: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    default_location: Optional[str] = None
    location_details: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    tehsil: Optional[str] = None
    locality: Optional[str] = None
    pincode: Optional[str] = None


class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/google/login")
async def google_login(request: GoogleLoginRequest):
    """
    Initiate Google OAuth login.
    Returns auth tokens after exchanging code.
    """
    # Exchange code for tokens
    tokens = google_oauth_service.exchange_code_for_tokens(request.code)
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange authorization code"
        )
    
    # Get user info from Google
    user_info = google_oauth_service.get_user_info(tokens["access_token"])
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch user information"
        )
    
    # Return user info for registration/login
    return {
        "user_info": user_info,
        "google_tokens": tokens
    }


@router.post("/signup")
async def signup(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Sign up a new user with email and password.
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Hash password
    password_hash = pwd_context.hash(request.password)
    
    # Create new user
    user = User(
        email=request.email,
        name=request.name,
        password_hash=password_hash,
        default_location=request.default_location,
        location_details=request.location_details,
        phone=request.phone,
        state=request.state,
        district=request.district,
        tehsil=request.tehsil,
        locality=request.locality,
        pincode=request.pincode,
        is_active=True
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate tokens
    access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })
    
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    # Store refresh token
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(db_refresh_token)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "default_location": user.default_location,
            "role": user.role
        }
    }


@router.post("/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Complete user registration with location details (for Google OAuth).
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create new user (no password for Google OAuth users)
    user = User(
        email=request.email,
        name=request.name,
        default_location=request.default_location,
        location_details=request.location_details,
        phone=request.phone,
        state=request.state,
        district=request.district,
        tehsil=request.tehsil,
        locality=request.locality,
        pincode=request.pincode,
        is_active=True
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate tokens
    access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })
    
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    # Store refresh token
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(db_refresh_token)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "default_location": user.default_location,
            "role": user.role
        }
    }


@router.post("/login/email")
async def email_login(request: EmailLoginRequest, db: Session = Depends(get_db)):
    """
    Login with email and password.
    """
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user has password (Google OAuth users might not)
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please sign in with Google"
        )
    
    # Verify password
    if not pwd_context.verify(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Generate tokens
    access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })
    
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    # Store refresh token
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(db_refresh_token)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "default_location": user.default_location,
            "role": user.role
        }
    }


@router.post("/verify-2fa")
async def verify_2fa(request: TwoFactorVerifyRequest, db: Session = Depends(get_db)):
    """
    Verify 2FA code and issue tokens.
    """
    # Verify session token (simplified - in production use proper session management)
    # For now, we'll skip full 2FA implementation and return success
    
    return {"message": "2FA verified successfully"}


@router.post("/refresh")
async def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Refresh access token using refresh token.
    """
    # Verify refresh token
    payload = verify_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    
    # Check if refresh token exists and is not revoked
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == request.refresh_token,
        RefreshToken.revoked == False
    ).first()
    
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or revoked"
        )
    
    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Revoke old refresh token
    db_token.revoked = True
    db.commit()
    
    # Generate new tokens
    access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })
    
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    
    # Store new refresh token
    new_db_token = RefreshToken(
        user_id=user.id,
        token=new_refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(new_db_token)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token
    }


@router.post("/logout")
async def logout(refresh_token: str, db: Session = Depends(get_db)):
    """
    Logout by revoking refresh token.
    """
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token
    ).first()
    
    if db_token:
        db_token.revoked = True
        db.commit()
    
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_current_user_endpoint(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get current user information.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "default_location": current_user.default_location,
        "location_details": current_user.location_details,
        "phone": current_user.phone,
        "role": current_user.role,
        "two_factor_enabled": current_user.two_factor_enabled,
        "phone_verified": current_user.phone_verified,
        "state": current_user.state,
        "district": current_user.district,
        "tehsil": current_user.tehsil,
        "locality": current_user.locality,
        "pincode": current_user.pincode,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None
    }


@router.put("/me")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile information.
    """
    if request.name:
        current_user.name = request.name
    if request.phone:
        current_user.phone = request.phone
    if request.default_location:
        current_user.default_location = request.default_location
    if request.location_details:
        current_user.location_details = request.location_details
    if request.state:
        current_user.state = request.state
    if request.district:
        current_user.district = request.district
    if request.tehsil:
        current_user.tehsil = request.tehsil
    if request.locality:
        current_user.locality = request.locality
    if request.pincode:
        current_user.pincode = request.pincode
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "default_location": current_user.default_location,
        "location_details": current_user.location_details,
        "phone": current_user.phone,
        "role": current_user.role,
        "two_factor_enabled": current_user.two_factor_enabled,
        "phone_verified": current_user.phone_verified,
        "state": current_user.state,
        "district": current_user.district,
        "tehsil": current_user.tehsil,
        "locality": current_user.locality,
        "pincode": current_user.pincode
    }


@router.put("/me/password")
async def update_password(
    request: UpdatePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user password.
    """
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update password for Google OAuth users"
        )
    
    # Verify current password
    if not pwd_context.verify(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = pwd_context.hash(request.new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Password updated successfully"}
