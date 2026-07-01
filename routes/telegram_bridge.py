"""
Telegram Bridge - Connect Web UI to Telegram Bot (Hermes CLI)

This module bridges the web UI chat interface with the Telegram bot,
allowing the web UI to get the same full Hermes CLI intelligence
as the Telegram interface, without timeout issues.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_socketio import SocketIO, emit
import logging
import requests
import json
import uuid
import threading
import time
from datetime import datetime

logger = logging.getLogger(__name__)
telegram_bridge_bp = Blueprint('telegram_bridge', __name__)

# In-memory storage for web UI sessions
# In production, use Redis or database
web_sessions = {}  # session_id -> {chat_id, last_active, messages}
message_queue = {}  # chat_id -> [messages]

# Telegram Bot API configuration
TELEGRAM_BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN"  # Will be configured via environment
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

# WebSocket for real-time updates (will be initialized in app.py)
socketio = None

def init_socketio(app):
    """Initialize SocketIO for real-time updates"""
    global socketio
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
    return socketio

def broadcast_to_webui(session_id, message, message_type="assistant"):
    """Broadcast message to web UI via WebSocket"""
    if socketio:
        socketio.emit('telegram_message', {
            'session_id': session_id,
            'message': message,
            'type': message_type,
            'timestamp': datetime.utcnow().isoformat()
        })
        logger.info(f"Broadcast to session {session_id}: {message[:50]}...")
    else:
        logger.warning("SocketIO not initialized, cannot broadcast")

def send_to_telegram(chat_id, text):
    """Send message to Telegram bot"""
    try:
        response = requests.post(
            f"{TELEGRAM_API_URL}/sendMessage",
            json={
                'chat_id': chat_id,
                'text': text,
                'parse_mode': 'Markdown'
            },
            timeout=10
        )
        return response.json()
    except Exception as e:
        logger.error(f"Error sending to Telegram: {str(e)}")
        return {'ok': False, 'error': str(e)}

def create_web_session():
    """Create a new web UI session with unique chat_id"""
    session_id = str(uuid.uuid4())
    # Use a negative chat_id for web sessions to avoid conflicts with real Telegram chats
    chat_id = f"web_{session_id}"
    
    web_sessions[session_id] = {
        'chat_id': chat_id,
        'created_at': datetime.utcnow(),
        'last_active': datetime.utcnow(),
        'messages': []
    }
    
    message_queue[chat_id] = []
    
    logger.info(f"Created web session: {session_id} with chat_id: {chat_id}")
    return session_id, chat_id

@telegram_bridge_bp.route('/api/telegram/session', methods=['POST'])
def create_session():
    """Create a new web UI chat session"""
    try:
        session_id, chat_id = create_web_session()
        return jsonify({
            'success': True,
            'session_id': session_id,
            'chat_id': chat_id,
            'message': 'Web session created successfully'
        })
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@telegram_bridge_bp.route('/api/telegram/send', methods=['POST'])
def send_message():
    """Send message from web UI to Telegram bot"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data'}), 400
        
        text = data.get('text', '').strip()
        session_id = data.get('session_id')
        
        if not text:
            return jsonify({'success': False, 'error': 'Message text required'}), 400
        
        if not session_id or session_id not in web_sessions:
            # Create new session if none provided
            session_id, chat_id = create_web_session()
        else:
            chat_id = web_sessions[session_id]['chat_id']
            web_sessions[session_id]['last_active'] = datetime.utcnow()
        
        # Store user message
        user_message = {
            'id': len(web_sessions[session_id]['messages']) + 1,
            'role': 'user',
            'content': text,
            'timestamp': datetime.utcnow().isoformat()
        }
        web_sessions[session_id]['messages'].append(user_message)
        
        # Broadcast user message to web UI
        broadcast_to_webui(session_id, text, "user")
        
        # For now, use direct database queries as fallback
        # In Phase 2, this will call actual Telegram bot API
        logger.info(f"Web UI message (will forward to Telegram): {text[:100]}...")
        
        # Simulate typing indicator
        broadcast_to_webui(session_id, "Hermes is typing...", "typing")
        
        # Use direct database query for simple requests
        # This is TEMPORARY - will be replaced with actual Telegram API call
        from models import Customer, ProjectData, HuaweiAccount, MigrationTask
        
        query_lower = text.lower()
        response = ""
        
        if 'customer' in query_lower:
            customers = Customer.query.limit(10).all()
            if customers:
                response = f"Found {len(customers)} customers:\n"
                for i, cust in enumerate(customers, 1):
                    response += f"{i}. {cust.name} (ID: {cust.id}, Region: {cust.region})\n"
            else:
                response = "No customers found in database."
                
        elif 'project' in query_lower:
            projects = ProjectData.query.limit(10).all()
            if projects:
                response = f"Found {len(projects)} projects:\n"
                for i, proj in enumerate(projects, 1):
                    try:
                        proj_data = json.loads(proj.data) if proj.data else {}
                        proj_name = proj_data.get('name', proj.id)
                        response += f"{i}. {proj_name} (ID: {proj.id}, Type: {proj.project_type})\n"
                    except:
                        response += f"{i}. {proj.id} (Type: {proj.project_type})\n"
            else:
                response = "No projects found in database."
                
        elif 'hello' in query_lower or 'hi' in query_lower or 'hey' in query_lower:
            response = "Hello! I'm Hermes CLI via Telegram Bridge. I can help you query customers, projects, and more. Try asking about 'customers' or 'projects'."
            
        elif 'help' in query_lower:
            response = "I can help you with:\n• Listing customers\n• Listing projects\n• Checking Huawei accounts\n• Migration tasks\n\nTry: 'list customers' or 'show projects'"
            
        else:
            response = f"I received: '{text}'\n\nFor now, I can only handle simple queries like 'list customers' or 'show projects'. Full Telegram bot integration is coming soon!"
        
        # Store assistant response
        assistant_message = {
            'id': len(web_sessions[session_id]['messages']) + 1,
            'role': 'assistant',
            'content': response,
            'timestamp': datetime.utcnow().isoformat()
        }
        web_sessions[session_id]['messages'].append(assistant_message)
        
        # Broadcast response to web UI
        broadcast_to_webui(session_id, response, "assistant")
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'message': 'Message processed (Telegram bridge simulation)',
            'response': response[:500]
        })
            
    except Exception as e:
        logger.error(f"Error in send_message: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f"Internal server error: {str(e)}"
        }), 500

