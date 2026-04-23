"""
Security headers middleware for enhanced security.
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.config import get_settings

settings = get_settings()


class SecurityMiddleware(BaseHTTPMiddleware):
    """Middleware for adding security headers to responses."""
    
    async def dispatch(self, request: Request, call_next):
        """Process request and add security headers to response."""
        response: Response = await call_next(request)
        
        # Content Security Policy
        # Restrict sources for scripts, styles, images, etc.
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        response.headers["Content-Security-Policy"] = csp
        
        # X-Frame-Options: Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # X-Content-Type-Options: Prevent MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # X-XSS-Protection: Enable XSS protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer-Policy: Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions-Policy: Control browser features
        permissions_policy = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )
        response.headers["Permissions-Policy"] = permissions_policy
        
        # Strict-Transport-Security (HSTS): Enforce HTTPS (production only)
        if settings.frontend_url and "https" in settings.frontend_url:
            hsts = "max-age=31536000; includeSubDomains; preload"
            response.headers["Strict-Transport-Security"] = hsts
        
        # Remove server information
        response.headers["Server"] = "Krashaq"
        
        # X-Powered-By: Remove or customize
        if "X-Powered-By" in response.headers:
            del response.headers["X-Powered-By"]
        
        return response
