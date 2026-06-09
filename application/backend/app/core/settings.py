import os
from pathlib import Path

from app.core.env import load_home4u_env

load_home4u_env()

APP_VERSION = "0.2.0"
APP_ENV = os.getenv("HOME4U_ENV", "development").strip().lower() or "development"
POSTGRESQL_URL_EXAMPLE = "postgresql+psycopg://home4u:password@localhost:5432/home4u"
POSTGRESQL_SCHEMES = ("postgresql", "postgresql+psycopg", "postgresql+psycopg2")

UPLOAD_URL_PREFIX = "/uploads"
ALLOWED_UPLOAD_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})


def _read_int_env(name: str, default: int, minimum: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default

    try:
        return max(minimum, int(raw))
    except ValueError:
        return default


def _read_bool_env(name: str, default: bool = False) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _resolve_upload_dir() -> Path:
    override = os.getenv("HOME4U_UPLOAD_DIR", "").strip()
    if override:
        return Path(override).expanduser()

    if APP_ENV == "production":
        return Path(os.getenv("HOME4U_UPLOAD_DIR", "/var/lib/home4u/uploads")).expanduser()

    return Path(__file__).resolve().parents[2] / "uploads"


def _resolve_database_url() -> str:
    raw = os.getenv("DATABASE_URL", "").strip()
    if not raw:
        if APP_ENV == "production":
            raise RuntimeError(
                "DATABASE_URL must be set in production and must use PostgreSQL, "
                f"for example: {POSTGRESQL_URL_EXAMPLE}"
            )
        raw = POSTGRESQL_URL_EXAMPLE

    scheme = raw.split(":", 1)[0].lower()
    if scheme not in POSTGRESQL_SCHEMES:
        raise RuntimeError(
            "Home4U is configured for PostgreSQL only. "
            f"Set DATABASE_URL to a PostgreSQL URL, for example: {POSTGRESQL_URL_EXAMPLE}"
        )

    return raw


def _normalize_public_asset_base() -> str:
    raw = os.getenv("HOME4U_PUBLIC_ASSET_BASE_URL", "").strip()
    return raw.rstrip("/") if raw else ""


def _format_upload_limit(max_bytes: int) -> str:
    megabytes = max_bytes / (1024 * 1024)
    if megabytes.is_integer():
        return f"{int(megabytes)}MB"
    return f"{megabytes:.1f}MB"


UPLOAD_DIR = _resolve_upload_dir()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

PUBLIC_ASSET_BASE_URL = _normalize_public_asset_base()
MAX_UPLOAD_BYTES = _read_int_env("HOME4U_MAX_UPLOAD_BYTES", 20 * 1024 * 1024, 1024)
MAX_UPLOAD_BYTES_LABEL = _format_upload_limit(MAX_UPLOAD_BYTES)
DATABASE_URL = _resolve_database_url()
DATABASE_BACKEND = DATABASE_URL.split(":", 1)[0].lower()

# AI vision feedback configuration (OpenAI-compatible endpoint)
AI_VISION_PROVIDER = os.getenv("HOME4U_AI_VISION_PROVIDER", "openai").strip().lower() or "openai"
AI_VISION_BASE_URL = os.getenv("HOME4U_AI_VISION_BASE_URL", "https://api.openai.com/v1").strip().rstrip("/")
AI_VISION_API_KEY = os.getenv("HOME4U_AI_VISION_API_KEY", "").strip()
AI_VISION_MODEL = os.getenv("HOME4U_AI_VISION_MODEL", "").strip()
AI_VISION_TIMEOUT_SECONDS = _read_int_env("HOME4U_AI_VISION_TIMEOUT_SECONDS", 18, 3)
AI_VISION_ENABLED = bool(AI_VISION_API_KEY and AI_VISION_MODEL)

# Anthropic Claude — AI analysis features (tag suggestions, resemblance, recommendations)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
AI_ANALYSIS_MODEL = os.getenv("HOME4U_AI_ANALYSIS_MODEL", "claude-haiku-4-5-20251001").strip()
AI_ANALYSIS_TIMEOUT_SECONDS = _read_int_env("HOME4U_AI_ANALYSIS_TIMEOUT_SECONDS", 25, 5)
AI_ANALYSIS_ENABLED = bool(ANTHROPIC_API_KEY and AI_ANALYSIS_MODEL)

# Legacy Gemini enhancement settings used by services/ai_design.py. These are optional
# and stay disabled unless explicitly enabled with HOME4U_AI_ENABLED and an API key.
AI_PROVIDER = os.getenv("HOME4U_AI_PROVIDER", "gemini").strip().lower() or "gemini"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", "")).strip()
GEMINI_TEXT_MODEL = os.getenv(
    "HOME4U_GEMINI_TEXT_MODEL",
    os.getenv("HOME4U_GOOGLE_GEMINI_MODEL", "gemini-2.0-flash-lite"),
).strip()
GEMINI_IMAGE_MODEL = os.getenv(
    "HOME4U_GEMINI_IMAGE_MODEL",
    "gemini-2.0-flash-preview-image-generation",
).strip()
AI_TIMEOUT_SECONDS = _read_int_env("HOME4U_AI_TIMEOUT_SECONDS", 45, 5)
AI_ENABLED = _read_bool_env("HOME4U_AI_ENABLED", False) and bool(GEMINI_API_KEY)

# Google Gemini Nano — lightweight vision provider for upload feedback and room analysis
# Set GOOGLE_API_KEY to enable. Model defaults to gemini-2.0-flash-lite (the "nano" tier),
# accessed via Google's OpenAI-compatible endpoint.
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "").strip()
GOOGLE_GEMINI_MODEL = os.getenv("HOME4U_GOOGLE_GEMINI_MODEL", "gemini-2.0-flash-lite").strip()
GOOGLE_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"
GOOGLE_GEMINI_TIMEOUT_SECONDS = _read_int_env("HOME4U_GOOGLE_GEMINI_TIMEOUT_SECONDS", 20, 5)
GOOGLE_GEMINI_ENABLED = bool(GOOGLE_API_KEY and GOOGLE_GEMINI_MODEL)


def build_public_asset_url(path: str) -> str:
    normalized = path if path.startswith("/") else f"/{path}"
    if PUBLIC_ASSET_BASE_URL:
        return f"{PUBLIC_ASSET_BASE_URL}{normalized}"
    return normalized
