from flask import Blueprint, request, jsonify

# 🚨 UPDATED: Using JWT instead of Basic Auth
from flask_jwt_extended import jwt_required

sms_bp = Blueprint('sms_migrations', __name__)

@sms_bp.route('/api/sms/discover', methods=['POST'])
@jwt_required()
def sms_discover():
    """Discover SMS servers with Huawei Cloud SDK."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        ak = data.get('ak')
        sk = data.get('sk')
        region = data.get('region', 'ap-southeast-3')
        
        if not ak or not sk:
            return jsonify({"error": "AK and SK are required"}), 400
        
        # Import here to avoid circular imports during startup
        from services.sms_handler import discover_servers
        
        servers = discover_servers(ak, sk, region)
        return jsonify({
            "message": "SMS discovery completed",
            "servers": servers,
            "count": len(servers)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
