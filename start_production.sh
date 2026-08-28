#!/bin/bash
# Start ERP with gunicorn + eventlet (production WSGI with WebSocket support)
# Fixes: single-threaded Flask dev server crashing on slow requests (cloud inventory, simulations)

cd /home/huawei-cloud/latam-cloud-erp-

# Kill any existing Flask/gunicorn on port 9119
fuser -k 9119/tcp 2>/dev/null
sleep 2

# Start gunicorn with eventlet worker (async I/O for concurrent requests + WebSocket)
exec gunicorn \
    --worker-class eventlet \
    --workers 1 \
    --bind 0.0.0.0:9119 \
    --timeout 300 \
    --graceful-timeout 30 \
    --access-logfile /tmp/flask.log \
    --error-logfile /tmp/flask.log \
    --log-level info \
    wsgi:app
