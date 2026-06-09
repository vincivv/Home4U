from io import BytesIO
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import SessionLocal, init_db
from app.core.settings import MAX_UPLOAD_BYTES, MAX_UPLOAD_BYTES_LABEL, UPLOAD_DIR
from app.main import app
from app.models.database import Recommendation, RoomProject, Style, StyleTag, Tag, User
from app.utils.auth import create_access_token, get_password_hash
from app.utils.login_rate_limit import login_rate_limiter

client = TestClient(app)


def _ensure_style_with_tags(db, name: str, description: str, tag_names: list[str]) -> Style:
    style = db.query(Style).filter(Style.name == name).first()
    if style is None:
        style = Style(name=name, description=description)
        db.add(style)
        db.flush()

    existing_tag_ids = {style_tag.tag_id for style_tag in style.style_tags}
    for tag_name in tag_names:
        tag = db.query(Tag).filter(Tag.name == tag_name).first()
        if tag is None:
            tag = Tag(name=tag_name)
            db.add(tag)
            db.flush()
        if tag.id not in existing_tag_ids:
            db.add(StyleTag(style_id=style.id, tag_id=tag.id, weight=1.0))

    db.flush()
    db.refresh(style)
    return style


def _create_user(password: str = "smoke-pass") -> tuple[int, str, dict[str, str]]:
    email = f"api-smoke-{uuid4().hex[:8]}@example.com"
    db = SessionLocal()
    try:
        user = User(email=email, password_hash=get_password_hash(password))
        db.add(user)
        db.commit()
        db.refresh(user)
        token = create_access_token({"sub": str(user.id)})
        return user.id, email, {"Authorization": f"Bearer {token}"}
    finally:
        db.close()


