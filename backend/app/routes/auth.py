from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timedelta
from passlib.context import CryptContext
import uuid

from app.db.mongodb import get_collection
from app.services.auth.jwt_service import create_access_token, create_refresh_token, verify_token
from app.services.auth.google_oauth import google_oauth_service
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
async def signup(request: RegisterRequest):
    """
    Sign up a new user with email and password.
    """
    users_collection = get_collection("users")
    refresh_tokens_collection = get_collection("refresh_tokens")
    
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": request.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Hash password
    password_hash = pwd_context.hash(request.password)
    
    # Generate user ID
    user_id = str(uuid.uuid4())
    
    # Create new user
    user = {
        "_id": user_id,
        "email": request.email,
        "name": request.name,
        "password_hash": password_hash,
        "location": {
            "state": request.state,
            "district": request.district,
            "tehsil": request.tehsil,
            "locality": request.locality,
            "pincode": request.pincode
        },
        "phone": request.phone,
        "role": "farmer",
        "language": "hi",
        "is_active": True,
        "two_factor_enabled": False,
        "phone_verified": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await users_collection.insert_one(user)
    
    # Generate tokens
    access_token = create_access_token({
        "sub": user_id,
        "email": request.email,
        "role": "farmer"
    })
    
    refresh_token = create_refresh_token({"sub": user_id})
    
    # Store refresh token
    await refresh_tokens_collection.insert_one({
        "user_id": user_id,
        "token": refresh_token,
        "expires_at": datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
        "created_at": datetime.utcnow(),
        "revoked": False
    })
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user_id,
            "email": request.email,
            "name": request.name,
            "role": "farmer",
            "language": "hi"
        }
    }


@router.post("/register")
async def register(request: RegisterRequest):
    """
    Complete user registration with location details (for Google OAuth).
    """
    users_collection = get_collection("users")
    refresh_tokens_collection = get_collection("refresh_tokens")
    
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": request.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Generate user ID
    user_id = str(uuid.uuid4())
    
    # Create new user (no password for Google OAuth users)
    user = {
        "_id": user_id,
        "email": request.email,
        "name": request.name,
        "location": {
            "state": request.state,
            "district": request.district,
            "tehsil": request.tehsil,
            "locality": request.locality,
            "pincode": request.pincode
        },
        "phone": request.phone,
        "role": "farmer",
        "language": "hi",
        "is_active": True,
        "two_factor_enabled": False,
        "phone_verified": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await users_collection.insert_one(user)
    
    # Generate tokens
    access_token = create_access_token({
        "sub": user_id,
        "email": request.email,
        "role": "farmer"
    })
    
    refresh_token = create_refresh_token({"sub": user_id})
    
    # Store refresh token
    await refresh_tokens_collection.insert_one({
        "user_id": user_id,
        "token": refresh_token,
        "expires_at": datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
        "created_at": datetime.utcnow(),
        "revoked": False
    })
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user_id,
            "email": request.email,
            "name": request.name,
            "role": "farmer",
            "language": "hi"
        }
    }


@router.post("/login/email")
async def email_login(request: EmailLoginRequest):
    """
    Login with email and password.
    """
    users_collection = get_collection("users")
    refresh_tokens_collection = get_collection("refresh_tokens")
    
    # Find user by email
    user = await users_collection.find_one({"email": request.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user has password (Google OAuth users might not)
    if not user.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please use Google OAuth to login"
        )
    
    # Verify password
    if not pwd_context.verify(request.password, user.get("password_hash")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    user_id = user.get("_id")
    
    # Generate tokens
    access_token = create_access_token({
        "sub": user_id,
        "email": user.get("email"),
        "role": user.get("role")
    })
    
    refresh_token = create_refresh_token({"sub": user_id})
    
    # Store refresh token
    await refresh_tokens_collection.insert_one({
        "user_id": user_id,
        "token": refresh_token,
        "expires_at": datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
        "created_at": datetime.utcnow(),
        "revoked": False
    })
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user_id,
            "email": user.get("email"),
            "name": user.get("name"),
            "role": user.get("role"),
            "language": user.get("language", "hi")
        }
    }


