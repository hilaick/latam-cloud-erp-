"""
RBAC (Role-Based Access Control) decorators for Flask routes.

Usage:
    from authlib.rbac import require_role

    @app.route('/admin-only')
    @jwt_required()
    @require_role('Admin')
    def admin_endpoint():
        ...

    @app.route('/pm-or-engineer')
    @jwt_required()
    @require_role('PM', 'Engineer')
    def team_endpoint():
        ...

Requires flask_jwt_extended — reads role from JWT additional claims.
"""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from typing import Optional


# Role hierarchy: each role includes itself + all roles below it
ROLE_HIERARCHY = {
    'Admin':    frozenset(['Admin', 'PM', 'Engineer', 'Partner', 'Viewer']),
    'PM':       frozenset(['PM', 'Engineer', 'Partner', 'Viewer']),
    'Engineer': frozenset(['Engineer', 'Viewer']),
    'Partner':  frozenset(['Partner', 'Viewer']),
    'Viewer':   frozenset(['Viewer']),
}

ALL_ROLES = frozenset(ROLE_HIERARCHY.keys())


def has_role(user_role: str, required_roles: frozenset) -> bool:
    """Check if user_role grants access to at least one required role."""
    allowed = ROLE_HIERARCHY.get(user_role, frozenset())
    return bool(allowed & required_roles)


def require_role(*roles: str):
    """
    Decorator: enforce that the current JWT bearer has at least one of the specified roles.

    Must be placed AFTER @jwt_required() in the decorator stack.
    """
    required = frozenset(roles)

    # Validate all roles are known
    unknown = required - ALL_ROLES
    if unknown:
        raise ValueError(f"Unknown roles in @require_role: {unknown}")

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Re-verify JWT is present (idempotent if @jwt_required() already ran)
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get('role', 'Viewer')

            if not has_role(user_role, required):
                return jsonify({
                    'success': False,
                    'error': f'Access denied. Required roles: {", ".join(sorted(required))}. Your role: {user_role}.'
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def get_current_user_id() -> Optional[int]:
    """Get the current user ID from the JWT. Returns None if no valid token."""
    try:
        verify_jwt_in_request(optional=True)
        from flask_jwt_extended import get_jwt_identity
        identity = get_jwt_identity()
        return int(identity) if identity else None
    except Exception:
        return None


def get_current_user_role() -> Optional[str]:
    """Get the current user's role from the JWT."""
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt()
        return claims.get('role')
    except Exception:
        return None


def user_can_access_project(user_id: int, project_id: str) -> bool:
    """Check if a user has access to a project (membership or Admin override)."""
    from models import User, ProjectMember
    user = User.query.get(user_id)
    if not user:
        return False
    # Admin has universal access
    if user.role == 'Admin':
        return True
    # Check explicit membership
    return ProjectMember.query.filter_by(
        user_id=user_id, project_id=project_id
    ).first() is not None
