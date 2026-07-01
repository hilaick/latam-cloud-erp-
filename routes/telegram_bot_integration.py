"""
Telegram Bot Direct Integration - Connect web UI to Telegram bot via API
"""

from flask import Blueprint, request, jsonify, current_app
import requests
import json
import logging
import uuid
from datetime import datetime

# Setup logging
logger = logging.getLogger(__name__)

# Telegram bot configuration
TELEGRAM_BOT_TOKEN = "8755047142:AAGOh_Dt8CAJWiVV-2JN0FPDbDp-whngvTU"
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
TELEGRAM_BOT_USERNAME = "hydsAgent_bot"  # Correct bot username from getMe

# Create blueprint
telegram_bot_bp = Blueprint('telegram_bot', __name__)

# In-memory storage for web UI sessions (in production, use Redis/DB)
web_sessions = {}  # session_id -> {user_id, chat_id, messages}
telegram_chats = {}  # chat_id -> session_id

def send_telegram_message(chat_id, text, parse_mode="Markdown"):
    """Send a message via Telegram bot"""
    try:
        url = f"{TELEGRAM_API_URL}/sendMessage"
        payload = {
            'chat_id': chat_id,
            'text': text,
            'parse_mode': parse_mode
        }
        
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Failed to send Telegram message: {e}")
        return None

def set_telegram_webhook(webhook_url):
    """Set Telegram webhook to receive messages"""
    try:
        url = f"{TELEGRAM_API_URL}/setWebhook"
        payload = {
            'url': webhook_url,
            'drop_pending_updates': True
        }
        
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"Telegram webhook set: {response.json()}")
        return response.json()
    except Exception as e:
        logger.error(f"Failed to set Telegram webhook: {e}")
        return None