@router.post("/verify-2fa")
async def verify_2fa(request: TwoFactorVerifyRequest):
    """
    Verify 2FA code and issue tokens.
    """
    # Verify session token (simplified - in production use proper session management)
    # For now, we'll skip full 2FA implementation and return success
    
    return {"message": "2FA verified successfully"}


@router.post("/refresh")
async def refresh_token(request: RefreshTokenRequest):
    """
    Refresh access token using refresh token.
    """
    users_collection = get_collection("users")
    refresh_tokens_collection = get_collection("refresh_tokens")
    
    # Verify refresh token
    payload = verify_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    
    # Check if refresh token exists and is not revoked
    db_token = await refresh_tokens_collection.find_one({
        "token": request.refresh_token,
        "revoked": False
    })
    
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or revoked"
        )
    
    # Get user
    user = await users_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Revoke old refresh token
    await refresh_tokens_collection.update_one(
        {"_id": db_token["_id"]},
        {"$set": {"revoked": True}}
    )
    
    # Generate new tokens
    access_token = create_access_token({
        "sub": user_id,
        "email": user.get("email"),
        "role": user.get("role")
    })
    
    new_refresh_token = create_refresh_token({"sub": user_id})
    
    # Store new refresh token
    await refresh_tokens_collection.insert_one({
        "user_id": user_id,
        "token": new_refresh_token,
        "expires_at": datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
        "created_at": datetime.utcnow(),
        "revoked": False
    })
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token
    }


@router.post("/logout")
async def logout(refresh_token: str):
    """
    Logout by revoking refresh token.
    """
    refresh_tokens_collection = get_collection("refresh_tokens")
    
    db_token = await refresh_tokens_collection.find_one({"token": refresh_token})
    
    if db_token:
        await refresh_tokens_collection.update_one(
            {"_id": db_token["_id"]},
            {"$set": {"revoked": True}}
        )
    
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_current_user_endpoint(current_user: Dict = Depends(get_current_user)):
    """
    Get current user information.
    """
    return {
        "id": current_user.get("_id"),
        "email": current_user.get("email"),
        "name": current_user.get("name"),
        "phone": current_user.get("phone"),
        "role": current_user.get("role"),
        "language": current_user.get("language", "hi"),
        "location": current_user.get("location"),
        "two_factor_enabled": current_user.get("two_factor_enabled", False),
        "phone_verified": current_user.get("phone_verified", False),
        "is_active": current_user.get("is_active", True)
    }


@router.put("/me")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Update user profile information.
    """
    users_collection = get_collection("users")
    user_id = current_user.get("_id")
    
    # Build update data
    update_data = {}
    if request.name:
        update_data["name"] = request.name
    if request.phone:
        update_data["phone"] = request.phone
    
    # Update location if provided
    if any([request.state, request.district, request.tehsil, request.locality, request.pincode]):
        location = current_user.get("location", {})
        if request.state:
            location["state"] = request.state
        if request.district:
            location["district"] = request.district
        if request.tehsil:
            location["tehsil"] = request.tehsil
        if request.locality:
            location["locality"] = request.locality
        if request.pincode:
            location["pincode"] = request.pincode
        update_data["location"] = location
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await users_collection.update_one(
            {"_id": user_id},
            {"$set": update_data}
        )
    
    # Fetch updated user
    updated_user = await users_collection.find_one({"_id": user_id})
    
    return {
        "id": updated_user.get("_id"),
        "email": updated_user.get("email"),
        "name": updated_user.get("name"),
        "phone": updated_user.get("phone"),
        "role": updated_user.get("role"),
        "language": updated_user.get("language", "hi"),
        "location": updated_user.get("location")
    }


@router.put("/me/password")
async def update_password(
    request: UpdatePasswordRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Update user password.
    """
    users_collection = get_collection("users")
    user_id = current_user.get("_id")
    
    # Verify current password
    if not pwd_context.verify(request.current_password, current_user.get("password_hash")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Hash new password
    new_password_hash = pwd_context.hash(request.new_password)
    
    # Update password
    await users_collection.update_one(
        {"_id": user_id},
        {"$set": {
            "password_hash": new_password_hash,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Password updated successfully"}