@telegram_bridge_bp.route('/api/telegram/webhook', methods=['POST'])
def telegram_webhook():
    """Receive messages from Telegram bot (for future integration)"""
    try:
        update = request.get_json()
        logger.info(f"Telegram webhook received: {update}")
        
        if 'message' in update:
            message = update['message']
            chat_id = message['chat']['id']
            text = message.get('text', '')
            
            # Check if this is a web UI session
            if isinstance(chat_id, str) and chat_id.startswith('web_'):
                session_id = chat_id.replace('web_', '')
                if session_id in web_sessions:
                    # Broadcast to web UI
                    broadcast_to_webui(session_id, text, "assistant")
                    
                    # Store message
                    assistant_message = {
                        'id': len(web_sessions[session_id]['messages']) + 1,
                        'role': 'assistant',
                        'content': text,
                        'timestamp': datetime.utcnow().isoformat()
                    }
                    web_sessions[session_id]['messages'].append(assistant_message)
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Error in telegram_webhook: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@telegram_bridge_bp.route('/api/telegram/messages/<session_id>', methods=['GET'])
def get_messages(session_id):
    """Get conversation history for a session"""
    if session_id not in web_sessions:
        return jsonify({'success': False, 'error': 'Session not found'}), 404
    
    return jsonify({
        'success': True,
        'session_id': session_id,
        'messages': web_sessions[session_id]['messages'],
        'last_active': web_sessions[session_id]['last_active'].isoformat()
    })

@telegram_bridge_bp.route('/api/telegram/sessions', methods=['GET'])
def list_sessions():
    """List all active web sessions"""
    sessions = []
    for session_id, data in web_sessions.items():
        sessions.append({
            'session_id': session_id,
            'chat_id': data['chat_id'],
            'created_at': data['created_at'].isoformat(),
            'last_active': data['last_active'].isoformat(),
            'message_count': len(data['messages'])
        })
    
    return jsonify({
        'success': True,
        'sessions': sessions,
        'total': len(sessions)
    })

@telegram_bridge_bp.route('/api/telegram/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'service': 'Telegram Bridge',
        'status': 'healthy',
        'active_sessions': len(web_sessions),
        'timestamp': datetime.utcnow().isoformat()
    })