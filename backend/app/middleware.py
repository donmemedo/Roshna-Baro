"""Pure-ASGI middleware: security headers, request ids, access log, last-resort 500.

Pure ASGI (not BaseHTTPMiddleware) so it adds microseconds, not a task per request.
"""
import json
import logging
import re
import time
import uuid

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .config import settings
from .logging_config import request_id_var

log = logging.getLogger("roshana.access")
_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{8,64}$")
_DOCS = ("/docs", "/openapi.json")

_STATIC_HEADERS = {
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "permissions-policy": "geolocation=(), camera=(), microphone=(), payment=()",
    "cross-origin-opener-policy": "same-origin",
}
_API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"


async def _json(send, status: int, payload: dict) -> None:
    body = json.dumps(payload).encode()
    await send({"type": "http.response.start", "status": status,
                "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
    await send({"type": "http.response.body", "body": body})


class _BodyTooLarge(Exception):
    pass


class SecurityMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        raw = dict(scope["headers"])
        supplied = raw.get(b"x-request-id", b"").decode("latin-1")
        rid = supplied if _REQUEST_ID.match(supplied) else uuid.uuid4().hex[:16]
        https = scope.get("scheme") == "https" or raw.get(b"x-forwarded-proto") == b"https"
        path = scope["path"]
        started = False
        status = 500
        request_id_var.set(rid)
        t0 = time.perf_counter()

        declared = raw.get(b"content-length", b"")
        received = 0
        rejected = False

        async def limited_receive() -> Message:
            # Streamed/chunked bodies carry no trustworthy Content-Length: count what actually arrives.
            nonlocal received, rejected
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > settings.max_body_bytes:
                    if not started:
                        await _json(send_wrapper, 413, {"detail": "Request body too large", "code": "payload_too_large"})
                        rejected = True  # FastAPI maps a failed body read to its own 400; that must not reach the client
                    raise _BodyTooLarge
            return message

        async def send_wrapper(message: Message) -> None:
            nonlocal started, status
            if rejected:
                return
            if message["type"] == "http.response.start":
                started, status = True, message["status"]
                h = MutableHeaders(scope=message)
                for k, v in _STATIC_HEADERS.items():
                    h[k] = v
                if not path.startswith(_DOCS):
                    h["content-security-policy"] = _API_CSP
                h.setdefault("cache-control", "no-store")
                h["x-request-id"] = rid
                if https:
                    h["strict-transport-security"] = "max-age=31536000; includeSubDomains"
            await send(message)

        try:
            if declared.isdigit() and int(declared) > settings.max_body_bytes:
                raise _BodyTooLarge
            await self.app(scope, limited_receive, send_wrapper)
        except _BodyTooLarge:
            if not started:
                await _json(send_wrapper, 413, {"detail": "Request body too large", "code": "payload_too_large"})
        except Exception:
            log.exception("unhandled error", extra={"fields": {"request_id": rid, "path": path}})
            if not started:
                await _json(send_wrapper, 500, {"detail": "Internal server error", "code": "internal_error", "request_id": rid})
        finally:
            log.info("request", extra={"fields": {
                "request_id": rid, "method": scope["method"], "path": path,
                "status": status, "ms": round((time.perf_counter() - t0) * 1000, 1),
            }})
