"""Add explicit project names.

Revision ID: 20260512_0003
Revises: 20260507_0002
Create Date: 2026-05-12 14:10:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260512_0003"
down_revision = "20260507_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("room_projects", sa.Column("name", sa.String(length=160), nullable=True))
    op.execute(
        "UPDATE room_projects "
        "SET name = TRIM(room_type) || ' Project #' || id "
        "WHERE name IS NULL OR TRIM(name) = ''"
    )
    op.alter_column("room_projects", "name", existing_type=sa.String(length=160), nullable=False)


def downgrade() -> None:
    op.drop_column("room_projects", "name")
