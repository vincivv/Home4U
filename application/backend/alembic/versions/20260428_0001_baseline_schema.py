"""Baseline Home4U relational schema.

Revision ID: 20260428_0001
Revises:
Create Date: 2026-04-28 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260428_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "styles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "vendors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("website_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "room_projects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("room_type", sa.String(length=100), nullable=False),
        sa.Column("budget", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "style_tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("style_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["style_id"], ["styles.id"]),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("style_id", "tag_id", name="uq_style_tags_style_tag"),
    )

    op.create_table(
        "room_tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("room_project_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.Column("is_confirmed", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(["room_project_id"], ["room_projects.id"]),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_project_id", "tag_id", name="uq_room_tags_project_tag"),
    )

    op.create_table(
        "resemblance_scores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("room_project_id", sa.Integer(), nullable=False),
        sa.Column("style_id", sa.Integer(), nullable=False),
        sa.Column("score_value", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["room_project_id"], ["room_projects.id"]),
        sa.ForeignKeyConstraint(["style_id"], ["styles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_project_id", "style_id", name="uq_resemblance_project_style"),
    )

    op.create_table(
        "room_dimensions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("room_project_id", sa.Integer(), nullable=False),
        sa.Column("width", sa.Float(), nullable=True),
        sa.Column("length", sa.Float(), nullable=True),
        sa.Column("height", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["room_project_id"], ["room_projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "room_furniture",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("room_project_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["room_project_id"], ["room_projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "room_objects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("room_project_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["room_project_id"], ["room_projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "recommendations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("room_project_id", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("priority_score", sa.Float(), nullable=True),
        sa.Column("estimated_cost", sa.Float(), nullable=True),
        sa.Column("is_completed", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["room_project_id"], ["room_projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "project_analysis_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("selected_style_id", sa.Integer(), nullable=True),
        sa.Column("selected_style_name", sa.String(length=100), nullable=True),
        sa.Column("room_type", sa.String(length=100), nullable=False),
        sa.Column("intensity", sa.Integer(), nullable=False),
        sa.Column("lighting", sa.String(length=20), nullable=False),
        sa.Column("budget_tier", sa.String(length=20), nullable=False),
        sa.Column("top_score", sa.Float(), nullable=True),
        sa.Column("recommendation_count", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["room_projects.id"]),
        sa.ForeignKeyConstraint(["selected_style_id"], ["styles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_project_analysis_runs_project_id", "project_analysis_runs", ["project_id"], unique=False)
    op.create_index("ix_project_analysis_runs_request_id", "project_analysis_runs", ["request_id"], unique=False)
    op.create_index("ix_project_analysis_runs_status", "project_analysis_runs", ["status"], unique=False)

    op.create_table(
        "product_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("style_id", sa.Integer(), nullable=False),
        sa.Column("vendor_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("estimated_cost", sa.Float(), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["style_id"], ["styles.id"]),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "budget_plans",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("total_budget", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False),
        sa.Column("plan_name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["room_projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "budget_allocations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("budget_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("allocated_amount", sa.Float(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("priority_rank", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["budget_id"], ["budget_plans.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["product_items.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("budget_allocations")
    op.drop_table("budget_plans")
    op.drop_table("product_items")
    op.drop_index("ix_project_analysis_runs_status", table_name="project_analysis_runs")
    op.drop_index("ix_project_analysis_runs_request_id", table_name="project_analysis_runs")
    op.drop_index("ix_project_analysis_runs_project_id", table_name="project_analysis_runs")
    op.drop_table("project_analysis_runs")
    op.drop_table("recommendations")
    op.drop_table("room_objects")
    op.drop_table("room_furniture")
    op.drop_table("room_dimensions")
    op.drop_table("resemblance_scores")
    op.drop_table("room_tags")
    op.drop_table("style_tags")
    op.drop_table("room_projects")
    op.drop_table("vendors")
    op.drop_table("tags")
    op.drop_table("styles")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
