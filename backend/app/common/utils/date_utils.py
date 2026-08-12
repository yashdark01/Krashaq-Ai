"""Date/time utilities with IST timezone support."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

# IST timezone
IST = ZoneInfo("Asia/Kolkata")


def now_ist() -> datetime:
    """Get current datetime in IST."""
    return datetime.now(IST)


def to_ist(dt: datetime) -> datetime:
    """Convert datetime to IST."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST)


def format_ist(dt: datetime, fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Format datetime in IST."""
    return to_ist(dt).strftime(fmt)
