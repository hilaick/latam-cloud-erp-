"""
Telegram Widget Integration - Embed Telegram chat directly in web UI

This uses Telegram's official widget to embed a chat interface directly.
No backend needed - pure frontend integration.
"""

from flask import Blueprint, request, jsonify, render_template_string
import logging

# Setup logging
logger = logging.getLogger(__name__)

# Create blueprint
telegram_widget_bp = Blueprint('telegram_widget', __name__)

@telegram_widget_bp.route('/api/telegram-widget/config', methods=['GET'])
def get_widget_config():
    """Get Telegram widget configuration"""
    return jsonify({
        'success': True,
        'widget_config': {
            'enabled': True,
            'bot_username': 'HermesAIBot',  # Your Telegram bot username
            'widget_type': 'popup',  # 'popup' or 'embedded'
            'theme': 'dark',
            'welcome_message': 'Hello! I\'m Hermes, your AI assistant for Huawei Cloud ERP. How can I help you today?',
            'show_start_button': True,
            'start_parameter': 'webui_start'
        },
        'instructions': 'Add the Telegram widget script to your page to embed the chat directly.'
    })

@telegram_widget_bp.route('/telegram-widget-demo', methods=['GET'])
def widget_demo():
    """Demo page showing Telegram widget embedded"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Telegram Widget Demo - Hermes AI</title>
        <script src="https://telegram.org/js/telegram-widget.js?22" 
                data-telegram-login="HermesAIBot" 
                data-size="large" 
                data-radius="10" 
                data-request-access="write"
                data-userpic="false">
        </script>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: #1a1a1a;
                color: white;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                background: #2d2d2d;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }
            h1 {
                color: #0088cc;
                margin-top: 0;
            }
            .widget-container {
                margin: 30px 0;
                text-align: center;
            }
            .instructions {
                background: #3a3a3a;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            code {
                background: #1a1a1a;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📱 Telegram Widget Integration</h1>
            <p>This demonstrates embedding Telegram chat directly into the web UI.</p>
            
            <div class="instructions">
                <h3>How it works:</h3>
                <ol>
                    <li>Click the "Login with Telegram" button below</li>
                    <li>Authorize the Hermes AI bot</li>
                    <li>Chat directly with the bot in the embedded interface</li>
                    <li>All messages go through Telegram's official platform</li>
                </ol>
            </div>
            
            <div class="widget-container">
                <!-- Telegram Login Widget -->
                <script async 
                    src="https://telegram.org/js/telegram-widget.js?22" 
                    data-telegram-login="HermesAIBot" 
                    data-size="large" 
                    data-radius="10" 
                    data-request-access="write"
                    data-userpic="false"
                    data-auth-url="/api/telegram-widget/auth"
                    data-on-auth="onTelegramAuth(user)">
                </script>
                
                <script>
                function onTelegramAuth(user) {
                    alert('Logged in as ' + user.first_name + ' ' + user.last_name + ' (@' + user.username + ')');
                    // You can now show the chat widget
                    showChatWidget();
                }
                
                function showChatWidget() {
                    // Telegram Chat Widget
                    var script = document.createElement('script');
                    script.src = "https://telegram.org/js/telegram-widget.js?22";
                    script.setAttribute('data-telegram-discussion', 'HermesAIBot');
                    script.setAttribute('data-width', '100%');
                    script.setAttribute('data-height', '500');
                    script.setAttribute('data-dark', '1');
                    script.setAttribute('data-color', '0088CC');
                    script.setAttribute('data-comments-channel-username', 'HermesAIBot');
                    document.getElementById('chat-widget').appendChild(script);
                }
                </script>
                
                <div id="chat-widget" style="margin-top: 20px;"></div>
            </div>
            
            <div class="instructions">
                <h3>Integration Code:</h3>
                <pre><code>&lt;!-- Telegram Chat Widget --&gt;
&lt;script async 
    src="https://telegram.org/js/telegram-widget.js?22" 
    data-telegram-discussion="HermesAIBot"
    data-width="100%"
    data-height="500"
    data-dark="1"
    data-color="0088CC"
    data-comments-channel-username="HermesAIBot"&gt;
&lt;/script&gt;</code></pre>
                
                <h3>Benefits:</h3>
                <ul>
                    <li>✅ <strong>Official Telegram interface</strong> - Same as mobile app</li>
                    <li>✅ <strong>No backend needed</strong> - Pure frontend integration</li>
                    <li>✅ <strong>Full Telegram features</strong> - Files, images, voice messages</li>
                    <li>✅ <strong>Persistent chat history</strong> - Saved in Telegram</li>
                    <li>✅ <strong>Mobile notifications</strong> - Get alerts on your phone</li>
                    <li>✅ <strong>Zero configuration</strong> - Just embed and go</li>
                </ul>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #444;">
                <p><strong>Note:</strong> This requires a public Telegram bot (@HermesAIBot). If you don't have one, we can:</p>
                <ol>
                    <li>Create a new Telegram bot via @BotFather</li>
                    <li>Configure it to work with your ERP system</li>
                    <li>Embed it here for seamless chat</li>
                </ol>
            </div>
        </div>
    </body>
    </html>
    """
    return html

@telegram_widget_bp.route('/api/telegram-widget/auth', methods=['POST'])
def handle_telegram_auth():
    """Handle Telegram widget authentication callback"""
    # This would validate the Telegram auth data
    # In production, verify the hash signature
    data = request.get_json()
    
    logger.info(f"Telegram auth received: {data}")
    
    # Store user session, create JWT, etc.
    return jsonify({
        'success': True,
        'message': 'Authentication successful',
        'user': data.get('id'),
        'redirect': '/dashboard'  # Redirect to main app
    })

@telegram_widget_bp.route('/api/telegram-widget/embed-code', methods=['GET'])
def get_embed_code():
    """Get the embed code for React component"""
    embed_code = """
    {/* Telegram Widget Component for React */}
    import { useEffect } from 'react';
    
    const TelegramWidget = () => {
      useEffect(() => {
        // Load Telegram widget script
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-discussion', 'HermesAIBot');
        script.setAttribute('data-width', '100%');
        script.setAttribute('data-height', '500');
        script.setAttribute('data-dark', '1');
        script.setAttribute('data-color', '0088CC');
        script.setAttribute('data-comments-channel-username', 'HermesAIBot');
        
        const container = document.getElementById('telegram-widget-container');
        if (container) {
          container.appendChild(script);
        }
        
        return () => {
          if (container && script.parentNode === container) {
            container.removeChild(script);
          }
        };
      }, []);
      
      return (
        <div id="telegram-widget-container" style={{ width: '100%', height: '500px' }}>
          {/* Widget will be inserted here */}
        </div>
      );
    };
    
    export default TelegramWidget;
    """
    
    return jsonify({
        'success': True,
        'embed_code': embed_code,
        'simple_version': """
        <!-- Simple embed for any HTML page -->
        <div id="telegram-chat"></div>
        <script>
          (function() {
            var script = document.createElement('script');
            script.src = 'https://telegram.org/js/telegram-widget.js?22';
            script.setAttribute('data-telegram-discussion', 'HermesAIBot');
            script.setAttribute('data-width', '100%');
            script.setAttribute('data-height', '500');
            script.setAttribute('data-dark', '1');
            script.setAttribute('data-comments-channel-username', 'HermesAIBot');
            script.async = true;
            document.getElementById('telegram-chat').appendChild(script);
          })();
        </script>
        """
    })