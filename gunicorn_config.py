"""Gunicorn configuration for production ERP Migration Factory.

Enables concurrent users with multiple worker processes.
Usage: gunicorn -c gunicorn_config.py app:app
"""
import os
import multiprocessing

# Number of worker processes (2 × CPU cores + 1)
workers = multiprocessing.cpu_count() * 2 + 1

# Worker type — sync is fine for most endpoints, threaded for I/O bound
worker_class = "gthread"
threads = 4

# Bind address
bind = "0.0.0.0:9119"

# Timeout — long for simulation/execution endpoints
timeout = 300
graceful_timeout = 30

# Logging
accesslog = "/tmp/gunicorn-erp-access.log"
errorlog = "/tmp/gunicorn-erp-error.log"
loglevel = "info"

# Max requests before worker recycle (prevents memory leaks)
max_requests = 1000
max_requests_jitter = 50

# Preload app for faster worker spawn
preload_app = True

# Environment
raw_env = [
    "PYTHONPATH=/home/huawei-cloud/latam-cloud-erp-",
]
