"""Optional AI enhancement layer for project analysis."""

from __future__ import annotations

import base64
import json
import logging
import mimetypes
import uuid
from pathlib import Path
from typing import Any, Optional

import httpx

from app.core.settings import (
    AI_ENABLED,
    AI_PROVIDER,
    AI_TIMEOUT_SECONDS,
    GEMINI_API_KEY,
    GEMINI_IMAGE_MODEL,
    GEMINI_TEXT_MODEL,
    UPLOAD_DIR,
    build_public_asset_url,
)
from app.models.database import Recommendation, RoomProject, Style

logger = logging.getLogger(__name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


def maybe_enhance_analysis_with_ai(
    *,
    project: RoomProject,
    selected_style: Style,
    room_type: str,
    intensity: int,
    lighting: str,
    budget_tier: str,
    image_profile: Optional[dict],
    suggested_tags: list[dict[str, Any]],
    style_scores: list[dict[str, Any]],
    recommendations: list[Recommendation],
) -> dict[str, Any]:
    """Best-effort AI enhancement for summary, recommendations, and concept image."""
    if not AI_ENABLED or AI_PROVIDER != "gemini":
        return {}

    photo_path = _resolve_project_photo_path(project.photo_url)
    if photo_path is None:
        return {}

    try:
        image_bytes = photo_path.read_bytes()
    except OSError as exc:
        logger.warning("Could not read project photo for AI enhancement: %s", exc)
        return {}

    mime_type, _ = mimetypes.guess_type(str(photo_path))
    mime_type = mime_type or "image/webp"

    baseline_recommendations = [
        {
            "description": recommendation.description,
            "priority_score": float(recommendation.priority_score or 0.0),
            "estimated_cost": float(recommendation.estimated_cost or 0.0),
        }
        for recommendation in recommendations
    ]

    text_payload = _gemini_json_request(
        model=GEMINI_TEXT_MODEL,
        prompt=_build_recommendation_prompt(
            project=project,
            selected_style=selected_style,
            room_type=room_type,
            intensity=intensity,
            lighting=lighting,
            budget_tier=budget_tier,
            image_profile=image_profile,
            suggested_tags=suggested_tags,
            style_scores=style_scores,
            baseline_recommendations=baseline_recommendations,
        ),
        image_bytes=image_bytes,
        mime_type=mime_type,
    )

    summary = None
    if isinstance(text_payload, dict):
        summary = _normalize_text(text_payload.get("summary"))
        ai_recommendations = text_payload.get("recommendations")
        if isinstance(ai_recommendations, list):
            _apply_ai_recommendations(recommendations, ai_recommendations)

    concept_image_url = _gemini_generate_concept_image(
        project=project,
        selected_style=selected_style,
        room_type=room_type,
        lighting=lighting,
        intensity=intensity,
        mime_type=mime_type,
        image_bytes=image_bytes,
    )

    return {
        "ai_provider": "gemini",
        "summary": summary,
        "concept_image_url": concept_image_url,
        "ai_enhanced": bool(summary or concept_image_url),
    }


def _resolve_project_photo_path(photo_url: Optional[str]) -> Optional[Path]:
    if not photo_url:
        return None
    filename = Path(photo_url).name
    if not filename:
        return None
    candidate = UPLOAD_DIR / filename
    return candidate if candidate.exists() else None


def _build_recommendation_prompt(
    *,
    project: RoomProject,
    selected_style: Style,
    room_type: str,
    intensity: int,
    lighting: str,
    budget_tier: str,
    image_profile: Optional[dict],
    suggested_tags: list[dict[str, Any]],
    style_scores: list[dict[str, Any]],
    baseline_recommendations: list[dict[str, Any]],
) -> str:
    context = {
        "project_name": project.name,
        "room_type": room_type or project.room_type,
        "budget": float(project.budget or 0.0),
        "budget_tier": budget_tier,
        "lighting": lighting,
        "intensity": intensity,
        "selected_style": selected_style.name,
        "image_profile": image_profile or {},
        "suggested_tags": suggested_tags[:8],
        "style_scores": style_scores[:4],
        "baseline_recommendations": baseline_recommendations[:4],
    }
    return (
        "You are an interior design planning assistant. Analyze the attached room photo and provided Home4U "
        "context, then improve the recommendation copy while staying realistic about budget and style.\n"
        "Return ONLY valid JSON with this shape:\n"
        "{\n"
        '  "summary": "2 short sentences max",\n'
        '  "recommendations": [\n'
        '    {"description": "1 concise action item", "priority_score": 0-10, "estimated_cost": 0}\n'
        "  ]\n"
        "}\n"
        "Rules:\n"
        "- Keep exactly 4 recommendations when possible.\n"
        "- Keep descriptions under 200 characters.\n"
        "- Use numeric estimated_cost values in USD.\n"
        "- Do not mention AI or JSON.\n"
        f"Context JSON: {json.dumps(context, ensure_ascii=True)}"
    )


def _apply_ai_recommendations(recommendations: list[Recommendation], ai_items: list[Any]) -> None:
    ordered = sorted(
        recommendations,
        key=lambda item: (-(float(item.priority_score or 0.0)), item.created_at or 0),
    )
    for recommendation, ai_item in zip(ordered, ai_items):
        if not isinstance(ai_item, dict):
            continue
        description = _normalize_text(ai_item.get("description"))
        if description:
            recommendation.description = description
        priority_score = _coerce_float(ai_item.get("priority_score"))
        if priority_score is not None:
            recommendation.priority_score = max(0.0, min(10.0, priority_score))
        estimated_cost = _coerce_float(ai_item.get("estimated_cost"))
        if estimated_cost is not None:
            recommendation.estimated_cost = max(0.0, estimated_cost)


def _gemini_generate_concept_image(
    *,
    project: RoomProject,
    selected_style: Style,
    room_type: str,
    lighting: str,
    intensity: int,
    mime_type: str,
    image_bytes: bytes,
) -> Optional[str]:
    prompt = (
        f"Edit this {room_type or project.room_type} photo into a polished {selected_style.name} concept render. "
        f"Keep the architecture and camera angle, but restyle furnishings, decor, and finishes to feel "
        f"{selected_style.name.lower()}. Lighting preference is {lighting} and style intensity is {intensity}/100. "
        "Return a photorealistic room image only."
    )
    parts = _gemini_generate_content(
        model=GEMINI_IMAGE_MODEL,
        payload={
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": base64.b64encode(image_bytes).decode("utf-8"),
                            }
                        },
                    ]
                }
            ]
        },
    )

    for part in parts:
        inline = part.get("inlineData") or part.get("inline_data")
        if not isinstance(inline, dict):
            continue
        data = inline.get("data")
        if not isinstance(data, str) or not data.strip():
            continue
        output_mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
        suffix = mimetypes.guess_extension(output_mime) or ".png"
        output_name = f"concept_project_{project.id}_{uuid.uuid4().hex}{suffix}"
        output_path = UPLOAD_DIR / output_name
        output_path.write_bytes(base64.b64decode(data))
        return build_public_asset_url(f"/uploads/{output_name}")

    return None


