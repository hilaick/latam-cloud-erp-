# n8n Self-Hosted on flexusx-9e95 — Setup Guide
#
# Target: Huawei Cloud ECS flexusx-9e95 (159.138.148.45)
# Use case: Internal admin visibility of ERP Migration Factory logic
#           Visual workflow graphs for complex decision trees (4.0 Gateway, etc.)

## 1. Prerequisites Check (run on server)

```bash
# Check Docker
docker --version          # Need 20.10+
docker compose version    # Need v2+

# Check resources
free -m                   # Need 1+ GB free
df -h /                   # Need 5+ GB free disk

# Check port availability
ss -tlnp | grep 5678      # Should be empty (not in use)
```

## 2. Install Docker if Needed

```bash
# Option A: Install from Huawei Cloud repo (recommended)
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Option B: If proxy blocks get.docker.com, use apt directly
apt-get update
apt-get install -y docker.io docker-compose-v2
```

## 3. Deploy n8n

```bash
# Copy files to server
scp -P 8443 n8n/docker-compose.yml root@159.138.148.45:/opt/n8n/

# SSH to server, then:
cd /opt/n8n
docker network create erp-network 2>/dev/null || true
docker compose up -d

# Check logs
docker compose logs -f n8n
```

## 4. First Access

1. Open https://159.138.148.45:5678 (accept self-signed cert)
2. Login: admin / latam-erp-n8n-2026
3. CHANGE the default password immediately
4. Create a new workflow → Import from /data/workflows/

## 5. ERP Integration (Webhook Endpoints)

n8n can call the ERP Flask API at http://host.docker.internal:9119 (if on same host)
or https://159.138.148.45:9119 for external calls.

Example n8n HTTP Request node:
```
Method: POST
URL: http://host.docker.internal:9119/api/gateway/full-check
Headers: Authorization: Bearer {{ $json.token }}
Body: { "customer_id": "{{ $json.customerId }}", "project_id": "{{ $json.projectId }}" }
```

## 6. Why Docker? Alternative: Direct Install

n8n can also be installed via npm without Docker:
```bash
npm install -g n8n
n8n start --tunnel  # Auto-exposes via n8n.cloud tunnel (no firewall config needed)
```

The Docker approach is preferred because:
- Isolated dependencies
- Auto-restart on crash
- No Node.js version conflicts with existing Flask app
- Health check + resource limits built in

## 7. Troubleshooting

| Symptom | Check |
|---------|-------|
| Container won't start | `docker compose logs n8n` |
| Port 5678 unreachable | Firewall: `ufw allow 5678/tcp` (or Huawei Security Group rule) |
| Webhook test fails | Ensure WEBHOOK_URL matches the external IP |
| Proxy blocking pulls | Set Docker daemon proxy: `/etc/systemd/system/docker.service.d/http-proxy.conf` |
