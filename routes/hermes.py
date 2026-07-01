# routes/hermes.py
from flask import Blueprint, request
from flask_socketio import emit
import json
import logging
import requests
from models import ProjectData, db
from app import socketio # Import the initialized socketio instance from app.py

logger = logging.getLogger(__name__)
hermes_bp = Blueprint('hermes', __name__)

LOAD_BALANCER_URL = "http://localhost:8666/v1/chat/completions"
LOAD_BALANCER_AUTH = "Basic YWRtaW46ODIxODcwZWVlNGQzMTA4NGUxYmZmNDA1YWJhMTVjYTY="

def build_hermes_context(project_id):
    # Keep your existing context builder exactly as it is written
    pass

@socketio.on('hermes_user_message')
def handle_hermes_message(payload):
    """
    Asynchronous WebSocket loop. Intercepts the user query, connects to 
    the local DeepSeek model, and streams words back to the UI token-by-token.
    """
    try:
        project_id = payload.get('projectId', 'global')
        user_query = payload.get('query', '')
        chat_history = payload.get('messages', [])

        # 1. Fetch live contextual state matrices
        context = build_hermes_context(project_id)
        context_string = json.dumps(context, indent=2)

        system_instruction = f"""You are Hermes, the autonomous AI orchestrator for LATAM Cloud ERP.
You have access to all real-time project metrics, databases, and playbooks.

LIVE ERP CONTEXT Matrix:
{context_string}

Respond to the user with profound, complete clarity regarding their delivery methodologies, execution runbooks, or troubleshooting tasks. Always use clean markdown.
"""

        # 2. Compile full chat history for DeepSeek
        llm_messages = [{"role": "system", "content": system_instruction}]
        for msg in chat_history:
            if msg.get("role") in ["user", "assistant"]:
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_query})

        # 3. Call DeepSeek via the ModelArts Load Balancer with streaming enabled
        headers = {
            "Authorization": LOAD_BALANCER_AUTH,
            "Content-Type": "application/json"
        }
        
        llm_payload = {
            "model": "deepseek-v3.2",
            "messages": messages,
            "stream": True,  # Enables raw token streaming
            "temperature": 0.2
        }

        response = requests.post(LOAD_BALANCER_URL, headers=headers, json=payload, stream=True, timeout=120)
        
        if response.status_code != 200:
            emit('hermes_error', {'error': f"DeepSeek Engine returned status {response.status_code}"})
            return

        # 4. Stream each chunk directly to the browser view in real-time
        for line in response.iter_lines():
            if line:
                line_text = line.decode('utf-8').strip()
                if line_text.startswith("data: "):
                    data_str = line_text[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk_json = json.loads(json_str)
                        token = chunk_json['choices'][0]['message']['content']
                        # Emit individual text tokens directly to the frontend chat component
                        emit('hermes_token', {'text': token})
                    except:
                        continue

        # Signal that transmission is cleanly finished
        emit('hermes_done', {'status': 'finished'})

    except Exception as e:
        logger.error(f"WebSocket execution exception: {str(e)}", exc_info=True)
        emit('hermes_error', {'error': f"Internal Engine Error: {str(e)}"})
