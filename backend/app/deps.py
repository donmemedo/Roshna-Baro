from datetime import date

from fastapi import Query

from .clock import utc_today
from .errors import ApiError


def get_today(today: date | None = Query(None, description="Client-local date, at most 1 day from UTC today")) -> date:
    """The caller's 'today'. Iran is UTC+3:30, so the UTC date is wrong for part of every day."""
    utc = utc_today()
    if today is None:
        return utc
    if abs((today - utc).days) > 1:
        raise ApiError(422, "validation_error", "today is out of range")
    return today
