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

# Required args
source_server_id = sys.argv[1]
target_server_id = sys.argv[2]
target_project_id = sys.argv[3]
target_region = sys.argv[4]
disk_id = int(sys.argv[5])

# Build task body
body = json.dumps({
    "type": "MIGRATE_FILE",
    "os_type": "LINUX",
    "source_server_id": source_server_id,
    "target_server_id": target_server_id,
    "project_id": target_project_id,
    "region_id": target_region,
    "migration_ip": "",
    "bandwidth_size": 0,
    "start_target_server": True,
    "use_public_ip": True,
    "syncing": False,
    "remain_windows_source": False,
    "enterprise_project_id": "",
    "description": "",
    "priority": 1,
    "flavor_map": {},
    "target_password": "",
    "migration_timeout": 84600,
    "disks": [
        {
            "name": "sda",
            "disk_id": disk_id,
            "device_name": "/dev/sda",
            "used_size": 0,
            "size": 0,
            "physical_volumes": [
                {
                    "device_name": "/dev/sda1",
                    "lv_config": [],
                    "file_system": "ext4",
                    "flag": "BOOT",
                    "size": 0
                }
            ],
            "os_disk": True
        }
    ]
}, ensure_ascii=False)

print('=== CREATE TASK ===')
try:
    resp = sign_and_request(
        'POST',
        f'https://sms.{target_region}.myhuaweicloud.com/v3/tasks',
        AK, SK,
        body=body,
        timeout=30
    )
    print(json.dumps(resp, indent=2))
    task_id = resp.get('task', {}).get('id')
    if task_id:
        print(f"\nTASK_ID={task_id}")
except Exception as e:
    print(f'Error: {e}')
