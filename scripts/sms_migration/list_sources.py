import sys, io, os, json, urllib.request, ssl

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'services'))
from huawei_api_signer import sign_and_request

# Proxy configuration (set via env var if needed)
# export HUAWEI_PROXY=http://proxy.huawei.com:8080
proxy = os.environ.get('HUAWEI_PROXY')
if proxy:
    proxy_handler = urllib.request.ProxyHandler({'http': proxy, 'https': proxy})
    https_handler = urllib.request.HTTPSHandler(context=ssl.create_default_context())
    opener = urllib.request.build_opener(proxy_handler, https_handler)
    urllib.request.install_opener(opener)

# AK/SK must come from env vars
AK = os.environ.get('HUAWEI_AK')
SK = os.environ.get('HUAWEI_SK')
if not AK or not SK:
    print("ERROR: set HUAWEI_AK and HUAWEI_SK env vars", file=sys.stderr)
    sys.exit(1)

# Test: list SMS sources
print('=== LIST SOURCES ===')
try:
    resp = sign_and_request('GET', 'https://sms.ap-southeast-3.myhuaweicloud.com/v3/sources?limit=100&offset=0', AK, SK)
    print(json.dumps(resp, indent=2)[:3000])
except Exception as e:
    print(f'Error: {e}')
