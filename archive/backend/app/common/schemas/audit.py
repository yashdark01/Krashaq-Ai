"""
Pydantic schemas for AuditLog collection.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AuditLogBase(BaseModel):
    """Base audit log schema."""
    admin_user_id: str
    action: str  # e.g., "user_role_changed", "user_deactivated", "config_updated"
    target_type: str  # e.g., "user", "config"
    target_id: Optional[str] = None
    details: Optional[str] = None  # JSON string with additional details
    ip_address: Optional[str] = None


class AuditLogCreate(AuditLogBase):
    """Schema for creating an audit log."""
    pass


class AuditLogInDB(AuditLogBase):
    """Schema for audit log in database."""
    id: str = Field(default_factory=str, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AuditLogResponse(AuditLogBase):
    """Schema for audit log response."""
    id: str = Field(default_factory=str, alias="_id")
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
