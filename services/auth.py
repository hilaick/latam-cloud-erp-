"""
User authentication and session management for Huawei Cloud ERP
Simple session-based auth for 5 users
"""
import os
import secrets
import hashlib
import base64
from datetime import datetime, timedelta
from functools import wraps
from flask import request, session, g, jsonify, current_app
import logging

logger = logging.getLogger(__name__)

# In-memory user store (in production, use database)
# Format: {username: {password_hash, role, full_name, created_at}}
USERS = {
    "admin": {
        "password_hash": hashlib.sha256("admin123".encode()).hexdigest(),
        "role": "admin",
        "full_name": "System Administrator",
        "created_at": datetime.utcnow()
    },
    "architect": {
        "password_hash": hashlib.sha256("architect123".encode()).hexdigest(),
        "role": "architect",
        "full_name": "Principal Architect",
        "created_at": datetime.utcnow()
    },
    "engineer1": {
        "password_hash": hashlib.sha256("engineer123".encode()).hexdigest(),
        "role": "engineer",
        "full_name": "Cloud Engineer 1",
        "created_at": datetime.utcnow()
    },
    "engineer2": {
        "password_hash": hashlib.sha256("engineer123".encode()).hexdigest(),
        "role": "engineer",
        "full_name": "Cloud Engineer 2",
        "created_at": datetime.utcnow()
    },
    "viewer": {
        "password_hash": hashlib.sha256("viewer123".encode()).hexdigest(),
        "role": "viewer",
        "full_name": "Read-Only Viewer",
        "created_at": datetime.utcnow()
    }
}

# Session timeout (8 hours)
SESSION_TIMEOUT = 8 * 60 * 60  # seconds

def hash_password(password: str) -> str:
    """Hash password with salt"""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
    return base64.b64encode(salt + key).decode()

def verify_password(stored_hash: str, password: str) -> bool:
    """Verify password against stored hash"""
    try:
        decoded = base64.b64decode(stored_hash)
        salt = decoded[:16]
        stored_key = decoded[16:]
        key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
        return secrets.compare_digest(key, stored_key)
    except:
        return False

