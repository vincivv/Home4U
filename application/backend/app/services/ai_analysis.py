"""
Claude-powered AI analysis features for Home4U.

Each public function returns None on any failure so callers can
always fall back to deterministic logic in project_analysis.py.

Ethics design:
- System prompts frame Claude as an advisor, not a decision maker.
- Suggestions use hedged language ("consider", "you may want to").
- No demographic data is sent to Claude.
- All user-supplied strings are sanitized before prompt insertion.
- Confidence scores and costs are clamped to safe numeric ranges.
"""
from __future__ import annotations

import base64
import json
import logging
import re
from pathlib import Path
from typing import Any, Optional

import anthropic

_log = logging.getLogger(__name__)

from app.core.settings import (
    AI_ANALYSIS_ENABLED,
    AI_ANALYSIS_MODEL,
    AI_ANALYSIS_TIMEOUT_SECONDS,
    ANTHROPIC_API_KEY,
    PUBLIC_ASSET_BASE_URL,
    UPLOAD_DIR,
)

_INJECT_RE = re.compile(r"[{}\[\]<>\\]")
_MAX_INPUT_LEN = 120


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _sanitize(text: str) -> str:
    """Strip prompt-injection chars and cap length."""
    return _INJECT_RE.sub("", str(text or "")).strip()[:_MAX_INPUT_LEN]


def _get_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def _resolve_image_path(photo_url: str) -> Optional[Path]:
    """Map a stored photo_url back to its absolute path on disk."""
    path_part = photo_url
    if PUBLIC_ASSET_BASE_URL and photo_url.startswith(PUBLIC_ASSET_BASE_URL):
        path_part = photo_url[len(PUBLIC_ASSET_BASE_URL):]
    if path_part.startswith("/uploads/"):
        return UPLOAD_DIR / path_part[len("/uploads/"):]
    return None


def _parse_json_response(content: str) -> dict:
    """Parse JSON from a Claude text response, tolerating markdown fences."""
    trimmed = content.strip()
    # Strip markdown code fences if present
    if trimmed.startswith("```"):
        lines = trimmed.splitlines()
        inner = [l for l in lines[1:] if not l.startswith("```")]
        trimmed = "\n".join(inner).strip()
    try:
        return json.loads(trimmed)
    except json.JSONDecodeError:
        start = trimmed.find("{")
        end = trimmed.rfind("}")
        if start != -1 and end > start:
            try:
                return json.loads(trimmed[start:end + 1])
            except json.JSONDecodeError:
                pass
    return {}


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


# ---------------------------------------------------------------------------
# Feature 1: AI Room Image Analysis
# ---------------------------------------------------------------------------

