#!/usr/bin/env python3
"""
Enhanced Huawei ModelArts API Load Balancer
Rotates between 6 API keys with proper rate limit tracking, QPS limiting,
and inline rate-limit sleep mitigation.
"""

import random
import time
import json
import threading
from collections import deque
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import requests
import base64

# Your 6 Huawei ModelArts API keys
KEYS = [
#    "WFpIs8g4-a9duqLicAqkeKnxttpD59SaoE_Snj7bzSobXd-pVm1cG25tNm1LTAOivvUc9DbNRB_1uZ2PWdh-jg",
#    "Pm07QpkXOBV4hSXOr7A3Pc9FEw6qTugjgH2DUB7P8YU0zIJVVQXGXOwWL-j1s5-m0sIB6Ke-x0EvBGueTDgt4A",
#    "wUYtlCORlXyiY0AUm8bUJp8ZvXqGO9o_4L_66scr729fcz-oI5YK43Z-0U2m1H8OnCC3hQ66IDMz4IDxeEdqeA",
#    "0VIn_KTpCp1Cg4mc-nf7ABfXUdig4r2F2PDwNUWFaOaFFxJCTF6H0SN7X6Ce4q1IYifI6Uc5L04CO3YLd_U_gg",
#    "0evwc0Er01n6hAKOn24AA5TSUPvuZqJkt4V2UxPzAU7BreKDHRjBIC2RPngFlwK3y0fH7lGkDueTW-RPfkxFkQ",
#    "Bz2y-YeoTVoEPZMbEZ5yKhlGonGFqMDOqi30RVl_ke_kbYHRfocfAE3QgA7UAzMw4SEKaaxLlsK9TK4IxPyuXw",
    "lEge2bx09RWOFjHYpBwL-jBHHoM1WUgjyHZG5sftlbFesKGDUcp4teFXNLN4i7deQXek0fxOEiQ4ZWqJ7igjAg",
    "l0ho141aMYjnGs0bY8xXqs6Xj8_c9SJ-UNLV7aNnLAujUJwGe11FroBaaZ5TNK3Ex3QyAaR04Jhw0Erg5eDm7A",
    "ERtbYr1rCDlLKcAl1tHchXQvNIWDuyjz7gH6lWtt4aVSKLTh2ZjYZwasz1V5tTt1QTQe7tcmv34BzfHxakX4SQ"
]

# Authentication credentials
AUTH_USERNAME = "admin"
AUTH_PASSWORD = "821870eee4d31084e1bff405aba15ca6"  # CHANGE THIS TO A STRONG PASSWORD!

# Thread-safe tracking structures
key_lock = threading.Lock()
SERVER_START_TIME = time.time()
WARMUP_SECONDS = 60  # Rate-limit total requests during warmup to prevent cold-start 429 cascade

# Track per-key metrics
key_request_timestamps = {key: deque(maxlen=1000) for key in KEYS}  # Timestamps of last 1000 requests
_warmup_request_times = deque(maxlen=1000)  # Global request times during warmup period, capped at 1/s
key_error_counts = {key: 0 for key in KEYS}  # Error count (reset after successful request)
key_last_error_time = {key: 0 for key in KEYS}  # Unix timestamp of last error (for decay)
key_cooldown_until = {key: 0 for key in KEYS}  # Unix timestamp when cooldown ends (0 = no cooldown)
key_last_429_time = {key: 0 for key in KEYS}  # Last time key got 429
key_token_remaining = {key: 500000 for key in KEYS}  # Track remaining tokens (initialize with limit)
key_last_headers = {key: {} for key in KEYS}  # Last response headers from Huawei

# Constants
COOLDOWN_SECONDS = 15  # How long to bench a key after 429
MAX_QPS = 10  # Maximum queries per second per key
MAX_RPM = 50  # Maximum requests per minute per key (10 RPM × ~50K tokens = 500K TPM)
MIN_TOKENS_REMAINING = 100000  # Skip keys with fewer tokens left than this (proactive token gating)
ERROR_DECAY_SECONDS = 300  # Errors older than 5 min are forgotten (time-based decay, prevents permanent deadlock)
MAX_ERRORS = 15  # Maximum consecutive errors before benching (was 5 — avoid deadlock when all keys error)
HTTP_TIMEOUT = 120  # Extended to 120 seconds to prevent DeepSeek timeouts during heavy generation
RPM_BACKPRESSURE_SLEEP = 2  # Seconds to sleep when all keys at RPM limit before retrying
RPM_BACKPRESSURE_MAX_WAIT = 30  # Max total seconds to wait under RPM backpressure before giving up
SSE_STREAM_TIMEOUT = 300  # Per-chunk timeout for streaming responses (5 min between chunks)
SSE_KEEPALIVE_INTERVAL = 15  # Send a keepalive comment every 15s to keep connection alive

