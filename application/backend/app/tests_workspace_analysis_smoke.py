from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import SessionLocal, init_db
from app.main import app
from app.models.database import RoomProject, Style, StyleTag, Tag, User
from app.utils.auth import create_access_token, get_password_hash

client = TestClient(app)


def ensure_style_with_tags(db, name: str, description: str, tag_names: list[str]) -> Style:
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


def test_workspace_analysis():
    init_db()
    db = SessionLocal()

    try:
        email = f"workspace-smoke-{uuid4().hex[:8]}@example.com"
        user = User(email=email, password_hash=get_password_hash("smoke-pass"))
        db.add(user)
        db.flush()

        style = ensure_style_with_tags(
            db,
            name="Scandinavian",
            description="Light, airy spaces with natural materials and cozy textures",
            tag_names=["cozy", "natural", "light-wood", "functional", "white"],
        )

        project = RoomProject(
            user_id=user.id,
            name="Living Room Project",
            room_type="Living Room",
            budget=2600,
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        db.refresh(style)

        token = create_access_token({"sub": str(user.id)})
        request_id = f"workspace-analysis-{uuid4().hex[:8]}"
        response = client.post(
            f"/projects/{project.id}/analysis",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Request-ID": request_id,
            },
            json={
                "style_id": style.id,
                "room_type": "Living Room",
                "intensity": 64,
                "lighting": "warm",
                "budget_tier": "medium",
                "image_profile": {
                    "width": 960,
                    "height": 720,
                    "aspect_ratio": 1.333,
                    "average_brightness": 0.68,
                    "average_saturation": 0.22,
                    "warmth_bias": 0.14,
                    "dominant_hex": "#d9d2c5",
                },
                "detected_tags": ["neutral", "clean"],
            },
        )

        assert response.status_code == 200, response.text
        payload = response.json()
        assert payload["selected_style"]["name"] == "Scandinavian"
        assert payload["project"]["id"] == project.id
        assert payload["style_scores"][0]["style_name"] == "Scandinavian"
        assert payload["style_scores"][0]["score_value"] >= 70
        assert payload["scan_assessment"]["confidence_label"] == "high"
        assert payload["scan_assessment"]["confidence_score"] >= 0.9
        assert payload["room_state"]["openness"] == "high"
        assert payload["room_state"]["clutter_level"] == "low"
        assert len(payload["suggested_tags"]) >= 3
        assert len(payload["recommendations"]) >= 3
        assert payload["recommendations"][0]["confidence_score"] >= 0.7
        assert payload["recommendations"][0]["reason_summary"]
        assert len(payload["shopping_plan"]) >= 3
        assert payload["shopping_plan"][0]["sources"][0]["url"].startswith("https://")
        assert len(payload["shopping_plan"][0]["products"]) >= 1
        assert payload["shopping_plan"][0]["products"][0]["url"].startswith("https://")

        saved_response = client.get(
            f"/projects/{project.id}/analysis",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert saved_response.status_code == 200, saved_response.text
        saved_payload = saved_response.json()
        assert saved_payload["selected_style"]["name"] == "Scandinavian"
        assert saved_payload["image_profile"]["dominant_hex"] == "#d9d2c5"
        assert saved_payload["image_profile"]["average_brightness"] == 0.68
        assert saved_payload["scan_assessment"]["confidence_label"] == "high"
        assert saved_payload["room_state"]["openness"] == "high"
        assert saved_payload["shopping_plan"][0]["sources"][0]["url"].startswith("https://")
        assert len(saved_payload["shopping_plan"][0]["products"]) >= 1

        runs_response = client.get(
            f"/projects/{project.id}/analysis/runs",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert runs_response.status_code == 200, runs_response.text
        runs = runs_response.json()
        assert len(runs) >= 1
        assert runs[0]["status"] == "succeeded"
        assert runs[0]["selected_style_name"] == "Scandinavian"
        assert runs[0]["recommendation_count"] >= 3
        assert runs[0]["request_id"] == request_id
        assert runs[0]["image_profile"]["dominant_hex"] == "#d9d2c5"
        assert runs[0]["scan_assessment"]["confidence_label"] == "high"
        assert runs[0]["room_state"]["openness"] == "high"
        assert runs[0]["analysis_duration_ms"] is not None
        assert runs[0]["detected_tags"] == ["neutral", "clean"]
    finally:
        db.close()


if __name__ == "__main__":
    test_workspace_analysis()
    print("workspace analysis smoke test passed")
