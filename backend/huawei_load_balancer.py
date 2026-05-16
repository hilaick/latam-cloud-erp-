#!/usr/bin/env python3
"""
Simple Huawei ModelArts API Load Balancer
Rotates between 6 API keys to distribute rate limits
"""

import random
import time
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
from urllib.parse import urlparse, parse_qs
import requests
import base64
import hashlib

# Your 6 Huawei ModelArts API keys
KEYS = [
    "WFpIs8g4-a9duqLicAqkeKnxttpD59SaoE_Snj7bzSobXd-pVm1cG25tNm1LTAOivvUc9DbNRB_1uZ2PWdh-jg",
    "Pm07QpkXOBV4hSXOr7A3Pc9FEw6qTugjgH2DUB7P8YU0zIJVVQXGXOwWL-j1s5-m0sIB6Ke-x0EvBGueTDgt4A",
    "wUYtlCORlXyiY0AUm8bUJp8ZvXqGO9o_4L_66scr729fcz-oI5YK43Z-0U2m1H8OnCC3hQ66IDMz4IDxeEdqeA",
    "0VIn_KTpCp1Cg4mc-nf7ABfXUdig4r2F2PDwNUWFaOaFFxJCTF6H0SN7X6Ce4q1IYifI6Uc5L04CO3YLd_U_gg",
    "0evwc0Er01n6hAKOn24AA5TSUPvuZqJkt4V2UxPzAU7BreKDHRjBIC2RPngFlwK3y0fH7lGkDueTW-RPfkxFkQ",
    "Bz2y-YeoTVoEPZMbEZ5yKhlGonGFqMDOqi30RVl_ke_kbYHRfocfAE3QgA7UAzMw4SEKaaxLlsK9TK4IxPyuXw"
]

# Authentication credentials (change these!)
AUTH_USERNAME = "admin"
AUTH_PASSWORD = "changeme123"  # CHANGE THIS TO A STRONG PASSWORD!

# Track usage per key
key_usage = {key: 0 for key in KEYS}
key_errors = {key: 0 for key in KEYS}

class HuaweiLoadBalancer(BaseHTTPRequestHandler):
    def authenticate(self):
        """Check Basic Authentication"""
        auth_header = self.headers.get('Authorization')
        if auth_header:
            auth_type, auth_string = auth_header.split(' ', 1)
            if auth_type.lower() == 'basic':
                decoded = base64.b64decode(auth_string).decode('utf-8')
                username, password = decoded.split(':', 1)
                if username == AUTH_USERNAME and password == AUTH_PASSWORD:
                    return True
        return False
    
    def require_auth(self):
        """Send 401 Authentication Required"""
        self.send_response(401)
        self.send_header('WWW-Authenticate', 'Basic realm="Huawei Load Balancer"')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": "Authentication required"}).encode())
    
    def do_GET(self):
        """Handle GET requests - show stats (REQUIRES AUTHENTICATION)"""
        if not self.authenticate():
            self.require_auth()
            return
            
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        # Create masked versions of keys for display (first 8 chars only)
        masked_key_usage = {f"{k[:8]}...": v for k, v in key_usage.items()}
        masked_key_errors = {f"{k[:8]}...": v for k, v in key_errors.items()}
        
        stats = {
            "status": "Huawei ModelArts Load Balancer",
            "total_keys": len(KEYS),
            "estimated_capacity_tpm": len(KEYS) * 500000,  # 500k per key
            "key_usage": masked_key_usage,
            "key_errors": masked_key_errors,
            "endpoints": {
                "POST /v1/chat/completions": "Forward to Huawei ModelArts API",
                "GET /stats": "Show load balancer statistics (keys masked)",
                "GET /health": "Health check"
            },
            "security_note": "API keys are masked for security. Only first 8 characters shown."
        }
        self.wfile.write(json.dumps(stats, indent=2).encode())
    
    def do_POST(self):
        """Handle POST requests - forward to Huawei ModelArts (NO AUTH REQUIRED)"""
        # POST to /v1/chat/completions doesn't require auth - it's the main API endpoint
        # Only GET endpoints (stats/health) require auth to protect API keys
        if self.path == '/v1/chat/completions':
            # No auth required for API calls
            pass
        else:
            # Other POST endpoints would require auth
            if not self.authenticate():
                self.require_auth()
                return
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            request_data = json.loads(post_data)
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return
        
        # Choose a key (round-robin with error avoidance)
        available_keys = [k for k in KEYS if key_errors.get(k, 0) < 5]  # Skip keys with >5 errors
        if not available_keys:
            available_keys = KEYS  # Fall back to all keys
        
        # Simple round-robin selection
        current_key = min(available_keys, key=lambda k: key_usage.get(k, 0))
        key_usage[current_key] = key_usage.get(current_key, 0) + 1
        
        # Forward to Huawei ModelArts
        try:
            response = requests.post(
                "https://api-ap-southeast-1.modelarts-maas.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {current_key}",
                    "Content-Type": "application/json"
                },
                json=request_data,
                timeout=30
            )
            
            # Send response back to client
            self.send_response(response.status_code)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(response.content)
            
            # Log success
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Success: Key {current_key[:8]}..., Status: {response.status_code}")
            
        except Exception as e:
            # Track errors
            key_errors[current_key] = key_errors.get(current_key, 0) + 1
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Error with key {current_key[:8]}...: {str(e)}")
            
            # Try with another key
            other_keys = [k for k in KEYS if k != current_key and key_errors.get(k, 0) < 5]
            if other_keys:
                retry_key = random.choice(other_keys)
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Retrying with key {retry_key[:8]}...")
                try:
                    response = requests.post(
                        "https://api-ap-southeast-1.modelarts-maas.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {retry_key}",
                            "Content-Type": "application/json"
                        },
                        json=request_data,
                        timeout=30
                    )
                    
                    self.send_response(response.status_code)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(response.content)
                    
                    key_usage[retry_key] = key_usage.get(retry_key, 0) + 1
                    return
                except Exception as e2:
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Retry also failed: {str(e2)}")
            
            # All retries failed
            self.send_error(502, f"All keys failed: {str(e)}")
    
    def log_message(self, format, *args):
        """Disable default logging"""
        pass

def run_server(port=8666):
    """Start the load balancer server"""
    server = HTTPServer(('0.0.0.0', port), HuaweiLoadBalancer)
    print(f"🚀 Huawei ModelArts Load Balancer running on port {port}")
    print(f"🔑 Using {len(KEYS)} API keys")
    print(f"🔐 Authentication enabled: username='{AUTH_USERNAME}', password='{AUTH_PASSWORD}'")
    print(f"⚠️  WARNING: Change the default password in the script!")
    print(f"⚡ Estimated capacity: {len(KEYS) * 500000:,} TPM")
    print(f"🌐 Endpoint: http://localhost:{port}/v1/chat/completions")
    print(f"📊 Stats: http://localhost:{port}/stats (requires auth)")
    print("Press Ctrl+C to stop")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down load balancer...")
        server.server_close()

if __name__ == '__main__':
    run_server()