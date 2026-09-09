#!/usr/bin/env python3
"""Full SMS Migration: EIP bind, agent install, registration, task creation"""
import sys, json, time
sys.path.insert(0, "/home/huawei-cloud/latam-cloud-erp-")
from services.huawei_api_signer import sign_and_request as sign

AK = "HPUAQHWOCSRT15WXWLUV"
SK = "zkysjfa0osvv1cdluMmMpQrJcTpyVeTaeKaWSy64"
SRC_REGION = "ap-southeast-3"
SRC_PROJECT = "59bd202e94ad3d00471428ddcb99f200"
TGT_REGION = "la-north-2"
TGT_PROJECT = "24137088bca64caa8ddf05aaf5dd8a0b"
TGT_VPC = ""  # Will discover
TGT_SUBNET = ""  # Will discover

def log(s): print(f"[{time.strftime('%H:%M:%S')}] {s}")

log("=== PHASE 1: Discover target VPC/subnet ===")
try:
    vpc_data = sign("GET", f"https://vpc.{TGT_REGION}.myhuaweicloud.com/v1/{TGT_PROJECT}/vpcs", AK, SK, timeout=8)
    vpcs = vpc_data.get("vpcs", [])
    if vpcs:
        TGT_VPC = vpcs[0]["id"]
        log(f"Target VPC: {vpcs[0].get("name","?")} = {TGT_VPC}")
        # Get subnet
        sub_data = sign("GET", f"https://vpc.{TGT_REGION}.myhuaweicloud.com/v1/{TGT_PROJECT}/subnets?vpc_id={TGT_VPC}", AK, SK, timeout=8)
        subs = sub_data.get("subnets", [])
        if subs:
            TGT_SUBNET = subs[0]["id"]
            log(f"Target Subnet: {subs[0].get("name","?")} = {TGT_SUBNET}")
except Exception as e: log(f"VPC discovery failed: {e}")

source_servers = [
    {"name": "ecs-49be-e903-20d3", "id": "7dd281b1-6ef2-4ad1-8cf9-33d8c5a4f66a", "ip": "192.168.0.16"},
    {"name": "ecs-49be-e903", "id": "d7ea60c8-4714-4968-a65a-d3b8eb00e906", "ip": "192.168.0.236"},
]

for srv in source_servers:
    name = srv["name"]
    sid = srv["id"]
    log(f"\n=== Processing {name} ({sid[:12]}...) ===")
    
    # Step 1: Check if server has EIP
    log("Checking EIP...")
    try:
        eip_data = sign("GET", f"https://vpc.{SRC_REGION}.myhuaweicloud.com/v1/{SRC_PROJECT}/publicips?limit=50", AK, SK, timeout=8)
        eips = eip_data.get("publicips", [])
        bound_eip = None
        for e in eips:
            if e.get("port_id") and e.get("port_id") == sid:
                bound_eip = e["public_ip_address"]
                log(f"  Already has EIP: {bound_eip}")
                break
        if not bound_eip:
            log("  No EIP found. Allocating...")
            alloc = sign("POST", f"https://vpc.{SRC_REGION}.myhuaweicloud.com/v1/{SRC_PROJECT}/publicips", AK, SK,
                body=json.dumps({"publicip":{"type":"5_bgp"},"bandwidth":{"name":f"eip-{name}","size":5,"sharetype":"PER","chargemode":"traffic"}}), timeout=15)
            eip_id = alloc.get("publicip",{}).get("id","")
            eip_addr = alloc.get("publicip",{}).get("public_ip_address","")
            log(f"  Allocated EIP {eip_addr} (id={eip_id[:12]}...)")
            if eip_id and sid:
                # Bind to server
                port_data = sign("GET", f"https://ecs.{SRC_REGION}.myhuaweicloud.com/v1/{SRC_PROJECT}/cloudservers/{sid}", AK, SK, timeout=8)
                server = port_data.get("server",{})
                port_id = None
                addrs = server.get("addresses",{})
                for net, net_ips in addrs.items():
                    if isinstance(net_ips, list):
                        for ip_info in net_ips:
                            if ip_info.get("addr") == srv["ip"]:
                                port_id = ip_info.get("OS-EXT-IPS:port_id","")
                                break
                if not port_id:
                    # Try getting port from ECS metadata
                    log("  Could not get port_id from server details, trying attachment...")
                try:
                    bind = sign("POST", f"https://vpc.{SRC_REGION}.myhuaweicloud.com/v1/{SRC_PROJECT}/publicips/{eip_id}/ports", AK, SK,
                        body=json.dumps({"port_id": port_id}) if port_id else json.dumps({"bandwidth_id": eip_id}), timeout=15)
                    log(f"  EIP bind result: {json.dumps(bind)[:200]}")
                except Exception as be:
                    log(f"  EIP bind failed: {be}")
            srv["eip"] = eip_addr
    except Exception as epe:
        log(f"  EIP check failed: {epe}")
    
    # Step 2: Register source server in SMS
    log("Registering source in SMS...")
    try:
        reg_body = json.dumps({
            "name": name,
            "ip": srv.get("eip", srv["ip"]),
            "os_type": "LINUX",
            "region": SRC_REGION,
            "project_id": SRC_PROJECT,
        })
        reg = sign("POST", f"https://sms.{SRC_REGION}.myhuaweicloud.com/v3/sources", AK, SK, body=reg_body, timeout=30)
        src_id = reg.get("id","")
        log(f"  Registered as source: id={src_id[:20] if src_id else 'N/A'}")
        srv["src_id"] = src_id
    except Exception as re:
        log(f"  Registration failed: {re}")

log("\n=== SUMMARY ===")
for srv in source_servers:
    print(f"  {srv["name"]}: ip={srv.get("ip","?")} eip={srv.get("eip","N/A")} src_id={srv.get("src_id","N/A")}")
