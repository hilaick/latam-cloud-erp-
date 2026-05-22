from flask import Blueprint, request, jsonify
from models import db, ProjectData, Customer
import json

crm_bp = Blueprint('crm', __name__)

def requires_auth_from_app(f):
    """Proxy decorator that will be replaced by the actual decorator from app.py"""
    return f

@crm_bp.route('/api/erp/state', methods=['GET'])
@requires_auth_from_app
def get_state():
    try:
        projects = ProjectData.query.all()
        return jsonify({"projects": [json.loads(p.data) for p in projects]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# TODO: Add /api/erp/projects endpoint when available in app.py
# TODO: Add /api/erp/customers endpoint when available in app.py  
# TODO: Add /api/erp/reset endpoint when available in app.py
