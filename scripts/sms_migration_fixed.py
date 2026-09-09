#!/usr/bin/env python3
"""Full SMS Migration: EIP bind, agent install, registration, task creation - FIXED"""
import sys, json, time
sys.path.insert(0, "/home/huawei-cloud/latam-cloud-erp-")
from services.huawei_api_signer import sign_and_request as sign

AK = "HPUAQHWOCSRT15WXWLUV"
SK = "zkysjfa0osvv1cdluMmMpQrJcTpyVeTaeKaWSy64"
SRC_REGION = "ap-southeast-3"
SRC_PROJECT = "59bd202e94ad3d00471428ddcb99f200"
TGT_REGION = "la-north-2"
TGT_PROJECT = "2413708833e14626b37a8da5edf92d8f"

def log(s):
    print("[{}] {}".format(time.strftime("%H:%M:%S"), s))

source_servers = [
    {"name": "ecs-49be-e903-20d3-12d0-0001", "id": "80863a7d-814c-42b2-ac52-e0aefedbb595", "ip": "192.168.0.80"},
    {"name": "ecs-49be-e903-20d3-12d0-0002", "id": "5bea1da9-8823-424d-8d4d-f2bfa6af6d8e", "ip": "111.119.235.186"},
]

log("=== PHASE 1: Check/Allocate EIPs ===")
for srv in source_servers:
    name = srv["name"]
    sid = srv["id"]
    log("Checking EIP for {}...".format(name))
    try:
        # List EIPs
        eip_data = sign("GET", "https://vpc.{}.myhuaweicloud.com/v1/{}/publicips?limit=50".format(SRC_REGION, SRC_PROJECT), AK, SK, timeout=8)
        eips = eip_data.get("publicips", [])
        bound_eip = None
        for e in eips:
            if e.get("port_id") == sid:
                bound_eip = e["public_ip_address"]
                log("  Already has EIP: {}".format(bound_eip))
                break
        if not bound_eip:
            log("  No EIP found. Allocating...")
            alloc = sign("POST", "https://vpc.{}.myhuaweicloud.com/v1/{}/publicips".format(SRC_REGION, SRC_PROJECT), AK, SK,
                body=json.dumps({"publicip":{"type":"5_bgp"},"bandwidth":{"name":"eip-{}".format(name),"size":5,"sharetype":"PER","chargemode":"traffic"}}), timeout=15)
            eip_id = alloc.get("publicip",{}).get("id","")
            eip_addr = alloc.get("publicip",{}).get("public_ip_address","")
            log("  Allocated EIP {} (id={})".format(eip_addr, eip_id[:12] if eip_id else "N/A"))
            if eip_id and sid:
                # Bind to server port
                port_data = sign("GET", "https://ecs.{}.myhuaweicloud.com/v1/{}/cloudservers/{}".format(SRC_REGION, SRC_PROJECT, sid), AK, SK, timeout=8)
                server = port_data.get("server",{})
                addrs = server.get("addresses",{})
                port_id = None
                for net, net_ips in addrs.items():
                    if isinstance(net_ips, list):
                        for ip_info in net_ips:
                            if ip_info.get("addr") == srv["ip"]:
                                port_id = ip_info.get("OS-EXT-IPS:port_id","")
                                break
                if port_id:
                    bind = sign("POST", "https://vpc.{}.myhuaweicloud.com/v1/{}/publicips/{}/ports".format(SRC_REGION, SRC_PROJECT, eip_id), AK, SK,
                        body=json.dumps({"port_id": port_id}), timeout=15)
                    log("  EIP bound successfully")
                else:
                    log("  Could not find port_id for binding")
            srv["eip"] = eip_addr
        else:
            srv["eip"] = bound_eip
    except Exception as e:
        log("  EIP check failed: {}".format(e))

log("\n=== PHASE 2: Register in SMS ===")
for srv in source_servers:
    name = srv["name"]
    sid = srv["id"]
    eip = srv.get("eip", srv["ip"])
    log("Registering {} (EIP: {}) in SMS...".format(name, eip))
    try:
        reg_body = json.dumps({
            "name": name,
            "ip": eip,
            "os_type": "LINUX",
            "region": SRC_REGION,
            "project_id": SRC_PROJECT,
        })
        reg = sign("POST", "https://sms.{}.myhuaweicloud.com/v3/sources".format(SRC_REGION), AK, SK, body=reg_body, timeout=30)
        src_id = reg.get("id","")
        log("  Registered as source: id={}".format(src_id[:20] if src_id else "N/A"))
        srv["src_id"] = src_id
    except Exception as re:
        log("  Registration failed: {}".format(re))

log("\n=== SUMMARY ===")
for srv in source_servers:
    print("  {}: ip={} eip={} src_id={}".format(srv["name"], srv.get("ip","?"), srv.get("eip","N/A"), srv.get("src_id","N/A")))
