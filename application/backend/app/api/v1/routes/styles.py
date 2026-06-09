from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.database import Style, Tag, StyleTag, User
from app.schemas.schemas import (
    StyleResponse, 
    StyleWithTagsResponse,
    TagResponse,
    StyleTagResponse
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/styles", tags=["Styles"])

# Public endpoints - no authentication required

@router.get("/", response_model=List[StyleResponse])
def get_styles(db: Session = Depends(get_db)):
    """Get all available styles."""
    styles = db.query(Style).all()
    return styles

@router.get("/{style_id}", response_model=StyleResponse)
def get_style(style_id: int, db: Session = Depends(get_db)):
    """Get a specific style."""
    style = db.query(Style).filter(Style.id == style_id).first()
    if not style:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Style not found"
        )
    return style

@router.get("/{style_id}/tags", response_model=List[dict])
def get_style_tags(style_id: int, db: Session = Depends(get_db)):
    """Get all tags associated with a style."""
    style_tags = db.query(StyleTag).filter(StyleTag.style_id == style_id).all()
    
    result = []
    for st in style_tags:
        result.append({
            "id": st.tag.id,
            "name": st.tag.name,
            "weight": st.weight
        })
    
    return result

@router.get("/tags/", response_model=List[TagResponse])
def get_all_tags(db: Session = Depends(get_db)):
    """Get all available tags."""
    tags = db.query(Tag).all()
    return tags


# Admin endpoints - require authentication (simplified for now)

@router.post("/tags/", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(
    name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new tag for authenticated internal use."""
    _ = current_user
    existing = db.query(Tag).filter(Tag.name == name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tag already exists"
        )
    
    tag = Tag(name=name)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag
