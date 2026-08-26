#!/bin/bash
# ERP Migration Factory — production startup script
# Uses gunicorn for concurrent multi-user support (replaces Flask dev server)
# Usage: bash start_production.sh [stop|restart|status]

APP_DIR="/home/huawei-cloud/latam-cloud-erp-"
PID_FILE="/tmp/erp-gunicorn.pid"
VENV="$APP_DIR/venv/bin/activate"

case "${1:-start}" in
    start)
        echo "Starting ERP (gunicorn, $(nproc) cores → $(($(nproc) * 2 + 1)) workers)..."
        cd "$APP_DIR"
        source "$VENV"
        gunicorn -c gunicorn_config.py app:app --pid "$PID_FILE" --daemon
        sleep 2
        if [ -f "$PID_FILE" ]; then
            echo "✓ ERP started (PID: $(cat $PID_FILE))"
            curl -s -o /dev/null -w "  Health: HTTP %{http_code}\n" http://localhost:9119/health
        else
            echo "✗ Failed to start — check /tmp/gunicorn-erp-error.log"
        fi
        ;;
    stop)
        if [ -f "$PID_FILE" ]; then
            echo "Stopping ERP (PID: $(cat $PID_FILE))..."
            kill $(cat "$PID_FILE") 2>/dev/null
            rm -f "$PID_FILE"
            echo "✓ Stopped"
        else
            echo "ERP not running"
        fi
        ;;
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    status)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "✓ ERP running (PID: $(cat $PID_FILE))"
            curl -s -o /dev/null -w "  Health: HTTP %{http_code}\n" http://localhost:9119/health
            ps aux | grep gunicorn | grep -v grep | head -5
        else
            echo "✗ ERP not running"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
