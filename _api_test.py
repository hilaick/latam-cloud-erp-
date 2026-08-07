import socket, base64, paramiko, os, json

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

share_id = "3fe7d1708f8711f1ba4403387fa007c1"

# Try calling the API from the server (no corp proxy)
stdin, stdout, stderr = ssh.exec_command(f'''
curl -v --max-time 15 "https://www.huaweicloud.com/api/calculator/rest/cbc/portalcalculatornodeservice/v4/api/share/detail" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Referer: https://www.huaweicloud.com/intl/en-us/pricing/calculator.html" \
  -H "Origin: https://www.huaweicloud.com" \
  -d '{{"shareListId":"{share_id}"}}' 2>&1 | tail -30
''', timeout=20)
out = stdout.read().decode()
err = stderr.read().decode()
print("=== API test from server ===\n" + out[:2000])
if err:
    print("stderr: " + err[:500])

# Also try the portal-intl domain from server
stdin, stdout, stderr = ssh.exec_command(f'''
curl -v --max-time 15 "https://portal-intl.huaweicloud.com/api/calculator/rest/cbc/portalcalculatornodeservice/v4/api/share/detail" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{{"shareListId":"{share_id}"}}' 2>&1 | tail -30
''', timeout=20)
out = stdout.read().decode()
print("\n=== portal-intl test ===\n" + out[:2000])

ssh.close()
sock.close()