def analyze_room_image_with_claude(
    photo_url: str,
    *,
    room_type: str,
    style_name: str,
) -> Optional[dict[str, Any]]:
    """
    Analyze a room photo with Claude Vision.

    Returns a dict with 'scan_assessment' and 'room_state' sub-dicts
    that can be merged into the existing analysis pipeline, or None on
    any failure so the deterministic path runs instead.
    """
    if not AI_ANALYSIS_ENABLED:
        return None
    try:
        image_path = _resolve_image_path(photo_url)
        if image_path is None or not image_path.exists():
            return None

        image_bytes = image_path.read_bytes()
        encoded = base64.standard_b64encode(image_bytes).decode("ascii")
        suffix = image_path.suffix.lower()
        if suffix in {".jpg", ".jpeg"}:
            media_type = "image/jpeg"
        elif suffix == ".png":
            media_type = "image/png"
        else:
            media_type = "image/webp"

        client = _get_client()
        response = client.messages.create(
            model=AI_ANALYSIS_MODEL,
            max_tokens=450,
            timeout=AI_ANALYSIS_TIMEOUT_SECONDS,
            system=(
                "You are an interior design assistant analyzing room photos for design planning. "
                "Your role is to make suggestions — the user makes all final decisions. "
                "Do not make assumptions based on demographics, culture, or personal identity. "
                "Focus only on visible design elements: furniture, color, lighting, layout. "
                "Return only valid JSON with no extra commentary."
            ),
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": encoded,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            f"Room type: {_sanitize(room_type)}. "
                            f"Target style: {_sanitize(style_name)}. "
                            "Analyze the visible design elements and return JSON with keys: "
                            "confidence_score (0.0-1.0 — how scannable this photo is for design planning), "
                            "confidence_label (low / medium / high), "
                            "openness (low / medium / high), "
                            "clutter_level (low / medium / high), "
                            "furnishing_density (low / medium / high), "
                            "contrast_level (low / medium / high), "
                            "style_cues (list of 3-5 short design observations)."
                        ),
                    },
                ],
            }],
        )

        content = response.content[0].text if response.content else ""
        parsed = _parse_json_response(content)
        if not parsed:
            return None

        confidence_score = _clamp(float(parsed.get("confidence_score", 0.5)), 0.1, 0.97)
        confidence_label = str(parsed.get("confidence_label", "medium")).lower()
        if confidence_label not in {"low", "medium", "high"}:
            confidence_label = "medium"

        def _level(key: str) -> str:
            val = str(parsed.get(key, "medium")).lower()
            return val if val in {"low", "medium", "high"} else "medium"

        return {
            "scan_assessment": {
                "confidence_score": round(confidence_score, 2),
                "confidence_label": confidence_label,
                "style_cues": [str(c)[:200] for c in (parsed.get("style_cues") or [])[:5]],
                "ai_source": "claude",
            },
            "room_state": {
                "openness": _level("openness"),
                "clutter_level": _level("clutter_level"),
                "furnishing_density": _level("furnishing_density"),
                "contrast_level": _level("contrast_level"),
                "ai_source": "claude",
            },
        }
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Feature 2: AI Tag Suggestions
# ---------------------------------------------------------------------------

def suggest_tags_with_claude(
    *,
    room_type: str,
    style_name: str,
    image_profile: Optional[dict],
    available_tag_names: list[str],
) -> Optional[list[dict[str, Any]]]:
    """
    Ask Claude to suggest relevant design tags from the available tag list.

    Returns [{"tag_name": str, "confidence": float, "source": "claude"}]
    or None on any failure.
    """
    if not AI_ANALYSIS_ENABLED:
        return None
    try:
        profile_parts: list[str] = []
        if image_profile:
            for key in ("average_brightness", "average_saturation", "warmth_bias", "dominant_hex"):
                val = image_profile.get(key)
                if val is not None:
                    profile_parts.append(f"{key}={val}")
        profile_summary = ", ".join(profile_parts) if profile_parts else "not available"

        # Cap tag list to avoid oversized prompts
        tag_list = ", ".join(available_tag_names[:60])

        client = _get_client()
        response = client.messages.create(
            model=AI_ANALYSIS_MODEL,
            max_tokens=350,
            timeout=AI_ANALYSIS_TIMEOUT_SECONDS,
            system=(
                "You are an interior design tag suggestion assistant. "
                "Suggest tags that describe the visible design character of a room — "
                "never based on who lives there or their background. "
                "Only choose tags from the provided available list. "
                "Your suggestions are recommendations only. Return only valid JSON."
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Room type: {_sanitize(room_type)}. "
                    f"Selected style: {_sanitize(style_name)}. "
                    f"Image profile metrics: {profile_summary}. "
                    f"Available tags: {tag_list}. "
                    "Select 5-10 tags from the available list that best match this room's "
                    "design character. Assign a confidence between 0.35 and 0.97. "
                    'Return JSON: {"tags": [{"tag_name": "...", "confidence": 0.0}, ...]}'
                ),
            }],
        )

        content = response.content[0].text if response.content else ""
        parsed = _parse_json_response(content)
        raw_tags = parsed.get("tags") or []
        if not isinstance(raw_tags, list):
            return None

        tag_name_set = {t.lower() for t in available_tag_names}
        result = []
        for item in raw_tags:
            if not isinstance(item, dict):
                continue
            tag_name = str(item.get("tag_name", "")).strip().lower()
            if not tag_name or tag_name not in tag_name_set:
                continue
            try:
                confidence = _clamp(float(item.get("confidence", 0.6)), 0.35, 0.97)
            except (TypeError, ValueError):
                confidence = 0.6
            result.append({
                "tag_name": tag_name,
                "confidence": round(confidence, 2),
                "source": "claude",
            })

        return result if result else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Feature 3: Resemblance Score Computation
