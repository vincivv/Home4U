"""Minimal environment file loader for local/dev and deployment overrides."""

from __future__ import annotations

import os
from pathlib import Path


def _parse_env_line(raw_line: str) -> tuple[str, str] | None:
    line = raw_line.strip()
    if not line or line.startswith("#") or "=" not in line:
        return None

    key, value = line.split("=", 1)
    key = key.strip()
    if not key:
        return None

    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1]
    return key, value


def _load_env_file(path: Path) -> None:
    if not path.exists() or not path.is_file():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        parsed = _parse_env_line(raw_line)
        if parsed is None:
            continue
        key, value = parsed
        os.environ.setdefault(key, value)


def load_home4u_env() -> None:
    """Load environment values without overriding already-exported vars."""
    backend_root = Path(__file__).resolve().parents[2]
    _load_env_file(backend_root / ".env")
    _load_env_file(Path("/etc/home4u/home4u.env"))


load_home4u_env()
