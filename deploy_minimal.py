#!/usr/bin/env python3
"""Minimal deploy: upload tar + single SSH command."""
import paramiko, os, socket, io, tarfile

REPO = r'C:\Users\h84423900\latam-cloud-erp\repo'

buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode='w:gz') as t:
    for root, dirs, files in os.walk(os.path.join(REPO, 'frontend', 'dist')):
        for fn in files:
            fp = os.path.join(root, fn)
            t.add(fp, arcname=os.path.relpath(fp, os.path.join(REPO, 'frontend', 'dist')).replace('\\', '/'))
    t.add(os.path.join(REPO, r'frontend\src\utils\specParser.js'), arcname='specParser.js')

sock = socket.socket(); sock.settimeout(20)
sock.connect(('proxy.huawei.com', 8080))
sock.sendall(b'CONNECT 159.138.148.45:8443 HTTP/1.0\r\nHost: 159.138.148.45\r\n\r\n')
resp = b''
while b'\r\n\r\n' not in resp: resp += sock.recv(4096)
print('Proxy: OK')

c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('159.138.148.45', 8443, username='root', key_filename=os.path.expanduser('~/.ssh/id_ed25519'), sock=sock, timeout=20)

sftp = c.open_sftp()
sftp.putfo(io.BytesIO(buf.getvalue()), '/tmp/fix.tar.gz')
sftp.close()
print('Upload: OK')

# Single command
cmd = (
    'cd /tmp && tar xzf fix.tar.gz && '
    'rm -f /home/huawei-cloud/latam-cloud-erp-/frontend/dist/assets/index-BkqbHqyH.js && '
    'cp assets/* /home/huawei-cloud/latam-cloud-erp-/frontend/dist/assets/ && '
    'cp index.html /home/huawei-cloud/latam-cloud-erp-/frontend/dist/ && '
    'cp specParser.js /home/huawei-cloud/latam-cloud-erp-/frontend/src/utils/specParser.js && '
    'ls /home/huawei-cloud/latam-cloud-erp-/frontend/dist/assets/index-*.js'
)
_, o, e = c.exec_command(cmd, timeout=15)
out = o.read().decode().strip()
err = e.read().decode().strip()
print(f'Result: {out[:300]}')
if err and 'error' in err.lower(): print(f'ERR: {err[:200]}')

c.close(); sock.close()
