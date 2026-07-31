"""add user tenant columns (department, partner_org)

Revision ID: f0dd0ab2e585
Revises: 
Create Date: 2026-08-01 00:30:50.192990

SAFE MIGRATION: ADD-only. DROP operations removed to preserve production data
in ai_configurations, delegate_task_logs, ai_usage_logs, execution_states.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f0dd0ab2e585'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add new tables and columns only. No DROP operations."""
    
    # --- NEW TABLES ---
    op.create_table('invalid_tokens',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('jti', sa.String(length=36), nullable=False),
        sa.Column('token_type', sa.String(length=10), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_invalid_tokens_jti', 'invalid_tokens', ['jti'], unique=False)
    
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('project_id', sa.String(length=50), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=100), nullable=True),
        sa.Column('entity_id', sa.String(length=100), nullable=True),
        sa.Column('changes_json', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_project_id'), 'audit_logs', ['project_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_timestamp'), 'audit_logs', ['timestamp'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)
    
    op.create_table('edit_sessions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.String(length=50), nullable=False),
        sa.Column('entity_type', sa.String(length=100), nullable=False),
        sa.Column('entity_id', sa.String(length=100), nullable=False),
        sa.Column('session_start', sa.DateTime(), nullable=True),
        sa.Column('heartbeat_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_edit_sessions_active', 'edit_sessions', ['project_id', 'entity_type', 'entity_id'], unique=False)
    
    op.create_table('project_members',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.String(length=50), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=True),
        sa.Column('joined_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'project_id', name='uq_user_project')
    )
    op.create_index(op.f('ix_project_members_project_id'), 'project_members', ['project_id'], unique=False)
    op.create_index(op.f('ix_project_members_user_id'), 'project_members', ['user_id'], unique=False)
    
    # --- NEW COLUMNS on projects ---
    op.add_column('projects', sa.Column('owner_id', sa.Integer(), nullable=True))
    op.add_column('projects', sa.Column('locked_by', sa.Integer(), nullable=True))
    op.add_column('projects', sa.Column('locked_at', sa.DateTime(), nullable=True))
    op.add_column('projects', sa.Column('created_at', sa.DateTime(), nullable=True))
    op.create_foreign_key(None, 'projects', 'users', ['owner_id'], ['id'])
    op.create_foreign_key(None, 'projects', 'users', ['locked_by'], ['id'])
    
    # --- NEW COLUMNS on users (the fix we need!) ---
    op.add_column('users', sa.Column('department', sa.String(length=120), nullable=True))
    op.add_column('users', sa.Column('partner_org', sa.String(length=200), nullable=True))
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=True))
    op.add_column('users', sa.Column('created_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Reverse: drop added columns and tables."""
    op.drop_column('users', 'created_at')
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'partner_org')
    op.drop_column('users', 'department')
    op.drop_constraint(None, 'projects', type_='foreignkey')
    op.drop_constraint(None, 'projects', type_='foreignkey')
    op.drop_column('projects', 'created_at')
    op.drop_column('projects', 'locked_at')
    op.drop_column('projects', 'locked_by')
    op.drop_column('projects', 'owner_id')
    op.drop_index(op.f('ix_project_members_user_id'), table_name='project_members')
    op.drop_index(op.f('ix_project_members_project_id'), table_name='project_members')
    op.drop_table('project_members')
    op.drop_index('ix_edit_sessions_active', table_name='edit_sessions')
    op.drop_table('edit_sessions')
    op.drop_index(op.f('ix_audit_logs_user_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_timestamp'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_project_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_table('audit_logs')
    op.drop_index('ix_invalid_tokens_jti', table_name='invalid_tokens')
    op.drop_table('invalid_tokens')
