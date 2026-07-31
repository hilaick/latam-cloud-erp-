#!/usr/bin/env python3
"""Deploy frontend dist + source files to server via HTTP CONNECT proxy."""
import paramiko, os, socket, io, tarfile, sys

REPO = r'C:\Users\h84423900\latam-cloud-erp\repo'
SERVER = '159.138.148.45'
PORT = 8443
PROXY = ('proxy.huawei.com', 8080)
TARGET_BASE = '/home/huawei-cloud/latam-cloud-erp-'
SERVICE_BASE = '/opt/latam-cloud-erp'

# Build tar
buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode='w:gz') as t:
    dist_dir = os.path.join(REPO, 'frontend', 'dist')
    for root, dirs, files in os.walk(dist_dir):
        for fn in files:
            fp = os.path.join(root, fn)
            t.add(fp, arcname=os.path.relpath(fp, dist_dir).replace('\\', '/'))
    t.add(os.path.join(REPO, r'frontend\src\components\wizard\StepPostLive.jsx'),
          arcname='StepPostLive.jsx')
    t.add(os.path.join(REPO, r'frontend\src\utils\specParser.js'),
          arcname='specParser.js')
    t.add(os.path.join(REPO, r'services\huawei_discovery.py'),
          arcname='huawei_discovery.py')

data = buf.getvalue()
print(f'[1/5] Tar built: {len(data)/1024:.1f} KB')

# HTTP CONNECT tunnel
print('[2/5] Connecting via proxy...')
sock = socket.socket(); sock.settimeout(15)
sock.connect(PROXY)
sock.sendall(f'CONNECT {SERVER}:{PORT} HTTP/1.0\r\nHost: {SERVER}\r\n\r\n'.encode())
resp = b''
while b'\r\n\r\n' not in resp:
    resp += sock.recv(4096)
print(f'  Proxy response: {resp.splitlines()[0].decode()}')

# SSH
print('[3/5] SSH to server...')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(SERVER, PORT, username='root',
          key_filename=os.path.expanduser('~/.ssh/id_ed25519'),
          sock=sock, timeout=15)

# Upload tar
print('[4/5] Uploading + extracting...')
sftp = c.open_sftp()
sftp.putfo(io.BytesIO(data), '/tmp/deploy.tar.gz')
sftp.close()

# Extract and deploy
cmds = [
    'cd /tmp && tar xzf deploy.tar.gz',
    # Deploy dist
    f'rm -rf {TARGET_BASE}/frontend/dist/assets/* {TARGET_BASE}/frontend/dist/index.html',
    f'cp -r /tmp/dist/* {TARGET_BASE}/frontend/dist/',
    # Deploy source
    f'cp /tmp/StepPostLive.jsx {TARGET_BASE}/frontend/src/components/wizard/StepPostLive.jsx',
    f'cp /tmp/specParser.js {TARGET_BASE}/frontend/src/utils/specParser.js',
    # Deploy backend to both locations
    f'cp /tmp/huawei_discovery.py {TARGET_BASE}/services/huawei_discovery.py',
    f'[ -d "{SERVICE_BASE}" ] && cp /tmp/huawei_discovery.py {SERVICE_BASE}/services/huawei_discovery.py || true',
    # Restart Flask
    'pkill -f "flask run" 2>/dev/null; sleep 1',
    f'cd {TARGET_BASE} && source venv/bin/activate && nohup flask run --host=0.0.0.0 --port=9119 > /tmp/flask.log 2>&1 &',
    'sleep 2',
    f'ls -la {TARGET_BASE}/frontend/dist/assets/index-*.js',
]
for cmd in cmds:
    _, o, e = c.exec_command(cmd, timeout=10)
    out = o.read().decode().strip()
    err = e.read().decode().strip()
    if out: print(f'  {out[:120]}')
    if err: print(f'  ERR: {err[:120]}')

c.close()
sock.close()
print('[5/5] Done!')
