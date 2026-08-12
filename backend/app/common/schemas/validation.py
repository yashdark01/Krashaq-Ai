"""
Validation schemas for common inputs.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
import re


class EmailValidation(BaseModel):
    """Email validation schema."""
    email: str = Field(..., min_length=5, max_length=255)
    
    @validator('email')
    def validate_email(cls, v):
        """Validate email format."""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('Invalid email format')
        return v.lower()


class PhoneValidation(BaseModel):
    """Phone number validation schema."""
    phone: str = Field(..., min_length=10, max_length=15)
    
    @validator('phone')
    def validate_phone(cls, v):
        """Validate phone number format."""
        # Remove all non-digit characters
        digits = re.sub(r'[^\d]', '', v)
        
        # Check if it has valid length (10-15 digits)
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError('Phone number must be between 10 and 15 digits')
        
        return v


class PasswordValidation(BaseModel):
    """Password validation schema."""
    password: str = Field(..., min_length=8, max_length=128)
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        
        return v


class LocationValidation(BaseModel):
    """Location validation schema."""
    state: Optional[str] = Field(None, max_length=100)
    district: Optional[str] = Field(None, max_length=100)
    tehsil: Optional[str] = Field(None, max_length=100)
    locality: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, min_length=6, max_length=6)
    
    @validator('pincode')
    def validate_pincode(cls, v):
        """Validate pincode format."""
        if v and not v.isdigit():
            raise ValueError('Pincode must be a 6-digit number')
        return v


class NameValidation(BaseModel):
    """Name validation schema."""
    name: str = Field(..., min_length=2, max_length=100)
    
    @validator('name')
    def validate_name(cls, v):
        """Validate name format."""
        if not re.match(r'^[a-zA-Z\s\'\-\.]+$', v):
            raise ValueError('Name can only contain letters, spaces, hyphens, apostrophes, and periods')
        return v.strip()


class MessageValidation(BaseModel):
    """Message validation schema."""
    message: str = Field(..., min_length=1, max_length=5000)
    
    @validator('message')
    def validate_message(cls, v):
        """Validate message content."""
        # Check for excessive whitespace
        if v.strip() != v:
            v = v.strip()
        
        # Check for empty message after stripping
        if not v:
            raise ValueError('Message cannot be empty')
        
        return v


class CodeValidation(BaseModel):
    """OTP/Code validation schema."""
    code: str = Field(..., min_length=4, max_length=10)
    
    @validator('code')
    def validate_code(cls, v):
        """Validate code format."""
        if not v.isdigit():
            raise ValueError('Code must be numeric')
        return v


class FileValidation(BaseModel):
    """File upload validation schema."""
    filename: str = Field(..., max_length=255)
    file_type: str = Field(..., max_length=100)
    file_size: int = Field(..., gt=0)
    
    @validator('filename')
    def validate_filename(cls, v):
        """Validate filename."""
        # Check for path traversal
        if '..' in v or '/' in v or '\\' in v:
            raise ValueError('Invalid filename')
        
        # Check for file extension
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.pdf', '.txt']
        if not any(v.lower().endswith(ext) for ext in allowed_extensions):
            raise ValueError('File type not allowed')
        
        return v
    
    @validator('file_size')
    def validate_file_size(cls, v):
        """Validate file size (max 10MB)."""
        max_size = 10 * 1024 * 1024  # 10MB
        if v > max_size:
            raise ValueError('File size exceeds maximum allowed size of 10MB')
        return v


class PaginationValidation(BaseModel):
    """Pagination validation schema."""
    page: int = Field(1, ge=1, le=1000)
    limit: int = Field(10, ge=1, le=100)
    
    @validator('limit')
    def validate_limit(cls, v):
        """Validate limit doesn't exceed maximum."""
        if v > 100:
            raise ValueError('Limit cannot exceed 100')
        return v


class DateRangeValidation(BaseModel):
    """Date range validation schema."""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        """Validate end date is after start date."""
        if v and 'start_date' in values and values['start_date']:
            # Simple validation - in production use proper date parsing
            if v < values['start_date']:
                raise ValueError('End date must be after start date')
        return v
