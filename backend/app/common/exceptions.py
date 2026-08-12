"""Custom exception hierarchy for Krashaq."""


class KrashaqException(Exception):
    """Base exception for Krashaq."""
    pass


class DatabaseException(KrashaqException):
    """Database related exceptions."""
    pass


class RedisException(KrashaqException):
    """Redis related exceptions."""
    pass


class ExternalAPIException(KrashaqException):
    """External API related exceptions."""
    pass


class ScraperException(KrashaqException):
    """Scraper related exceptions."""
    pass


class LLMException(KrashaqException):
    """LLM related exceptions."""
    pass


class ValidationException(KrashaqException):
    """Validation related exceptions."""
    pass
