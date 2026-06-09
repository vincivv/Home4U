"""Add AI enhancement fields to analysis runs.

Revision ID: 20260513_0005
Revises: 20260508_0004, 20260512_0003
Create Date: 2026-05-13 09:15:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260513_0005"
down_revision = ("20260508_0004", "20260512_0003")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("project_analysis_runs", sa.Column("ai_provider", sa.String(length=40), nullable=True))
    op.add_column("project_analysis_runs", sa.Column("ai_summary_text", sa.Text(), nullable=True))
    op.add_column("project_analysis_runs", sa.Column("ai_concept_image_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("project_analysis_runs", "ai_concept_image_url")
    op.drop_column("project_analysis_runs", "ai_summary_text")
    op.drop_column("project_analysis_runs", "ai_provider")
