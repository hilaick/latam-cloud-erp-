"""
WSGI entry point for gunicorn.
Usage: gunicorn --worker-class eventlet --workers 1 -b 0.0.0.0:9119 wsgi:app
"""
import os
import logging
from app import app, socketio

# Initialize knowledge store on startup
try:
    from services.knowledge_provider import ExternalKnowledgeStore
    ExternalKnowledgeStore.initialize()
    logging.info(f"Knowledge store initialized: {ExternalKnowledgeStore.get_stats()}")
except Exception as e:
    logging.warning(f"Knowledge store init failed (will lazy-load): {e}")

if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', port=9119, debug=False, allow_unsafe_werkzeug=True)
