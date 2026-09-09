import requests, json, sys, time, subprocess
sys.path.insert(0, "/home/huawei-cloud/latam-cloud-erp-")
from services.huawei_api_signer import sign_and_request as sign

AK = "HPUAQHWOCSRT15WXWLUV"
SK = "zkysjfa0osvv1cdluMmMpQrJcTpyVeTaeKaWSy64"
SRC_REGION = "ap-southeast-3"
SRC_PROJECT = "59bd202e94ad3d00471428ddcb99f200"
OS_PASS = "17c10af29A2"

servers = [
    {"name":"ecs-49be-e903-20d3","id":"7dd281b1-6ef2-4ad1-8cf9-33d8c5a4f66a","ip":"192.168.0.16"},
    {"name":"ecs-49be-e903","id":"d7ea60c8-4714-4968-a65a-d3b8eb00e906","ip":"192.168.0.236"},
]

# Step 1: Check EIPs
print("=== CHECKING EIPs ===")
for srv in servers:
    sid = srv["id"]
    try:
        eip_data = sign("GET", f"https://vpc.{SRC_REGION}.myhuaweicloud.com/v1/{SRC_PROJECT}/publicips?limit=100",
            AK, SK, headers={"X-Project-Id": SRC_PROJECT}, timeout=10)
        for e in eip_data.get("publicips",[]):
            e_port = str(e.get("port_id",""))
            if sid[:12] in e_port or sid in e_port:
                srv["public_ip"] = e.get("public_ip_address")
                srv["eip_id"] = e.get("id")
                print(f"  {srv['name']}: EIP={srv['public_ip']} (found)")
                break
    except Exception as epe:
        print(f"  EIP check for {srv['name']}: {epe}")

    if not srv.get("public_ip"):
        print(f"  {srv['name']}: NO EIP found - server details: {srv}")

# Step 2: SSH and install SMS agent
print("\n=== INSTALLING SMS AGENT ===")
for srv in servers:
    pub_ip = srv.get("public_ip")
    if pub_ip:
        print(f"\n  SSH into {srv['name']} @ {pub_ip}...")
        cmd = ' '.join([
            'sshpass', '-p', OS_PASS,
            'ssh', '-o', 'StrictHostKeyChecking=no',
            '-o', 'ConnectTimeout=10',
            f'root@{pub_ip}',
            '"wget -q -N https://sms.ap-southeast-3.myhuaweicloud.com/sms_agent/sms_agent_linux.tar.gz && tar -zxf sms_agent_linux.tar.gz 2>/dev/null; cd SMS-Agent 2>/dev/null && ./install.sh --ak ' + AK + ' --sk ' + SK + ' --quiet 2>&1; ps aux | grep SMS-Agent | head -2"'
        ])
        try:
            r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
            print(f"  Result: exit={r.returncode}")
            print(f"  stdout: {r.stdout[:500]}")
            if r.stderr: print(f"  stderr: {r.stderr[:300]}")
        except Exception as sshe:
            print(f"  SSH FAILED: {sshe}")
    else:
        print(f"  {srv['name']}: No public IP - SKIP SSH")

