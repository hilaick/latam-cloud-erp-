import sys, os, json, urllib.request, ssl

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'services'))
from huawei_api_signer import sign_and_request

# Proxy config
proxy = os.environ.get('HUAWEI_PROXY')
if proxy:
    proxy_handler = urllib.request.ProxyHandler({'http': proxy, 'https': proxy})
    https_handler = urllib.request.HTTPSHandler(context=ssl.create_default_context())
    opener = urllib.request.build_opener(proxy_handler, https_handler)
    urllib.request.install_opener(opener)

AK = os.environ.get('HUAWEI_AK')
SK = os.environ.get('HUAWEI_SK')
if not AK or not SK:
    print("ERROR: set HUAWEI_AK and HUAWEI_SK env vars", file=sys.stderr)
    sys.exit(1)

if len(sys.argv) < 2:
    print("Usage: check_task.py <task_id> [region]", file=sys.stderr)
    sys.exit(1)

task_id = sys.argv[1]
region = sys.argv[2] if len(sys.argv) > 2 else os.environ.get('HUAWEI_REGION', 'la-north-2')

print(f'=== CHECK TASK {task_id} ===')
try:
    resp = sign_and_request('GET', f'https://sms.{region}.myhuaweicloud.com/v3/migration-tasks/{task_id}', AK, SK)
    print(json.dumps(resp, indent=2))
except Exception as e:
    print(f'Error: {e}')