# ---------------------------------------------------------------------------

def compute_resemblance_with_claude(
    *,
    detected_tags: list[dict],
    styles_summary: list[dict],
) -> Optional[dict[int, float]]:
    """
    Ask Claude to score how well detected room tags match each style.

    Returns {style_id: score (8.0-98.0)} or None on any failure.
    """
    if not AI_ANALYSIS_ENABLED:
        return None
    try:
        tag_lines = ", ".join(
            f"{t['name']}({t['confidence']:.2f})"
            for t in detected_tags[:15]
            if isinstance(t, dict) and t.get("name")
        ) or "none"

        style_lines = "\n".join(
            "- id={id}, name={name}, tags=[{tags}]".format(
                id=s["style_id"],
                name=_sanitize(s["style_name"]),
                tags=", ".join(str(x) for x in s.get("style_tags", [])[:8]),
            )
            for s in styles_summary[:12]
        )

        client = _get_client()
        response = client.messages.create(
            model=AI_ANALYSIS_MODEL,
            max_tokens=400,
            timeout=AI_ANALYSIS_TIMEOUT_SECONDS,
            system=(
                "You are an interior design style matching assistant. "
                "Score how well a room's design tags match each listed style. "
                "Scores reflect design alignment only — not personal preference. "
                "Return only valid JSON."
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Detected room tags (name, confidence): {tag_lines}\n\n"
                    f"Styles to score:\n{style_lines}\n\n"
                    "Score each style 0-100 based on tag overlap and design coherence. "
                    'Return JSON: {"scores": [{"style_id": 1, "score": 75.0}, ...]}'
                ),
            }],
        )

        content = response.content[0].text if response.content else ""
        parsed = _parse_json_response(content)
        raw_scores = parsed.get("scores") or []
        if not isinstance(raw_scores, list):
            return None

        result: dict[int, float] = {}
        for item in raw_scores:
            if not isinstance(item, dict):
                continue
            try:
                sid = int(item["style_id"])
                score = _clamp(float(item["score"]), 8.0, 98.0)
                result[sid] = round(score, 1)
            except (KeyError, TypeError, ValueError):
                continue

        return result if result else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Feature 4: Budget-Aware Recommendation Generation
# ---------------------------------------------------------------------------

def generate_recommendations_with_claude(
    *,
    room_type: str,
    style_name: str,
    budget: float,
    budget_tier: str,
    detected_tags: list[str],
    scan_label: str,
    room_state: Optional[dict],
) -> Optional[list[dict[str, Any]]]:
    """
    Ask Claude to generate personalised, budget-aware design recommendations.

    Claude acts strictly as an advisor — language like "consider" and
    "you may want to" is enforced in the system prompt so the user
    retains full decision-making authority.

    Returns a list of recommendation dicts or None on any failure.
    """
    if not AI_ANALYSIS_ENABLED:
        return None
    try:
        tag_str = ", ".join(detected_tags[:8]) if detected_tags else "none detected"
        state_str = (
            f"openness={room_state.get('openness', 'medium')}, "
            f"clutter={room_state.get('clutter_level', 'medium')}, "
            f"furnishing density={room_state.get('furnishing_density', 'medium')}"
        ) if room_state else "unknown"

        client = _get_client()
        response = client.messages.create(
            model=AI_ANALYSIS_MODEL,
            max_tokens=700,
            timeout=AI_ANALYSIS_TIMEOUT_SECONDS,
            system=(
                "You are a budget-aware interior design advisor. "
                "Your role is to suggest options — the user decides what to do. "
                "Always use hedged language: 'consider', 'you may want to', 'one option is'. "
                "Never instruct. Never make assumptions about who lives in the space. "
                "Focus on practical, design-driven changes within the stated budget. "
                "Return only valid JSON."
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Room type: {_sanitize(room_type)}. "
                    f"Target style: {_sanitize(style_name)}. "
                    f"Total budget: ${budget:.0f} ({_sanitize(budget_tier)} tier). "
                    f"Detected design tags: {tag_str}. "
                    f"Room state: {state_str}. "
                    f"Scan confidence: {_sanitize(scan_label)}. "
                    "Generate 3-5 specific, actionable interior design recommendations. "
                    "Each recommendation must fit within a reasonable portion of the budget. "
                    "Return JSON: {\"recommendations\": ["
                    "{\"description\": str, \"estimated_cost\": float, "
                    "\"priority_score\": float (1-10), \"reason_summary\": str}, ...]}"
                ),
            }],
        )

        content = response.content[0].text if response.content else ""
        parsed = _parse_json_response(content)
        raw_recs = parsed.get("recommendations") or []
        if not isinstance(raw_recs, list):
            return None

        result = []
        for item in raw_recs:
            if not isinstance(item, dict):
                continue
            description = str(item.get("description", "")).strip()
            reason_summary = str(item.get("reason_summary", "")).strip()
            if not description:
                continue
            try:
                estimated_cost = max(0.0, float(item.get("estimated_cost", budget * 0.15)))
                priority_score = _clamp(float(item.get("priority_score", 7.0)), 1.0, 10.0)
            except (TypeError, ValueError):
                estimated_cost = round(budget * 0.15, 2)
                priority_score = 7.0
            result.append({
                "description": description[:500],
                "estimated_cost": round(estimated_cost, 2),
                "priority_score": round(priority_score, 1),
                "reason_summary": reason_summary[:300],
            })

        return result[:5] if result else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Comprehensive vision call: room image vs. target style
