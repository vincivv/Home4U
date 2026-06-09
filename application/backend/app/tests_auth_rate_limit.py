from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import SessionLocal, init_db
from app.main import app
from app.models.database import User
from app.utils.auth import get_password_hash
from app.utils.login_rate_limit import login_rate_limiter

client = TestClient(app)


def _create_user(password: str = "correct-pass") -> str:
    email = f"rate-limit-{uuid4().hex[:8]}@example.com"
    db = SessionLocal()
    try:
        user = User(email=email, password_hash=get_password_hash(password))
        db.add(user)
        db.commit()
        return email
    finally:
        db.close()


def test_login_rate_limit_blocks_repeated_failures():
    init_db()
    login_rate_limiter.clear()
    email = _create_user()

    try:
        for _ in range(5):
            response = client.post(
                "/auth/login",
                data={"username": email, "password": "wrong-pass"},
            )
            assert response.status_code == 401, response.text

        blocked = client.post(
            "/auth/login",
            data={"username": email, "password": "wrong-pass"},
        )

        assert blocked.status_code == 429, blocked.text
        assert blocked.headers.get("Retry-After")
    finally:
        login_rate_limiter.clear()


def test_login_rate_limit_resets_after_success():
    init_db()
    login_rate_limiter.clear()
    email = _create_user()

    try:
        for _ in range(4):
            response = client.post(
                "/auth/login",
                data={"username": email, "password": "wrong-pass"},
            )
            assert response.status_code == 401, response.text

        success = client.post(
            "/auth/login",
            data={"username": email, "password": "correct-pass"},
        )
        assert success.status_code == 200, success.text
        assert success.json()["token_type"] == "bearer"

        for _ in range(4):
            response = client.post(
                "/auth/login",
                data={"username": email, "password": "wrong-pass"},
            )
            assert response.status_code == 401, response.text

        fifth_failure = client.post(
            "/auth/login",
            data={"username": email, "password": "wrong-pass"},
        )
        assert fifth_failure.status_code == 401, fifth_failure.text

        blocked = client.post(
            "/auth/login",
            data={"username": email, "password": "wrong-pass"},
        )
        assert blocked.status_code == 429, blocked.text
    finally:
        login_rate_limiter.clear()


if __name__ == "__main__":
    test_login_rate_limit_blocks_repeated_failures()
    test_login_rate_limit_resets_after_success()
    print("auth rate limit smoke tests passed")
