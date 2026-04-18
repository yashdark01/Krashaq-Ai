from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict
from passlib.context import CryptContext

from app.db.mongodb import get_collection
from app.services.auth.jwt_service import verify_token

security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict:
    """
    Get the current authenticated user from JWT token.
    
    Args:
        credentials: HTTP Bearer credentials (JWT token)
    
    Returns:
        User dictionary
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    
    # Verify token
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    # Check token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    # Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Get user from database
    users_collection = get_collection("users")
    user = await users_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[Dict]:
    """
    Get the current user if authenticated, otherwise return None.
    
    Args:
        credentials: HTTP Bearer credentials (optional)
    
    Returns:
        User dictionary if authenticated, None otherwise
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_role(allowed_roles: list[str]):
    """
    Dependency factory to require specific user roles.
    
    Args:
        allowed_roles: List of allowed roles
    
    Returns:
        Dependency function that checks user role
    """
    async def role_checker(current_user: Dict = Depends(get_current_user)) -> Dict:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {allowed_roles}"
            )
        return current_user
    
    return role_checker


def require_admin():
    """
    Dependency to require admin role.
    
    Returns:
        Dependency function that checks if user is admin
    """
    return require_role(["admin"])


def require_reauth():
    """
    Dependency to require re-authentication for sensitive operations.
    This should be used with a re-authentication endpoint that verifies the user's password.
    
    Note: This is a placeholder. In a full implementation, you would:
    1. Add a re-auth endpoint that accepts the user's current password
    2. Issue a short-lived re-auth token upon successful verification
    3. Check for this token in this dependency
    
    Returns:
        Dependency function (currently just returns the current user)
    """
    async def reauth_checker(current_user: Dict = Depends(get_current_user)) -> Dict:
        # In a full implementation, verify re-auth token here
        # For now, we just return the user as the admin routes handle sensitive checks
        return current_user
    
    return reauth_checker
