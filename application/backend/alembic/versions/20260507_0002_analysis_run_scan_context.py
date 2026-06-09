"""Persist scan context on analysis runs.

Revision ID: 20260507_0002
Revises: 20260428_0001
Create Date: 2026-05-07 00:02:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260507_0002"
down_revision = "20260428_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("project_analysis_runs", sa.Column("image_width", sa.Integer(), nullable=True))
    op.add_column("project_analysis_runs", sa.Column("image_height", sa.Integer(), nullable=True))
    op.add_column("project_analysis_runs", sa.Column("image_aspect_ratio", sa.Float(), nullable=True))
    op.add_column("project_analysis_runs", sa.Column("image_average_brightness", sa.Float(), nullable=True))
    op.add_column("project_analysis_runs", sa.Column("image_average_saturation", sa.Float(), nullable=True))
    op.add_column("project_analysis_runs", sa.Column("image_warmth_bias", sa.Float(), nullable=True))
    op.add_column("project_analysis_runs", sa.Column("image_dominant_hex", sa.String(length=32), nullable=True))
    op.add_column("project_analysis_runs", sa.Column("detected_tags_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("project_analysis_runs", "detected_tags_json")
    op.drop_column("project_analysis_runs", "image_dominant_hex")
    op.drop_column("project_analysis_runs", "image_warmth_bias")
    op.drop_column("project_analysis_runs", "image_average_saturation")
    op.drop_column("project_analysis_runs", "image_average_brightness")
    op.drop_column("project_analysis_runs", "image_aspect_ratio")
    op.drop_column("project_analysis_runs", "image_height")
    op.drop_column("project_analysis_runs", "image_width")
