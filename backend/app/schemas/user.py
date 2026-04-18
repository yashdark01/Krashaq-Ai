"""
Pydantic schemas for User collection (merged User+Farmer).
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class Language(str, Enum):
    """Language preferences."""
    EN = "en"
    HI = "hi"
    HINGLISH = "hinglish"


class Role(str, Enum):
    """User roles."""
    ADMIN = "admin"
    FARMER = "farmer"
    PESTICIDES_SUPPLIER = "pestisides-supplier"


class LocationSchema(BaseModel):
    """Location details schema."""
    state: Optional[str] = None
    district: Optional[str] = None
    tehsil: Optional[str] = None
    locality: Optional[str] = None
    pincode: Optional[str] = None


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: Role = Role.FARMER
    language: Language = Language.HI
    location: Optional[LocationSchema] = None
    is_active: bool = True


class UserCreate(UserBase):
    """Schema for creating a user."""
    password: Optional[str] = None
    google_id: Optional[str] = None
    soil_moisture: Optional[int] = None  # Farmer-specific field
    crop: Optional[str] = None  # Farmer-specific field


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[Role] = None
    language: Optional[Language] = None
    location: Optional[LocationSchema] = None
    is_active: Optional[bool] = None
    soil_moisture: Optional[int] = None
    crop: Optional[str] = None


class UserInDB(UserBase):
    """Schema for user in database."""
    id: str = Field(default_factory=str, alias="_id")
    password_hash: Optional[str] = None
    google_id: Optional[str] = None
    two_factor_enabled: bool = False
    two_factor_secret: Optional[str] = None
    phone_verified: bool = False
    soil_moisture: Optional[int] = None  # Farmer-specific field
    crop: Optional[str] = None  # Farmer-specific field
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserResponse(UserBase):
    """Schema for user response (without sensitive data)."""
    id: str = Field(default_factory=str, alias="_id")
    soil_moisture: Optional[int] = None
    crop: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