def _create_project_for_user(
    user_id: int,
    room_type: str = "Living Room",
    budget: float = 0.0,
    name: str | None = None,
) -> RoomProject:
    db = SessionLocal()
    try:
        project = RoomProject(
            user_id=user_id,
            name=name or f"{room_type} Project",
            room_type=room_type,
            budget=budget,
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return project
    finally:
        db.close()


def _cleanup_uploaded_photo(photo_url: str) -> None:
    filename = photo_url.rstrip("/").split("/")[-1]
    if filename:
        (UPLOAD_DIR / filename).unlink(missing_ok=True)


def test_health_exposes_request_id_and_security_headers():
    init_db()
    request_id = f"health-smoke-{uuid4().hex[:8]}"

    response = client.get("/health", headers={"X-Request-ID": request_id})
    assert response.status_code == 200, response.text
    assert response.headers["X-Request-ID"] == request_id
    assert response.headers.get("X-Response-Time")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.json()["status"] == "ok"


def test_auth_normalizes_login_and_me_response():
    init_db()
    login_rate_limiter.clear()
    mixed_case_email = f"Qa-Smoke-{uuid4().hex[:8]}@Example.com"

    try:
        signup = client.post(
            "/auth/signup",
            json={"email": mixed_case_email, "password": "smoke-pass"},
        )
        assert signup.status_code == 201, signup.text
        assert signup.json()["email"] == mixed_case_email.lower()

        duplicate = client.post(
            "/auth/signup",
            json={"email": mixed_case_email.lower(), "password": "smoke-pass"},
        )
        assert duplicate.status_code == 400, duplicate.text
        assert duplicate.json()["detail"] == "Email already registered"

        login = client.post(
            "/auth/login",
            data={"username": f"  {mixed_case_email.upper()}  ", "password": "smoke-pass"},
        )
        assert login.status_code == 200, login.text
        token = login.json()["access_token"]

        me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200, me.text
        assert me.json()["email"] == mixed_case_email.lower()
    finally:
        login_rate_limiter.clear()


def test_projects_require_auth_and_stay_owner_scoped():
    init_db()
    owner_id, _, owner_headers = _create_user()
    _, _, stranger_headers = _create_user()

    unauthenticated = client.get("/projects/")
    assert unauthenticated.status_code == 401, unauthenticated.text

    created = client.post(
        "/projects/",
        json={"room_type": "Bedroom"},
        headers=owner_headers,
    )
    assert created.status_code == 201, created.text
    project_id = created.json()["id"]
    assert created.json()["user_id"] == owner_id
    assert created.json()["name"] == f"Bedroom Project #{project_id}"

    foreign_read = client.get(f"/projects/{project_id}", headers=stranger_headers)
    assert foreign_read.status_code == 404, foreign_read.text

    foreign_delete = client.delete(f"/projects/{project_id}", headers=stranger_headers)
    assert foreign_delete.status_code == 404, foreign_delete.text

    request_id = f"missing-analysis-{uuid4().hex[:8]}"
    missing_analysis = client.get(
        f"/projects/{project_id}/analysis",
        headers={**owner_headers, "X-Request-ID": request_id},
    )
    assert missing_analysis.status_code == 404, missing_analysis.text
    assert missing_analysis.json()["detail"] == "Project analysis not found"
    assert missing_analysis.json()["request_id"] == request_id


def test_project_and_recommendation_lists_support_filters_and_pagination():
    init_db()
    user_id, _, headers = _create_user()
    project_a = _create_project_for_user(user_id, room_type="Living Room", budget=1200)
    project_b = _create_project_for_user(user_id, room_type="Bedroom", budget=3200)
    project_c = _create_project_for_user(user_id, room_type="Living Room", budget=2200)
    db = SessionLocal()

    try:
        db.add_all([
            Recommendation(
                room_project_id=project_a.id,
                description="Paint the room",
                priority_score=80,
                estimated_cost=300,
                is_completed=False,
            ),
            Recommendation(
                room_project_id=project_a.id,
                description="Add curtains",
                priority_score=50,
                estimated_cost=120,
                is_completed=True,
            ),
            Recommendation(
                room_project_id=project_a.id,
                description="Upgrade lighting",
                priority_score=70,
                estimated_cost=260,
                is_completed=False,
            ),
        ])
        db.commit()

        projects = client.get(
            "/projects/?room_type=Living%20Room&sort=budget_desc&limit=1&page=2",
            headers=headers,
        )
        assert projects.status_code == 200, projects.text
        assert projects.headers["X-Total-Count"] == "2"
        assert projects.headers["X-Page"] == "2"
        assert projects.headers["X-Limit"] == "1"
        payload = projects.json()
        assert len(payload) == 1
        assert payload[0]["id"] == project_a.id

        recommendations = client.get(
            f"/recommendations/project/{project_a.id}?status=open&sort=priority_desc&limit=1&page=1",
            headers=headers,
        )
        assert recommendations.status_code == 200, recommendations.text
        assert recommendations.headers["X-Total-Count"] == "2"
        assert recommendations.headers["X-Page"] == "1"
        assert recommendations.headers["X-Limit"] == "1"
        rec_payload = recommendations.json()
        assert len(rec_payload) == 1
        assert rec_payload[0]["description"] == "Paint the room"
        assert rec_payload[0]["is_completed"] is False

        completed = client.get(
            f"/recommendations/project/{project_a.id}?status=completed",
            headers=headers,
        )
        assert completed.status_code == 200, completed.text
        completed_payload = completed.json()
        assert len(completed_payload) == 1
        assert completed_payload[0]["description"] == "Add curtains"
        assert completed_payload[0]["is_completed"] is True
    finally:
        db.close()


def test_project_budget_validation_and_photo_limits():
    init_db()
    user_id, _, headers = _create_user()
    project = _create_project_for_user(user_id)

    invalid_create = client.post(
        "/projects/",
        json={"room_type": "   "},
        headers=headers,
    )
    assert invalid_create.status_code == 422, invalid_create.text

    invalid_room_type = client.put(
        f"/projects/{project.id}",
        json={"room_type": "   "},
        headers=headers,
    )
    assert invalid_room_type.status_code == 422, invalid_room_type.text

    invalid_budget = client.put(
        f"/projects/{project.id}",
        json={"budget": -25},
        headers=headers,
    )
    assert invalid_budget.status_code == 422, invalid_budget.text

    renamed = client.put(
        f"/projects/{project.id}",
        json={"name": "Client Presentation Room"},
        headers=headers,
    )
    assert renamed.status_code == 200, renamed.text
    assert renamed.json()["name"] == "Client Presentation Room"

    oversized_upload = client.post(
        f"/projects/{project.id}/photo",
        headers=headers,
        files={
            "file": (
                "room.png",
                BytesIO(b"x" * (MAX_UPLOAD_BYTES + 1)),
                "image/png",
            )
        },
    )
    assert oversized_upload.status_code == 413, oversized_upload.text
    assert oversized_upload.json()["detail"] == f"File too large (max {MAX_UPLOAD_BYTES_LABEL})"

    upload_request_id = f"upload-smoke-{uuid4().hex[:8]}"
    valid_upload = client.post(
        f"/projects/{project.id}/photo",
        headers={**headers, "X-Request-ID": upload_request_id},
        files={
            "file": (
                "room.png",
                BytesIO(b"fake-image-bytes"),
                "image/png",
            )
        },
    )
    assert valid_upload.status_code == 200, valid_upload.text
    assert valid_upload.headers["X-Request-ID"] == upload_request_id
    upload_payload = valid_upload.json()
    assert upload_payload["project"]["id"] == project.id
    photo_url = upload_payload["project"]["photo_url"]
    assert "/uploads/" in photo_url
    assert photo_url.split("/")[-1].startswith(f"project_{project.id}_")
    _cleanup_uploaded_photo(photo_url)


def test_recommendation_routes_support_generate_and_complete():
    init_db()
    user_id, _, headers = _create_user()
    _, _, stranger_headers = _create_user()
    db = SessionLocal()

    try:
        style = _ensure_style_with_tags(
            db,
            name="Warm Minimal",
            description="Balanced, natural, understated interiors with layered comfort.",
            tag_names=["cozy", "natural", "clean", "neutral", "functional"],
        )
        project = RoomProject(
            user_id=user_id,
            name="Living Room Project",
            room_type="Living Room",
            budget=2400,
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        db.refresh(style)

        analysis = client.post(
            f"/projects/{project.id}/analysis",
            headers=headers,
            json={
                "style_id": style.id,
                "room_type": "Living Room",
                "intensity": 82,
                "lighting": "cool",
                "budget_tier": "high",
                "image_profile": {
                    "width": 1200,
                    "height": 900,
                    "aspect_ratio": 1.333,
                    "average_brightness": 0.57,
                    "average_saturation": 0.24,
                    "warmth_bias": -0.16,
                    "dominant_hex": "#6f8297",
                },
                "detected_tags": ["neutral", "cozy"],
            },
        )
        assert analysis.status_code == 200, analysis.text
        analysis_payload = analysis.json()
        assert analysis_payload["selected_style"]["name"] == "Warm Minimal"
        assert len(analysis_payload["recommendations"]) >= 4
        assert analysis_payload["scan_assessment"]["confidence_label"] == "high"
        assert analysis_payload["room_state"]["contrast_level"] == "low"
        assert analysis_payload["recommendations"][0]["confidence_score"] >= 0.7
        assert analysis_payload["recommendations"][0]["reason_summary"]

        recommendation_list = client.get(
            f"/recommendations/project/{project.id}",
            headers=headers,
        )
        assert recommendation_list.status_code == 200, recommendation_list.text
        recs = recommendation_list.json()
        assert len(recs) >= 3
        assert all(
            recs[index]["priority_score"] >= recs[index + 1]["priority_score"]
            for index in range(len(recs) - 1)
        )

        foreign_list = client.get(
            f"/recommendations/project/{project.id}",
            headers=stranger_headers,
        )
        assert foreign_list.status_code == 404, foreign_list.text

        regenerated = client.post(
            f"/recommendations/generate/{project.id}",
            headers=headers,
        )
        assert regenerated.status_code == 200, regenerated.text
        regenerated_payload = regenerated.json()
        assert len(regenerated_payload) >= 4
        assert regenerated_payload[0]["confidence_score"] >= 0.6
        assert regenerated_payload[0]["reason_summary"]
        assert any(
            "crisp, bright, and focused" in recommendation["description"]
            for recommendation in regenerated_payload
        )
        assert any(
            "statement furnishing" in recommendation["description"]
            for recommendation in regenerated_payload
        )

        saved_analysis = client.get(
            f"/projects/{project.id}/analysis",
            headers=headers,
        )
        assert saved_analysis.status_code == 200, saved_analysis.text
        saved_analysis_payload = saved_analysis.json()
        assert saved_analysis_payload["image_profile"]["dominant_hex"] == "#6f8297"
        assert saved_analysis_payload["image_profile"]["warmth_bias"] == -0.16
        assert saved_analysis_payload["scan_assessment"]["confidence_label"] == "high"
        assert saved_analysis_payload["room_state"]["contrast_level"] == "low"

        completed = client.put(
            f"/recommendations/{regenerated_payload[0]['id']}/complete",
            headers=headers,
        )
        assert completed.status_code == 200, completed.text
        assert completed.json()["is_completed"] is True
    finally:
        db.close()


def test_analysis_run_history_tracks_failed_and_successful_attempts():
    init_db()
    user_id, _, headers = _create_user()
    db = SessionLocal()

    try:
        style = _ensure_style_with_tags(
            db,
            name="Quiet Contemporary",
            description="Balanced contemporary spaces with warm neutrals and clean structure.",
            tag_names=["clean", "neutral", "functional", "cozy", "sleek"],
        )
        project = RoomProject(
            user_id=user_id,
            name="Living Room Project",
            room_type="Living Room",
            budget=2200,
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        db.refresh(style)

        failed_request_id = f"analysis-fail-{uuid4().hex[:8]}"
        failed = client.post(
            f"/projects/{project.id}/analysis",
            headers={**headers, "X-Request-ID": failed_request_id},
            json={
                "style_id": 999999,
                "room_type": "Living Room",
                "intensity": 55,
                "lighting": "warm",
                "budget_tier": "medium",
            },
        )
        assert failed.status_code == 404, failed.text

        success_request_id = f"analysis-pass-{uuid4().hex[:8]}"
        succeeded = client.post(
            f"/projects/{project.id}/analysis",
            headers={**headers, "X-Request-ID": success_request_id},
            json={
                "style_id": style.id,
                "room_type": "Living Room",
                "intensity": 58,
                "lighting": "warm",
                "budget_tier": "medium",
                "detected_tags": ["neutral", "clean"],
            },
        )
        assert succeeded.status_code == 200, succeeded.text

        runs = client.get(
            f"/projects/{project.id}/analysis/runs",
            headers=headers,
        )
        assert runs.status_code == 200, runs.text
        assert runs.headers["X-Total-Count"] == "2"
        assert runs.headers["X-Page"] == "1"
        assert runs.headers["X-Limit"] == "10"
        payload = runs.json()
        assert len(payload) >= 2
        assert payload[0]["request_id"] == success_request_id
        assert payload[0]["status"] == "succeeded"
        assert payload[0]["selected_style_name"] == "Quiet Contemporary"
        assert payload[0]["recommendation_count"] >= 3
        assert payload[0]["image_profile"] is None
        assert payload[0]["scan_assessment"]["confidence_label"] == "low"
        assert payload[0]["scan_assessment"]["warnings"]
        assert payload[0]["room_state"]["openness"] == "medium"
        assert payload[0]["analysis_duration_ms"] is not None
        assert payload[0]["detected_tags"] == ["neutral", "clean"]
        assert payload[1]["request_id"] == failed_request_id
        assert payload[1]["status"] == "failed"
        assert payload[1]["error_message"] == "Selected style not found"

        failed_only = client.get(
            f"/projects/{project.id}/analysis/runs?status=failed&limit=5",
            headers=headers,
        )
        assert failed_only.status_code == 200, failed_only.text
        assert failed_only.headers["X-Total-Count"] == "1"
        failed_payload = failed_only.json()
        assert len(failed_payload) >= 1
        assert all(run["status"] == "failed" for run in failed_payload)
    finally:
        db.close()


def test_analysis_validation_rejects_tiny_or_missing_scan_inputs():
    init_db()
    user_id, _, headers = _create_user()
    db = SessionLocal()

    try:
        style = _ensure_style_with_tags(
            db,
            name="Benchmark Minimal",
            description="Quiet interiors with simple, functional furniture.",
            tag_names=["clean", "simple", "neutral", "functional"],
        )
        project = RoomProject(
            user_id=user_id,
            name="Bedroom Scan Validation",
            room_type="Bedroom",
            budget=1800,
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        db.refresh(style)

        tiny = client.post(
            f"/projects/{project.id}/analysis",
            headers=headers,
            json={
                "style_id": style.id,
                "room_type": "Bedroom",
                "intensity": 45,
                "lighting": "warm",
                "budget_tier": "medium",
                "image_profile": {
                    "width": 120,
                    "height": 180,
                    "aspect_ratio": 0.666,
                    "average_brightness": 0.42,
                    "average_saturation": 0.19,
                    "warmth_bias": 0.06,
                    "dominant_hex": "#cabfb2",
                },
                "detected_tags": [],
            },
        )
        assert tiny.status_code == 422, tiny.text
        assert "too small" in tiny.json()["detail"].lower()

        missing = client.post(
            f"/projects/{project.id}/analysis",
            headers=headers,
            json={
                "style_id": style.id,
                "room_type": "Bedroom",
                "intensity": 45,
                "lighting": "warm",
                "budget_tier": "medium",
                "detected_tags": [],
            },
        )
        assert missing.status_code == 422, missing.text
        assert "requires either a valid room image profile or detected room tags" in missing.json()["detail"].lower()
    finally:
        db.close()


if __name__ == "__main__":
    test_health_exposes_request_id_and_security_headers()
    test_auth_normalizes_login_and_me_response()
    test_projects_require_auth_and_stay_owner_scoped()
    test_project_budget_validation_and_photo_limits()
    test_recommendation_routes_support_generate_and_complete()
    test_analysis_validation_rejects_tiny_or_missing_scan_inputs()
    print("API smoke tests passed")
