from flask import Flask, render_template, send_from_directory, jsonify, request
import os
import time

app = Flask(__name__, static_folder='frontend/dist', static_url_path='')

# Serve the main application
@app.route('/')
def index():
    return send_from_directory('frontend/dist', 'index.html')

# Diagnostic endpoint
@app.route('/api/diagnostic')
def diagnostic():
    js_path = 'frontend/dist/assets/index-RhQro--g.js'
    js_exists = os.path.exists(js_path)
    js_size = os.path.getsize(js_path) if js_exists else 0
    js_mtime = os.path.getmtime(js_path) if js_exists else 0
    
    return jsonify({
        'timestamp': time.time(),
        'server_time': time.strftime('%Y-%m-%d %H:%M:%S GMT', time.gmtime()),
        'js_file': {
            'exists': js_exists,
            'path': js_path,
            'size': js_size,
            'modified': time.strftime('%Y-%m-%d %H:%M:%S GMT', time.gmtime(js_mtime)) if js_mtime else None,
            'contains_fullscreen': check_js_for_fullscreen(js_path) if js_exists else False
        },
        'headers': dict(request.headers),
        'cache_control': 'no-store, no-cache, must-revalidate, max-age=0',
        'build_info': {
            'build_time': '2026-06-12 02:52:28 GMT',
            'features': ['architecture-canvas-container', 'fullscreen-api', 'mobile-detection']
        }
    })

def check_js_for_fullscreen(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read(50000)  # Read first 50KB
            return any(keyword in content for keyword in [
                'requestFullscreen', 'exitFullscreen', 'fullscreenElement', 
                'fullscreenchange', 'toggleFullscreen', 'isMobile'
            ])
    except:
        return False

# Health check
@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'timestamp': time.time()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9119, debug=True)