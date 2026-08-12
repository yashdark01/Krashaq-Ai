"""
Input validation middleware for security.
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import re
from typing import Optional

# SQL injection patterns (for MongoDB, we use parameterized queries, but still validate)
SQL_INJECTION_PATTERNS = [
    r"(\bOR\b|\bAND\b).*=.*=.*",
    r"(\bOR\b|\bAND\b).*\d.*=.*\d",
    r";\s*(DROP|DELETE|INSERT|UPDATE|SELECT|ALTER|CREATE|TRUNCATE)",
    r"UNION\s+SELECT",
    r"--",
    r"/\*.*\*/",
    r"xp_cmdshell",
    r"exec\s*\(",
]

# XSS patterns
XSS_PATTERNS = [
    r"<script[^>]*>.*?</script>",
    r"javascript:",
    r"on\w+\s*=",
    r"<iframe",
    r"<object",
    r"<embed",
]

# Path traversal patterns
PATH_TRAVERSAL_PATTERNS = [
    r"\.\./",
    r"\.\.\\",
    r"%2e%2e%2f",
    r"%2e%2e%5c",
]

# File upload validation
ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
    "text/plain",
]

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


class ValidationMiddleware(BaseHTTPMiddleware):
    """Middleware for input validation and security checks."""
    
    async def dispatch(self, request: Request, call_next):
        """Process request with validation."""
        # Validate request body
        await self._validate_request_body(request)
        
        # Validate query parameters
        self._validate_query_params(request)
        
        # Validate path
        self._validate_path(request.url.path)
        
        # Process request
        response = await call_next(request)
        
        return response
    
    async def _validate_request_body(self, request: Request):
        """Validate request body for injection attacks."""
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.json()
                self._check_for_injection(body)
            except:
                # If body is not JSON, skip validation
                pass
    
    def _validate_query_params(self, request: Request):
        """Validate query parameters."""
        for key, value in request.query_params.items():
            # Check for injection patterns in query params
            if self._contains_injection(str(value)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid input in query parameter '{key}'"
                )
    
    def _validate_path(self, path: str):
        """Validate path for traversal attacks."""
        for pattern in PATH_TRAVERSAL_PATTERNS:
            if re.search(pattern, path, re.IGNORECASE):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid path detected"
                )
    
    def _check_for_injection(self, data):
        """Check data for SQL injection and XSS patterns."""
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, (str, dict, list)):
                    self._check_for_injection(value)
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, (str, dict, list)):
                    self._check_for_injection(item)
        elif isinstance(data, str):
            # Check for SQL injection
            for pattern in SQL_INJECTION_PATTERNS:
                if re.search(pattern, data, re.IGNORECASE):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid input detected"
                    )
            
            # Check for XSS
            for pattern in XSS_PATTERNS:
                if re.search(pattern, data, re.IGNORECASE):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid input detected"
                    )
    
    def _contains_injection(self, value: str) -> bool:
        """Check if string contains injection patterns."""
        for pattern in SQL_INJECTION_PATTERNS + XSS_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                return True
        return False


def validate_file_upload(file_type: str, file_size: int) -> bool:
    """
    Validate file upload.
    
    Args:
        file_type: MIME type of the file
        file_size: Size of the file in bytes
    
    Returns:
        True if valid, raises HTTPException otherwise
    """
    # Check file size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024*1024)}MB"
        )
    
    # Check file type
    if file_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{file_type}' is not allowed. Allowed types: {', '.join(ALLOWED_FILE_TYPES)}"
        )
    
    return True


def sanitize_output(text: str) -> str:
    """
    Sanitize output to prevent XSS.
    
    Args:
        text: Text to sanitize
    
    Returns:
        Sanitized text
    """
    # Escape HTML special characters
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    text = text.replace('"', "&quot;")
    text = text.replace("'", "&#x27;")
    
    return text
