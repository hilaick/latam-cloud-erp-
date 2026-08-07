import socket, base64, paramiko, os

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(30)
sock.connect(('proxy.huawei.com', 8080))
auth = base64.b64encode(b'huawei\\h84423900:').decode()
sock.sendall(f'CONNECT 159.138.148.45:8443 HTTP/1.1\r\nHost: 159.138.148.45:8443\r\nProxy-Authorization: Basic {auth}\r\n\r\n'.encode())
resp = b''
while b'\r\n\r\n' not in resp:
    resp += sock.recv(1)

key = paramiko.Ed25519Key.from_private_key_file(os.path.expanduser('~/.ssh/id_ed25519'))
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('159.138.148.45', port=8443, username='root', pkey=key, sock=sock, timeout=30)

# Install playwright in the app's venv
stdin, stdout, stderr = ssh.exec_command(
    'cd /home/huawei-cloud/latam-cloud-erp- && venv/bin/pip install playwright 2>&1 | tail -10', 
    timeout=120
)
out = stdout.read().decode()
err = stderr.read().decode()
print("pip install playwright:")
print(out)
if err:
    print(f"ERR: {err[:500]}")

# Install chromium
stdin, stdout, stderr = ssh.exec_command(
    'cd /home/huawei-cloud/latam-cloud-erp- && venv/bin/python -m playwright install chromium 2>&1 | tail -10',
    timeout=180
)
out = stdout.read().decode()
err = stderr.read().decode()
print("\nplaywright install chromium:")
print(out)
if err:
    print(f"ERR: {err[:500]}")

ssh.close()
sock.close()
