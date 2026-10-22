"""The one place that reads the clock, so tests can freeze it."""
from datetime import UTC, date, datetime


def utc_now() -> datetime:
    return datetime.now(UTC)


def utc_today() -> date:
    return utc_now().date()
