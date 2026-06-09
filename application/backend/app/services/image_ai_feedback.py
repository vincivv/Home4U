from __future__ import annotations

import base64
import io
import json
from typing import Any

import httpx
from PIL import Image, ImageStat

from app.core.settings import (
    AI_VISION_API_KEY,
    AI_VISION_BASE_URL,
    AI_VISION_ENABLED,
    AI_VISION_MODEL,
    AI_VISION_PROVIDER,
    AI_VISION_TIMEOUT_SECONDS,
)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _label_for_score(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.5:
        return "medium"
    return "low"


def _deterministic_feedback(image_bytes: bytes, *, room_type: str = "room") -> dict[str, Any]:
    """
    Build fast, deterministic "AI-like" upload feedback from image quality cues.
    This keeps upload resilient and provider-agnostic while giving immediate value.
    """
    with Image.open(io.BytesIO(image_bytes)) as source:
        image = source.convert("RGB")
        width, height = image.size
        stat = ImageStat.Stat(image)
        brightness = round(sum(stat.mean) / (255.0 * 3.0), 3)

    megapixels = (width * height) / 1_000_000.0
    aspect_ratio = width / max(height, 1)
    issues: list[str] = []
    suggestions: list[str] = []
    score = 0.6

    if megapixels >= 1.8:
        score += 0.17
    elif megapixels >= 0.8:
        score += 0.1
    else:
        score -= 0.13
        issues.append("Image resolution is low, so small details may be missed.")
        suggestions.append("Retake with a wider, higher-resolution photo of the room.")

    if 0.28 <= brightness <= 0.78:
        score += 0.14
    elif brightness < 0.18:
        score -= 0.14
        issues.append("The image is very dark.")
        suggestions.append("Turn on room lights or shoot during daylight for clearer detail.")
    elif brightness > 0.9:
        score -= 0.12
        issues.append("The image is overexposed.")
        suggestions.append("Avoid direct window glare and lower camera exposure slightly.")
    else:
        score -= 0.06
        issues.append("Lighting is uneven.")
        suggestions.append("Use balanced lighting so textures and edges are easier to read.")

    if 0.65 <= aspect_ratio <= 2.3:
        score += 0.08
    else:
        score -= 0.08
        issues.append("Framing is extreme for a room scan.")
        suggestions.append("Center the frame and keep a standard room perspective.")

    confidence_score = round(_clamp(score, 0.1, 0.97), 2)
    confidence_label = _label_for_score(confidence_score)
    normalized_room = (room_type or "room").strip().lower()
    issue_count = len(issues)

    if confidence_label == "high":
        summary = f"This {normalized_room} photo is clear enough for strong AI-guided feedback."
    elif confidence_label == "medium":
        summary = (
            f"This {normalized_room} photo is usable, but quality improvements could make recommendations more specific."
        )
    else:
        summary = (
            f"This {normalized_room} photo has limited scan quality; recommendations will stay broad until image quality improves."
        )

    if not suggestions:
        suggestions = [
            "Capture a second angle from the opposite corner for better spatial coverage.",
            "Keep major furniture fully visible in frame to improve layout awareness.",
        ]

    return {
        "summary": summary,
        "confidence_score": confidence_score,
        "confidence_label": confidence_label,
        "issues": issues[:3],
        "suggestions": suggestions[:4],
        "metrics": {
            "width": width,
            "height": height,
            "megapixels": round(megapixels, 2),
            "brightness": brightness,
            "aspect_ratio": round(aspect_ratio, 2),
            "issue_count": issue_count,
        },
    }


def _normalize_model_feedback(
    *,
    raw_payload: dict[str, Any],
    default_metrics: dict[str, Any],
    room_type: str,
) -> dict[str, Any]:
    summary = str(raw_payload.get("summary") or "").strip()
    if not summary:
        summary = f"AI feedback generated for this {(room_type or 'room').strip().lower()} photo."

    raw_confidence = raw_payload.get("confidence_score", 0.62)
    try:
        confidence_score = round(_clamp(float(raw_confidence), 0.0, 1.0), 2)
    except (TypeError, ValueError):
        confidence_score = 0.62

    confidence_label = str(raw_payload.get("confidence_label") or _label_for_score(confidence_score)).strip().lower()
    if confidence_label not in {"low", "medium", "high"}:
        confidence_label = _label_for_score(confidence_score)

    issues = [
        str(item).strip()
        for item in (raw_payload.get("issues") or [])
        if isinstance(item, str) and item.strip()
    ][:3]
    suggestions = [
        str(item).strip()
        for item in (raw_payload.get("suggestions") or [])
        if isinstance(item, str) and item.strip()
    ][:4]

    return {
        "summary": summary,
        "confidence_score": confidence_score,
        "confidence_label": confidence_label,
        "issues": issues,
        "suggestions": suggestions,
        "metrics": default_metrics,
    }


def _extract_message_content(payload: dict[str, Any]) -> str:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""
    first_choice = choices[0] if isinstance(choices[0], dict) else {}
    message = first_choice.get("message") if isinstance(first_choice, dict) else {}
    content = message.get("content") if isinstance(message, dict) else ""
    return content if isinstance(content, str) else ""


def _parse_model_json(content: str) -> dict[str, Any]:
    trimmed = content.strip()
    if not trimmed:
        return {}
    try:
        return json.loads(trimmed)
    except json.JSONDecodeError:
        start = trimmed.find("{")
        end = trimmed.rfind("}")
        if start == -1 or end == -1 or start >= end:
            return {}
        candidate = trimmed[start : end + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            return {}


async def _fetch_openai_vision_feedback(
    image_bytes: bytes,
    *,
    room_type: str,
    default_metrics: dict[str, Any],
) -> dict[str, Any]:
    encoded_image = base64.b64encode(image_bytes).decode("ascii")
    data_uri = f"data:image/jpeg;base64,{encoded_image}"
    prompt = (
        "Analyze this interior room photo upload for design-planning quality. "
        "Return strict JSON only with this schema: "
        '{"summary": string, "confidence_score": number, "confidence_label": "low|medium|high", '
        '"issues": string[], "suggestions": string[]}. '
        "Focus on lighting quality, framing coverage, and usefulness for interior design recommendations. "
        "Keep issues and suggestions practical and concise."
    )

    body = {
        "model": AI_VISION_MODEL,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an interior design image QA assistant. "
                    "Always output strict JSON that matches the requested schema."
                ),
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Room type: {room_type or 'room'}"},
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            },
        ],
        "max_tokens": 280,
    }
    headers = {
        "Authorization": f"Bearer {AI_VISION_API_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=AI_VISION_TIMEOUT_SECONDS) as client:
        response = await client.post(
            f"{AI_VISION_BASE_URL}/chat/completions",
            headers=headers,
            json=body,
        )
        response.raise_for_status()
        payload = response.json()

    content = _extract_message_content(payload)
    parsed = _parse_model_json(content)
    if not parsed:
        raise ValueError("AI vision response did not return valid JSON content")
    return _normalize_model_feedback(
        raw_payload=parsed,
        default_metrics=default_metrics,
        room_type=room_type,
    )


async def _fetch_gemini_vision_feedback(
    image_bytes: bytes,
    *,
    room_type: str,
    default_metrics: dict[str, Any],
) -> dict[str, Any]:
    """Use Google Gemini Nano (gemini-2.0-flash-lite) via the OpenAI-compatible endpoint."""
    from app.core.settings import (
        GOOGLE_API_KEY,
        GOOGLE_GEMINI_BASE_URL,
        GOOGLE_GEMINI_MODEL,
        GOOGLE_GEMINI_TIMEOUT_SECONDS,
    )

    suffix = image_bytes[:4]
    mime = "image/png" if suffix == b"\x89PNG" else "image/jpeg"
    encoded_image = base64.b64encode(image_bytes).decode("ascii")
    data_uri = f"data:{mime};base64,{encoded_image}"

    prompt = (
        "Analyze this interior room photo for design planning. "
        "Return strict JSON only:\n"
        '{"summary": "...", "confidence_score": 0.0-1.0, "confidence_label": "low|medium|high", '
        '"issues": ["..."], "suggestions": ["..."], '
        '"style_observations": ["visible design elements that define the room character"]}.\n'
        "Focus on lighting quality, layout clarity, and visible design features."
    )

    body = {
        "model": GOOGLE_GEMINI_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Room type: {room_type or 'room'}. {prompt}"},
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            }
        ],
        "max_tokens": 350,
    }
    headers = {
        "Authorization": f"Bearer {GOOGLE_API_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=GOOGLE_GEMINI_TIMEOUT_SECONDS) as client:
        response = await client.post(
            f"{GOOGLE_GEMINI_BASE_URL}/chat/completions",
            headers=headers,
            json=body,
        )
        response.raise_for_status()
        payload = response.json()

    content = _extract_message_content(payload)
    parsed = _parse_model_json(content)
    if not parsed:
        raise ValueError("Gemini response contained no valid JSON")
    return _normalize_model_feedback(
        raw_payload=parsed,
        default_metrics=default_metrics,
        room_type=room_type,
    )


async def build_image_upload_feedback(image_bytes: bytes, *, room_type: str = "room") -> dict[str, Any]:
    """
    Build upload feedback using a real vision model when configured.
    Priority: Google Gemini Nano → OpenAI vision → deterministic fallback.
    """
    fallback = _deterministic_feedback(image_bytes, room_type=room_type)

    from app.core.settings import GOOGLE_GEMINI_ENABLED
    if GOOGLE_GEMINI_ENABLED:
        try:
            return await _fetch_gemini_vision_feedback(
                image_bytes,
                room_type=room_type,
                default_metrics=fallback["metrics"],
            )
        except Exception:
            pass

    if not AI_VISION_ENABLED or AI_VISION_PROVIDER != "openai":
        return fallback

    try:
        return await _fetch_openai_vision_feedback(
            image_bytes,
            room_type=room_type,
            default_metrics=fallback["metrics"],
        )
    except Exception:
        return fallback
