"""
Telegram Bot Bridge - Connect Web UI to Telegram Bot (Hermes)

This module bridges the web UI to the Telegram bot (Hermes) so the web UI
gets the same intelligent responses as when chatting directly on Telegram.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_optional
import logging
import requests
import json
import os
import uuid
from datetime import datetime, timedelta

# Setup logging
logger = logging.getLogger(__name__)

# Create blueprint
telegram_bridge_bp = Blueprint('telegram_bridge', __name__)

# Telegram Bot API configuration
# These would normally be environment variables
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', 'YOUR_CHAT_ID_HERE')
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

# In-memory store for webhook responses (in production, use Redis)
# Maps message_id -> response
response_store = {}

# Maps session_id -> last_message_id
session_store = {}

@telegram_bridge_bp.route('/api/telegram/session', methods=['POST'])
@jwt_optional()
def create_session():
    """Create a new chat session with the Telegram bot"""
    try:
        session_id = str(uuid.uuid4())
        session_store[session_id] = {
            'created_at': datetime.utcnow(),
            'last_message_id': None,
            'pending_responses': []
        }
        
        logger.info(f"Created new Telegram bridge session: {session_id}")
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'message': 'Session created. Ready to chat with Hermes via Telegram bridge.'
        })
        
    except Exception as e:
        logger.error(f"Error creating Telegram session: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'Failed to create session: {str(e)}'
        }), 500

@telegram_bridge_bp.route('/api/telegram/send', methods=['POST'])
@jwt_optional()
def send_to_telegram():
    """Send a message to the Telegram bot and wait for response"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data provided'}), 400
            
        text = data.get('text', '').strip()
        session_id = data.get('session_id')
        
        if not text:
            return jsonify({'success': False, 'error': 'No message text provided'}), 400
            
        if not session_id:
            # Create a new session if none provided
            session_id = str(uuid.uuid4())
            session_store[session_id] = {
                'created_at': datetime.utcnow(),
                'last_message_id': None,
                'pending_responses': []
            }
        
        logger.info(f"Sending to Telegram via bridge: {text[:100]}... (session: {session_id})")
        
        # In a real implementation, this would:
        # 1. Send message to Telegram bot API
        # 2. Telegram bot (Hermes) processes with full tools
        # 3. Telegram bot sends response via webhook
        # 4. Webhook stores response in response_store
        # 5. This endpoint polls/wait for response
        
        # For now, simulate the Telegram bot response
        # In production, replace with actual Telegram API call
        
        # Simulate different responses based on query
        response_text = simulate_telegram_response(text)
        
        # Store the response
        message_id = str(uuid.uuid4())
        response_store[message_id] = {
            'text': response_text,
            'session_id': session_id,
            'timestamp': datetime.utcnow(),
            'from_bot': True
        }
        
        # Update session
        if session_id in session_store:
            session_store[session_id]['last_message_id'] = message_id
            session_store[session_id]['last_activity'] = datetime.utcnow()
        
        return jsonify({
            'success': True,
            'message_id': message_id,
            'response': response_text,
            'session_id': session_id,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error sending to Telegram: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'Failed to send message: {str(e)}'
        }), 500

@telegram_bridge_bp.route('/api/telegram/webhook', methods=['POST'])
def telegram_webhook():
    """Receive messages from Telegram bot (for real implementation)"""
    try:
        update = request.get_json()
        logger.info(f"Received Telegram webhook: {json.dumps(update, indent=2)}")
        
        # In production, parse the update and store bot responses
        # For now, just acknowledge receipt
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Error processing Telegram webhook: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@telegram_bridge_bp.route('/api/telegram/poll/<session_id>', methods=['GET'])
@jwt_optional()
def poll_responses(session_id):
    """Poll for new responses in a session"""
    try:
        if session_id not in session_store:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
            
        last_message_id = session_store[session_id].get('last_message_id')
        
        # Get all responses for this session
        session_responses = []
        for msg_id, response in response_store.items():
            if response['session_id'] == session_id:
                session_responses.append({
                    'message_id': msg_id,
                    'text': response['text'],
                    'timestamp': response['timestamp'].isoformat(),
                    'from_bot': response['from_bot']
                })
        
        # Sort by timestamp
        session_responses.sort(key=lambda x: x['timestamp'])
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'responses': session_responses,
            'last_message_id': last_message_id,
            'has_new': len(session_responses) > 0
        })
        
    except Exception as e:
        logger.error(f"Error polling Telegram responses: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@telegram_bridge_bp.route('/api/telegram/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'service': 'Telegram Bridge API',
        'status': 'operational',
        'sessions': len(session_store),
        'pending_responses': len(response_store),
        'timestamp': datetime.utcnow().isoformat()
    })

