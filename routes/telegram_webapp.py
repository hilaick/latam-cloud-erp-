"""
Telegram Web App Embed - Direct chat with the bot
"""

from flask import Blueprint, render_template_string

telegram_webapp_bp = Blueprint('telegram_webapp', __name__)

@telegram_webapp_bp.route('/telegram-chat')
def telegram_chat():
    """Embed Telegram Web App for direct chat with the bot"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Chat with Hermes AI - Telegram Web App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
                max-width: 900px;
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
            
            .telegram-frame {
                width: 100%;
                height: 600px;
                border: none;
                display: block;
            }
            
            .instructions {
                padding: 30px;
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
            }
            
            .instructions h2 {
                color: #0088cc;
                margin-bottom: 20px;
                font-size: 1.5rem;
            }
            
            .feature-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-top: 20px;
            }
            
            .feature {
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            
            .feature h3 {
                color: #0088cc;
                margin-bottom: 10px;
                font-size: 1.2rem;
            }
            
            .feature p {
                color: #666;
                line-height: 1.5;
            }
            
            .feature-icon {
                font-size: 2rem;
                margin-bottom: 15px;
                color: #0088cc;
            }
            
            .back-button {
                display: inline-block;
                margin-top: 30px;
                padding: 12px 30px;
                background: #0088cc;
                color: white;
                text-decoration: none;
                border-radius: 50px;
                font-weight: 600;
                transition: all 0.3s ease;
            }
            
            .back-button:hover {
                background: #006699;
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(0,0,0,0.2);
            }
            
            @media (max-width: 768px) {
                .container {
                    border-radius: 10px;
                }
                
                .header {
                    padding: 20px;
                }
                
                .header h1 {
                    font-size: 1.8rem;
                }
                
                .telegram-frame {
                    height: 500px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🤖 Telegram Web App</h1>
                <p>This is the <strong>full Telegram interface</strong> embedded directly in your ERP system.</p>
                <p>Log in with your Telegram account to access all your chats, including Hermes AI.</p>
            </div>
            
            <!-- Telegram Web App Iframe -->
            <iframe 
                src="https://web.telegram.org/k/" 
                class="telegram-frame"
                title="Telegram Web App"
                allow="microphone; camera;"
            ></iframe>
            
            <div class="instructions">
                <h2>✨ Why This is Better</h2>
                <div class="feature-grid">
                    <div class="feature">
                        <div class="feature-icon">💬</div>
                        <h3>Full Telegram Experience</h3>
                        <p>Files, images, voice messages, stickers - everything works exactly like the Telegram app.</p>
                    </div>
                    
                    <div class="feature">
                        <div class="feature-icon">📱</div>
                        <h3>Mobile Notifications</h3>
                        <p>Get alerts on your phone when you receive messages, even when the web UI is closed.</p>
                    </div>
                    
                    <div class="feature">
                        <div class="feature-icon">🔄</div>
                        <h3>Sync Across Devices</h3>
                        <p>Continue conversations on your phone, tablet, or desktop - all messages stay in sync.</p>
                    </div>
                    
                    <div class="feature">
                        <div class="feature-icon">🔒</div>
                        <h3>Secure & Private</h3>
                        <p>End-to-end encrypted conversations through Telegram's secure platform.</p>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="/" class="back-button">← Back to ERP Dashboard</a>
                </div>
            </div>
        </div>
        
        <script>
            // Auto-resize iframe to fit content
            window.addEventListener('message', function(event) {
                if (event.data && event.data.type === 'telegramIframeHeight') {
                    document.querySelector('.telegram-frame').style.height = event.data.height + 'px';
                }
            });
            
            // Add Telegram Web App features
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.ready();
                Telegram.WebApp.expand();
                Telegram.WebApp.setHeaderColor('#0088cc');
                Telegram.WebApp.setBackgroundColor('#ffffff');
            }
        </script>
    </body>
    </html>
    """
    return html

@telegram_webapp_bp.route('/api/telegram-webapp/config')
def webapp_config():
    """Get Telegram Web App configuration"""
    return {
        'bot_username': 'HermesAIBot',
        'webapp_url': 'https://web.telegram.org/k/#@HermesAIBot',
        'deep_link': 'https://t.me/HermesAIBot',
        'widget_code': """
        <!-- Telegram Web App Widget -->
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <div id="telegram-webapp"></div>
        <script>
          // Initialize Telegram Web App
          let tg = window.Telegram.WebApp;
          tg.ready();
          tg.expand();
          
          // Load the bot
          tg.MainButton.setText('Open Hermes AI');
          tg.MainButton.show();
          tg.MainButton.onClick(function() {
            window.open('https://web.telegram.org/k/#@HermesAIBot', '_blank');
          });
        </script>
        """
    }