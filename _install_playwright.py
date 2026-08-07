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

cmds = [
    "cat /etc/os-release | head -5",
    "uname -m",
    "pip3 install playwright 2>&1 | tail -5",
]

for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(out)
    if err:
        print(f"ERR: {err[:300]}")

ssh.close()
sock.close()