def login_required(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if user is logged in
        if 'user_id' not in session:
            return {"success": False, "error": "Authentication required"}, 401
        
        # Check session timeout
        last_activity = session.get('last_activity')
        if last_activity:
            last_activity_time = datetime.fromisoformat(last_activity)
            if datetime.utcnow() - last_activity_time > timedelta(seconds=SESSION_TIMEOUT):
                session.clear()
                return {"success": False, "error": "Session expired"}, 401
        
        # Update last activity
        session['last_activity'] = datetime.utcnow().isoformat()
        
        # Set user in global context
        g.user = {
            'id': session['user_id'],
            'username': session['username'],
            'role': session['role'],
            'full_name': session['full_name']
        }
        
        return f(*args, **kwargs)
    return decorated_function

def role_required(required_role):
    """Decorator to require specific role"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # First check login
            if 'user_id' not in session:
                return {"success": False, "error": "Authentication required"}, 401
            
            # Check role
            user_role = session.get('role')
            if not user_role:
                return {"success": False, "error": "User role not found"}, 403
            
            # Define role hierarchy
            role_hierarchy = {
                'viewer': 0,
                'engineer': 1,
                'architect': 2,
                'admin': 3
            }
            
            user_level = role_hierarchy.get(user_role, -1)
            required_level = role_hierarchy.get(required_role, -1)
            
            if user_level < required_level:
                return {"success": False, "error": f"Insufficient permissions. Required role: {required_role}"}, 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def init_auth(app, allowed_ips=None, denied_ips=None):
    """Initialize authentication for Flask app"""
    # Set secret key for sessions
    app.secret_key = os.environ.get('SESSION_SECRET', secrets.token_hex(32))
    
    # Store IP lists in app config
    app.config['ALLOWED_IPS'] = allowed_ips or []
    app.config['DENIED_IPS'] = denied_ips or []
    
    # Add authentication endpoints
    @app.route('/api/auth/login', methods=['POST'])
    def auth_login():
        """Login endpoint"""
        try:
            data = request.json
            username = data.get('username', '').strip()
            password = data.get('password', '')
            
            if not username or not password:
                return jsonify({"success": False, "error": "Username and password required"}), 400
            
            # Find user
            user = USERS.get(username)
            if not user:
                return jsonify({"success": False, "error": "Invalid credentials"}), 401
            
            # Verify password (using simple hash for demo)
            # In production, use verify_password with stored hash
            expected_hash = hashlib.sha256(password.encode()).hexdigest()
            if not secrets.compare_digest(user['password_hash'], expected_hash):
                return jsonify({"success": False, "error": "Invalid credentials"}), 401
            
            # Create session
            session['user_id'] = f"user_{username}"
            session['username'] = username
            session['role'] = user['role']
            session['full_name'] = user['full_name']
            session['last_activity'] = datetime.utcnow().isoformat()
            
            logger.info(f"User {username} logged in")
            
            return jsonify({
                "success": True,
                "user": {
                    "id": session['user_id'],
                    "username": username,
                    "role": user['role'],
                    "full_name": user['full_name']
                }
            })
            
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return jsonify({"success": False, "error": "Login failed"}), 500
    
    @app.route('/api/auth/logout', methods=['POST'])
    def auth_logout():
        """Logout endpoint"""
        session.clear()
        return jsonify({"success": True, "message": "Logged out"})
    
    @app.route('/api/auth/me', methods=['GET'])
    @login_required
    def auth_me():
        """Get current user info"""
        return jsonify({
            "success": True,
            "user": {
                "id": session['user_id'],
                "username": session['username'],
                "role": session['role'],
                "full_name": session['full_name']
            }
        })
    
    @app.route('/api/auth/users', methods=['GET'])
    @login_required
    @role_required('admin')
    def auth_list_users():
        """List all users (admin only)"""
        users_list = []
        for username, user_data in USERS.items():
            users_list.append({
                "username": username,
                "role": user_data['role'],
                "full_name": user_data['full_name'],
                "created_at": user_data['created_at'].isoformat() if isinstance(user_data['created_at'], datetime) else user_data['created_at']
            })
        
        return jsonify({
            "success": True,
            "users": users_list,
            "total": len(users_list)
        })

# Update the requires_auth decorator in app.py to use this system
def requires_auth(f):
    """Updated authentication decorator that integrates with new auth system"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Get client IP, checking X-Forwarded-For for proxy scenarios
        client_ip = request.remote_addr
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            # Take the first IP in X-Forwarded-For chain
            client_ip = forwarded_for.split(',')[0].strip()
        
        # Check if IP is in denied list
        denied_ips = current_app.config.get('DENIED_IPS', [])
        if client_ip in denied_ips:
            return jsonify({
                'success': False,
                'error': 'Access denied',
                'message': 'Your IP has been blocked due to suspicious activity'
            }), 403
        
        # Check if IP is in allowed list
        allowed_ips = current_app.config.get('ALLOWED_IPS', [])
        if client_ip in allowed_ips:
            # Auto-login allowed IPs as viewer
            session['user_id'] = f'ip_user_{client_ip}'
            session['username'] = 'viewer'
            session['role'] = 'viewer'
            session['full_name'] = 'IP Authenticated User'
            session['last_activity'] = datetime.utcnow().isoformat()
            g.user = {
                'id': f'ip_user_{client_ip}',
                'username': 'viewer',
                'role': 'viewer',
                'full_name': 'IP Authenticated User'
            }
            return f(*args, **kwargs)
        
        # Check if user is logged in
        if 'user_id' not in session:
            # Check for basic auth (backward compatibility)
            auth = request.authorization
            if auth and auth.username == USERNAME and auth.password == PASSWORD:
                # Set session for basic auth user
                session['user_id'] = 'basic_auth_user'
                session['username'] = 'admin'
                session['role'] = 'admin'
                session['full_name'] = 'Administrator'
                session['last_activity'] = datetime.utcnow().isoformat()
                g.user = {
                    'id': 'basic_auth_user',
                    'username': 'admin',
                    'role': 'admin',
                    'full_name': 'Administrator'
                }
                return f(*args, **kwargs)
            
            # Require authentication
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'message': 'Please login to access this resource'
            }), 401
        
        # Check session timeout
        last_activity = session.get('last_activity')
        if last_activity:
            last_activity_time = datetime.fromisoformat(last_activity)
            if datetime.utcnow() - last_activity_time > timedelta(seconds=SESSION_TIMEOUT):
                session.clear()
                return jsonify({
                    'success': False,
                    'error': 'Session expired',
                    'message': 'Please login again'
                }), 401
        
        # Update last activity
        session['last_activity'] = datetime.utcnow().isoformat()
        
        # Set user in global context
        g.user = {
            'id': session['user_id'],
            'username': session['username'],
            'role': session['role'],
            'full_name': session['full_name']
        }
        
        return f(*args, **kwargs)
    return decorated