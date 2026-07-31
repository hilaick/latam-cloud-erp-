"""
Admin User Seed Script — Bootstrap the first Administrator account.

The register endpoint requires Admin role, creating a chicken-and-egg problem.
This script creates the initial Admin user directly via the database.

Usage:
    python seed_admin.py                          # interactive prompt
    python seed_admin.py --email <e> --password <p> --name <n>  # non-interactive
    python seed_admin.py --check                   # verify if admin exists

Environment variables (non-interactive alternative):
    ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD, ADMIN_SEED_NAME
"""

import os
import sys
import argparse
import getpass
from datetime import datetime

# Add repo root to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from models import db, User


def get_app():
    """Create a minimal Flask app for database access."""
    app = Flask(__name__)
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set in environment. Create a .env file with:")
        print("  DATABASE_URL=postgresql://user:password@host:5432/dbname")
        sys.exit(1)
    
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    return app


def check_admin_exists(app):
    """Return True if at least one active Admin user exists."""
    with app.app_context():
        admin_count = User.query.filter_by(role='Admin', is_active=True).count()
        return admin_count > 0


def create_admin(app, email: str, password: str, name: str) -> User:
    """Create a new Admin user. Raises ValueError if email already exists."""
    from werkzeug.security import generate_password_hash
    
    with app.app_context():
        # Check for duplicate email
        existing = User.query.filter_by(email=email).first()
        if existing:
            raise ValueError(f"User with email '{email}' already exists (role: {existing.role})")
        
        admin = User(
            name=name,
            email=email,
            password_hash=generate_password_hash(password),
            role='Admin',
            department='Platform Engineering',
            partner_org=None,
            is_active=True,
            is_2fa=False,
            last_login=None,
        )
        db.session.add(admin)
        db.session.commit()
        
        print(f"✓ Admin user created successfully!")
        print(f"  ID:    {admin.id}")
        print(f"  Name:  {admin.name}")
        print(f"  Email: {admin.email}")
        print(f"  Role:  {admin.role}")
        return admin


def main():
    parser = argparse.ArgumentParser(description='Seed the first Admin user for ERP Migration Factory')
    parser.add_argument('--email', help='Admin email address')
    parser.add_argument('--password', help='Admin password (use env var ADMIN_SEED_PASSWORD to avoid shell history)')
    parser.add_argument('--name', help='Admin display name', default='Platform Admin')
    parser.add_argument('--check', action='store_true', help='Check if admin already exists and exit')
    parser.add_argument('--force', action='store_true', help='Create even if admin already exists')
    args = parser.parse_args()
    
    app = get_app()
    
    # ── Check mode ──
    if args.check:
        exists = check_admin_exists(app)
        if exists:
            with app.app_context():
                admin = User.query.filter_by(role='Admin', is_active=True).first()
                print(f"✓ Admin exists: {admin.name} ({admin.email})")
        else:
            print("✗ No Admin user found. Run without --check to create one.")
        return
    
    # ── Non-interactive mode ──
    email = args.email or os.environ.get('ADMIN_SEED_EMAIL')
    password = args.password or os.environ.get('ADMIN_SEED_PASSWORD')
    name = args.name or os.environ.get('ADMIN_SEED_NAME', 'Platform Admin')
    
    if email and password:
        # Non-interactive
        pass
    else:
        # Interactive mode
        print("=" * 60)
        print("  ERP Migration Factory — Admin User Seed")
        print("=" * 60)
        print()
        
        if check_admin_exists(app) and not args.force:
            print("⚠ An Admin user already exists. Use --force to create another.")
            sys.exit(0)
        
        if not email:
            email = input("Admin email: ").strip()
        if not password:
            password = getpass.getpass("Admin password: ").strip()
        if not name or name == 'Platform Admin':
            name = input(f"Display name [{name}]: ").strip() or name
    
    # Validate
    if not email:
        print("ERROR: Email is required")
        sys.exit(1)
    if not password:
        print("ERROR: Password is required")
        sys.exit(1)
    if len(password) < 8:
        print("ERROR: Password must be at least 8 characters")
        sys.exit(1)
    if '@' not in email:
        print("ERROR: Invalid email address")
        sys.exit(1)
    
    # Create
    try:
        create_admin(app, email, password, name)
    except ValueError as e:
        print(f"ERROR: {e}")
        sys.exit(1)
    
    print()
    print("You can now log in at the ERP Migration Factory with these credentials.")
    print("Use this account to create additional users via the Admin panel.")


if __name__ == '__main__':
    main()
