#!/usr/bin/env python3
"""Hermes Deploy — socket HTTP CONNECT tunnel + paramiko SSH + git pull + restart"""
import socket, paramiko, time, sys, os

PROXY_HOST = 'proxy.huawei.com'
PROXY_PORT = 8080
PROXY_USER = os.environ.get('PROXY_USER', 'h84423900')
PROXY_PASS = os.environ.get('PROXY_PASS', '')

TARGET_HOST = '159.138.148.45'
TARGET_PORT = 8443
SSH_USER = 'root'
SSH_KEY = os.path.expanduser('~/.ssh/id_ed25519')

DEPLOY_PATH = '/home/huawei-cloud/latam-cloud-erp-'

def proxy_tunnel():
    """Create HTTP CONNECT tunnel through corporate proxy"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(15)
    sock.connect((PROXY_HOST, PROXY_PORT))
    
    # HTTP CONNECT with Basic auth
    connect_req = f'CONNECT {TARGET_HOST}:{TARGET_PORT} HTTP/1.1\r\nHost: {TARGET_HOST}:{TARGET_PORT}\r\n'
    if PROXY_USER:
        import base64
        auth = base64.b64encode(f'{PROXY_USER}:{PROXY_PASS}'.encode()).decode()
        connect_req += f'Proxy-Authorization: Basic {auth}\r\n'
    connect_req += '\r\n'
    
    sock.sendall(connect_req.encode())
    response = sock.recv(4096)
    if b'200' not in response:
        raise Exception(f'Proxy tunnel failed: {response.decode(errors="replace")[:200]}')
    print('[1/4] Proxy tunnel established')
    return sock

def run_ssh(cmd):
    """Execute command via SSH and return stdout"""
    sock = proxy_tunnel()
    try:
        transport = paramiko.Transport(sock)
        transport.start_client()
        key = paramiko.Ed25519Key.from_private_key_file(SSH_KEY)
        transport.auth_publickey(SSH_USER, key)
        
        session = transport.open_session()
        session.exec_command(cmd)
        
        stdout = b''
        while True:
            chunk = session.recv(65536)
            if not chunk:
                break
            stdout += chunk
        
        exit_code = session.recv_exit_status()
        transport.close()
        return exit_code, stdout.decode(errors='replace')
    finally:
        try:
            sock.close()
        except:
            pass

def deploy():
    print('[2/4] Git fetch + reset on server...')
    cmd = f'cd {DEPLOY_PATH} && git fetch origin feature-migration-lifecycle-2 && git checkout feature-migration-lifecycle-2 && git reset --hard origin/feature-migration-lifecycle-2'
    code, out = run_ssh(cmd)
    print(f'  Exit: {code}')
    print(f'  {out[-300:]}')
    
    if code != 0:
        print('ERROR: git pull failed')
        return False
    
    print('[3/4] Restart Flask...')
    restart_cmd = f'cd {DEPLOY_PATH} && pkill -f "python.*app.py" 2>/dev/null; sleep 2; nohup venv/bin/python3 app.py > /tmp/flask.log 2>&1 &'
    code, out = run_ssh(restart_cmd)
    print(f'  Exit: {code}')
    
    print('[4/4] Verify HTTP via separate tunnel...')
    time.sleep(2)
    code, out = run_ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost:9119/api/projects')
    print(f'  /api/projects HTTP status: {out.strip()}')
    code2, out2 = run_ssh('curl -s http://localhost:9119/ | head -c 200')
    print(f'  Root page snippet: {out2[:150]}')
    
    print('\n✅ Deploy complete!')
    return True

if __name__ == '__main__':
    deploy()
