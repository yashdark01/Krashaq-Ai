from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.db import Base


class Farmer(Base):
    __tablename__ = "farmers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    location = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=func.now())


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, nullable=True)
    phone = Column(String(20), nullable=True, index=True)
    session_id = Column(String(50), nullable=True, index=True)
    message = Column(Text, nullable=False)
    response = Column(Text, nullable=True)
    language = Column(String(10), nullable=True)  # en, hi, hinglish
    tools_used = Column(Text, nullable=True)  # JSON array of tool names
    llm_provider = Column(String(20), nullable=True)  # ollama, gemini, openai, claude, grok
    created_at = Column(DateTime, default=func.now())


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=True)  # For email/password auth
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    phone = Column(String(20), nullable=True, index=True)
    
    # Location details (collected during registration)
    default_location = Column(String(100), nullable=True)  # User's default location (legacy)
    location_details = Column(Text, nullable=True)  # Additional location info (coordinates, etc.) (legacy)
    
    # Cascading location hierarchy
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    tehsil = Column(String(100), nullable=True)
    locality = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    
    # 2FA fields
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255), nullable=True)  # TOTP secret
    phone_verified = Column(Boolean, default=False)
    
    # Role & permissions
    role = Column(String(20), default="farmer")  # admin, farmer, viewer
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_login = Column(DateTime, nullable=True)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(500), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.now())
    revoked = Column(Boolean, default=False)
