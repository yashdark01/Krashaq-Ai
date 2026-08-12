"""
Pydantic schemas for SchedulerConfig collection.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ScheduleType(str, Enum):
    """Schedule types."""
    HOURLY = "hourly"
    DAILY = "daily"
    INTERVAL = "interval"


class SchedulerConfigBase(BaseModel):
    """Base scheduler config schema."""
    job_name: str
    schedule_type: ScheduleType
    interval_hours: Optional[int] = None
    interval_minutes: Optional[int] = None
    hour: Optional[int] = None  # For daily schedules (0-23)
    minute: Optional[int] = None  # For daily schedules (0-59)
    enabled: bool = True


class SchedulerConfigCreate(SchedulerConfigBase):
    """Schema for creating a scheduler config."""
    pass


class SchedulerConfigUpdate(BaseModel):
    """Schema for updating a scheduler config."""
    schedule_type: Optional[ScheduleType] = None
    interval_hours: Optional[int] = None
    interval_minutes: Optional[int] = None
    hour: Optional[int] = None
    minute: Optional[int] = None
    enabled: Optional[bool] = None


class SchedulerConfigInDB(SchedulerConfigBase):
    """Schema for scheduler config in database."""
    id: str = Field(default_factory=str, alias="_id")
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SchedulerConfigResponse(SchedulerConfigBase):
    """Schema for scheduler config response."""
    id: str = Field(default_factory=str, alias="_id")
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
