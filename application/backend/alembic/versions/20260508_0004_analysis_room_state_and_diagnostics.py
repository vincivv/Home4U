"""Persist room-state diagnostics on analysis runs.

Revision ID: 20260508_0004
Revises: 20260508_0003
Create Date: 2026-05-08 00:04:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260508_0004"
down_revision = "20260508_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("project_analysis_runs", sa.Column("scan_signal_count", sa.Integer(), nullable=True))
    op.add_column("project_analysis_runs", sa.Column("room_state_json", sa.Text(), nullable=True))
    op.add_column("project_analysis_runs", sa.Column("analysis_duration_ms", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("project_analysis_runs", "analysis_duration_ms")
    op.drop_column("project_analysis_runs", "room_state_json")
    op.drop_column("project_analysis_runs", "scan_signal_count")
