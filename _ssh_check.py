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
    "echo === disk === && df -h / | tail -1",
    "echo === memory === && free -m | grep Mem",
    "echo === python === && python3 --version",
    "echo === node === && (node --version 2>/dev/null || echo 'no node')",
    "echo === chromium === && (which chromium-browser google-chrome chromium 2>/dev/null || echo 'no chromium')",
    "echo === network === && curl -s --max-time 5 https://www.huaweicloud.com -o /dev/null -w '%{http_code}' && echo ' -> huaweicloud.com OK'",
    "echo === pip === && pip3 list 2>/dev/null | grep -iE 'playwright|selenium|requests|bs4'",
]

for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    if out:
        print(out)

ssh.close()
sock.close()
