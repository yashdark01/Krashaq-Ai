"""
Rate limiting middleware using sliding window algorithm with Redis.
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from typing import Optional
import redis
import time
from app.config import get_settings

settings = get_settings()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for rate limiting API requests."""
    
    def __init__(self, app):
        super().__init__(app)
        self.redis_client = None
        self.redis_available = False
        self._connect_redis()
        
        # Rate limit configurations (requests per minute)
        self.default_limit = 100  # per IP
        self.user_limit = 200  # per authenticated user
        self.endpoint_limits = {
            "/webhook": 10,  # webhook endpoint
            "/api/chat": 30,  # chat endpoint
            "/api/auth/login/email": 10,  # login endpoint
            "/api/auth/signup": 5,  # signup endpoint
        }
    
    def _connect_redis(self):
        """Try to connect to Redis, disable rate limiting if not available."""
        try:
            self.redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            # Test connection
            self.redis_client.ping()
            self.redis_available = True
            print("Rate limiting middleware: Redis connected successfully")
        except Exception as e:
            self.redis_available = False
            print(f"Rate limiting middleware: Redis not available ({e}), rate limiting disabled")
    
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting."""
        # Skip rate limiting for health check and root endpoint
        if request.url.path in ["/", "/health"]:
            return await call_next(request)
        
        # Skip rate limiting if Redis is not available
        if not self.redis_available:
            return await call_next(request)
        
        # Get client identifier (IP or user ID)
        client_id = self._get_client_id(request)
        
        # Get rate limit for this endpoint
        limit = self._get_limit_for_endpoint(request.url.path)
        
        # Check rate limit
        if not await self._check_rate_limit(client_id, limit, request.url.path):
            return self._rate_limit_exceeded_response(limit)
        
        # Add rate limit headers to response
        response = await call_next(request)
        self._add_rate_limit_headers(response, client_id, limit, request.url.path)
        
        return response
    
    def _get_client_id(self, request: Request) -> str:
        """Get client identifier from request."""
        # Try to get user ID from auth header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            # Extract user ID from token (simplified - in production verify token)
            return f"user:{auth_header[7:]}"
        
        # Fall back to IP address
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}"
    
    def _get_limit_for_endpoint(self, path: str) -> int:
        """Get rate limit for specific endpoint."""
        # Check exact match
        if path in self.endpoint_limits:
            return self.endpoint_limits[path]
        
        # Check prefix match
        for endpoint, limit in self.endpoint_limits.items():
            if path.startswith(endpoint):
                return limit
        
        # Check if it's a user-specific endpoint (authenticated)
        if path.startswith("/api/") and "auth" not in path:
            return self.user_limit
        
        # Default limit
        return self.default_limit
    
    async def _check_rate_limit(self, client_id: str, limit: int, path: str) -> bool:
        """Check if client has exceeded rate limit using sliding window."""
        current_time = int(time.time())
        window_start = current_time - 60  # 1 minute window
        
        # Redis key for this client and endpoint
        key = f"ratelimit:{client_id}:{path}"
        
        # Remove old entries outside the window
        self.redis_client.zremrangebyscore(key, 0, window_start)
        
        # Count current requests in window
        current_count = self.redis_client.zcard(key)
        
        if current_count >= limit:
            return False
        
        # Add current request
        self.redis_client.zadd(key, {str(current_time): current_time})
        
        # Set expiry on key (2 minutes to ensure cleanup)
        self.redis_client.expire(key, 120)
        
        return True
    
    def _rate_limit_exceeded_response(self, limit: int) -> JSONResponse:
        """Return response when rate limit is exceeded."""
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": f"Rate limit exceeded. Maximum {limit} requests per minute allowed.",
                "limit": limit,
                "window": "1 minute"
            }
        )
    
    def _add_rate_limit_headers(self, response, client_id: str, limit: int, path: str):
        """Add rate limit headers to response."""
        if not self.redis_available:
            return
        
        current_time = int(time.time())
        window_start = current_time - 60
        key = f"ratelimit:{client_id}:{path}"
        
        try:
            # Get current count
            self.redis_client.zremrangebyscore(key, 0, window_start)
            current_count = self.redis_client.zcard(key)
            
            remaining = max(0, limit - current_count)
            reset_time = current_time + 60
            
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(reset_time)
        except Exception as e:
            # Silently fail if Redis is unavailable
            pass
