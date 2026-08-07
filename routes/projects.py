"""
Projects API — Multi-tenant project management with optimistic concurrency control.

Provides:
  GET    /api/projects                    — list projects accessible to current user
  POST   /api/projects                    — create new project (PM/Admin)
  GET    /api/projects/<id>               — get project with edit metadata
  PUT    /api/projects/<id>               — save project (optimistic locking)
  DELETE /api/projects/<id>               — delete project (Admin only)
  POST   /api/projects/<id>/members       — add member to project
  DELETE /api/projects/<id>/members/<uid> — remove member
  POST   /api/projects/<id>/heartbeat     — edit session heartbeat
  GET    /api/projects/<id>/editors       — who's currently editing
  GET    /api/projects/<id>/audit         — audit trail for project

Concurrency model:
  - Client sends `expected_updated_at` with PUT requests
  - Server compares with DB `updated_at`: rejects if mismatch (409 Conflict)
  - Heartbeat API maintains EditSession entries with 60s expiry
  - Stale edit sessions (>2 min no heartbeat) are auto-purged on read
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db, ProjectData, ProjectMember, AuditLog, EditSession, User
from authlib.rbac import require_role, get_current_user_id, user_can_access_project
from datetime import datetime, timedelta
import json
import logging

logger = logging.getLogger(__name__)
projects_bp = Blueprint('projects', __name__, url_prefix='/api/projects')

# ── Helpers ──

def _get_user_accessible_projects(user_id: int):
    """Return all ProjectData rows the user can access (own + memberships + Admin all)."""
    user = User.query.get(user_id)
    if not user:
        return []
    if user.role == 'Admin':
        return ProjectData.query.order_by(ProjectData.updated_at.desc()).all()
    # Projects where user is owner
    owned = set(p.id for p in ProjectData.query.filter_by(owner_id=user_id).all())
    # Projects where user is member
    member_of = set(m.project_id for m in ProjectMember.query.filter_by(user_id=user_id).all())
    all_ids = owned | member_of
    if not all_ids:
        return []
    return ProjectData.query.filter(ProjectData.id.in_(all_ids)).order_by(ProjectData.updated_at.desc()).all()


def _purge_stale_edit_sessions(project_id: str = None):
    """Remove edit sessions with no heartbeat for >2 minutes."""
    cutoff = datetime.utcnow() - timedelta(minutes=2)
    query = EditSession.query.filter(EditSession.heartbeat_at < cutoff)
    if project_id:
        query = query.filter_by(project_id=project_id)
    stale = query.all()
    for s in stale:
        db.session.delete(s)
    if stale:
        db.session.flush()
        logger.debug(f"Purged {len(stale)} stale edit sessions")


def _check_project_access(project_id: str):
    """Verify current user can access this project. Returns (project, user_id) or (None, None)."""
    user_id = get_current_user_id()
    if not user_id:
        return None, None
    if not user_can_access_project(user_id, project_id):
        return None, None
    project = ProjectData.query.get(project_id)
    return project, user_id


# ── Routes ──

@projects_bp.route('', methods=['GET'])
@jwt_required()
def list_projects():
    """List projects the current user can access."""
    user_id = int(get_jwt_identity())
    projects = _get_user_accessible_projects(user_id)

    # Purge stale sessions while we're here
    _purge_stale_edit_sessions()

    # Enrich with member count and active editors
    result = []
    for p in projects:
        member_count = ProjectMember.query.filter_by(project_id=p.id).count()
        active_editors = EditSession.query.filter_by(project_id=p.id).all()
        result.append({
            'id': p.id,
            'project_type': p.project_type,
            'owner_id': p.owner_id,
            'member_count': member_count,
            'active_editors': [{'user_id': e.user_id, 'entity_type': e.entity_type,
                                'entity_id': e.entity_id} for e in active_editors],
            'created_at': p.created_at.isoformat() if p.created_at else None,
            'updated_at': p.updated_at.isoformat() if p.updated_at else None,
        })

    return jsonify({'success': True, 'projects': result})


@projects_bp.route('', methods=['POST'])
@jwt_required()
@require_role('Admin', 'PM')
def create_project():
    """Create a new project. Automatically adds creator as owner+member."""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data received'}), 400

    project_id = data.get('id', '').strip()
    project_type = data.get('project_type', 'migration')
    initial_data = data.get('data', '{}')

    if not project_id:
        return jsonify({'success': False, 'error': 'Project ID required'}), 400
    if ProjectData.query.get(project_id):
        return jsonify({'success': False, 'error': 'Project ID already exists'}), 409

    user_id = int(get_jwt_identity())

    project = ProjectData(
        id=project_id,
        project_type=project_type,
        owner_id=user_id,
        data=json.dumps(initial_data) if isinstance(initial_data, dict) else str(initial_data),
    )
    db.session.add(project)
    db.session.flush()  # Get created_at populated

    # Add creator as Owner-level member
    member = ProjectMember(user_id=user_id, project_id=project_id, role='Owner')
    db.session.add(member)

    AuditLog.log(user_id, project_id, 'project.created', 'Project', project_id,
                 {'project_type': project_type})

    db.session.commit()

    logger.info(f"User {user_id} created project '{project_id}'")
    return jsonify({
        'success': True,
        'project': {
            'id': project.id,
            'project_type': project.project_type,
            'owner_id': project.owner_id,
            'created_at': project.created_at.isoformat(),
            'updated_at': project.updated_at.isoformat(),
        }
    }), 201


@projects_bp.route('/<project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    """Get project data with concurrency metadata."""
    project, user_id = _check_project_access(project_id)
    if not project:
        return jsonify({'success': False, 'error': 'Project not found or access denied'}), 404

    _purge_stale_edit_sessions(project_id)

    # Who else is editing?
    active_editors = EditSession.query.filter_by(project_id=project_id).all()
    other_editors = [
        {'user_id': e.user_id, 'entity_type': e.entity_type, 'entity_id': e.entity_id,
         'name': User.query.get(e.user_id).name if User.query.get(e.user_id) else 'Unknown'}
        for e in active_editors if e.user_id != user_id
    ]

    members = [{
        'user_id': m.user_id,
        'name': User.query.get(m.user_id).name if User.query.get(m.user_id) else 'Unknown',
        'role': m.role,
        'joined_at': m.joined_at.isoformat() if m.joined_at else None
    } for m in ProjectMember.query.filter_by(project_id=project_id).all()]

    try:
        project_data = json.loads(project.data)
    except (json.JSONDecodeError, TypeError):
        project_data = project.data
    
    try:
        delegate_tasks = json.loads(project.delegate_tasks or '[]')
    except (json.JSONDecodeError, TypeError):
        delegate_tasks = []

    return jsonify({
        'success': True,
        'project': {
            'id': project.id,
            'project_type': project.project_type,
            'owner_id': project.owner_id,
            'data': project_data,
            'delegateTasks': delegate_tasks,
            'members': members,
            'other_editors': other_editors,
            'created_at': project.created_at.isoformat() if project.created_at else None,
            'updated_at': project.updated_at.isoformat() if project.updated_at else None,
            # Critical for optimistic locking: client must send this back on PUT
            '_concurrency_key': project.updated_at.isoformat() if project.updated_at else None,
        }
    })


@projects_bp.route('/<project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    """
    Save project data with optimistic concurrency control.

    Client MUST send `_concurrency_key` (the `updated_at` value from GET).
    If another user saved in the meantime, server returns 409 Conflict.
    """
    project, user_id = _check_project_access(project_id)
    if not project:
        return jsonify({'success': False, 'error': 'Project not found or access denied'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data received'}), 400

    # ── Optimistic lock check ──
    client_key = data.get('_concurrency_key')
    if client_key:
        try:
            client_updated_at = datetime.fromisoformat(client_key)
            # Compare with microsecond tolerance (DB may have different precision)
            server_updated_at = project.updated_at.replace(microsecond=0)
            client_updated_at = client_updated_at.replace(microsecond=0)
            if server_updated_at != client_updated_at:
                conflict_user = None
                if project.locked_by:
                    conflict_user = User.query.get(project.locked_by)
                return jsonify({
                    'success': False,
                    'error': 'Edit conflict: another user saved changes while you were editing.',
                    'conflict': {
                        'your_version': client_key,
                        'server_version': project.updated_at.isoformat(),
                        'last_edited_by': conflict_user.name if conflict_user else 'Unknown',
                    }
                }), 409
        except (ValueError, TypeError):
            pass  # Invalid key format — fall through to accept the save

    # ── Apply changes ──
    changes = {}
    if 'data' in data:
        old_data = project.data
        new_data = json.dumps(data['data']) if isinstance(data['data'], dict) else str(data['data'])
        if old_data != new_data:
            project.data = new_data
            changes['data'] = True  # Don't store full blob diff
    if 'project_type' in data and data['project_type'] != project.project_type:
        changes['project_type'] = {'old': project.project_type, 'new': data['project_type']}
        project.project_type = data['project_type']

    if changes:
        AuditLog.log(user_id, project_id, 'project.updated', 'Project', project_id, changes)
        db.session.commit()
        logger.info(f"User {user_id} updated project '{project_id}': {list(changes.keys())}")
    else:
        # No changes, but still update timestamp so concurrency key advances
        # (prevents stale clients from saving over fresh data)
        project.updated_at = datetime.utcnow()
        db.session.commit()

    # Clear edit session for this user
    EditSession.query.filter_by(user_id=user_id, project_id=project_id).delete()
    db.session.flush()

    return jsonify({
        'success': True,
        'project': {
            'id': project.id,
            'updated_at': project.updated_at.isoformat(),
            '_concurrency_key': project.updated_at.isoformat(),
        }
    })


@projects_bp.route('/<project_id>', methods=['DELETE'])
@jwt_required()
@require_role('Admin')
def delete_project(project_id):
    """Delete a project. Admin only."""
    project = ProjectData.query.get(project_id)
    if not project:
        return jsonify({'success': False, 'error': 'Project not found'}), 404

    user_id = int(get_jwt_identity())
    AuditLog.log(user_id, project_id, 'project.deleted', 'Project', project_id,
                 {'project_type': project.project_type})

    # Cascade: delete members, edit sessions
    ProjectMember.query.filter_by(project_id=project_id).delete()
    EditSession.query.filter_by(project_id=project_id).delete()
    db.session.delete(project)
    db.session.commit()

    logger.info(f"Admin {user_id} deleted project '{project_id}'")
    return jsonify({'success': True, 'message': f'Project {project_id} deleted'})


# ── Team Management ──

@projects_bp.route('/<project_id>/members', methods=['POST'])
@jwt_required()
@require_role('Admin', 'PM')
def add_member(project_id):
    """Add a user to a project with specified role."""
    project, user_id = _check_project_access(project_id)
    if not project:
        return jsonify({'success': False, 'error': 'Project not found or access denied'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data received'}), 400

    new_user_id = data.get('user_id')
    role = data.get('role', 'Viewer')

    if not new_user_id:
        return jsonify({'success': False, 'error': 'user_id required'}), 400
    if role not in ('Owner', 'Editor', 'Viewer'):
        return jsonify({'success': False, 'error': f'Invalid role: {role}'}), 400
    if not User.query.get(new_user_id):
        return jsonify({'success': False, 'error': 'User not found'}), 404
    if ProjectMember.query.filter_by(user_id=new_user_id, project_id=project_id).first():
        return jsonify({'success': False, 'error': 'User is already a member'}), 409

    member = ProjectMember(user_id=new_user_id, project_id=project_id, role=role)
    db.session.add(member)

    AuditLog.log(user_id, project_id, 'project.member_added', 'ProjectMember',
                 f'{project_id}:{new_user_id}',
                 {'added_user': new_user_id, 'role': role})

    db.session.commit()
    return jsonify({'success': True, 'message': f'User {new_user_id} added as {role}'})


@projects_bp.route('/<project_id>/members/<int:member_user_id>', methods=['DELETE'])
@jwt_required()
@require_role('Admin', 'PM')
def remove_member(project_id, member_user_id):
    """Remove a user from a project."""
    project, user_id = _check_project_access(project_id)
    if not project:
        return jsonify({'success': False, 'error': 'Project not found or access denied'}), 404

    member = ProjectMember.query.filter_by(user_id=member_user_id, project_id=project_id).first()
    if not member:
        return jsonify({'success': False, 'error': 'User is not a member of this project'}), 404

    # Don't allow removing the project owner
    if project.owner_id == member_user_id:
        return jsonify({'success': False, 'error': 'Cannot remove the project owner'}), 403

    db.session.delete(member)
    AuditLog.log(user_id, project_id, 'project.member_removed', 'ProjectMember',
                 f'{project_id}:{member_user_id}',
                 {'removed_user': member_user_id, 'removed_role': member.role})

    db.session.commit()
    return jsonify({'success': True, 'message': f'User {member_user_id} removed'})


# ── Concurrency: Edit Session Management ──

@projects_bp.route('/<project_id>/heartbeat', methods=['POST'])
@jwt_required()
def edit_heartbeat(project_id):
    """
    Register or refresh an edit session for the current user.

    The frontend calls this every 30 seconds while a user is actively editing.
    Sessions expire 2 minutes after the last heartbeat.
    """
    project, user_id = _check_project_access(project_id)
    if not project:
        return jsonify({'success': False, 'error': 'Project not found or access denied'}), 404

    data = request.get_json() or {}
    entity_type = data.get('entity_type', 'project_config')
    entity_id = data.get('entity_id', project_id)

    session = EditSession.query.filter_by(
        user_id=user_id, entity_type=entity_type, entity_id=entity_id
    ).first()

    if session:
        session.heartbeat_at = datetime.utcnow()
    else:
        session = EditSession(
            user_id=user_id,
            project_id=project_id,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        db.session.add(session)

    db.session.commit()

    return jsonify({
        'success': True,
        'session_active': True,
        'heartbeat_at': session.heartbeat_at.isoformat()
    })


@projects_bp.route('/<project_id>/heartbeat', methods=['DELETE'])
@jwt_required()
def end_edit_session(project_id):
    """Explicitly end an edit session (user navigated away or closed)."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401

    data = request.get_json() or {}
    entity_type = data.get('entity_type', 'project_config')
    entity_id = data.get('entity_id', project_id)

    deleted = EditSession.query.filter_by(
        user_id=user_id, entity_type=entity_type, entity_id=entity_id
    ).delete()

    db.session.commit()
    return jsonify({'success': True, 'sessions_ended': deleted})


