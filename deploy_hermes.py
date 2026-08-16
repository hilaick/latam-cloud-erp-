#!/usr/bin/env python3
"""Deploy frontend dist + source files to server via HTTP CONNECT proxy."""
import paramiko, os, socket, io, tarfile, time

REPO = r'C:\Users\h84423900\latam-cloud-erp\repo'
SERVER = '159.138.148.45'
PORT = 8443
PROXY = ('proxy.huawei.com', 8080)
TARGET = '/home/huawei-cloud/latam-cloud-erp-'

def build_tar():
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as t:
        dist_dir = os.path.join(REPO, 'frontend', 'dist')
        for root, dirs, files in os.walk(dist_dir):
            for fn in files:
                fp = os.path.join(root, fn)
                rel = os.path.relpath(fp, dist_dir).replace('\\', '/')
                t.add(fp, arcname='dist/' + rel)
        srcs = [
            r'frontend\src\components\wizard\AgenticOrchestrationPanel.jsx',
            r'services\agentic_simulator.py',
        ]
        for s in srcs:
            t.add(os.path.join(REPO, s), arcname='src/' + os.path.basename(s))
    return buf.getvalue()

def connect():
    sock = socket.socket()
    sock.settimeout(15)
    sock.connect(PROXY)
    req = 'CONNECT ' + str(SERVER) + ':' + str(PORT) + ' HTTP/1.0\r\nHost: ' + SERVER + '\r\n\r\n'
    sock.sendall(req.encode())
    resp = b''
    while b'\r\n\r\n' not in resp:
        resp += sock.recv(4096)
    print('Proxy:', resp.splitlines()[0].decode().strip())
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER, PORT, username='root',
                key_filename=os.path.expanduser('~/.ssh/id_ed25519'),
                sock=sock, timeout=15)
    return ssh

def deploy(ssh, data):
    sftp = ssh.open_sftp()
    sftp.putfo(io.BytesIO(data), '/tmp/deploy.tar.gz')
    sftp.close()
    print('Uploaded', len(data)//1024, 'KB')

    script = r"""import os, time
t = '/home/huawei-cloud/latam-cloud-erp-'
os.chdir(t)
os.system('git stash -m "pre-deploy-backup"')
os.system('git pull origin feature-migration-lifecycle-2')
os.system('git stash pop 2>/dev/null')
os.system('find . -name "*.pyc" -delete')
os.system('find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null')
os.chdir('/tmp')
os.system('rm -rf /tmp/deploy_dist && mkdir /tmp/deploy_dist && tar xzf deploy.tar.gz -C /tmp/deploy_dist')
os.system('rm -rf ' + t + '/frontend/dist/assets/*')
os.system('cp -r /tmp/deploy_dist/dist/assets/* ' + t + '/frontend/dist/assets/')
os.system('cp /tmp/deploy_dist/dist/index.html ' + t + '/frontend/dist/index.html')
os.system('pkill -f "python3 app.py" 2>/dev/null')
time.sleep(2)
os.system('cd ' + t + ' . venv/bin/activate && PYTHONDONTWRITEBYTECODE=1 nohup python3 app.py --port 9119 > /tmp/flask.log 2>&1 &')
time.sleep(2)
os.system('ls -la ' + t + '/frontend/dist/assets/index-*.js')
os.system('curl -s http://localhost:9119/ | grep -oE "index-[^.]+"')
"""
    _, o, e = ssh.exec_command('python3 -c "' + script.replace('"', "'") + '"', timeout=120)
    out = o.read().decode()
    err = e.read().decode()
    print(out[:800])
    if err.strip():
        print('ERR:', err[:300])

def main():
    print('[1/3] Building tar...')
    data = build_tar()
    print('[2/3] Connecting...')
    ssh = connect()
    print('[3/3] Deploying...')
    deploy(ssh, data)
    ssh.close()
    print('Done!')

if __name__ == '__main__':
    main()
