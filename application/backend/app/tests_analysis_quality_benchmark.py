from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import SessionLocal, init_db
from app.main import app
from app.models.database import RoomProject, Style, StyleTag, Tag, User
from app.utils.auth import create_access_token, get_password_hash

client = TestClient(app)


BENCHMARK_CASES = [
    {
        "name": "airy-scandinavian-living",
        "style": {
            "name": "Benchmark Scandinavian",
            "description": "Light, airy rooms with calm materials and clean functionality.",
            "tags": ["cozy", "natural", "light-wood", "functional", "white"],
        },
        "project": {"room_type": "Living Room", "budget": 2600},
        "request": {
            "room_type": "Living Room",
            "intensity": 64,
            "lighting": "warm",
            "budget_tier": "medium",
            "image_profile": {
                "width": 980,
                "height": 720,
                "aspect_ratio": 1.36,
                "average_brightness": 0.69,
                "average_saturation": 0.18,
                "warmth_bias": 0.11,
                "dominant_hex": "#ddd4c6",
            },
            "detected_tags": ["neutral", "clean"],
        },
        "expected": {
            "scan_label": "high",
            "min_score": 80,
            "room_state": {"openness": "high", "clutter_level": "low"},
        },
    },
    {
        "name": "moody-modern-office",
        "style": {
            "name": "Benchmark Modern Office",
            "description": "Crisp, contemporary workspaces with focused contrast.",
            "tags": ["sleek", "metal", "geometric", "functional", "clean"],
        },
        "project": {"room_type": "Home Office", "budget": 3400},
        "request": {
            "room_type": "Home Office",
            "intensity": 78,
            "lighting": "cool",
            "budget_tier": "high",
            "image_profile": {
                "width": 1180,
                "height": 760,
                "aspect_ratio": 1.55,
                "average_brightness": 0.33,
                "average_saturation": 0.42,
                "warmth_bias": -0.22,
                "dominant_hex": "#3e556d",
            },
            "detected_tags": ["clean", "sleek", "monochrome"],
        },
        "expected": {
            "scan_label": "high",
            "min_score": 74,
            "room_state": {"contrast_level": "medium", "clutter_level": "low"},
        },
    },
    {
        "name": "compact-bedroom-low-confidence",
        "style": {
            "name": "Benchmark Calm Bedroom",
            "description": "Soft, restful bedrooms with quiet materials.",
            "tags": ["cozy", "simple", "natural", "neutral", "clean"],
        },
        "project": {"room_type": "Bedroom", "budget": 1800},
        "request": {
            "room_type": "Bedroom",
            "intensity": 40,
            "lighting": "warm",
            "budget_tier": "medium",
            "detected_tags": ["clean"],
        },
        "expected": {
            "scan_label": "low",
            "min_score": 55,
            "room_state": {"openness": "low"},
        },
    },
    {
        "name": "colorful-dining-eclectic",
        "style": {
            "name": "Benchmark Eclectic Dining",
            "description": "Layered dining rooms with rich color and bold styling.",
            "tags": ["colorful", "patterns", "rich-colors", "eclectic", "ornate"],
        },
        "project": {"room_type": "Dining Room", "budget": 4200},
        "request": {
            "room_type": "Dining Room",
            "intensity": 82,
            "lighting": "warm",
            "budget_tier": "high",
            "image_profile": {
                "width": 1024,
                "height": 700,
                "aspect_ratio": 1.46,
                "average_brightness": 0.48,
                "average_saturation": 0.63,
                "warmth_bias": 0.18,
                "dominant_hex": "#8b4a44",
            },
            "detected_tags": ["colorful", "patterns", "rich-colors"],
        },
        "expected": {
            "scan_label": "high",
            "min_score": 76,
            "room_state": {"clutter_level": "high", "contrast_level": "high"},
        },
    },
]


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


def _create_user_and_token() -> tuple[int, str]:
    email = f"benchmark-{uuid4().hex[:8]}@example.com"
    db = SessionLocal()
    try:
        user = User(email=email, password_hash=get_password_hash("smoke-pass"))
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id, create_access_token({"sub": str(user.id)})
    finally:
        db.close()


def test_analysis_quality_benchmarks():
    init_db()
    user_id, token = _create_user_and_token()
    headers = {"Authorization": f"Bearer {token}"}
    db = SessionLocal()

    try:
        for case in BENCHMARK_CASES:
            style = _ensure_style_with_tags(
                db,
                name=case["style"]["name"],
                description=case["style"]["description"],
                tag_names=case["style"]["tags"],
            )
            project = RoomProject(
                user_id=user_id,
                name=f"{case['name']} Room",
                room_type=case["project"]["room_type"],
                budget=case["project"]["budget"],
            )
            db.add(project)
            db.commit()
            db.refresh(project)

            response = client.post(
                f"/projects/{project.id}/analysis",
                headers=headers,
                json={"style_id": style.id, **case["request"]},
            )
            assert response.status_code == 200, f"{case['name']}: {response.text}"
            payload = response.json()
            assert payload["selected_style"]["name"] == style.name, case["name"]
            assert payload["scan_assessment"]["confidence_label"] == case["expected"]["scan_label"], case["name"]
            assert payload["style_scores"][0]["score_value"] >= case["expected"]["min_score"], case["name"]
            assert len(payload["recommendations"]) >= 3, case["name"]
            assert payload["recommendations"][0]["reason_summary"], case["name"]
            for field, expected_value in case["expected"]["room_state"].items():
                assert payload["room_state"][field] == expected_value, case["name"]
    finally:
        db.close()


if __name__ == "__main__":
    test_analysis_quality_benchmarks()
    print("analysis quality benchmarks passed")
