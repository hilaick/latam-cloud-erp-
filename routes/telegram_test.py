"""
Simple Telegram Bot Test Page
"""

from flask import Blueprint, render_template_string

telegram_test_bp = Blueprint('telegram_test', __name__)

@telegram_test_bp.route('/telegram-bot-test')
def telegram_bot_test():
    """Test page for Telegram bot integration"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Telegram Bot Integration Test</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .container {
                width: 100%;
                max-width: 800px;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #0088cc 0%, #00a2ff 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
                font-weight: 700;
            }
            
            .header p {
                font-size: 1.1rem;
                opacity: 0.9;
                max-width: 600px;
                margin: 0 auto;
                line-height: 1.6;
            }
            
            .content {
                padding: 30px;
            }
            
            .section {
                margin-bottom: 30px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 10px;
                border-left: 4px solid #0088cc;
            }
            
            .section h2 {
                color: #0088cc;
                margin-bottom: 15px;
                font-size: 1.5rem;
            }
            
            .button {
                display: inline-block;
                padding: 12px 24px;
                background: #0088cc;
                color: white;
                text-decoration: none;
                border-radius: 50px;
                font-weight: 600;
                border: none;
                cursor: pointer;
                transition: all 0.3s ease;
                margin: 5px;
            }
            
            .button:hover {
                background: #006699;
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(0,0,0,0.2);
            }
            
            .button.secondary {
                background: #6c757d;
            }
            
            .button.success {
                background: #28a745;
            }
            
            .button.danger {
                background: #dc3545;
            }
            
            .code-block {
                background: #1a1a1a;
                color: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                margin: 15px 0;
                overflow-x: auto;
            }
            
            .status {
                padding: 10px;
                border-radius: 5px;
                margin: 10px 0;
                font-weight: 600;
            }
            
            .status.success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            
            .status.error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .status.info {
                background: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
            }
            
            .chat-box {
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 10px;
                padding: 20px;
                margin-top: 20px;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .message {
                margin-bottom: 15px;
                padding: 10px 15px;
                border-radius: 10px;
                max-width: 80%;
            }
            
            .message.user {
                background: #0088cc;
                color: white;
                margin-left: auto;
                text-align: right;
            }
            
            .message.bot {
                background: #f1f3f4;
                color: #333;
                margin-right: auto;
            }
            
            .input-group {
                display: flex;
                margin-top: 20px;
            }
            
            .input-group input {
                flex: 1;
                padding: 12px 15px;
                border: 1px solid #dee2e6;
                border-radius: 50px 0 0 50px;
                font-size: 16px;
            }
            
            .input-group button {
                padding: 12px 24px;
                background: #0088cc;
                color: white;
                border: none;
                border-radius: 0 50px 50px 0;
                cursor: pointer;
                font-weight: 600;
            }
            
            .input-group button:hover {
                background: #006699;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🤖 Telegram Bot Integration Test</h1>
                <p>Test the direct connection between web UI and Telegram bot <strong>@hydsAgent_bot</strong></p>
            </div>
            
            <div class="content">
                <div class="section">
                    <h2>1. Bot Status</h2>
                    <div id="bot-status" class="status info">Checking bot status...</div>
                    <button onclick="checkBotStatus()" class="button">Check Bot Status</button>
                </div>
                
                <div class="section">
                    <h2>2. Create Session</h2>
                    <p>Create a new session to chat with the Telegram bot:</p>
                    <div id="session-status" class="status info">No session created yet</div>
                    <button onclick="createSession()" class="button success">Create Session</button>
                    <div id="session-instructions" style="display: none; margin-top: 15px;">
                        <p><strong>To connect:</strong></p>
                        <ol>
                            <li>Open Telegram and message <strong>@hydsAgent_bot</strong></li>
                            <li>Send: <code>/webui &lt;session-id&gt;</code></li>
                            <li>Start chatting!</li>
                        </ol>
                    </div>
                </div>
                
                <div class="section">
                    <h2>3. Chat Interface</h2>
                    <div id="chat-container" style="display: none;">
                        <div class="chat-box" id="chat-messages">
                            <div class="message bot">
                                <strong>Bot:</strong> Waiting for connection...
                            </div>
                        </div>
                        
                        <div class="input-group">
                            <input type="text" id="message-input" placeholder="Type your message..." onkeypress="handleKeyPress(event)">
                            <button onclick="sendMessage()">Send</button>
                        </div>
                        
                        <div style="margin-top: 15px;">
                            <button onclick="pollMessages()" class="button secondary">Check for Replies</button>
                            <button onclick="clearChat()" class="button danger">Clear Chat</button>
                        </div>
                    </div>
                    <div id="no-session" class="status info">
                        Create a session first to start chatting
                    </div>
                </div>
                
                <div class="section">
                    <h2>4. API Endpoints</h2>
                    <div class="code-block">
                        POST /api/telegram-bot/session<br>
                        GET  /api/telegram-bot/health<br>
                        POST /api/telegram-bot/send<br>
                        GET  /api/telegram-bot/poll/&lt;session_id&gt;<br>
                        POST /api/telegram-bot/connect<br>
                        POST /api/telegram-bot/webhook (Telegram → Flask)
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            let currentSessionId = null;
            
            async function checkBotStatus() {
                try {
                    const response = await axios.get('/api/telegram-bot/health');
                    const data = response.data;
                    
                    if (data.success) {
                        document.getElementById('bot-status').innerHTML = `
                            <div class="status success">
                                ✅ Bot is online: @${data.bot.username} (${data.bot.first_name})<br>
                                ID: ${data.bot.id} | Sessions: ${data.sessions} | Active chats: ${data.active_chats}
                            </div>
                        `;
                    } else {
                        document.getElementById('bot-status').innerHTML = `
                            <div class="status error">
                                ❌ Bot offline: ${data.error}
                            </div>
                        `;
                    }
                } catch (error) {
                    document.getElementById('bot-status').innerHTML = `
                        <div class="status error">
                            ❌ Error checking bot status: ${error.message}
                        </div>
                    `;
                }
            }
            
            async function createSession() {
                try {
                    const response = await axios.post('/api/telegram-bot/session');
                    const data = response.data;
                    
                    if (data.success) {
                        currentSessionId = data.session_id;
                        document.getElementById('session-status').innerHTML = `
                            <div class="status success">
                                ✅ Session created: ${data.session_id}<br>
                                Bot: @${data.bot_username}
                            </div>
                        `;
                        
                        document.getElementById('session-instructions').style.display = 'block';
                        document.getElementById('chat-container').style.display = 'block';
                        document.getElementById('no-session').style.display = 'none';
                        
                        // Show connection instructions
                        const chatMessages = document.getElementById('chat-messages');
                        chatMessages.innerHTML = `
                            <div class="message bot">
                                <strong>Bot:</strong> ${data.instructions}<br><br>
                                <strong>Session ID:</strong> <code>${data.session_id}</code><br><br>
                                To connect:<br>
                                1. Message <strong>@${data.bot_username}</strong> on Telegram<br>
                                2. Send: <code>/webui ${data.session_id}</code><br>
                                3. Start chatting!
                            </div>
                        `;
                    }
                } catch (error) {
                    document.getElementById('session-status').innerHTML = `
                        <div class="status error">
                            ❌ Error creating session: ${error.message}
                        </div>
                    `;
                }
            }
            
            async function sendMessage() {
                const input = document.getElementById('message-input');
                const message = input.value.trim();
                
                if (!message || !currentSessionId) return;
                
                // Add user message to chat
                const chatMessages = document.getElementById('chat-messages');
                chatMessages.innerHTML += `
                    <div class="message user">
                        <strong>You:</strong> ${message}
                    </div>
                `;
                
                input.value = '';
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                try {
                    const response = await axios.post('/api/telegram-bot/send', {
                        session_id: currentSessionId,
                        text: message
                    });
                    
                    if (response.data.success) {
                        chatMessages.innerHTML += `
                            <div class="message bot">
                                <strong>Bot:</strong> ${response.data.message}
                            </div>
                        `;
                    } else {
                        chatMessages.innerHTML += `
                            <div class="message bot" style="background: #f8d7da; color: #721c24;">
                                <strong>Error:</strong> ${response.data.error || 'Failed to send'}
                            </div>
                        `;
                    }
                    
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                } catch (error) {
                    chatMessages.innerHTML += `
                        <div class="message bot" style="background: #f8d7da; color: #721c24;">
                            <strong>Error:</strong> ${error.message}
                        </div>
                    `;
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }
            
            async function pollMessages() {
                if (!currentSessionId) return;
                
                try {
                    const response = await axios.get(`/api/telegram-bot/poll/${currentSessionId}`);
                    const data = response.data;
                    
                    if (data.success && data.messages && data.messages.length > 0) {
                        const chatMessages = document.getElementById('chat-messages');
                        
                        data.messages.forEach(msg => {
                            if (msg.from_telegram) {
                                chatMessages.innerHTML += `
                                    <div class="message bot">
                                        <strong>Bot:</strong> ${msg.content}
                                    </div>
                                `;
                            }
                        });
                        
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                } catch (error) {
                    console.error('Error polling messages:', error);
                }
            }
            
            function clearChat() {
                const chatMessages = document.getElementById('chat-messages');
                chatMessages.innerHTML = '<div class="message bot"><strong>Bot:</strong> Chat cleared</div>';
            }
            
            function handleKeyPress(event) {
                if (event.key === 'Enter') {
                    sendMessage();
                }
            }
            
            // Auto-check bot status on load
            window.onload = function() {
                checkBotStatus();
            }
        </script>
    </body>
    </html>
    """
    return html