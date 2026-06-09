import logging
import os
import time
import traceback
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import api_router
from app.core.database import init_db
from app.core.settings import APP_VERSION, UPLOAD_DIR

logger = logging.getLogger(__name__)
REQUEST_ID_HEADER = "X-Request-ID"


def _parse_cors_origins() -> list[str]:
    """Return explicitly allowed cross-origin callers for direct backend access."""
    configured = os.getenv("HOME4U_CORS_ORIGINS", "").strip()
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]

    if os.getenv("HOME4U_ENV", "development") == "production":
        # Production traffic is expected to arrive through the same-origin nginx /api proxy.
        return []

    return [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
    ]


def _resolve_request_id(request: Request) -> str:
    incoming = request.headers.get(REQUEST_ID_HEADER, "").strip()
    if incoming and len(incoming) <= 128:
        return incoming
    return uuid4().hex


def _request_id_for(request: Request) -> str:
    request_id = getattr(request.state, "request_id", "")
    return request_id or uuid4().hex


def _apply_standard_headers(response, elapsed: float, request_id: str) -> None:
    """Attach diagnostic and baseline security headers to API responses."""
    response.headers[REQUEST_ID_HEADER] = request_id
    response.headers["X-Response-Time"] = f"{elapsed:.4f}s"
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()",
    )

# ---------------------------------------------------------------------------
# FastAPI Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Home4U API",
    version=APP_VERSION,
    description="Room renovation recommendation API",
)

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# ---------------------------------------------------------------------------
# Global Error Handler — catches ALL unhandled exceptions
# ---------------------------------------------------------------------------
@app.middleware("http")
async def global_error_handler(request: Request, call_next):
    """Catch any unhandled exception, log it, and return a clean JSON 500."""
    start = time.perf_counter()
    request_id = _resolve_request_id(request)
    request.state.request_id = request_id
    try:
        response = await call_next(request)
        elapsed = time.perf_counter() - start
        _apply_standard_headers(response, elapsed, request_id)
        return response
    except Exception as exc:
        elapsed = time.perf_counter() - start
        logger.error(
            "Unhandled %s on %s %s [request_id=%s] (%.4fs): %s\n%s",
            type(exc).__name__,
            request.method,
            request.url.path,
            request_id,
            elapsed,
            exc,
            traceback.format_exc(),
        )
        response = JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error. Our team has been notified.",
                "type": type(exc).__name__,
                "request_id": request_id,
            },
        )
        _apply_standard_headers(response, elapsed, request_id)
        return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Return consistent JSON payloads for handled HTTP errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "request_id": _request_id_for(request),
        },
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Expose validation failures with a request identifier for QA/debugging."""
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Request validation failed",
            "errors": exc.errors(),
            "request_id": _request_id_for(request),
        },
    )


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes (Vite proxy handles /api -> backend routing)
app.include_router(api_router)


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------
@app.on_event("startup")
def startup_event():
    """Initialize database on startup."""
    init_db()


@app.get("/")
def root():
    return {"message": "Home4U API is running. Visit /docs for Swagger UI."}
