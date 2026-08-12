"""
Pydantic schemas for RefreshToken collection.
"""

from pydantic import BaseModel, Field
from datetime import datetime


class RefreshTokenBase(BaseModel):
    """Base refresh token schema."""
    user_id: str
    token: str
    expires_at: datetime


class RefreshTokenCreate(RefreshTokenBase):
    """Schema for creating a refresh token."""
    pass


class RefreshTokenInDB(RefreshTokenBase):
    """Schema for refresh token in database."""
    id: str = Field(default_factory=str, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    revoked: bool = False

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RefreshTokenResponse(RefreshTokenBase):
    """Schema for refresh token response."""
    id: str = Field(default_factory=str, alias="_id")
    created_at: datetime
    revoked: bool

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
