"""add mcp default credentials to hermes_config

Revision ID: a3b2c1d4e5f6
Revises: f0dd0ab2e585
Create Date: 2026-08-27 05:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'a3b2c1d4e5f6'
down_revision = 'f0dd0ab2e585'
branch_labels = None
depends_on = None


def upgrade():
    try:
        op.add_column('hermes_config', sa.Column('mcp_default_ak', sa.String(255), nullable=True))
    except Exception:
        pass  # Column may already exist
    try:
        op.add_column('hermes_config', sa.Column('mcp_default_sk', sa.String(255), nullable=True))
    except Exception:
        pass  # Column may already exist


def downgrade():
    try:
        op.drop_column('hermes_config', 'mcp_default_sk')
    except Exception:
        pass
    try:
        op.drop_column('hermes_config', 'mcp_default_ak')
    except Exception:
        pass
