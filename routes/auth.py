"""
Auth API — JWT Authentication, RBAC, and Session Management.

Provides:
  POST /api/auth/login       — authenticate, receive access + refresh tokens
  POST /api/auth/register    — create new user account (Admin only)
  POST /api/auth/refresh     — exchange refresh token for new access token
  POST /api/auth/logout      — invalidate refresh token (token blocklist)
  GET  /api/auth/me          — current user profile
  GET  /api/auth/users       — list users (Admin/PM)
  PUT  /api/auth/users/<id>  — update user (Admin)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    jwt_required, create_access_token, create_refresh_token,
    get_jwt_identity, get_jwt, current_user
)
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, AuditLog, InvalidToken
from authlib.rbac import require_role
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ── In-memory token blocklist for logout ──
# Production: use Redis or DB-backed blocklist
_token_blocklist = set()

# ── Role hierarchy ──
ROLE_HIERARCHY = {
    'Admin':   ['Admin', 'PM', 'Engineer', 'Partner', 'Viewer'],
    'PM':      ['PM', 'Engineer', 'Partner', 'Viewer'],
    'Engineer':['Engineer', 'Viewer'],
    'Partner': ['Partner', 'Viewer'],
    'Viewer':  ['Viewer'],
}

def role_gte(user_role: str, required_role: str) -> bool:
    """Check if user_role has at least the privileges of required_role."""
    return required_role in ROLE_HIERARCHY.get(user_role, [])


# ── Routes ──

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate and receive JWT tokens."""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data received'}), 400

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        logger.warning(f"Failed login attempt for email: {email}")
        return jsonify({'success': False, 'error': 'Invalid email or password'}), 401

    if user.status != 'Active':
        return jsonify({'success': False, 'error': f'Account is {user.status}. Contact an administrator.'}), 403

    # Generate tokens
    additional_claims = {
        'role': user.role,
        'name': user.name,
    }
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims=additional_claims,
        expires_delta=timedelta(hours=8)
    )
    refresh_token = create_refresh_token(
        identity=str(user.id),
        expires_delta=timedelta(days=30)
    )

    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()

    # Audit
    AuditLog.log(user.id, None, 'auth.login', 'User', str(user.id),
                 {'email': email})

    logger.info(f"User '{user.email}' (role={user.role}) logged in")

    return jsonify({
        'success': True,
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict()
    })


@auth_bp.route('/register', methods=['POST'])
@jwt_required()
@require_role('Admin')
def register():
    """Register a new user. Admin only."""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data received'}), 400

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    role = data.get('role', 'Viewer')
    department = data.get('department', '')
    partner_org = data.get('partner_org', '')

    # Validate
    if not email or not password or not name:
        return jsonify({'success': False, 'error': 'Email, password, and name are required'}), 400
    if role not in ROLE_HIERARCHY:
        return jsonify({'success': False, 'error': f'Invalid role: {role}'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'error': 'Email already registered'}), 409
    if len(password) < 8:
        return jsonify({'success': False, 'error': 'Password must be at least 8 characters'}), 400

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
        role=role,
        department=department,
        partner_org=partner_org,
        status='Active',
        is_2fa=False
    )
    db.session.add(user)
    db.session.commit()

    admin_id = get_jwt_identity()
    AuditLog.log(admin_id, None, 'user.created', 'User', str(user.id),
                 {'name': name, 'email': email, 'role': role})

    logger.info(f"Admin user_id={admin_id} created user '{email}' with role={role}")
    return jsonify({'success': True, 'user': user.to_dict()}), 201


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Exchange refresh token for a new access token."""
    identity = get_jwt_identity()
    jwt_data = get_jwt()

    # Check blocklist
    jti = jwt_data.get('jti')
    if jti and jti in _token_blocklist:
        return jsonify({'success': False, 'error': 'Token has been revoked'}), 401

    user = User.query.get(int(identity))
    if not user or user.status != 'Active':
        return jsonify({'success': False, 'error': 'User not found or inactive'}), 401

    additional_claims = {
        'role': user.role,
        'name': user.name,
    }
    access_token = create_access_token(
        identity=identity,
        additional_claims=additional_claims,
        expires_delta=timedelta(hours=8)
    )

    return jsonify({
        'success': True,
        'access_token': access_token,
        'user': user.to_dict()
    })


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout — revoke the current refresh token."""
    jwt_data = get_jwt()
    jti = jwt_data.get('jti')
    if jti:
        _token_blocklist.add(jti)

    identity = get_jwt_identity()
    AuditLog.log(identity, None, 'auth.logout', 'User', identity, {})

    return jsonify({'success': True, 'message': 'Logged out'})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """Get current user's profile."""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    # Build enriched profile with project membership
    from models import ProjectMember, ProjectData
    memberships = ProjectMember.query.filter_by(user_id=user.id).all()
    projects = []
    for m in memberships:
        p = ProjectData.query.get(m.project_id)
        if p:
            projects.append({
                'project_id': p.id,
                'project_type': p.project_type,
                'member_role': m.role
            })

    return jsonify({
        'success': True,
        'user': {
            **user.to_dict(),
            'projects': projects
        }
    })


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
@require_role('Admin', 'PM')
def list_users():
    """List all users. Admin and PM only."""
    users = User.query.order_by(User.name).all()
    return jsonify({
        'success': True,
        'users': [u.to_dict() for u in users]
    })


@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@require_role('Admin')
def update_user(user_id):
    """Update a user's role, status, or profile. Admin only."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data received'}), 400

    allowed = ['name', 'role', 'status', 'department', 'partner_org', 'is_2fa']
    changes = {}
    for field in allowed:
        if field in data:
            old_val = getattr(user, field)
            new_val = data[field]
            if old_val != new_val:
                setattr(user, field, new_val)
                changes[field] = {'old': old_val, 'new': new_val}

    if changes:
        admin_id = get_jwt_identity()
        AuditLog.log(admin_id, None, 'user.updated', 'User', str(user_id), changes)
        db.session.commit()

    return jsonify({'success': True, 'user': user.to_dict()})


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change current user's password."""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data received'}), 400

    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    old_password = data.get('old_password', '')
    new_password = data.get('new_password', '')

    if not old_password or not new_password:
        return jsonify({'success': False, 'error': 'Old and new password required'}), 400
    if not check_password_hash(user.password_hash, old_password):
        return jsonify({'success': False, 'error': 'Current password is incorrect'}), 403
    if len(new_password) < 8:
        return jsonify({'success': False, 'error': 'New password must be at least 8 characters'}), 400

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    AuditLog.log(user_id, None, 'user.password_changed', 'User', str(user_id), {})

    return jsonify({'success': True, 'message': 'Password changed successfully'})
