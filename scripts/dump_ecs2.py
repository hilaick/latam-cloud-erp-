import sys, json
sys.path.insert(0, "/home/huawei-cloud/latam-cloud-erp-")
from services.huawei_api_signer import sign_and_request as sign
ak = "HPUAQHWOCSRT15WXWLUV"
sk = "zkysjfa0osvv1cdluMmMpQrJcTpyVeTaeKaWSy64"
region = "ap-southeast-3"
project_id = "59bd202e94ad3d00471428ddcb99f200"
url = f"https://ecs.{region}.myhuaweicloud.com/v1/{project_id}/cloudservers/detail?limit=10"
data = sign("GET", url, ak, sk, timeout=10)
servers = data.get("servers", [])
print(f"Found {len(servers)} servers")
for s in servers:
    name = s.get("name","?")
    sid = s.get("id","?")[:12]
    status = s.get("status","?")
    addrs = s.get("addresses", {})
    if addrs:
        ips = []
        for net, net_ips in addrs.items():
            for ip_info in net_ips if isinstance(net_ips, list) else [net_ips]:
                if isinstance(ip_info, dict) and ip_info.get("addr"):
                    ips.append(ip_info["addr"])
        print(f"{name} ({sid}): status={status}, ips={ips}")
    else:
        print(f"{name} ({sid}): status={status}, addresses=EMPTY")
    print(f"  Full: {json.dumps(s, indent=2)[:400]}")
