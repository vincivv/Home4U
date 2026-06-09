from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session
from typing import List, Literal

from app.core.database import get_db
from app.models.database import Recommendation, RoomProject, ResemblanceScore
from app.schemas.schemas import (
    RecommendationCreate, 
    RecommendationResponse
)
from app.utils.dependencies import get_current_user
from app.models.database import User
from app.services.project_analysis import (
    build_saved_recommendation_context,
    refresh_project_recommendations,
)

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.post("/", response_model=RecommendationResponse, status_code=status.HTTP_201_CREATED)
def create_recommendation(
    recommendation: RecommendationCreate,
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new recommendation for a room project."""
    # Verify project belongs to user
    project = db.query(RoomProject).filter(
        RoomProject.id == project_id,
        RoomProject.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    db_recommendation = Recommendation(
        room_project_id=project_id,
        description=recommendation.description,
        priority_score=recommendation.priority_score,
        estimated_cost=recommendation.estimated_cost
    )
    
    db.add(db_recommendation)
    db.commit()
    db.refresh(db_recommendation)
    return db_recommendation

@router.get("/project/{project_id}", response_model=List[RecommendationResponse])
def get_project_recommendations(
    project_id: int,
    response: Response,
    limit: int = Query(default=20, ge=1, le=100),
    page: int = Query(default=1, ge=1),
    status_filter: Literal["all", "open", "completed"] = Query(default="all", alias="status"),
    sort: Literal["priority_desc", "priority_asc", "created_desc", "created_asc", "cost_desc", "cost_asc"] = Query(default="priority_desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all recommendations for a room project."""
    # Verify project belongs to user
    project = db.query(RoomProject).filter(
        RoomProject.id == project_id,
        RoomProject.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    query = db.query(Recommendation).filter(
        Recommendation.room_project_id == project_id
    )
    if status_filter == "open":
        query = query.filter(Recommendation.is_completed.is_(False))
    elif status_filter == "completed":
        query = query.filter(Recommendation.is_completed.is_(True))

    total = query.count()
    order_clause = {
        "priority_desc": desc(Recommendation.priority_score),
        "priority_asc": asc(Recommendation.priority_score),
        "created_desc": desc(Recommendation.created_at),
        "created_asc": asc(Recommendation.created_at),
        "cost_desc": desc(Recommendation.estimated_cost),
        "cost_asc": asc(Recommendation.estimated_cost),
    }[sort]
    recommendations = (
        query.order_by(order_clause, desc(Recommendation.id))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Limit"] = str(limit)
    return recommendations

@router.put("/{recommendation_id}/complete", response_model=RecommendationResponse)
def mark_recommendation_complete(
    recommendation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a recommendation as completed."""
    recommendation = db.query(Recommendation).filter(
        Recommendation.id == recommendation_id
    ).first()
    
    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )
    
    # Verify project belongs to user
    project = db.query(RoomProject).filter(
        RoomProject.id == recommendation.room_project_id,
        RoomProject.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    recommendation.is_completed = True
    db.commit()
    db.refresh(recommendation)
    return recommendation


# AI-powered recommendation generation (simplified)
@router.post("/generate/{project_id}", response_model=List[RecommendationResponse])
def generate_recommendations(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI-powered recommendations based on project data."""
    # Verify project belongs to user
    project = db.query(RoomProject).filter(
        RoomProject.id == project_id,
        RoomProject.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get resemblance scores for this project
    scores = db.query(ResemblanceScore).filter(
        ResemblanceScore.room_project_id == project_id
    ).all()
    
    if not scores:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please calculate style scores first"
        )
    
    top_styles = sorted(scores, key=lambda x: x.score_value, reverse=True)
    if not top_styles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please calculate style scores first"
        )
    saved_context = build_saved_recommendation_context(db, project=project)

    db.query(Recommendation).filter(
        Recommendation.room_project_id == project_id
    ).delete(synchronize_session=False)

    style_scores = [
        {
            "style_id": score.style_id,
            "style_name": score.style.name,
            "score_value": score.score_value,
            "matched_tags": [],
        }
        for score in top_styles
    ]
    recommendations = refresh_project_recommendations(
        db,
        project=project,
        selected_style=top_styles[0].style,
        style_scores=style_scores,
        suggested_tags=saved_context.suggested_tags,
        intensity=saved_context.intensity,
        lighting=saved_context.lighting,
        budget_tier=saved_context.budget_tier,
        scan_assessment=saved_context.scan_assessment,
        room_state=saved_context.room_state,
    )

    db.commit()
    for recommendation in recommendations:
        db.refresh(recommendation)

    return recommendations