class HuaweiLoadBalancer(BaseHTTPRequestHandler):
    def authenticate(self):
        """Check Basic Authentication"""
        auth_header = self.headers.get('Authorization')
        if auth_header:
            try:
                auth_type, auth_string = auth_header.split(' ', 1)
                if auth_type.lower() == 'basic':
                    decoded = base64.b64decode(auth_string).decode('utf-8')
                    username, password = decoded.split(':', 1)
                    if username == AUTH_USERNAME and password == AUTH_PASSWORD:
                        return True
            except Exception:
                return False
        return False
    
    def require_auth(self):
        """Send 401 Authentication Required"""
        self.send_response(401)
        self.send_header('WWW-Authenticate', 'Basic realm="Huawei Load Balancer"')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": "Authentication required"}).encode())
    
    def get_available_keys(self):
        """Get list of keys that are currently available (not in cooldown, not error-prone, not at RPM limit)"""
        now = time.time()
        available = []
        
        with key_lock:
            for key in KEYS:
                # Skip if in cooldown
                if key_cooldown_until[key] > now:
                    continue
                
                # Time-based decay: forget errors older than ERROR_DECAY_SECONDS
                if key_error_counts[key] > 0 and (now - key_last_error_time[key]) > ERROR_DECAY_SECONDS:
                    key_error_counts[key] = 0
                
                # Skip if too many errors
                if key_error_counts[key] >= MAX_ERRORS:
                    continue
                
                # Skip if QPS limit reached
                timestamps = key_request_timestamps[key]
                one_second_ago = now - 1
                recent_requests = sum(1 for ts in timestamps if ts > one_second_ago)
                if recent_requests >= MAX_QPS:
                    continue
                
                # Skip if RPM limit reached (proactive — prevents 429 cascade)
                one_minute_ago = now - 60
                minute_requests = sum(1 for ts in timestamps if ts > one_minute_ago)
                if minute_requests >= MAX_RPM:
                    continue
                
                # TOKEN GATE: skip keys with too few remaining tokens (tokens are the real constraint)
                # Threshold: 100K tokens left = enough for ~4 full agent calls before needing cooldown
                if key_token_remaining.get(key, 500000) < MIN_TOKENS_REMAINING:
                    continue
                
                available.append(key)
        
        return available
    
    def select_best_key(self, available_keys):
        """Select the best key from available ones based on usage in last minute"""
        if not available_keys:
            return None
        
        now = time.time()
        one_minute_ago = now - 60
        
        with key_lock:
            # Count requests in last minute for each key
            minute_counts = {}
            for key in available_keys:
                timestamps = key_request_timestamps[key]
                count = sum(1 for ts in timestamps if ts > one_minute_ago)
                minute_counts[key] = count
            
            # Also consider remaining tokens (if we have that info)
            scores = []
            for key in available_keys:
                # Lower usage is better
                usage_score = minute_counts.get(key, 0)
                
                # More remaining tokens is better (normalize to 0-1)
                remaining_tokens = key_token_remaining.get(key, 500000)
                token_score = 1.0 - (remaining_tokens / 500000)  # 0 if full, 1 if empty
                
                # Combine scores (weight usage more heavily)
                total_score = usage_score * 0.7 + token_score * 0.3
                scores.append((total_score, key))
            
            # Select key with lowest score (least used, most tokens)
            scores.sort()
            return scores[0][1]
    
    def update_key_metrics(self, key, response=None, error=False):
        """Update tracking metrics for a key"""
        now = time.time()
        
        with key_lock:
            # Record request timestamp
            key_request_timestamps[key].append(now)
            
            if error:
                key_error_counts[key] += 1
                key_last_error_time[key] = now
                # If it's a 429, put key in cooldown
                if response is not None and hasattr(response, 'status_code') and response.status_code == 429:
                    key_cooldown_until[key] = now + COOLDOWN_SECONDS
                    key_last_429_time[key] = now
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Key {key[:8]}... benched for {COOLDOWN_SECONDS}s due to 429 Rate Limit")
            else:
                # Reset error count on success
                key_error_counts[key] = 0
                key_last_error_time[key] = 0
                
                # Update token remaining from response headers
                if response and hasattr(response, 'headers'):
                    headers = response.headers
                    key_last_headers[key] = dict(headers)
                    
                    # Parse Huawei rate limit headers
                    remaining = headers.get('x-ratelimit-remaining-tokens')
                    if remaining:
                        try:
                            key_token_remaining[key] = int(remaining)
                            if key_token_remaining[key] < 100000:  # Warn if low
                                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Warning: Key {key[:8]}... has only {key_token_remaining[key]:,} tokens remaining")
                        except (ValueError, TypeError):
                            pass
    
    def _handle_streaming(self, request_data):
        """SSE streaming handler: forward chunks from ModelArts as they arrive."""
        # Reuse the same key selection loop pattern as do_POST
        import requests as _req
        
        # Strip stream flag handling — pass stream=True upstream
        max_attempts = 3
        last_exception = None
        
        for attempt in range(max_attempts):
            available_keys = self.get_available_keys()
            if not available_keys:
                available_keys = KEYS
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] WARNING (stream): No fully healthy keys available, falling back to all keys (Attempt {attempt+1})")
            
            current_key = self.select_best_key(available_keys)
            if not current_key:
                self.send_error(503, "Service Unavailable: No Keys Available")
                return
            
            key_mask = f"{current_key[:8]}..."
            
            try:
                upstream = _req.post(
                    "https://api-ap-southeast-1.modelarts-maas.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {current_key}",
                        "Content-Type": "application/json",
                    },
                    json=request_data,
                    stream=True,
                    timeout=(10, SSE_STREAM_TIMEOUT),  # (connect, read) timeout
                )
                
                if upstream.status_code == 429:
                    self.update_key_metrics(current_key, response=upstream, error=True)
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] (stream) Rate limit 429 hit on {key_mask}. Sleeping 2s to rotate...")
                    time.sleep(2)
                    upstream.close()
                    continue
                
                if upstream.status_code != 200:
                    self.update_key_metrics(current_key, response=upstream, error=True)
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] (stream) API returned error code {upstream.status_code} on key {key_mask}")
                    upstream.close()
                    continue
                
                # Success — stream response back to client as SSE
                self.update_key_metrics(current_key, response=upstream, error=False)
                self.send_response(200)
                self.send_header('Content-Type', 'text/event-stream')
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('Connection', 'keep-alive')
                # Forward rate limit headers
                for header in ['x-ratelimit-remaining-tokens', 'x-ratelimit-limit-tokens',
                              'x-ratelimit-reset-tokens', 'x-ratelimit-remaining-requests']:
                    if header in upstream.headers:
                        self.send_header(header, upstream.headers[header])
                self.end_headers()
                
                # Stream chunks
                total_chunks = 0
                last_activity = time.time()
                
                # Use raw iter_lines to parse SSE from upstream
                import io as _io
                for raw_line in upstream.iter_lines(decode_unicode=True):
                    if not raw_line:
                        continue
                    # Keepalive: if upstream stalls, send a comment to keep client connection alive
                    now = time.time()
                    if now - last_activity > SSE_KEEPALIVE_INTERVAL:
                        try:
                            self.wfile.write(b': keepalive\n\n')
                            self.wfile.flush()
                        except Exception:
                            break
                        last_activity = now
                    
                    try:
                        self.wfile.write((raw_line + '\n').encode('utf-8'))
                        self.wfile.flush()
                    except Exception:
                        break  # client disconnected
                    total_chunks += 1
                    last_activity = time.time()
                
                # Ensure stream closes with proper SSE ending
                try:
                    self.wfile.write(b'\n')
                    self.wfile.flush()
                except Exception:
                    pass
                
                upstream.close()
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] (stream) Success: Key {key_mask}, {total_chunks} chunks streamed")
                return
                
            except Exception as e:
                self.update_key_metrics(current_key, error=True)
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] (stream) Exception with key {key_mask}: {str(e)}")
                last_exception = e
                time.sleep(1)
                continue
        
        # All attempts exhausted — send SSE-formatted error (client expects stream)
        try:
            self.send_response(502)
            self.send_header('Content-Type', 'text/event-stream')
            self.end_headers()
            err = json.dumps({"error": f"All key allocation routing attempts failed. Last exception: {str(last_exception)}", "success": False})
            self.wfile.write(f"data: {err}\n\n".encode())
            self.wfile.flush()
        except Exception:
            pass
    
    def do_GET(self):
        """Handle GET requests - show stats (REQUIRES AUTHENTICATION)"""
        if not self.authenticate():
            self.require_auth()
            return
            
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        now = time.time()
        one_minute_ago = now - 60
        one_second_ago = now - 1
        
        with key_lock:
            stats = {
                "status": "Enhanced Huawei ModelArts Load Balancer",
                "total_keys": len(KEYS),
                "estimated_capacity_tpm": len(KEYS) * 500000,
                "keys": {},
                "totals": {
                    "requests_last_minute": 0,
                    "requests_last_second": 0,
                    "keys_in_cooldown": 0,
                    "keys_with_errors": 0
                },
                "endpoints": {
                    "POST /v1/chat/completions": "Forward to Huawei ModelArts API",
                    "GET /stats": "Show load balancer statistics",
                    "GET /health": "Health check"
                }
            }
            
            for key in KEYS:
                masked_key = f"{key[:8]}..."
                timestamps = list(key_request_timestamps[key])
                
                requests_last_minute = sum(1 for ts in timestamps if ts > one_minute_ago)
                requests_last_second = sum(1 for ts in timestamps if ts > one_second_ago)
                
                stats["keys"][masked_key] = {
                    "requests_last_minute": requests_last_minute,
                    "requests_last_second": requests_last_second,
                    "total_requests": len(timestamps),
                    "error_count": key_error_counts[key],
                    "in_cooldown": key_cooldown_until[key] > now,
                    "cooldown_remaining": max(0, key_cooldown_until[key] - now) if key_cooldown_until[key] > now else 0,
                    "tokens_remaining": key_token_remaining[key],
                    "last_429": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(key_last_429_time[key])) if key_last_429_time[key] > 0 else "Never"
                }
                
                stats["totals"]["requests_last_minute"] += requests_last_minute
                stats["totals"]["requests_last_second"] += requests_last_second
                if key_cooldown_until[key] > now:
                    stats["totals"]["keys_in_cooldown"] += 1
                if key_error_counts[key] >= MAX_ERRORS:
                    stats["totals"]["keys_with_errors"] += 1
        
        self.wfile.write(json.dumps(stats, indent=2).encode())
    
    def do_POST(self):
        """Handle POST requests - forward to Huawei ModelArts (NO AUTH REQUIRED FOR COMPLETIONS)"""
        if self.path != '/v1/chat/completions':
            if not self.authenticate():
                self.require_auth()
                return
        
        # === WARMUP GATE: prevent cold-start 429 cascade ===
        # During the first WARMUP_SECONDS, limit total requests to 1/sec
        # This gives RPM counters time to accumulate before enforcing per-key limits
        now = time.time()
        server_age = now - SERVER_START_TIME
        if server_age < WARMUP_SECONDS:
            with key_lock:
                one_second_ago = now - 1
                recent_warmup = sum(1 for ts in _warmup_request_times if ts > one_second_ago)
                if recent_warmup >= 1:
                    warmup_remaining = WARMUP_SECONDS - server_age
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Warmup throttle: "
                          f"1 req/s cap active ({warmup_remaining:.0f}s remaining). Sleeping 1s...")
                    time.sleep(1)
                    now = time.time()  # Refresh after sleep
                _warmup_request_times.append(now)
        
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            request_data = json.loads(post_data)
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return
        
        # ── STREAMING MODE: if client requested stream, use SSE forwarding ──
        if request_data.get("stream", False):
            self._handle_streaming(request_data)
            return
        
        # Max attempts to gracefully loop over keys if a 429 or execution error is encountered
        max_attempts = 3
        last_exception = None
        rpm_backpressure_start = None
        
        for attempt in range(max_attempts):
            available_keys = self.get_available_keys()
            if not available_keys:
                # Check if all keys are just RPM-throttled (not errored/cooldowned)
                # If so, apply backpressure wait instead of immediate 502
                now = time.time()
                all_rpm_capped = True
                with key_lock:
                    for key in KEYS:
                        if key_cooldown_until[key] <= now and key_error_counts[key] < MAX_ERRORS:
                            timestamps = key_request_timestamps[key]
                            minute_requests = sum(1 for ts in timestamps if ts > now - 60)
                            if minute_requests < MAX_RPM:
                                all_rpm_capped = False
                                break
                
                if all_rpm_capped and (rpm_backpressure_start is None):
                    rpm_backpressure_start = now
                
                if all_rpm_capped and rpm_backpressure_start is not None:
                    waited = now - rpm_backpressure_start
                    if waited < RPM_BACKPRESSURE_MAX_WAIT:
                        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] RPM backpressure: all keys at {MAX_RPM} RPM limit. "
                              f"Waiting {RPM_BACKPRESSURE_SLEEP}s (waited {waited:.0f}s of {RPM_BACKPRESSURE_MAX_WAIT}s max)...")
                        time.sleep(RPM_BACKPRESSURE_SLEEP)
                        continue  # Retry — minute window may have rolled over
                
                available_keys = KEYS
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] WARNING: No fully healthy keys available, falling back to all keys (Attempt {attempt+1})")
            
            current_key = self.select_best_key(available_keys)
            if not current_key:
                self.send_error(503, "Service Unavailable: No Keys Available")
                return
                
            key_mask = f"{current_key[:8]}..."
            
            try:
                response = requests.post(
                    "https://api-ap-southeast-1.modelarts-maas.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {current_key}",
                        "Content-Type": "application/json"
                    },
                    json=request_data,
                    timeout=HTTP_TIMEOUT
                )
                
                # Check explicitly for Rate Limiting / 429
                if response.status_code == 429:
                    self.update_key_metrics(current_key, response=response, error=True)
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Rate limit 429 hit on {key_mask}. Sleeping 2 seconds to rotate...")
                    time.sleep(2)
                    continue  # Continues to next iteration loop to transparently switch keys
                    
                # Handle non-200 standard errors
                if response.status_code != 200:
                    self.update_key_metrics(current_key, response=response, error=True)
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] API returned error code {response.status_code} on key {key_mask}")
                    continue
                
                # If we achieved a clean 200 OK, complete metrics and send payload back to tool client
                self.update_key_metrics(current_key, response=response, error=False)
                
                self.send_response(response.status_code)
                self.send_header('Content-type', 'application/json')
                
                # Forward Huawei rate limit headers if present
                for header in ['x-ratelimit-remaining-tokens', 'x-ratelimit-limit-tokens', 
                              'x-ratelimit-reset-tokens', 'x-ratelimit-remaining-requests']:
                    if header in response.headers:
                        self.send_header(header, response.headers[header])
                self.end_headers()
                self.wfile.write(response.content)
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Success: Key {key_mask}, Status: {response.status_code}")
                return
                
            except Exception as e:
                self.update_key_metrics(current_key, error=True)
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Exception encountered with key {key_mask}: {str(e)}")
                last_exception = e
                time.sleep(1)  # Brief delay on network glitches before moving to the next key
                continue
                
        # If all transparent loop attempts have been exhausted
        error_msg = f"All key allocation routing attempts failed. Last exception: {str(last_exception)}"
        self.send_response(502)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": error_msg, "success": False}).encode())

    def log_message(self, format, *args):
        """Disable default terminal logging to prevent stdout noise"""
        pass

def run_server(port=8666):
    """Start the enhanced load balancer server"""
    server = HTTPServer(('0.0.0.0', port), HuaweiLoadBalancer)
    print(f"🚀 Enhanced Huawei ModelArts Load Balancer running on port {port}")
    print(f"🔑 Registered Keys Pool Size: {len(KEYS)}")
    print(f"⚡️ Core Optimizations Enabled:")
    print(f"    • Intraday Timeout Cap: {HTTP_TIMEOUT} seconds")
    print(f"    • QPS limiting: {MAX_QPS} requests/second per key")
    print(f"    • Cooldown Window: {COOLDOWN_SECONDS}s on 429 errors")
    print(f"    • Error Threshold: Benches keys after {MAX_ERRORS} sequential failures")
    print(f"    • Inline Rate Mitigation: Transparent 2-second sleep + rotation catch-loop")
    print(f"🌐 Target Proxy Endpoint: http://localhost:{port}/v1/chat/completions")
    print("Press Ctrl+C to gracefully close the service.")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down load balancer...")
        server.server_close()

if __name__ == '__main__':
    run_server()