# ---------------------------------------------------------------------------

def analyze_room_vs_style_with_claude(
    photo_url: str,
    *,
    room_type: str,
    style_name: str,
    style_tags: list[str],
    budget: float,
    budget_tier: str,
    available_tag_names: list[str],
) -> Optional[dict[str, Any]]:
    """
    Single comprehensive Claude vision call.

    Sends the actual room photo together with the target style's
    characteristic tags. Claude compares what it sees to the target,
    then returns in one JSON response: scan assessment, room state,
    suggested tags (from available_tag_names), a style match score,
    and specific gap-closing recommendations.

    Returns None on any failure so the caller uses deterministic fallback.
    """
    if not AI_ANALYSIS_ENABLED:
        return None
    try:
        image_path = _resolve_image_path(photo_url)
        if image_path is None or not image_path.exists():
            return None

        image_bytes = image_path.read_bytes()
        encoded = base64.standard_b64encode(image_bytes).decode("ascii")
        suffix = image_path.suffix.lower()
        if suffix in {".jpg", ".jpeg"}:
            media_type = "image/jpeg"
        elif suffix == ".png":
            media_type = "image/png"
        else:
            media_type = "image/webp"

        style_tags_str = ", ".join(_sanitize(t) for t in style_tags[:15]) or "none specified"
        available_tags_str = ", ".join(available_tag_names[:50])

        client = _get_client()
        response = client.messages.create(
            model=AI_ANALYSIS_MODEL,
            max_tokens=2000,
            timeout=AI_ANALYSIS_TIMEOUT_SECONDS,
            system=(
                "You are an interior design assistant analyzing room photos for style alignment and renovation planning. "
                "Your role is to make suggestions — the user makes all final decisions. "
                "Focus only on visible design elements: furniture, materials, color, lighting, spatial layout. "
                "Do not make assumptions about the occupants based on demographics, culture, or personal identity. "
                "Always use hedged language in recommendations: 'consider', 'you may want to', 'one option is'. "
                "Return only valid JSON with no extra commentary."
            ),
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": encoded,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            f"Room type: {_sanitize(room_type)}. "
                            f"Target design style: {_sanitize(style_name)}. "
                            f"Style characteristics (design elements that define this style): {style_tags_str}. "
                            f"Available design tags to choose from: {available_tags_str}. "
                            f"User budget: ${budget:.0f} ({_sanitize(budget_tier)} tier).\n\n"
                            "Look at this room photo carefully. Then:\n"
                            "1. Assess the room's current design state (confidence for analysis, openness, clutter, furnishing density, contrast).\n"
                            "2. Identify which style characteristics are already visible and which are missing.\n"
                            "3. From the available tags list ONLY, select 5-10 tags that describe what you see (confidence 0.35-0.97).\n"
                            f"4. Score how well this room matches the {_sanitize(style_name)} style (0-100).\n"
                            "5. Generate 3-5 recommendations. EACH description MUST open by naming a specific visible element from the photo (e.g. 'The dark sofa...', 'The bare walls...', 'The overhead light fixture...') then explain what to change about it to move toward the target style. Use hedged language ('consider', 'you may want to').\n\n"
                            "Return only valid JSON:\n"
                            '{"confidence_score": 0.0-1.0, "confidence_label": "low|medium|high", '
                            '"openness": "low|medium|high", "clutter_level": "low|medium|high", '
                            '"furnishing_density": "low|medium|high", "contrast_level": "low|medium|high", '
                            '"style_cues": ["short observation", ...], '
                            '"matching_aspects": ["what already fits the style", ...], '
                            '"gap_aspects": ["what is missing or misaligned", ...], '
                            '"suggested_tags": [{"tag_name": "must be from available list", "confidence": 0.0}], '
                            '"style_match_score": 0-100, '
                            '"recommendations": [{"description": "...", "estimated_cost": 0.0, '
                            '"priority_score": 1.0-10.0, "reason_summary": "..."}]}'
                        ),
                    },
                ],
            }],
        )

        content = response.content[0].text if response.content else ""
        print("AI_VISION_COMPREHENSIVE_RAW:", content[:400])
        parsed = _parse_json_response(content)
        print("AI_VISION_COMPREHENSIVE_PARSED:", bool(parsed), list(parsed.keys())[:4] if parsed else "EMPTY")
        if not parsed:
            return None

        confidence_score = _clamp(float(parsed.get("confidence_score", 0.5)), 0.1, 0.97)
        confidence_label = str(parsed.get("confidence_label", "medium")).lower()
        if confidence_label not in {"low", "medium", "high"}:
            confidence_label = "medium"

        def _level(key: str) -> str:
            val = str(parsed.get(key, "medium")).lower()
            return val if val in {"low", "medium", "high"} else "medium"

        style_match_score = _clamp(float(parsed.get("style_match_score", 50.0)), 8.0, 98.0)

        tag_name_set = {t.lower() for t in available_tag_names}
        suggested_tags: list[dict] = []
        for item in (parsed.get("suggested_tags") or []):
            if not isinstance(item, dict):
                continue
            tag_name = str(item.get("tag_name", "")).strip().lower()
            if not tag_name or tag_name not in tag_name_set:
                continue
            try:
                confidence = _clamp(float(item.get("confidence", 0.6)), 0.35, 0.97)
            except (TypeError, ValueError):
                confidence = 0.6
            suggested_tags.append({
                "tag_name": tag_name,
                "confidence": round(confidence, 2),
                "source": "claude",
            })

        recommendations: list[dict] = []
        for item in (parsed.get("recommendations") or [])[:5]:
            if not isinstance(item, dict):
                continue
            description = str(item.get("description", "")).strip()
            if not description:
                continue
            reason_summary = str(item.get("reason_summary", "")).strip()
            try:
                estimated_cost = max(0.0, float(item.get("estimated_cost", budget * 0.15)))
                priority_score = _clamp(float(item.get("priority_score", 7.0)), 1.0, 10.0)
            except (TypeError, ValueError):
                estimated_cost = round(budget * 0.15, 2)
                priority_score = 7.0
            recommendations.append({
                "description": description[:500],
                "estimated_cost": round(estimated_cost, 2),
                "priority_score": round(priority_score, 1),
                "reason_summary": reason_summary[:300],
            })

        return {
            "confidence_score": round(confidence_score, 2),
            "confidence_label": confidence_label,
            "openness": _level("openness"),
            "clutter_level": _level("clutter_level"),
            "furnishing_density": _level("furnishing_density"),
            "contrast_level": _level("contrast_level"),
            "style_cues": [str(c)[:200] for c in (parsed.get("style_cues") or [])[:5]],
            "matching_aspects": [str(c)[:200] for c in (parsed.get("matching_aspects") or [])[:5]],
            "gap_aspects": [str(c)[:200] for c in (parsed.get("gap_aspects") or [])[:5]],
            "suggested_tags": suggested_tags,
            "style_match_score": round(style_match_score, 1),
            "recommendations": recommendations,
            "ai_source": "claude",
        }
    except Exception as exc:
        import traceback as _tb
        print("AI_VISION_ERROR:", exc)
        _tb.print_exc()
        return None
