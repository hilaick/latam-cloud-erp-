import os
from flask import Flask, send_from_directory, jsonify, request
from pathlib import Path

basedir = os.path.abspath(os.path.dirname(__file__))
dist_folder = os.path.join(basedir, 'frontend', 'dist')

app = Flask(__name__, static_folder=dist_folder)

@app.after_request
def add_header(response):
    # Add cache control for static files
    if request.path.startswith('/assets/'):
        response.headers['Cache-Control'] = 'public, max-age=31536000'  # 1 year for assets
    elif 'text/html' in response.headers.get('Content-Type', ''):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    return response

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path.startswith('api/'):
        return jsonify({"success": False, "error": f"API Route Not Found: {path}"}), 404
    
    # Check if file exists in static folder
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    
    # Fallback to index.html for SPA routing
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9119, debug=True)