def _gemini_json_request(
    *,
    model: str,
    prompt: str,
    image_bytes: bytes,
    mime_type: str,
) -> Optional[dict[str, Any]]:
    parts = _gemini_generate_content(
        model=model,
        payload={
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": base64.b64encode(image_bytes).decode("utf-8"),
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.45,
            },
        },
    )
    raw = "\n".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            parsed = json.loads(raw[start : end + 1])
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            logger.warning("Gemini JSON payload could not be parsed.")
            return None


def _gemini_generate_content(*, model: str, payload: dict[str, Any]) -> list[dict[str, Any]]:
    if not GEMINI_API_KEY:
        return []
    url = f"{GEMINI_API_BASE}/{model}:generateContent"
    try:
        with httpx.Client(timeout=AI_TIMEOUT_SECONDS) as client:
            response = client.post(url, params={"key": GEMINI_API_KEY}, json=payload)
            response.raise_for_status()
    except Exception as exc:  # pragma: no cover
        logger.warning("Gemini request failed: %s", exc)
        return []
    data = response.json()
    candidates = data.get("candidates") or []
    if not candidates:
        return []
    first = candidates[0] if isinstance(candidates[0], dict) else {}
    content = first.get("content") or {}
    parts = content.get("parts") or []
    return [part for part in parts if isinstance(part, dict)]


def _normalize_text(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    cleaned = " ".join(value.strip().split())
    return cleaned or None


def _coerce_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
