from flask import Blueprint, request, jsonify, Response
import json

# from models import db, Project, Customer
# from services.identity_provisioner import HuaweiIdentityProvisioner
from services.agent_orchestrator import ProprietaryCognitiveEngine

execution_bp = Blueprint('execution', __name__)

# ... (Keep your existing initialize-vault route here) ...

@execution_bp.route('/api/projects/<int:project_id>/execute-agent-stream', methods=['POST'])
def execute_agent_stream(project_id):
    """
    Step 2: Hands the context to the cognitive agent and STREAMS the real-time execution logs and AI tokens back to the React UI via SSE.
    """
    mock_vault = {"tier2_ak": "AKIA-MOCK-TIER2-101", "tier2_sk": "SK-MOCK-SECRET-TIER2-101"}
    mock_blueprint = {"region": "la-south-2", "infrastructure": {"vpc_cidr": "172.16.0.0/16"}}
    
    engine = ProprietaryCognitiveEngine(project_id, mock_vault, mock_blueprint)

    def generate():
        try:
            for payload in engine.orchestrate_streaming_pipeline():
                # Format strictly as a Server-Sent Event (SSE)
                yield f"data: {json.dumps(payload)}\n\n"
        except Exception as e:
            error_payload = {"type": "log", "content": f"❌ [SERVER ERROR] {str(e)}"}
            yield f"data: {json.dumps(error_payload)}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return Response(generate(), mimetype='text/event-stream')