@telegram_bot_bp.route('/api/telegram-bot/webhook', methods=['POST'])
def telegram_webhook():
    """Receive updates from Telegram"""
    try:
        update = request.get_json()
        logger.info(f"Telegram webhook received: {update}")
        
        # Handle message
        if 'message' in update:
            message = update['message']
            chat_id = message['chat']['id']
            text = message.get('text', '')
            from_user = message.get('from', {})
            
            logger.info(f"Message from {from_user.get('username', 'unknown')}: {text}")
            
            # Check if this is a web UI session
            if chat_id in telegram_chats:
                session_id = telegram_chats[chat_id]
                if session_id in web_sessions:
                    # Store message for web UI to fetch
                    if 'messages' not in web_sessions[session_id]:
                        web_sessions[session_id]['messages'] = []
                    
                    web_sessions[session_id]['messages'].append({
                        'id': str(uuid.uuid4()),
                        'role': 'assistant',
                        'content': text,
                        'timestamp': datetime.now().isoformat(),
                        'from_telegram': True
                    })
            
            # Echo back for testing
            if text.startswith('/'):
                # Handle commands
                if text == '/start':
                    send_telegram_message(chat_id, "Hello! I'm Hermes AI bot. You can chat with me here or through the web UI.")
                elif text == '/help':
                    send_telegram_message(chat_id, "Available commands:\n/start - Start conversation\n/help - Show this help\n/webui - Get web UI session ID")
                elif text == '/webui':
                    # Create a session for web UI
                    session_id = str(uuid.uuid4())
                    web_sessions[session_id] = {
                        'chat_id': chat_id,
                        'user_id': from_user.get('id'),
                        'username': from_user.get('username'),
                        'created_at': datetime.now().isoformat(),
                        'messages': []
                    }
                    telegram_chats[chat_id] = session_id
                    send_telegram_message(chat_id, f"Web UI session created: `{session_id}`\n\nUse this session ID in the web UI to chat with me.")
                else:
                    send_telegram_message(chat_id, f"I received: {text}")
            else:
                # Regular message - process with AI
                # For now, just echo
                send_telegram_message(chat_id, f"Echo: {text}")
        
        return jsonify({'success': True})
    
    except Exception as e:
        logger.error(f"Error in Telegram webhook: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@telegram_bot_bp.route('/api/telegram-bot/session', methods=['POST'])
def create_session():
    """Create a new web UI session connected to Telegram"""
    try:
        session_id = str(uuid.uuid4())
        
        # For web UI, we need to get a chat ID
        # In production, you'd have the user start a chat with the bot first
        # For now, create a session without an active chat
        
        web_sessions[session_id] = {
            'chat_id': None,  # Will be set when user starts chat
            'user_id': None,
            'username': 'webui_user',
            'created_at': datetime.now().isoformat(),
            'messages': [
                {
                    'id': str(uuid.uuid4()),
                    'role': 'assistant',
                    'content': f"Hello! I'm Hermes AI bot. To start chatting, please:\n\n1. Open Telegram and message @{TELEGRAM_BOT_USERNAME}\n2. Send `/webui` to get your session ID\n3. Enter this session ID in the web UI: `{session_id}`\n\nOnce connected, we can chat directly!",
                    'timestamp': datetime.now().isoformat(),
                    'from_telegram': True
                }
            ]
        }
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'bot_username': TELEGRAM_BOT_USERNAME,
            'instructions': f"Message @{TELEGRAM_BOT_USERNAME} on Telegram and send /webui to connect"
        })
    
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@telegram_bot_bp.route('/api/telegram-bot/send', methods=['POST'])
def send_message():
    """Send a message from web UI to Telegram bot"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        text = data.get('text', '')
        
        if not session_id:
            return jsonify({'success': False, 'error': 'session_id required'}), 400
        
        if not text:
            return jsonify({'success': False, 'error': 'text required'}), 400
        
        # Store user message
        if session_id not in web_sessions:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        web_sessions[session_id]['messages'].append({
            'id': str(uuid.uuid4()),
            'role': 'user',
            'content': text,
            'timestamp': datetime.now().isoformat(),
            'from_telegram': False
        })
        
        # Send to Telegram if chat_id is available
        chat_id = web_sessions[session_id].get('chat_id')
        if chat_id:
            result = send_telegram_message(chat_id, text)
            if result:
                return jsonify({
                    'success': True,
                    'message': 'Message sent to Telegram',
                    'telegram_response': result
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Failed to send to Telegram',
                    'message': 'Message stored locally, but could not send to Telegram'
                })
        else:
            # No chat_id yet - store message for when user connects
            return jsonify({
                'success': True,
                'message': 'Message stored. Connect Telegram to receive responses.',
                'instructions': f"Message @{TELEGRAM_BOT_USERNAME} on Telegram and send: /webui {session_id}"
            })
    
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@telegram_bot_bp.route('/api/telegram-bot/poll/<session_id>', methods=['GET'])
def poll_messages(session_id):
    """Poll for new messages from Telegram"""
    try:
        if session_id not in web_sessions:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        messages = web_sessions[session_id].get('messages', [])
        
        # Get only new messages (since last poll)
        since = request.args.get('since')
        if since:
            filtered_messages = [m for m in messages if m['timestamp'] > since]
        else:
            filtered_messages = messages
        
        return jsonify({
            'success': True,
            'messages': filtered_messages,
            'has_chat': web_sessions[session_id].get('chat_id') is not None,
            'bot_username': TELEGRAM_BOT_USERNAME,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error polling messages: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@telegram_bot_bp.route('/api/telegram-bot/connect', methods=['POST'])
def connect_session():
    """Connect a web UI session to a Telegram chat"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        chat_id = data.get('chat_id')
        
        if not session_id or not chat_id:
            return jsonify({'success': False, 'error': 'session_id and chat_id required'}), 400
        
        if session_id not in web_sessions:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        # Update session with chat_id
        web_sessions[session_id]['chat_id'] = chat_id
        telegram_chats[chat_id] = session_id
        
        # Send welcome message
        send_telegram_message(chat_id, "✅ Connected to web UI! You can now chat with me through the web interface.")
        
        return jsonify({
            'success': True,
            'message': 'Session connected to Telegram',
            'session_id': session_id,
            'chat_id': chat_id
        })
    
    except Exception as e:
        logger.error(f"Error connecting session: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@telegram_bot_bp.route('/api/telegram-bot/health', methods=['GET'])
def health_check():
    """Check Telegram bot health"""
    try:
        # Test Telegram API
        url = f"{TELEGRAM_API_URL}/getMe"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        
        bot_info = response.json()
        
        return jsonify({
            'success': True,
            'bot': bot_info.get('result', {}),
            'sessions': len(web_sessions),
            'active_chats': len(telegram_chats),
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Telegram bot health check failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'bot_token': TELEGRAM_BOT_TOKEN[:10] + '...' if TELEGRAM_BOT_TOKEN else 'missing'
        }), 500

@telegram_bot_bp.route('/api/telegram-bot/setup-webhook', methods=['POST'])
def setup_webhook():
    """Setup Telegram webhook (call this once)"""
    try:
        # Get the webhook URL (assuming HTTPS with ngrok or similar in production)
        webhook_url = request.json.get('webhook_url')
        if not webhook_url:
            # Try to guess from request
            webhook_url = request.url_root.replace('http://', 'https://') + 'api/telegram-bot/webhook'
        
        result = set_telegram_webhook(webhook_url)
        
        return jsonify({
            'success': True if result else False,
            'webhook_url': webhook_url,
            'result': result
        })
    
    except Exception as e:
        logger.error(f"Error setting up webhook: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500