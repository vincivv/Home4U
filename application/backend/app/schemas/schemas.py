from pydantic import BaseModel, EmailStr, Field, StringConstraints
from typing import Optional, List, Literal, Annotated
from datetime import datetime

RoomTypeValue = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
ProjectNameValue = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]

# User Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None

# RoomProject Schemas
class RoomProjectCreate(BaseModel):
    name: Optional[ProjectNameValue] = None
    room_type: RoomTypeValue

class RoomProjectUpdate(BaseModel):
    name: Optional[ProjectNameValue] = None
    room_type: Optional[RoomTypeValue] = None
    budget: Optional[float] = Field(default=None, ge=0.0)

class RoomProjectResponse(BaseModel):
    id: int
    user_id: int
    name: str
    room_type: str
    budget: float
    created_at: datetime
    photo_url: Optional[str] = None

    class Config:
        from_attributes = True


class ImageUploadFeedbackMetrics(BaseModel):
    width: int = Field(ge=1)
    height: int = Field(ge=1)
    megapixels: float = Field(ge=0.0)
    brightness: float = Field(ge=0.0, le=1.0)
    aspect_ratio: float = Field(ge=0.1)
    issue_count: int = Field(ge=0)


class ImageUploadFeedback(BaseModel):
    summary: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    confidence_label: Literal["low", "medium", "high"] = "low"
    issues: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    metrics: ImageUploadFeedbackMetrics


class UploadPhotoResponse(BaseModel):
    project: RoomProjectResponse
    upload_feedback: Optional[ImageUploadFeedback] = None

# Style Schemas
class StyleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]

    class Config:
        from_attributes = True

class StyleWithTagsResponse(StyleResponse):
    tags: List[dict] = []

    class Config:
        from_attributes = True

# Tag Schemas
class TagResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

# StyleTag Schemas
class StyleTagResponse(BaseModel):
    id: int
    style_id: int
    tag_id: int
    weight: float

    class Config:
        from_attributes = True

# RoomTag Schemas
class RoomTagCreate(BaseModel):
    tag_id: int
    is_confirmed: bool = False

class RoomTagResponse(BaseModel):
    id: int
    room_project_id: int
    tag_id: int
    is_confirmed: bool

    class Config:
        from_attributes = True

# ResemblanceScore Schemas
class ScoreResponse(BaseModel):
    id: int
    room_project_id: int
    style_id: int
    score_value: float
    created_at: datetime

    class Config:
        from_attributes = True

class ScoreCalculationRequest(BaseModel):
    room_project_id: int
    style_ids: List[int]

# Recommendation Schemas
class RecommendationCreate(BaseModel):
    description: str
    priority_score: float = Field(ge=0.0)
    estimated_cost: float = Field(ge=0.0)

class RecommendationResponse(BaseModel):
    id: int
    room_project_id: int
    description: str
    priority_score: float
    estimated_cost: float
    confidence_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    reason_summary: Optional[str] = None
    is_completed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ShoppingSourceDetail(BaseModel):
    retailer: str
    search_query: str
    url: str


class ShoppingProductMatch(BaseModel):
    key: str
    name: str
    retailer: str
    estimated_cost: float = Field(ge=0.0)
    price_label: str
    url: str
    image_url: Optional[str] = None
    match_reason: str
    match_label: str
    source_kind: Literal["catalog", "search"] = "search"


class ShoppingPlanItem(BaseModel):
    key: str
    label: str
    category: str
    room_zone: str
    priority_label: str
    purchase_reason: str
    estimated_cost: float = Field(ge=0.0)
    budget_share: float = Field(ge=0.0, le=1.0)
    is_completed: bool = False
    search_query: str
    sources: List[ShoppingSourceDetail] = []
    products: List[ShoppingProductMatch] = []


class SuggestedTagDetail(BaseModel):
    id: int
    name: str
    confidence: float = Field(ge=0.0, le=1.0)
    source: str


class StyleScoreDetail(BaseModel):
    style_id: int
    style_name: str
    score_value: float = Field(ge=0.0, le=100.0)
    matched_tags: List[str] = []


class ImageProfile(BaseModel):
    width: int = Field(default=0, ge=0)
    height: int = Field(default=0, ge=0)
    aspect_ratio: float = Field(default=1.0, ge=0.1)
    average_brightness: float = Field(default=0.0, ge=0.0, le=1.0)
    average_saturation: float = Field(default=0.0, ge=0.0, le=1.0)
    warmth_bias: float = Field(default=0.0, ge=-1.0, le=1.0)
    dominant_hex: Optional[str] = None


class ScanAssessment(BaseModel):
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    confidence_label: Literal["low", "medium", "high"] = "low"
    signal_count: int = Field(default=0, ge=0)
    warnings: List[str] = Field(default_factory=list)


class RoomStateSignals(BaseModel):
    openness: Literal["low", "medium", "high"] = "medium"
    clutter_level: Literal["low", "medium", "high"] = "medium"
    contrast_level: Literal["low", "medium", "high"] = "medium"
    furnishing_density: Literal["low", "medium", "high"] = "medium"
    cues: List[str] = Field(default_factory=list)


class ProjectAnalysisRequest(BaseModel):
    style_id: Optional[int] = None
    style_slug: Optional[str] = None
    style_name: Optional[str] = None
    room_type: Optional[str] = None
    intensity: int = Field(default=60, ge=0, le=100)
    lighting: Literal["warm", "cool"] = "warm"
    budget_tier: Literal["low", "medium", "high"] = "medium"
    image_profile: Optional[ImageProfile] = None
    detected_tags: List[str] = []


class ProjectAnalysisResponse(BaseModel):
    project: RoomProjectResponse
    selected_style: StyleResponse
    summary: str
    image_profile: Optional[ImageProfile] = None
    scan_assessment: Optional[ScanAssessment] = None
    room_state: Optional[RoomStateSignals] = None
    suggested_tags: List[SuggestedTagDetail]
    style_scores: List[StyleScoreDetail]
    recommendations: List[RecommendationResponse]
    shopping_plan: List[ShoppingPlanItem] = []
    matching_aspects: List[str] = []
    gap_aspects: List[str] = []
    ai_powered: bool = False
    ai_model: Optional[str] = None


class ProjectAnalysisRunResponse(BaseModel):
    id: int
    project_id: int
    request_id: Optional[str] = None
    status: str
    selected_style_id: Optional[int] = None
    selected_style_name: Optional[str] = None
    room_type: str
    intensity: int
    lighting: str
    budget_tier: str
    image_profile: Optional[ImageProfile] = None
    scan_assessment: Optional[ScanAssessment] = None
    room_state: Optional[RoomStateSignals] = None
    detected_tags: List[str] = []
    top_score: Optional[float] = None
    recommendation_count: int
    analysis_duration_ms: Optional[int] = None
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ProductItem Schemas
class ProductItemResponse(BaseModel):
    id: int
    style_id: int
    name: str
    estimated_cost: float
    url: Optional[str]
    image_url: Optional[str]

    class Config:
        from_attributes = True

# AI Tag Suggestion Schema
class AISuggestTagsRequest(BaseModel):
    room_project_id: int

class AISuggestTagsResponse(BaseModel):
    suggested_tags: List[dict]  # [{"tag_id": 1, "tag_name": "modern", "confidence": 0.95}]


# Search Schemas
class SearchResult(BaseModel):
    id: int
    type: str  # e.g., "style"
    title: str
    snippet: Optional[str]
    tags: List[str] = []
    score: float
    rank: int

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int
    page: int
    limit: int
    has_more: bool
