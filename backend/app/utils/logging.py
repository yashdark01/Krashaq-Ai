"""
Structured logging configuration for Krashaq backend.
"""
import logging
import logging.config
import json
import uuid
from datetime import datetime
from typing import Any, Dict
try:
    from pythonjsonlogger import jsonlogger
except ImportError:
    from pythonjsonlogger.json import JsonFormatter as jsonlogger

from app.config import get_settings

settings = get_settings()


# Sensitive data patterns to filter
SENSITIVE_PATTERNS = [
    "password",
    "token",
    "secret",
    "api_key",
    "auth_token",
    "access_token",
    "refresh_token",
    "credit_card",
    "ssn",
    "pin"
]


class ContextFilter(logging.Filter):
    """Add contextual information to log records."""
    
    def filter(self, record):
        # Add correlation ID if not present
        if not hasattr(record, "correlation_id"):
            record.correlation_id = str(uuid.uuid4())[:8]
        
        # Add timestamp if not present
        if not hasattr(record, "timestamp"):
            record.timestamp = datetime.utcnow().isoformat()
        
        # Add environment
        if not hasattr(record, "environment"):
            record.environment = "development" if settings.frontend_url and "localhost" in settings.frontend_url else "production"
        
        return record


class SensitiveDataFilter(logging.Filter):
    """Filter sensitive data from log messages."""
    
    def filter(self, record):
        if hasattr(record, "msg") and isinstance(record.msg, str):
            record.msg = self._filter_sensitive(record.msg)
        
        if hasattr(record, "args") and record.args:
            record.args = tuple(self._filter_sensitive(str(arg)) if isinstance(arg, str) else arg for arg in record.args)
        
        return record
    
    def _filter_sensitive(self, text: str) -> str:
        """Filter out sensitive data from text."""
        text_lower = text.lower()
        
        for pattern in SENSITIVE_PATTERNS:
            if pattern in text_lower:
                # Find the pattern and replace its value
                # This is a simple implementation - in production use more sophisticated parsing
                parts = text.split()
                for i, part in enumerate(parts):
                    if pattern in part.lower() and "=" in part:
                        key, value = part.split("=", 1)
                        # Keep key, mask value
                        parts[i] = f"{key}=***"
                text = " ".join(parts)
        
        return text


def setup_logging():
    """Configure structured logging for the application."""
    
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # JSON formatter for production
    json_formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
        timestamp=True
    )
    
    # Text formatter for development
    text_formatter = logging.Formatter(
        fmt="[%(asctime)s] [%(correlation_id)s] [%(levelname)s] %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)
    
    # Use JSON formatter in production, text in development
    if settings.frontend_url and "localhost" not in settings.frontend_url:
        console_handler.setFormatter(json_formatter)
    else:
        console_handler.setFormatter(text_formatter)
    
    # File handler with rotation
    from logging.handlers import TimedRotatingFileHandler
    
    file_handler = TimedRotatingFileHandler(
        "logs/app.log",
        when="midnight",
        interval=1,
        backupCount=30
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(json_formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Add handlers
    root_logger.addHandler(console_handler)
    
    # Add file handler in production
    if settings.frontend_url and "localhost" not in settings.frontend_url:
        root_logger.addHandler(file_handler)
    
    # Add filters
    context_filter = ContextFilter()
    sensitive_filter = SensitiveDataFilter()
    
    for handler in root_logger.handlers:
        handler.addFilter(context_filter)
        handler.addFilter(sensitive_filter)
    
    # Set specific log levels for noisy libraries
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("motor").setLevel(logging.WARNING)
    logging.getLogger("pymongo").setLevel(logging.WARNING)
    
    logging.info("Logging configured successfully")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger with the specified name.
    
    Args:
        name: Logger name (typically __name__)
    
    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)


class LoggerAdapter(logging.LoggerAdapter):
    """Logger adapter for adding contextual information."""
    
    def __init__(self, logger: logging.Logger, extra: Dict[str, Any]):
        super().__init__(logger, extra)
    
    def process(self, msg, kwargs):
        """Add contextual information to log record."""
        kwargs["extra"] = kwargs.get("extra", {})
        kwargs["extra"].update(self.extra)
        return msg, kwargs


def get_context_logger(name: str, **context) -> LoggerAdapter:
    """
    Get a logger adapter with contextual information.
    
    Args:
        name: Logger name
        **context: Contextual information (user_id, session_id, etc.)
    
    Returns:
        Logger adapter with context
    """
    logger = get_logger(name)
    return LoggerAdapter(logger, context)
