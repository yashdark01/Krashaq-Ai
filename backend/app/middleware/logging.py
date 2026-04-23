"""
Request/response logging middleware.
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import time
import uuid
from app.utils.logging import get_logger

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging requests and responses."""
    
    async def dispatch(self, request: Request, call_next):
        """Process request and log request/response details."""
        # Generate correlation ID
        correlation_id = str(uuid.uuid4())[:8]
        
        # Add correlation ID to request state
        request.state.correlation_id = correlation_id
        
        # Get request details
        method = request.method
        path = request.url.path
        client_host = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Log request
        logger.info(
            f"Incoming request: {method} {path}",
            extra={
                "correlation_id": correlation_id,
                "method": method,
                "endpoint": path,
                "client_host": client_host,
                "user_agent": user_agent
            }
        )
        
        # Process request
        start_time = time.time()
        try:
            response: Response = await call_next(request)
            status_code = response.status_code
            
            # Calculate response time
            response_time = time.time() - start_time
            
            # Log response
            log_level = "info" if status_code < 400 else "warning" if status_code < 500 else "error"
            getattr(logger, log_level)(
                f"Request completed: {method} {path} - Status: {status_code}",
                extra={
                    "correlation_id": correlation_id,
                    "method": method,
                    "endpoint": path,
                    "status_code": status_code,
                    "response_time": round(response_time, 3)
                }
            )
            
            # Add correlation ID to response headers
            response.headers["X-Correlation-ID"] = correlation_id
            
            return response
            
        except Exception as e:
            # Calculate response time for failed requests
            response_time = time.time() - start_time
            
            # Log error
            logger.error(
                f"Request failed: {method} {path} - Error: {str(e)}",
                extra={
                    "correlation_id": correlation_id,
                    "method": method,
                    "endpoint": path,
                    "error": str(e),
                    "response_time": round(response_time, 3)
                },
                exc_info=True
            )
            
            raise
