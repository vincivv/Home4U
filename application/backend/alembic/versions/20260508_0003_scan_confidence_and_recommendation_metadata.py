"""Persist scan confidence and recommendation explanation metadata.

Revision ID: 20260508_0003
Revises: 20260507_0002
Create Date: 2026-05-08 00:03:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260508_0003"
down_revision = "20260507_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("project_analysis_runs", sa.Column("scan_confidence_score", sa.Float(), nullable=True))
    op.add_column("project_analysis_runs", sa.Column("scan_confidence_label", sa.String(length=20), nullable=True))
    op.add_column("project_analysis_runs", sa.Column("scan_warnings_json", sa.Text(), nullable=True))
    op.add_column("recommendations", sa.Column("confidence_score", sa.Float(), nullable=True))
    op.add_column("recommendations", sa.Column("reason_summary", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("recommendations", "reason_summary")
    op.drop_column("recommendations", "confidence_score")
    op.drop_column("project_analysis_runs", "scan_warnings_json")
    op.drop_column("project_analysis_runs", "scan_confidence_label")
    op.drop_column("project_analysis_runs", "scan_confidence_score")
