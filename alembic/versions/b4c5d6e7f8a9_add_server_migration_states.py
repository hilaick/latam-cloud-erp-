"""add server_migration_states table

Revision ID: b4c5d6e7f8a9
Revises: a3b2c1d4e5f6
Create Date: 2026-09-17 13:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'b4c5d6e7f8a9'
down_revision = 'a3b2c1d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'server_migration_states',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('execution_state_id', sa.Integer, sa.ForeignKey('execution_states.id'), nullable=False, index=True),
        sa.Column('project_id', sa.String(50), nullable=False, index=True),
        sa.Column('source_server_id', sa.String(100), nullable=True),
        sa.Column('source_server_name', sa.String(200), nullable=False, index=True),
        sa.Column('target_ecs_id', sa.String(100), nullable=True),
        sa.Column('target_ecs_name', sa.String(200), nullable=True),
        sa.Column('sms_task_id', sa.String(100), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, server_default='planned'),
        sa.Column('current_step_id', sa.Integer, nullable=True),
        sa.Column('failed_step_id', sa.Integer, nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('target_flavor', sa.String(50), nullable=True),
        sa.Column('target_flavor_source', sa.String(30), nullable=True),
        sa.Column('target_requirements_met', sa.Boolean, nullable=True, server_default='false'),
        sa.Column('target_requirements_detail', sa.Text, nullable=True),
        sa.Column('started_at', sa.DateTime, nullable=True),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint('project_id', 'source_server_name', name='_project_server_uc'),
    )


def downgrade():
    op.drop_table('server_migration_states')
