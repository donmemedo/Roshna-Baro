"""One error envelope for the whole API: {"detail": str, "code": str, ...}."""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

_CODES = {401: "unauthorized", 403: "forbidden", 404: "not_found", 405: "method_not_allowed", 429: "rate_limited"}


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, detail: str, headers: dict[str, str] | None = None):
        self.status_code, self.code, self.detail, self.headers = status_code, code, detail, headers


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError):
        return JSONResponse({"detail": exc.detail, "code": exc.code}, exc.status_code, exc.headers)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException):
        code = _CODES.get(exc.status_code, "error")
        return JSONResponse({"detail": str(exc.detail), "code": code}, exc.status_code, getattr(exc, "headers", None))

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        # Never echo the submitted values back: they can contain passwords or health data.
        errors = [{"loc": [str(p) for p in e["loc"] if p != "body"], "msg": e["msg"]} for e in exc.errors()]
        return JSONResponse({"detail": "Invalid input", "code": "validation_error", "errors": errors}, 422)
