#!/bin/bash
export N8N_AUTH_EMAIL="admin@erp-migration.local"
export N8N_AUTH_PASSWORD="latam-erp-n8n-2026"
cd /home/huawei-cloud/latam-cloud-erp-
exec venv/bin/python3 app.py --port 9119