@projects_bp.route('/<project_id>/editors', methods=['GET'])
@jwt_required()
def get_active_editors(project_id):
    """Get users currently editing this project."""
    project, user_id = _check_project_access(project_id)
    if not project:
        return jsonify({'success': False, 'error': 'Project not found or access denied'}), 404

    _purge_stale_edit_sessions(project_id)

    sessions = EditSession.query.filter_by(project_id=project_id).all()
    editors = [{
        'user_id': s.user_id,
        'name': User.query.get(s.user_id).name if User.query.get(s.user_id) else 'Unknown',
        'entity_type': s.entity_type,
        'entity_id': s.entity_id,
        'since': s.session_start.isoformat() if s.session_start else None,
    } for s in sessions]

    return jsonify({'success': True, 'editors': editors})


# ── Audit Trail ──

@projects_bp.route('/<project_id>/audit', methods=['GET'])
@jwt_required()
def get_audit_trail(project_id):
    """Get audit trail for a project."""
    project, user_id = _check_project_access(project_id)
    if not project:
        return jsonify({'success': False, 'error': 'Project not found or access denied'}), 404

    limit = min(int(request.args.get('limit', 50)), 200)
    offset = int(request.args.get('offset', 0))

    logs = AuditLog.query.filter_by(project_id=project_id)\
        .order_by(AuditLog.timestamp.desc())\
        .offset(offset).limit(limit).all()

    entries = [{
        'id': l.id,
        'user_id': l.user_id,
        'user_name': User.query.get(l.user_id).name if l.user_id and User.query.get(l.user_id) else 'System',
        'action': l.action,
        'entity_type': l.entity_type,
        'entity_id': l.entity_id,
        'changes': json.loads(l.changes_json) if l.changes_json else None,
        'timestamp': l.timestamp.isoformat() if l.timestamp else None,
    } for l in logs]

    return jsonify({'success': True, 'audit_logs': entries, 'count': len(entries)})
