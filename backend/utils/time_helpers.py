from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

def now_ist() -> str:
    """Return current IST time as ISO format string."""
    return datetime.now(IST).isoformat()
