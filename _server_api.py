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

# Write a proper Python script on the server to:
# 1. Visit the calculator page to get cookies
# 2. Call the share API with those cookies
# 3. If share API fails, try productInfo with cart data from the share

script = '''
import urllib.request, http.cookiejar, json

# Create cookie jar
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# Step 1: Visit the calculator page
calc_url = "https://www.huaweicloud.com/intl/en-us/pricing/calculator.html"
print("Step 1: Visiting calculator page...")
try:
    resp = opener.open(calc_url, timeout=20)
    html = resp.read().decode()
    print(f"  Status: {resp.status}, HTML: {len(html)} bytes")
    print(f"  Cookies: {list(cj)}")
except Exception as e:
    print(f"  Error: {e}")

# Step 2: Call share detail API
share_id = "3fe7d1708f8711f1ba4403387fa007c1"
api_host = "https://portal-intl.huaweicloud.com"
share_paths = [
    "/api/cbc/global/rest/cbc/portalcalculatornodeservice/v4/api/share/detail",
    "/api/cbc/calculator/rest/cbc/portalcalculatornodeservice/v4/api/share/detail",
]

for path in share_paths:
    url = api_host + path
    print(f"\\nTrying: {url}")
    data = json.dumps({"shareListId": share_id}).encode()
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Accept', 'application/json')
    req.add_header('Referer', calc_url)
    req.add_header('Origin', 'https://www.huaweicloud.com')
    try:
        resp = opener.open(req, timeout=20)
        body = resp.read().decode()
        print(f"  Status: {resp.status}, Body: {body[:500]}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  HTTP {e.code}: {body[:500]}")
    except Exception as e:
        print(f"  Error: {e}")

print("\\nDone")
'''

stdin, stdout, stderr = ssh.exec_command(f'python3 -c \'{script}\'', timeout=60)
out = stdout.read().decode()
err = stderr.read().decode()
print(out)
if err:
    print(f'ERR: {err[:500]}')

ssh.close()
sock.close()
