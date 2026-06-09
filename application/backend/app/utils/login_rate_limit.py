import os
import time
from collections import defaultdict, deque
from threading import Lock
from typing import Optional

from fastapi import Request


def _read_int_env(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default

    try:
        return max(1, int(raw))
    except ValueError:
        return default


LOGIN_RATE_LIMIT_ATTEMPTS = _read_int_env("HOME4U_LOGIN_RATE_LIMIT_ATTEMPTS", 5)
LOGIN_RATE_LIMIT_IP_ATTEMPTS = _read_int_env("HOME4U_LOGIN_RATE_LIMIT_IP_ATTEMPTS", 20)
LOGIN_RATE_LIMIT_WINDOW_SECONDS = _read_int_env(
    "HOME4U_LOGIN_RATE_LIMIT_WINDOW_SECONDS",
    300,
)


class LoginRateLimiter:
    """Small in-memory limiter for repeated failed login attempts."""

    def __init__(self, attempts: int, ip_attempts: int, window_seconds: int):
        self.attempts = attempts
        self.ip_attempts = ip_attempts
        self.window_seconds = window_seconds
        self._lock = Lock()
        self._failures_by_identity = defaultdict(deque)
        self._failures_by_ip = defaultdict(deque)

    def _prune(self, bucket: deque[float], now: float) -> None:
        while bucket and now - bucket[0] >= self.window_seconds:
            bucket.popleft()

    def retry_after(self, client_ip: str, email: str) -> Optional[int]:
        now = time.time()
        identity_key = f"{client_ip}:{email}"

        with self._lock:
            identity_bucket = self._failures_by_identity[identity_key]
            ip_bucket = self._failures_by_ip[client_ip]
            self._prune(identity_bucket, now)
            self._prune(ip_bucket, now)

            candidates = []
            if len(identity_bucket) >= self.attempts and identity_bucket:
                candidates.append(identity_bucket[0])
            if len(ip_bucket) >= self.ip_attempts and ip_bucket:
                candidates.append(ip_bucket[0])

            if not candidates:
                return None

            oldest = min(candidates)
            return max(1, int(self.window_seconds - (now - oldest)))

    def register_failure(self, client_ip: str, email: str) -> None:
        now = time.time()
        identity_key = f"{client_ip}:{email}"

        with self._lock:
            identity_bucket = self._failures_by_identity[identity_key]
            ip_bucket = self._failures_by_ip[client_ip]
            self._prune(identity_bucket, now)
            self._prune(ip_bucket, now)
            identity_bucket.append(now)
            ip_bucket.append(now)

    def reset_identity(self, client_ip: str, email: str) -> None:
        identity_key = f"{client_ip}:{email}"
        with self._lock:
            self._failures_by_identity.pop(identity_key, None)

    def clear(self) -> None:
        with self._lock:
            self._failures_by_identity.clear()
            self._failures_by_ip.clear()


def get_request_ip(request: Request) -> str:
    """Use proxy headers only when the request itself came from localhost."""
    client_host = request.client.host if request.client else "unknown"
    if client_host in {"127.0.0.1", "::1", "localhost"}:
        forwarded_for = request.headers.get("x-forwarded-for", "")
        if forwarded_for:
            first_hop = forwarded_for.split(",")[0].strip()
            if first_hop:
                return first_hop

        real_ip = request.headers.get("x-real-ip", "").strip()
        if real_ip:
            return real_ip

    return client_host or "unknown"


login_rate_limiter = LoginRateLimiter(
    attempts=LOGIN_RATE_LIMIT_ATTEMPTS,
    ip_attempts=LOGIN_RATE_LIMIT_IP_ATTEMPTS,
    window_seconds=LOGIN_RATE_LIMIT_WINDOW_SECONDS,
)
