#!/usr/bin/env python3
"""Deploy frontend dist + source files to server via HTTP CONNECT proxy."""
import paramiko, os, socket, io, tarfile, sys

REPO = r'C:\Users\h84423900\latam-cloud-erp\repo'
SERVER = '159.138.148.45'
PORT = 8443
PROXY = ('proxy.huawei.com', 8080)
TARGET_BASE = '/home/huawei-cloud/latam-cloud-erp-'

# === 1. Build tar of dist/ + changed source files (for backup) ===
buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode='w:gz') as t:
    dist_dir = os.path.join(REPO, 'frontend', 'dist')
    for root, dirs, files in os.walk(dist_dir):
        for fn in files:
            fp = os.path.join(root, fn)
            rel = os.path.relpath(fp, dist_dir).replace('\\', '/')
            t.add(fp, arcname='dist/' + rel)
    # Backup changed source files
    srcs = [
        r'frontend\src\components\wizard\AgenticOrchestrationPanel.jsx',
        r'services\agentic_simulator.py',
    ]
    for s in srcs:
        t.add(os.path.join(REPO, s), arcname='src/' + os.path.basename(s))

data = buf.getvalue()
print(f'[1/6] Tar built: {len(data)/1024:.1f} KB')

# === 2. HTTP CONNECT tunnel ===
print('[2/6] Connecting via proxy...')
sock = socket.socket(); sock.settimeout(15)
sock.connect(PROXY)
sock.sendall(f'CONNECT {SERVER}:{PORT} HTTP/1.0\r\nHost: {SERVER}\r\n\r\n'.encode())
resp = b''
while b'\r\n\r\n' not in resp:
    resp += sock.recv(4096)
print(f'  Proxy response: {resp.splitlines()[0].decode()}')

# === 3. SSH ===
print('[3/6] SSH to server...')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(SERVER, PORT, username='root',
          key_filename=os.path.expanduser('~/.ssh/id_ed25519'),
          sock=sock, timeout=15)

# === 4. Upload tar ===
print('[4/6] Uploading tar...')
sftp = c.open_sftp()
sftp.putfo(io.BytesIO(data), '/tmp/deploy.tar.gz')
sftp.close()

# === 5. Server-side: git pull + deploy + restart ===
print('[5/6] Git pull + deploy + restart...')
cmds = (
    # Git: stash local, pull, restore stashes
    f'cd {TARGET_BASE} && git stash -m "pre-depoy-backup" && '
    f'git pull origin feature-migration-lifecycle-2 && '
    f'git stash pop 2>/dev/null; '
    # Purge stale bytecode
    f'cd {TARGET_BASE} && find . -name "*.pyc" -delete && find . -name "__pycache__" -type d -exec rm -rf {{}} +; '
    # Deploy dist/ bundle
    'cd /tmp && rm -rf /tmp/deploy_dist && mkdir -p /tmp/deploy_dist && tar xzf deploy.tar.gz -C /tmp/deploy_dist; '
    # Remove old assets, copy new bundle
    f'rm -rf {TARGET_BASE}/frontend/dist/assets/* && '
    f'cp -r /tmp/deploy_dist/dist/assets/* {TARGET_BASE}/frontend/dist/assets/ && '
    f'cp /tmp/deploy_dist/dist/index.html {TARGET_BASE}/frontend/dist/index.html; '
    # Stop old Flask, restart
    'pkill -f "python3 app.py" 2>/dev/null; sleep 1; '
    f'cd {TARGET_BASE} && PYTHONDONTWRITEBYTECODE=1 bash -c "source venv/bin/activate && nohup python3 app.py --port 9119 > /tmp/flask.log 2>&1 &"; '
    'sleep 2; '
    # Verify: check bundle hash + server is up
    f'python3 -c "import http.client; c=http.client.HTTPConnection(\"localhost\", 9119, timeout=5); c.request(\"GET\", \"/\"); r=c.getresponse(); print(\"HTTP\", r.status); b=r.read()[:200]; print(\"bundle\", [l for l in b.decode().split(\"\\n\") if \"index-\" in l.lower()][0] if any(\"index-\" in l.lower() for l in b.decode().split(\"\\n\")) else \"no bundle ref\")"
)
_, o, e = c.exec_command(cmds, timeout=120)
out = o.read().decode()
err = e.read().decode()
print(out[:600])
if err.strip(): print('ERR:', err[:300])

c.close()
sock.close()
print('[6/6] Done!')
