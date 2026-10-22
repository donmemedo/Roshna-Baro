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


def enforce(key: str, limit: int, window: float) -> None:
    retry = hit(key, limit, window)
    if retry:
        raise ApiError(429, "rate_limited", "Too many attempts. Try again later.", {"Retry-After": str(retry)})


def forget(key: str) -> None:
    _hits.pop(key, None)


def undo(key: str) -> None:
    """Refund the most recent reservation on `key` (a login that succeeded does not use up the budget)."""
    q = _hits.get(key)
    if q:
        q.pop()


# Addresses that have already signed in to an account. They keep working while the account-wide cap is
# tripped, so a stranger cannot lock the real owner out from their usual device by failing on purpose.
# Kept per account (a few addresses each) so signing in to unrelated accounts cannot push an owner out.
_known: dict[str, OrderedDict[str, float]] = {}
_KNOWN_TTL = 30 * 24 * 3600.0
_KNOWN_PER_ACCOUNT = 10


def remember(account: str, ip: str) -> None:
    now = time.monotonic()
    addrs = _known.setdefault(account, OrderedDict())
    addrs[ip] = now + _KNOWN_TTL
    addrs.move_to_end(ip)
    while len(addrs) > _KNOWN_PER_ACCOUNT:
        addrs.popitem(last=False)
    if len(_known) > 100_000:  # drop accounts whose addresses have all expired
        for key in [k for k, v in _known.items() if all(exp < now for exp in v.values())]:
            del _known[key]


def known(account: str, ip: str) -> bool:
    expiry = _known.get(account, {}).get(ip)
    return expiry is not None and expiry >= time.monotonic()


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
