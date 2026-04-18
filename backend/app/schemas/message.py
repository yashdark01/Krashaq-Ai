"""
Pydantic schemas for Message collection.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class Language(str, Enum):
    """Language preferences."""
    EN = "en"
    HI = "hi"
    HINGLISH = "hinglish"


class LLMProvider(str, Enum):
    """LLM providers."""
    OLLAMA = "ollama"
    GEMINI = "gemini"
    OPENAI = "openai"
    CLAUDE = "claude"
    GROK = "grok"


class MessageBase(BaseModel):
    """Base message schema."""
    farmer_id: Optional[str] = None
    phone: Optional[str] = None
    session_id: Optional[str] = None
    message: str
    response: Optional[str] = None
    language: Language = Language.HI
    tools_used: Optional[str] = None  # JSON string of tool names
    llm_provider: Optional[LLMProvider] = None


class MessageCreate(MessageBase):
    """Schema for creating a message."""
    pass


class MessageInDB(MessageBase):
    """Schema for message in database."""
    id: str = Field(default_factory=str, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class MessageResponse(MessageBase):
    """Schema for message response."""
    id: str = Field(default_factory=str, alias="_id")
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
