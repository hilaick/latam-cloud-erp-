"""
Alembic environment configuration for ERP Migration Factory.

Features:
- Reads DATABASE_URL from Flask app config (env var)
- Auto-discovers all SQLAlchemy models via Flask-SQLAlchemy metadata
- Multi-schema support: run with SCHEMA=tenant_name to target a specific
  tenant, or use ALL_SCHEMAS=true to migrate all tenant schemas.
- Default: public schema only (shared tables: users, projects, hermes_config)
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool, text
from alembic import context

# Add repo root so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from models import db

# ── Flask app bootstrap (minimal, for DB config only) ──
_app = Flask(__name__)

database_url = os.environ.get("DATABASE_URL")
if not database_url:
    raise RuntimeError(
        "DATABASE_URL environment variable not set. "
        "Create a .env file or export DATABASE_URL before running Alembic."
    )
# Normalize postgres:// → postgresql:// (some providers use the old scheme)
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

_app.config["SQLALCHEMY_DATABASE_URI"] = database_url
_app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(_app)

# Push an app context so model metadata is available
_app.app_context().push()

# ── Alembic Config ──
config = context.config

# Use Flask's database URL instead of alembic.ini's sqlalchemy.url
config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata: all models registered with Flask-SQLAlchemy
target_metadata = db.metadata

# ── Multi-schema support ──
# Which schema(s) to migrate. Set via env vars:
#   SCHEMA=schema_name  — migrate a single named schema
#   ALL_SCHEMAS=true    — discover and migrate all tenant schemas + public
#   (default)           — public schema only
_target_schema = os.environ.get("SCHEMA")
_migrate_all = os.environ.get("ALL_SCHEMAS", "").lower() in ("1", "true", "yes")


def _get_tenant_schemas(connection):
    """Discover tenant schemas (those matching 'tenant_%' pattern)."""
    result = connection.execute(
        text(
            "SELECT schema_name FROM information_schema.schemata "
            "WHERE schema_name LIKE 'tenant_%' "
            "ORDER BY schema_name"
        )
    )
    return [row[0] for row in result]


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL to stdout)."""
    url = config.get_main_option("sqlalchemy.url")
    
    schemas_to_migrate = ["public"]
    if _target_schema:
        schemas_to_migrate = [str(_target_schema)]
    
    # In offline mode we can't discover tenant schemas, use SCHEMA or ALL_SCHEMAS
    if _migrate_all:
        print("WARNING: ALL_SCHEMAS not supported in offline mode. Use SCHEMA=name instead.")
    
    for schema in schemas_to_migrate:
        context.configure(
            url=url,
            target_metadata=target_metadata,
            literal_binds=True,
            dialect_opts={"paramstyle": "named"},
            version_table_schema=schema,
            include_schemas=True,
        )
        
        with context.begin_transaction():
            context.execute(text(f"SET search_path TO {schema}"))
            context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (against a live database)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Determine which schemas to migrate
        schemas_to_migrate = ["public"]
        if _target_schema:
            schemas_to_migrate = [str(_target_schema)]
        elif _migrate_all:
            tenant_schemas = _get_tenant_schemas(connection)
            schemas_to_migrate = ["public"] + tenant_schemas
            print(f"[Alembic] Migrating {len(schemas_to_migrate)} schema(s): {', '.join(schemas_to_migrate)}")
        else:
            print(f"[Alembic] Migrating public schema only (set SCHEMA=name or ALL_SCHEMAS=true for tenants)")
        
        for schema in schemas_to_migrate:
            print(f"[Alembic]  → {schema}")
            connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
            connection.execute(text(f"SET search_path TO {schema}"))
            
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                version_table_schema=schema,
                include_schemas=True,
            )
            
            with context.begin_transaction():
                context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