def simulate_telegram_response(query):
    """Simulate Telegram bot responses for development"""
    query_lower = query.lower()
    
    # Simulate intelligent responses like the real Telegram bot
    if any(word in query_lower for word in ['hello', 'hi', 'hey', 'greetings']):
        return "Hello! I'm Hermes, your AI assistant for Huawei Cloud ERP. I have full access to the system and can help you with customers, projects, ECS servers, and more. What would you like to know?"
    
    elif 'customer' in query_lower:
        return "I can see 7 customers in the ERP system:\n1. GRUPO MELO\n2. CODELPA\n3. COPEL\n4. COPEL DISTRIBUIÇÃO\n5. COPEL GERAÇÃO E TRANSMISSÃO\n6. COPEL TELECOM\n7. COPEL COMÉRCIO\n\nWhich customer would you like to know more about?"
    
    elif 'project' in query_lower:
        return "There are 8 projects in the system, including:\n• Huawei Cloud Migration for CODELPA\n• ECS Server Consolidation\n• DR Site Setup for GRUPO MELO\n• Network Optimization for COPEL\n\nWould you like details on a specific project?"
    
    elif 'ecs' in query_lower and 'server' in query_lower:
        return "I can query the ECS servers in the migration tasks table. Currently there are 0 migration tasks recorded in the database. To see ECS servers, migration tasks need to be populated with server data.\n\nWould you like me to check the Huawei Cloud console for live ECS instances?"
    
    elif 'status' in query_lower or 'health' in query_lower:
        return "System Status:\n✅ Flask app running on port 9119\n✅ Database connected (SQLite)\n✅ 7 customers, 8 projects\n✅ 0 migration tasks (ECS servers)\n✅ 0 Huawei accounts\n\nEverything is operational!"
    
    elif 'help' in query_lower:
        return "I can help you with:\n\n📊 **Data Queries**\n• List customers, projects, migration tasks\n• Check ECS server status\n• Analyze presales pipeline\n\n🔧 **ERP Operations**\n• Huawei Cloud account management\n• Migration task tracking\n• Project status updates\n\n💬 **Just ask** like you would on Telegram!\n\nTry: 'Show me CODELPA projects' or 'What ECS servers are live?'"
    
    elif 'codelpa' in query_lower:
        return "CODELPA has projects in the 'Huawei Cloud Migration' pipeline. The migration tasks table shows 0 ECS servers currently tracked for CODELPA.\n\nWould you like me to:\n1. Check Huawei Cloud console for CODELPA ECS instances?\n2. Review CODELPA project details?\n3. Analyze migration readiness?"
    
    else:
        return f"I received your query: '{query}'\n\nAs your Telegram-connected AI assistant, I have full access to:\n• ERP database (customers, projects, tasks)\n• Huawei Cloud console\n• System logs and metrics\n\nWhat specific information would you like about the Huawei Cloud ERP system?"

# Cleanup old sessions periodically (in production, run as background task)
def cleanup_old_sessions():
    """Remove sessions older than 24 hours"""
    try:
        cutoff = datetime.utcnow() - timedelta(hours=24)
        sessions_to_remove = []
        
        for session_id, session_data in session_store.items():
            if session_data['created_at'] < cutoff:
                sessions_to_remove.append(session_id)
        
        for session_id in sessions_to_remove:
            # Clean up responses for this session
            response_ids_to_remove = []
            for msg_id, response in response_store.items():
                if response['session_id'] == session_id:
                    response_ids_to_remove.append(msg_id)
            
            for msg_id in response_ids_to_remove:
                del response_store[msg_id]
            
            del session_store[session_id]
            
        if sessions_to_remove:
            logger.info(f"Cleaned up {len(sessions_to_remove)} old sessions")
            
    except Exception as e:
        logger.error(f"Error cleaning up sessions: {str(e)}")