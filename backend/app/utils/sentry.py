"""
Sentry error tracking integration for Krashaq backend.
"""
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration
from app.config import get_settings

settings = get_settings()


def init_sentry():
    """Initialize Sentry for error tracking."""
    if not settings.sentry_dsn or settings.sentry_dsn == "":
        print("Sentry DSN not configured, skipping Sentry initialization")
        return
    
    # Determine environment
    environment = "development"
    if settings.frontend_url and "localhost" not in settings.frontend_url:
        environment = "production"
    elif settings.frontend_url and "staging" in settings.frontend_url:
        environment = "staging"
    
    # Initialize Sentry
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[
            FastApiIntegration(),
            LoggingIntegration(level=logging.ERROR),  # Only send ERROR logs
            HttpxIntegration(),
        ],
        environment=environment,
        release="1.0.0",  # Should be replaced with actual version from CI/CD
        traces_sample_rate=0.1,  # Sample 10% of transactions for performance monitoring
        profiles_sample_rate=0.1,  # Sample 10% of profiles for performance profiling
        before_send_transaction=before_send_transaction,
        before_send=before_send,
    )
    
    print(f"Sentry initialized for environment: {environment}")


def before_send(event, hint):
    """
    Process event before sending to Sentry.
    Filter sensitive data and add custom context.
    """
    # Filter sensitive data from request headers
    if "request" in event and "headers" in event["request"]:
        headers = event["request"]["headers"]
        sensitive_headers = ["authorization", "cookie", "x-api-key", "x-auth-token"]
        for header in sensitive_headers:
            if header in headers:
                headers[header] = "[FILTERED]"
    
    # Filter sensitive data from extra data
    if "extra" in event:
        extra = event["extra"]
        sensitive_keys = ["password", "token", "secret", "api_key", "auth_token"]
        for key in sensitive_keys:
            if key in extra:
                extra[key] = "[FILTERED]"
    
    # Add custom tags
    if "tags" not in event:
        event["tags"] = {}
    event["tags"]["app"] = "krashaq"
    event["tags"]["component"] = "backend"
    
    return event


def before_send_transaction(event, hint):
    """
    Process transaction before sending to Sentry.
    Add LangSmith trace ID if available.
    """
    # Add LangSmith trace ID if available
    if "contexts" in event and "trace" in event["contexts"]:
        trace_context = event["contexts"]["trace"]
        # If LangSmith is being used, the trace_id might be in the transaction metadata
        # This is a placeholder - actual implementation depends on LangSmith integration
        pass
    
    return event


def set_user_context(user_id: str, email: str = None, username: str = None):
    """
    Set user context for Sentry error reports.
    
    Args:
        user_id: User ID
        email: User email (optional)
        username: Username (optional)
    """
    sentry_sdk.set_user({
        "id": user_id,
        "email": email,
        "username": username
    })


def set_request_context(request):
    """
    Set request context for Sentry error reports.
    
    Args:
        request: FastAPI request object
    """
    sentry_sdk.set_context("request", {
        "url": str(request.url),
        "method": request.method,
        "path": request.url.path,
        "query_params": dict(request.query_params),
        "client_host": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    })


def set_langsmith_trace_context(trace_id: str):
    """
    Set LangSmith trace ID in Sentry context for linking.
    
    Args:
        trace_id: LangSmith trace ID
    """
    sentry_sdk.set_tag("langsmith_trace_id", trace_id)
    sentry_sdk.set_context("langsmith", {"trace_id": trace_id})


def add_breadcrumb(message: str, category: str = "default", level: str = "info"):
    """
    Add a breadcrumb for better error context.
    
    Args:
        message: Breadcrumb message
        category: Breadcrumb category
        level: Breadcrumb level (info, warning, error)
    """
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        level=level
    )


def capture_exception(exception, extra_context: dict = None):
    """
    Capture an exception and send to Sentry.
    
    Args:
        exception: Exception to capture
        extra_context: Additional context to include
    """
    if extra_context:
        sentry_sdk.set_context("extra", extra_context)
    sentry_sdk.capture_exception(exception)


def capture_message(message: str, level: str = "info", extra_context: dict = None):
    """
    Capture a message and send to Sentry.
    
    Args:
        message: Message to capture
        level: Message level (info, warning, error)
        extra_context: Additional context to include
    """
    if extra_context:
        sentry_sdk.set_context("extra", extra_context)
    sentry_sdk.capture_message(message, level=level)
