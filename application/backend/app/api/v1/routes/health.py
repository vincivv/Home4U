import platform
import time
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.database import engine
from app.core.settings import AI_ANALYSIS_ENABLED, AI_ANALYSIS_MODEL, APP_VERSION

router = APIRouter()

_BOOT_TIME = datetime.now(timezone.utc)


@router.get("/health")
def health():
    """
    Production-grade health-check endpoint.
    Returns 200 if the API AND database are both healthy.
    Returns 503 (Service Unavailable) if the database is unreachable.
    Includes diagnostics for monitoring dashboards.
    """
    diagnostics = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(
            (datetime.now(timezone.utc) - _BOOT_TIME).total_seconds(), 1
        ),
        "python": platform.python_version(),
        "version": APP_VERSION,
        "ai_enabled": AI_ANALYSIS_ENABLED,
        "ai_model": AI_ANALYSIS_MODEL if AI_ANALYSIS_ENABLED else None,
    }

    try:
        t0 = time.perf_counter()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_latency = round((time.perf_counter() - t0) * 1000, 2)

        return {
            "status": "ok",
            "db": "connected",
            "db_latency_ms": db_latency,
            **diagnostics,
        }
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "db": "unavailable",
                "detail": "Database connection failed",
                **diagnostics,
            },
        )
