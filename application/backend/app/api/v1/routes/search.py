"""
Search endpoint with fuzzy matching and relevance scoring.

Uses Levenshtein distance for typo tolerance alongside the existing
ILIKE pattern matching.
"""

from difflib import SequenceMatcher

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.database import Style, Tag, StyleTag
from app.schemas.schemas import SearchResult, SearchResponse

router = APIRouter(prefix="/search", tags=["Search"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fuzzy_ratio(a: str, b: str) -> float:
    """Return a similarity ratio (0..1) between two strings."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _fuzzy_match(query: str, text: str, threshold: float = 0.6) -> float:
    """
    Check if *query* fuzzy-matches any word or substring in *text*.
    Returns the best ratio (0..1), or 0 if below threshold.
    """
    if not text:
        return 0.0
    q = query.lower()
    t = text.lower()

    # Exact substring match — highest confidence
    if q in t:
        return 1.0

    # Word-level fuzzy matching
    best = 0.0
    for word in t.split():
        ratio = _fuzzy_ratio(q, word)
        if ratio > best:
            best = ratio

    # Sliding window across text for partial matches
    if len(q) <= len(t):
        for i in range(len(t) - len(q) + 1):
            ratio = _fuzzy_ratio(q, t[i : i + len(q)])
            if ratio > best:
                best = ratio

    return best if best >= threshold else 0.0


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/", response_model=SearchResponse)
def search(
    q: str = Query(..., min_length=1, description="Search term"),
    limit: int = Query(20, ge=1, le=50),
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
):
    """Search over styles and tags with fuzzy matching and multi-signal scoring.

    Scoring signals:
    - Name match:        ×3.0 (exact substring) or ×2.0 (fuzzy)
    - Description match: ×1.0 (exact) or ×0.5 (fuzzy)
    - Tag hit:           ×1.5 per matching tag
    - Query length boost: slight boost for longer, more intentional queries
    """
    term = f"%{q.lower()}%"

    # --- DB query: standard ILIKE ---
    styles = db.query(Style).filter(
        or_(Style.name.ilike(term), Style.description.ilike(term))
    ).all()

    tag_hits = (
        db.query(Style)
        .join(StyleTag, StyleTag.style_id == Style.id)
        .join(Tag, Tag.id == StyleTag.tag_id)
        .filter(Tag.name.ilike(term))
        .all()
    )

    combined = {s.id: s for s in styles}
    for s in tag_hits:
        combined[s.id] = s

    # --- Fuzzy expansion: catch typos the ILIKE missed ---
    if len(combined) < limit:
        all_styles = db.query(Style).all()
        for s in all_styles:
            if s.id in combined:
                continue
            name_ratio = _fuzzy_match(q, s.name or "", threshold=0.65)
            desc_ratio = _fuzzy_match(q, s.description or "", threshold=0.65)
            tag_ratio = max(
                (_fuzzy_match(q, st.tag.name, threshold=0.65) for st in (s.style_tags or [])),
                default=0.0,
            )
            if max(name_ratio, desc_ratio, tag_ratio) > 0:
                combined[s.id] = s

    # --- Score every result ---
    results: List[SearchResult] = []
    for s in combined.values():
        name_fuzzy = _fuzzy_match(q, s.name or "")
        desc_fuzzy = _fuzzy_match(q, s.description or "")

        name_score = 3.0 if name_fuzzy == 1.0 else (2.0 * name_fuzzy)
        desc_score = 1.0 if desc_fuzzy == 1.0 else (0.5 * desc_fuzzy)

        # Tag scoring — iterate correctly over style_tags
        tag_score = 0.0
        tag_names: List[str] = []
        for st in (s.style_tags or []):
            tag_names.append(st.tag.name)
            tag_ratio = _fuzzy_match(q, st.tag.name)
            if tag_ratio > 0:
                tag_score += 1.5 * tag_ratio

        score = name_score + desc_score + tag_score
        score += min(len(q), 6) * 0.05  # slight boost for longer intent

        if score > 0:
            results.append(
                SearchResult(
                    id=s.id,
                    type="style",
                    title=s.name,
                    snippet=(s.description or "")[:160],
                    tags=tag_names,
                    score=round(score, 3),
                    rank=0,
                )
            )

    results.sort(key=lambda r: r.score, reverse=True)

    total = len(results)
    start = (page - 1) * limit
    end = start + limit
    page_results = results[start:end]

    for idx, r in enumerate(page_results, start=start + 1):
        r.rank = idx

    return SearchResponse(
        results=page_results,
        total=total,
        page=page,
        limit=limit,
        has_more=end < total,
    )
