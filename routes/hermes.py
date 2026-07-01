"""
Huawei ModelArts Hermes WebSocket Router

Replaces traditional synchronous HTTP cycles with a stateful WebSocket connection.
Streams tokens from the local DeepSeek engine piece-by-piece, removing all timeout limitations.
"""

from flask import Blueprint, request, jsonify
# from flask_socketio import emit  # Temporarily disabled
import json
import logging
import requests
from models import Customer, ProjectData, db
# from app import socketio  # Temporarily disabled

logger = logging.getLogger(__name__)
hermes_bp = Blueprint('hermes', __name__)

LOAD_BALANCER_URL = "http://localhost:8666/v1/chat/completions"
LOAD_BALANCER_AUTH = "Basic YWRtaW46ODIxODcwZWVlNGQzMTA4NGUxYmZmNDA1YWJhMTVjYTY="

def build_hermes_context(project_id):
    """Build context about the ERP system for Hermes AI"""
    context = {
        "system_info": "Huawei Cloud ERP System - Real-time Data Access",
        "capabilities": "Root-level terminal, Database execution, High-Privilege Process Control"
    }
    
    if project_id and project_id != 'global':
        try:
            project = ProjectData.query.filter_by(id=project_id).first()
            if project:
                context["current_project"] = {
                    "id": project.id,
                    "type": project.project_type,
                    "updated_at": project.updated_at.isoformat() if project.updated_at else None
                }
                try:
                    context["project_details"] = json.loads(project.data)
                except:
                    pass
        except Exception as e:
            logger.error(f"Error fetching project data: {str(e)}")
            
    return context

# @socketio.on('hermes_query_stream')  # Temporarily disabled
def handle_hermes_stream(payload):
    """
    Asynchronous message receiver thread. Keeps a persistent connection open
    and streams DeepSeek text tokens back to the React view instantaneously.
    """
    try:
        user_query = payload.get('query', '')
        project_id = payload.get('projectId', 'global')
        historical_messages = payload.get('messages', [])

        # 1. Gather Live ERP Context
        context_data = build_hermes_context(project_id)
        context_string = json.dumps(context_data, indent=2)

        # 2. Build unified execution context instructions
        system_instruction = f"""You are Hermes, the high-privilege AI orchestrator for LATAM Cloud ERP.
You possess root-level terminal capability, filesystem read/write permissions, and direct database access via your background daemon framework.

LIVE ERP CONTEXT:
{context_string}

When an operator commands an action, use your tools or design scripts dynamically to fulfill it. 
Break down execution guidelines and delivery methodologies with absolute analytical clarity. Always return clean markdown.
"""

        messages = [{"role": "system", "content": system_instruction}]
        for msg in historical_messages:
            if msg.get("role") in ["user", "assistant"]:
                messages.append({"role": msg["role"], "content": msg["content"]})

        headers = {
            "Authorization": LOAD_BALANCER_AUTH,
            "Content-Type": "application/json"
        }

        llm_payload = {
            "model": "deepseek-v3.2",
            "messages": messages,
            "stream": True,  # Fire token stream mode
            "temperature": 0.1
        }

        # 3. Issue non-blocking streaming call directly to the ModelArts compute cluster
        # Timeout is set very high (3 minutes) to allow deep analysis, but because it streams, it won't block the UI
        response = requests.post(LOAD_BALANCER_URL, headers=headers, json=llm_payload, stream=True, timeout=180)
        
        if response.status_code != 200:
#             emit('hermes_error', {'error': f"DeepSeek balancing layer rejected frame with code {response.status_code}"})
            return

        # 4. Read incoming network buffer chunks byte-by-byte as they leave the GPU
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8').strip()
                if decoded_line.startswith("data: "):
                    content_str = decoded_line[6:]
                    if content_str == "[DONE]":
                        break
                    try:
                        chunk_data = json.loads(content_str)
                        # Extract the token payload from OpenAI-compatible JSON framing
                        token = chunk_data.get('choices', [{}])[0].get('delta', {}).get('content', '')
                        if token:
                            # Transmit text token instantly over the persistent TCP socket
                            # emit('hermes_token', {'text': token})
                            pass  # Temporarily disabled
                    except Exception as parse_err:
                        continue

        # Signal clear transmission completion
#         emit('hermes_done', {'status': 'success'})

    except Exception as e:
        logger.error(f"WebSocket streaming pipeline collapsed: {str(e)}", exc_info=True)
#         emit('hermes_error', {'error': f"Kernel Link Exception: {str(e)}"})

# Keep the original synchronous fallback endpoint for legacy components
@hermes_bp.route('/api/hermes/query', methods=['POST'])
def hermes_query():
    """Legacy HTTP fallback. Routes requests directly to the new hermes-cli daemon bridge."""
    try:
        data = request.get_json()
        project_id = data.get('projectId', 'global')
        user_query = data.get('query', '')
        
        # If UI sent array format, extract latest string
        if not user_query and data.get('messages'):
            for msg in reversed(data.get('messages')):
                if msg.get('role') == 'user':
                    user_query = msg.get('content', '')
                    break

        if not user_query:
            return jsonify({'success': False, 'error': 'Query required'}), 400

        # Import the privileged executor from the updated CLI file
        from routes.hermes_cli_api import execute_privileged_engine_command
        response_text = execute_privileged_engine_command(user_query, project_id)

        return jsonify({
            'response': response_text,
            'projectId': project_id,
            'status': 'success',
            'source': 'hermes-core-daemon-fallback'
        })
        
    except Exception as e:
        return jsonify({"error": f"Internal Agent Error: {str(e)}"}), 500
