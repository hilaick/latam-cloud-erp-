#!/usr/bin/env python3
"""
Add security group rules for SMS migration on target ECS.
Must be run BEFORE creating SMS migration tasks.

Official Huawei Cloud SMS port requirements:
  - Linux:   TCP 8900 (data) + TCP 22 (SSH)
  - Windows: TCP 8899 + TCP 8900 (data) + TCP 22 (SSH)

Usage: python3 add_sg_rules.py
"""
import sys, json, os
sys.path.insert(0, '/root/ulearning-migration/scripts')
from mgc_migrate import HcApiClient

AK = os.environ.get('SOURCE_AK', '')
SK = os.environ.get('SOURCE_SK', '')
TARGET_REGION = os.environ.get('TARGET_REGION', 'la-north-2')
TARGET_PROJECT_ID = os.environ.get('TARGET_PROJECT_ID', '2413708833e14626b37a8da5edf92d8f')

# Target ECS IDs to add SG rules for
TARGET_VM_IDS = os.environ.get('TARGET_VM_IDS', '').split(',')
# Source IPs to allow (optional — 0.0.0.0/0 if not specified)
SOURCE_IPS = os.environ.get('SOURCE_IPS', '0.0.0.0/0').split(',')

if not AK or not SK:
    print('ERROR: Set SOURCE_AK and SOURCE_SK environment variables')
    sys.exit(1)

client = HcApiClient(AK, SK)

for vm_id in TARGET_VM_IDS:
    vm_id = vm_id.strip()
    if not vm_id:
        continue
    print(f'\n=== SG rules for {vm_id[:12]}... ===')

    # Get target ECS security groups
    try:
        srv_rsp = client.request_json('GET', f'https://ecs.{TARGET_REGION}.myhuaweicloud.com/v1/{TARGET_PROJECT_ID}/cloudservers/{vm_id}')
        srv = srv_rsp.get('server', {})
        sg_ids = [sg.get('id') for sg in srv.get('security_groups', []) if sg.get('id')]
        print(f'  SG IDs: {sg_ids}')
    except Exception as e:
        print(f'  Error: {e}')
        continue

    for sg_id in sg_ids:
        for src_ip in SOURCE_IPS:
            src_ip = src_ip.strip()
            if not src_ip:
                continue
            # Required ports: 8900 (data), 22 (SSH), 8899 (Windows), all TCP, ICMP
            rules = [
                {'direction': 'ingress', 'protocol': 'tcp', 'port_range_min': 8900, 'port_range_max': 8900, 'remote_ip_prefix': src_ip, 'description': 'SMS migration data channel'},
                {'direction': 'ingress', 'protocol': 'tcp', 'port_range_min': 8899, 'port_range_max': 8899, 'remote_ip_prefix': src_ip, 'description': 'SMS Windows migration'},
                {'direction': 'ingress', 'protocol': 'tcp', 'port_range_min': 22, 'port_range_max': 22, 'remote_ip_prefix': src_ip, 'description': 'SSH for SMS agent'},
                {'direction': 'ingress', 'protocol': 'tcp', 'port_range_min': 1, 'port_range_max': 65535, 'remote_ip_prefix': src_ip, 'description': 'All TCP for SMS migration'},
                {'direction': 'ingress', 'protocol': 'icmp', 'remote_ip_prefix': src_ip, 'description': 'ICMP for SMS'},
                {'direction': 'egress', 'protocol': 'tcp', 'port_range_min': 1, 'port_range_max': 65535, 'remote_ip_prefix': src_ip, 'description': 'All TCP egress for SMS'},
                {'direction': 'egress', 'protocol': 'icmp', 'remote_ip_prefix': src_ip, 'description': 'ICMP egress for SMS'},
            ]
            for rule in rules:
                body = {'security_group_rule': {'security_group_id': sg_id, **rule}}
                try:
                    client.request_json('POST', f'https://vpc.{TARGET_REGION}.myhuaweicloud.com/v1/{TARGET_PROJECT_ID}/security-group-rules', body=body)
                    print(f'  Added: {rule["direction"]} {rule["protocol"]} {rule.get("port_range_min","")}-{rule.get("port_range_max","")} from {src_ip}')
                except Exception as e:
                    if 'already' in str(e).lower() or 'duplicate' in str(e).lower():
                        pass  # Rule already exists
                    else:
                        print(f'  Error: {str(e)[:150]}')

print('\n=== DONE ===')
