import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status, UploadFile, File
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session
from typing import List, Literal, Optional

from app.core.database import get_db
from app.core.settings import (
    ALLOWED_UPLOAD_TYPES,
    MAX_UPLOAD_BYTES,
    MAX_UPLOAD_BYTES_LABEL,
    UPLOAD_DIR,
    build_public_asset_url,
)
from app.models.database import ProjectAnalysisRun, RoomProject, User
from app.schemas.schemas import (
    ProjectAnalysisRequest,
    ProjectAnalysisResponse,
    ProjectAnalysisRunResponse,
    RoomProjectCreate,
    RoomProjectUpdate,
    RoomProjectResponse,
    UploadPhotoResponse,
)
from app.services.image_ai_feedback import build_image_upload_feedback
from app.services.project_analysis import (
    analyze_project_design,
    load_saved_project_analysis,
    resolve_style_for_analysis,
    validate_scan_inputs,
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/projects", tags=["RoomProjects"])


def _normalize_project_name(name: Optional[str]) -> Optional[str]:
    """Normalize optional project names by trimming whitespace."""
    if name is None:
        return None
    cleaned = name.strip()
    return cleaned or None


def _default_project_name(room_type: str, project_id: int) -> str:
    """Build a readable fallback name for projects that were never explicitly named."""
    room_label = room_type.strip() or "Room"
    return f"{room_label} Project #{project_id}"


def _serialize_analysis_run(run: ProjectAnalysisRun) -> dict:
    detected_tags = []
    if run.detected_tags_json:
        try:
            parsed = json.loads(run.detected_tags_json)
        except json.JSONDecodeError:
            parsed = []
        if isinstance(parsed, list):
            detected_tags = [item for item in parsed if isinstance(item, str)]

    image_profile = None
    if any(
        value is not None
        for value in (
            run.image_width,
            run.image_height,
            run.image_aspect_ratio,
            run.image_average_brightness,
            run.image_average_saturation,
            run.image_warmth_bias,
            run.image_dominant_hex,
        )
    ):
        image_profile = {
            "width": int(run.image_width or 0),
            "height": int(run.image_height or 0),
            "aspect_ratio": float(run.image_aspect_ratio or 1.0),
            "average_brightness": float(run.image_average_brightness or 0.0),
            "average_saturation": float(run.image_average_saturation or 0.0),
            "warmth_bias": float(run.image_warmth_bias or 0.0),
            "dominant_hex": run.image_dominant_hex,
        }

    scan_assessment = None
    if (
        run.scan_confidence_score is not None
        or run.scan_confidence_label
        or run.scan_warnings_json
    ):
        warnings = []
        if run.scan_warnings_json:
            try:
                parsed_warnings = json.loads(run.scan_warnings_json)
            except json.JSONDecodeError:
                parsed_warnings = []
            if isinstance(parsed_warnings, list):
                warnings = [item for item in parsed_warnings if isinstance(item, str)]
        scan_assessment = {
            "confidence_score": round(float(run.scan_confidence_score or 0.0), 2),
            "confidence_label": run.scan_confidence_label or "low",
            "signal_count": int(run.scan_signal_count or 0),
            "warnings": warnings[:6],
        }

    room_state = None
    if run.room_state_json:
        try:
            parsed_room_state = json.loads(run.room_state_json)
        except json.JSONDecodeError:
            parsed_room_state = None
        if isinstance(parsed_room_state, dict):
            cues = parsed_room_state.get("cues")
            room_state = {
                "openness": parsed_room_state.get("openness", "medium"),
                "clutter_level": parsed_room_state.get("clutter_level", "medium"),
                "contrast_level": parsed_room_state.get("contrast_level", "medium"),
                "furnishing_density": parsed_room_state.get("furnishing_density", "medium"),
                "cues": [item for item in cues if isinstance(item, str)] if isinstance(cues, list) else [],
            }

    return {
        "id": run.id,
        "project_id": run.project_id,
        "request_id": run.request_id,
        "status": run.status,
        "selected_style_id": run.selected_style_id,
        "selected_style_name": run.selected_style_name,
        "room_type": run.room_type,
        "intensity": run.intensity,
        "lighting": run.lighting,
        "budget_tier": run.budget_tier,
        "image_profile": image_profile,
        "scan_assessment": scan_assessment,
        "room_state": room_state,
        "detected_tags": detected_tags,
        "top_score": run.top_score,
        "recommendation_count": run.recommendation_count,
        "analysis_duration_ms": run.analysis_duration_ms,
        "error_message": run.error_message,
        "started_at": run.started_at,
        "completed_at": run.completed_at,
    }


@router.post("/", response_model=RoomProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project: RoomProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new room project."""
    normalized_name = _normalize_project_name(project.name)
    db_project = RoomProject(
        user_id=current_user.id,
        name=normalized_name or project.room_type,
        room_type=project.room_type,
    )
    db.add(db_project)
    db.flush()
    if normalized_name is None:
        db_project.name = _default_project_name(project.room_type, db_project.id)
    db.commit()
    db.refresh(db_project)
    return db_project


@router.get("/", response_model=List[RoomProjectResponse])
def get_projects(
    response: Response,
    limit: int = Query(default=20, ge=1, le=100),
    page: int = Query(default=1, ge=1),
    room_type: Optional[str] = Query(default=None),
    sort: Literal["created_desc", "created_asc", "budget_desc", "budget_asc"] = Query(default="created_desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all room projects for the current user."""
    query = db.query(RoomProject).filter(RoomProject.user_id == current_user.id)
    if room_type:
        query = query.filter(RoomProject.room_type.ilike(room_type.strip()))

    total = query.count()
    order_clause = {
        "created_desc": desc(RoomProject.created_at),
        "created_asc": asc(RoomProject.created_at),
        "budget_desc": desc(RoomProject.budget),
        "budget_asc": asc(RoomProject.budget),
    }[sort]
    items = (
        query.order_by(order_clause, desc(RoomProject.id))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Limit"] = str(limit)
    return items


@router.get("/{project_id}", response_model=RoomProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific room project."""
    project = (
        db.query(RoomProject)
        .filter(RoomProject.id == project_id, RoomProject.user_id == current_user.id)
        .first()
    )

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return project


@router.get("/{project_id}/analysis", response_model=ProjectAnalysisResponse)
def get_project_analysis(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the latest saved analysis snapshot for a project, if one exists."""
    project = (
        db.query(RoomProject)
        .filter(RoomProject.id == project_id, RoomProject.user_id == current_user.id)
        .first()
    )

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    payload = load_saved_project_analysis(db, project=project)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project analysis not found")

    return payload


@router.get(
    "/{project_id}/analysis/runs",
    response_model=List[ProjectAnalysisRunResponse],
)
def get_project_analysis_runs(
    project_id: int,
    response: Response,
    limit: int = Query(default=10, ge=1, le=50),
    page: int = Query(default=1, ge=1),
    status_filter: Optional[Literal["processing", "succeeded", "failed"]] = Query(
        default=None,
        alias="status",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return recent analysis runs for a project to support QA and product tracing."""
    project = (
        db.query(RoomProject)
        .filter(RoomProject.id == project_id, RoomProject.user_id == current_user.id)
        .first()
    )

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    query = db.query(ProjectAnalysisRun).filter(ProjectAnalysisRun.project_id == project_id)
    if status_filter is not None:
        query = query.filter(ProjectAnalysisRun.status == status_filter)

    total = query.count()
    items = (
        query.order_by(ProjectAnalysisRun.started_at.desc(), ProjectAnalysisRun.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Limit"] = str(limit)
    return [_serialize_analysis_run(item) for item in items]


@router.put("/{project_id}", response_model=RoomProjectResponse)
def update_project(
    project_id: int,
    project_update: RoomProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a room project."""
    project = (
        db.query(RoomProject)
        .filter(RoomProject.id == project_id, RoomProject.user_id == current_user.id)
        .first()
    )

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    normalized_name = _normalize_project_name(project_update.name)
    if project_update.name is not None and normalized_name is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Project name cannot be empty",
        )

    if normalized_name is not None:
        project.name = normalized_name
    if project_update.room_type is not None:
        project.room_type = project_update.room_type
    if project_update.budget is not None:
        project.budget = project_update.budget

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a room project."""
    project = (
        db.query(RoomProject)
        .filter(RoomProject.id == project_id, RoomProject.user_id == current_user.id)
        .first()
    )

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    db.delete(project)
    db.commit()
    return None


@router.post("/{project_id}/photo", response_model=UploadPhotoResponse)
async def upload_project_photo(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a photo for a project.
    Saves the file to ./uploads and stores the URL in project.photo_url.
    """
    project = (
        db.query(RoomProject)
        .filter(RoomProject.id == project_id, RoomProject.user_id == current_user.id)
        .first()
    )

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if file.content_type not in ALLOWED_UPLOAD_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, PNG, and WebP images are allowed",
        )

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large (max {MAX_UPLOAD_BYTES_LABEL})",
        )

    ext = (
        ".jpg"
        if file.content_type == "image/jpeg"
        else ".png"
        if file.content_type == "image/png"
        else ".webp"
    )
    filename = f"project_{project_id}_{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / filename).write_bytes(data)

    project.photo_url = build_public_asset_url(f"/uploads/{filename}")
    upload_feedback = None
    try:
        upload_feedback = await build_image_upload_feedback(data, room_type=project.room_type)
    except Exception:
        upload_feedback = None

    db.commit()
    db.refresh(project)
    return {
        "project": project,
        "upload_feedback": upload_feedback,
    }


@router.post("/{project_id}/analysis", response_model=ProjectAnalysisResponse)
def analyze_project(
    project_id: int,
    analysis_request: ProjectAnalysisRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze a project against a selected style and persist scores/recommendations."""
    project = (
        db.query(RoomProject)
        .filter(RoomProject.id == project_id, RoomProject.user_id == current_user.id)
        .first()
    )

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    run = ProjectAnalysisRun(
        project_id=project.id,
        request_id=getattr(request.state, "request_id", None),
        status="processing",
        selected_style_name=analysis_request.style_name or analysis_request.style_slug,
        room_type=analysis_request.room_type or project.room_type,
        intensity=analysis_request.intensity,
        lighting=analysis_request.lighting,
        budget_tier=analysis_request.budget_tier,
        image_width=analysis_request.image_profile.width if analysis_request.image_profile else None,
        image_height=analysis_request.image_profile.height if analysis_request.image_profile else None,
        image_aspect_ratio=analysis_request.image_profile.aspect_ratio if analysis_request.image_profile else None,
        image_average_brightness=analysis_request.image_profile.average_brightness if analysis_request.image_profile else None,
        image_average_saturation=analysis_request.image_profile.average_saturation if analysis_request.image_profile else None,
        image_warmth_bias=analysis_request.image_profile.warmth_bias if analysis_request.image_profile else None,
        image_dominant_hex=analysis_request.image_profile.dominant_hex if analysis_request.image_profile else None,
        detected_tags_json=json.dumps(analysis_request.detected_tags[:12]),
        started_at=datetime.utcnow(),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    analysis_started_at = datetime.utcnow()

    try:
        validation_error = validate_scan_inputs(
            image_profile=analysis_request.image_profile.model_dump() if analysis_request.image_profile else None,
            detected_tags=analysis_request.detected_tags,
        )
        if validation_error:
            run.status = "failed"
            run.error_message = validation_error
            run.completed_at = datetime.utcnow()
            run.analysis_duration_ms = int((run.completed_at - analysis_started_at).total_seconds() * 1000)
            db.commit()
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=validation_error)

        selected_style = resolve_style_for_analysis(
            db,
            style_id=analysis_request.style_id,
            style_slug=analysis_request.style_slug,
            style_name=analysis_request.style_name,
        )
        if selected_style is None:
            run.status = "failed"
            run.error_message = "Selected style not found"
            run.completed_at = datetime.utcnow()
            db.commit()
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected style not found")

        if analysis_request.room_type and analysis_request.room_type != project.room_type:
            project.room_type = analysis_request.room_type

        payload = analyze_project_design(
            db,
            project=project,
            selected_style=selected_style,
            room_type=analysis_request.room_type or project.room_type,
            intensity=analysis_request.intensity,
            lighting=analysis_request.lighting,
            budget_tier=analysis_request.budget_tier,
            image_profile=analysis_request.image_profile.model_dump() if analysis_request.image_profile else None,
            detected_tags=analysis_request.detected_tags,
        )

        selected_score = next(
            (
                score["score_value"]
                for score in payload["style_scores"]
                if score["style_id"] == selected_style.id
            ),
            payload["style_scores"][0]["score_value"] if payload["style_scores"] else None,
        )
        run.status = "succeeded"
        run.selected_style_id = selected_style.id
        run.selected_style_name = selected_style.name
        run.scan_confidence_score = payload["scan_assessment"]["confidence_score"]
        run.scan_confidence_label = payload["scan_assessment"]["confidence_label"]
        run.scan_signal_count = payload["scan_assessment"]["signal_count"]
        run.scan_warnings_json = json.dumps(payload["scan_assessment"]["warnings"])
        run.room_state_json = json.dumps(payload["room_state"])
        run.top_score = selected_score
        run.recommendation_count = len(payload["recommendations"])
        run.error_message = None
        run.completed_at = datetime.utcnow()
        run.analysis_duration_ms = int((run.completed_at - analysis_started_at).total_seconds() * 1000)

        db.commit()
        db.refresh(project)
        for recommendation in payload["recommendations"]:
            db.refresh(recommendation)

        return payload
    except HTTPException:
        if run.status == "processing":
            db.rollback()
            persisted_run = db.get(ProjectAnalysisRun, run.id)
            if persisted_run is not None:
                persisted_run.status = "failed"
                persisted_run.error_message = "Analysis request failed"
                persisted_run.completed_at = datetime.utcnow()
                persisted_run.analysis_duration_ms = int((persisted_run.completed_at - analysis_started_at).total_seconds() * 1000)
                db.commit()
        raise
    except Exception as exc:
        db.rollback()
        persisted_run = db.get(ProjectAnalysisRun, run.id)
        if persisted_run is not None:
            persisted_run.status = "failed"
            persisted_run.error_message = str(exc)[:500]
            persisted_run.completed_at = datetime.utcnow()
            persisted_run.analysis_duration_ms = int((persisted_run.completed_at - analysis_started_at).total_seconds() * 1000)
            db.commit()
        raise
