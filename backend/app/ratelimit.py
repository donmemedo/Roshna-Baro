"""In-memory sliding-window limiter.

Single process by design (SQLite deployment). Rejection happens *before* any bcrypt work,
so a flood costs a dict lookup instead of ~250 ms of CPU. Swap `_hits` for Redis when the
API is scaled out (see docs/architecture.md).
"""
import ipaddress
import time
from collections import OrderedDict, deque

from fastapi import Request

from .errors import ApiError

_hits: dict[str, deque[float]] = {}
_MAX_WINDOW = 3600.0
_calls = 0


def _sweep(now: float) -> None:
    for key in [k for k, q in _hits.items() if not q or now - q[-1] > _MAX_WINDOW]:
        del _hits[key]


def hit(key: str, limit: int, window: float) -> int:
    """Record an attempt. Returns 0 if allowed, else the seconds until the caller may retry."""
    global _calls
    now = time.monotonic()
    _calls += 1
    if _calls % 512 == 0:
        _sweep(now)
    q = _hits.setdefault(key, deque())
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        return max(1, int(window - (now - q[0])) + 1)
    q.append(now)
    return 0


def peek(key: str, limit: int, window: float) -> int:
    """Like hit() but records nothing: 0 if under the limit, else seconds to wait."""
    now = time.monotonic()
    q = _hits.get(key)
    if not q:
        return 0
    while q and now - q[0] > window:
        q.popleft()
    return max(1, int(window - (now - q[0])) + 1) if len(q) >= limit else 0


def enforce(key: str, limit: int, window: float) -> None:
    retry = hit(key, limit, window)
    if retry:
        raise ApiError(429, "rate_limited", "Too many attempts. Try again later.", {"Retry-After": str(retry)})


def forget(key: str) -> None:
    _hits.pop(key, None)


# Addresses that have already signed in to an account. They keep working while the account-wide failure cap
# is tripped, so a stranger cannot lock the real owner out from their usual device by failing on purpose.
_known: OrderedDict[str, float] = OrderedDict()
_KNOWN_TTL = 30 * 24 * 3600.0
_KNOWN_MAX = 50_000


def remember(key: str) -> None:
    _known[key] = time.monotonic() + _KNOWN_TTL
    _known.move_to_end(key)
    while len(_known) > _KNOWN_MAX:
        _known.popitem(last=False)


def known(key: str) -> bool:
    expiry = _known.get(key)
    if expiry is None or expiry < time.monotonic():
        _known.pop(key, None)
        return False
    return True


def reset_all() -> None:
    _hits.clear()
    _known.clear()


def client_ip(request: Request) -> str:
    """Rate-limit identity of the caller. IPv6 clients are grouped by /64: one subscriber owns that
    whole block, so keying on the full address would hand an attacker 2**64 fresh buckets.
    uvicorn (FORWARDED_ALLOW_IPS) already rewrites client.host behind a trusted proxy."""
    host = request.client.host if request.client else "unknown"
    try:
        addr = ipaddress.ip_address(host)
    except ValueError:
        return host
    if isinstance(addr, ipaddress.IPv6Address):
        addr = addr.ipv4_mapped or addr
        if isinstance(addr, ipaddress.IPv6Address):
            return str(ipaddress.ip_network(f"{addr}/64", strict=False).network_address) + "/64"
    return str(addr)
