import os
from flask import request, jsonify
from functools import wraps
import secrets

USERNAME = os.environ.get('DASHBOARD_USERNAME', 'admin')
# Secure random password if none is provided in .env
PASSWORD = os.environ.get('DASHBOARD_PASSWORD', secrets.token_urlsafe(32))

ALLOWED_IPS = ['127.0.0.1', 'localhost', '::1', '159.138.148.45', '154.47.28.240']
DENIED_IPS = ['1.94.223.28']

def check_auth(username, password):
    return username == USERNAME and password == PASSWORD

def authenticate():
    return jsonify({'success': False, 'error': 'Authentication required'}), 401, {'WWW-Authenticate': 'Basic realm="Dashboard Access"'}

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        client_ip = request.remote_addr
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            client_ip = forwarded_for.split(',')[0].strip()
        
        if client_ip in DENIED_IPS:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
            
        if client_ip in ALLOWED_IPS:
            return f(*args, **kwargs)
            
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated
