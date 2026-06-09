from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    room_projects = relationship("RoomProject", back_populates="user")

class RoomProject(Base):
    __tablename__ = "room_projects"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(160), nullable=False)
    room_type = Column(String(100), nullable=False)
    budget = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # NEW: photo upload support
    photo_url = Column(String(500), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="room_projects")
    room_tags = relationship("RoomTag", back_populates="room_project", cascade="all, delete-orphan")
    room_dimensions = relationship("RoomDimension", back_populates="room_project", cascade="all, delete-orphan")
    room_furniture = relationship("RoomFurniture", back_populates="room_project", cascade="all, delete-orphan")
    room_objects = relationship("RoomObject", back_populates="room_project", cascade="all, delete-orphan")
    resemblance_scores = relationship("ResemblanceScore", back_populates="room_project", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="room_project", cascade="all, delete-orphan")
    budget_plans = relationship("BudgetPlan", back_populates="room_project", cascade="all, delete-orphan")
    analysis_runs = relationship("ProjectAnalysisRun", back_populates="room_project", cascade="all, delete-orphan")

class Style(Base):
    __tablename__ = "styles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    
    # Relationships
    style_tags = relationship("StyleTag", back_populates="style")
    product_items = relationship("ProductItem", back_populates="style")
    resemblance_scores = relationship("ResemblanceScore", back_populates="style")

class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    
    # Relationships
    style_tags = relationship("StyleTag", back_populates="tag")
    room_tags = relationship("RoomTag", back_populates="tag")

class StyleTag(Base):
    __tablename__ = "style_tags"
    __table_args__ = (
        UniqueConstraint("style_id", "tag_id", name="uq_style_tags_style_tag"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    style_id = Column(Integer, ForeignKey("styles.id"), nullable=False)
    tag_id = Column(Integer, ForeignKey("tags.id"), nullable=False)
    weight = Column(Float, default=1.0)
    
    # Relationships
    style = relationship("Style", back_populates="style_tags")
    tag = relationship("Tag", back_populates="style_tags")

class RoomTag(Base):
    __tablename__ = "room_tags"
    __table_args__ = (
        UniqueConstraint("room_project_id", "tag_id", name="uq_room_tags_project_tag"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    room_project_id = Column(Integer, ForeignKey("room_projects.id"), nullable=False)
    tag_id = Column(Integer, ForeignKey("tags.id"), nullable=False)
    is_confirmed = Column(Boolean, default=False)
    
    # Relationships
    room_project = relationship("RoomProject", back_populates="room_tags")
    tag = relationship("Tag", back_populates="room_tags")

class ResemblanceScore(Base):
    __tablename__ = "resemblance_scores"
    __table_args__ = (
        UniqueConstraint("room_project_id", "style_id", name="uq_resemblance_project_style"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    room_project_id = Column(Integer, ForeignKey("room_projects.id"), nullable=False)
    style_id = Column(Integer, ForeignKey("styles.id"), nullable=False)
    score_value = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    room_project = relationship("RoomProject", back_populates="resemblance_scores")
    style = relationship("Style", back_populates="resemblance_scores")

class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    room_project_id = Column(Integer, ForeignKey("room_projects.id"), nullable=False)
    description = Column(Text, nullable=False)
    priority_score = Column(Float, default=0.0)
    estimated_cost = Column(Float, default=0.0)
    confidence_score = Column(Float, nullable=True)
    reason_summary = Column(Text, nullable=True)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    room_project = relationship("RoomProject", back_populates="recommendations")


class ProjectAnalysisRun(Base):
    __tablename__ = "project_analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("room_projects.id"), nullable=False, index=True)
    request_id = Column(String(128), nullable=True, index=True)
    status = Column(String(32), nullable=False, default="processing", index=True)
    selected_style_id = Column(Integer, ForeignKey("styles.id"), nullable=True)
    selected_style_name = Column(String(100), nullable=True)
    room_type = Column(String(100), nullable=False)
    intensity = Column(Integer, nullable=False, default=60)
    lighting = Column(String(20), nullable=False, default="warm")
    budget_tier = Column(String(20), nullable=False, default="medium")
    image_width = Column(Integer, nullable=True)
    image_height = Column(Integer, nullable=True)
    image_aspect_ratio = Column(Float, nullable=True)
    image_average_brightness = Column(Float, nullable=True)
    image_average_saturation = Column(Float, nullable=True)
    image_warmth_bias = Column(Float, nullable=True)
    image_dominant_hex = Column(String(32), nullable=True)
    detected_tags_json = Column(Text, nullable=True)
    scan_confidence_score = Column(Float, nullable=True)
    scan_confidence_label = Column(String(20), nullable=True)
    scan_signal_count = Column(Integer, nullable=True)
    scan_warnings_json = Column(Text, nullable=True)
    room_state_json = Column(Text, nullable=True)
    top_score = Column(Float, nullable=True)
    recommendation_count = Column(Integer, nullable=False, default=0)
    analysis_duration_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    room_project = relationship("RoomProject", back_populates="analysis_runs")
    selected_style = relationship("Style")


class RoomDimension(Base):
    __tablename__ = "room_dimensions"

    id = Column(Integer, primary_key=True, index=True)
    room_project_id = Column(Integer, ForeignKey("room_projects.id"), nullable=False)
    width = Column(Float, nullable=True)
    length = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    unit = Column(String(20), default="ft")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    room_project = relationship("RoomProject", back_populates="room_dimensions")


class RoomFurniture(Base):
    __tablename__ = "room_furniture"

    id = Column(Integer, primary_key=True, index=True)
    room_project_id = Column(Integer, ForeignKey("room_projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    quantity = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    room_project = relationship("RoomProject", back_populates="room_furniture")


class RoomObject(Base):
    __tablename__ = "room_objects"

    id = Column(Integer, primary_key=True, index=True)
    room_project_id = Column(Integer, ForeignKey("room_projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    quantity = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    room_project = relationship("RoomProject", back_populates="room_objects")

class ProductItem(Base):
    __tablename__ = "product_items"
    
    id = Column(Integer, primary_key=True, index=True)
    style_id = Column(Integer, ForeignKey("styles.id"), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    estimated_cost = Column(Float, nullable=False)
    url = Column(String(500))
    image_url = Column(String(500))
    
    # Relationships
    style = relationship("Style", back_populates="product_items")
    vendor = relationship("Vendor", back_populates="product_items")
    budget_allocations = relationship("BudgetAllocation", back_populates="product_item")


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    website_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product_items = relationship("ProductItem", back_populates="vendor")


class BudgetPlan(Base):
    __tablename__ = "budget_plans"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("room_projects.id"), nullable=False)
    total_budget = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), nullable=False, default="USD")
    plan_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    room_project = relationship("RoomProject", back_populates="budget_plans")
    budget_allocations = relationship("BudgetAllocation", back_populates="budget_plan")


class BudgetAllocation(Base):
    __tablename__ = "budget_allocations"

    id = Column(Integer, primary_key=True, index=True)
    budget_id = Column(Integer, ForeignKey("budget_plans.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("product_items.id"), nullable=True)
    category = Column(String(100), nullable=False)
    allocated_amount = Column(Float, nullable=False, default=0.0)
    quantity = Column(Integer, nullable=False, default=1)
    priority_rank = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    budget_plan = relationship("BudgetPlan", back_populates="budget_allocations")
    product_item = relationship("ProductItem", back_populates="budget_allocations")
