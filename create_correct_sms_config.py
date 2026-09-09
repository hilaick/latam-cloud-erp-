#!/usr/bin/env python3
"""
Create correct SMS CreateTask configuration based on API documentation
"""

import json
import os

# Correct SMS CreateTask configuration based on API
sms_task_config = {
    "name": "CDP-PRTSRV-01-MIGRATION",
    "project_id": "c5354feed62946958b9554cffb70a13c",
    "project_name": "CODELPA",
    "region_id": "ap-southeast-3",
    "region_name": "ap-southeast-3",
    "source_server": {
        "id": "1becd287-42db-462c-9baf-b088cb3ed90a"
    },
    "target_server": {
        "name": "CDP-PRTSRV-01-TARGET-NEW",
        "vm_id": "2c8de6de-b43c-46a5-8650-71a59d9c55e4"
    },
    "type": "MIGRATE_BLOCK",
    "auto_start": True,
    "os_type": "WINDOWS",
    "migration_ip": "172.48.0.24",
    "exist_server": True,
    "enterprise_project_id": "6a586d63-10d9-4287-be7e-3860d6694696",
    
    # Additional parameters for Windows block migration
    "migration_method": "WINDOWS_BLOCK",
    "rate_limit": 0,
    "use_public_ip": True,
    
    # Disk configuration (critical for SMS.0515)
    "disks": [
        {
            "name": "System Disk",
            "device_use": "OS",  # Windows requires OS, not BOOT
            "size": 104,
            "physical_volumes": [
                {
                    "device_type": "disk",
                    "file_system": "NTFS",
                    "index": 0,
                    "mount_point": "C:",
                    "size": 104,
                    "used_size": 0,
                    "uuid": ""  # Will be auto-populated by SMS Agent
                }
            ]
        }
    ],
    
    # Network configuration
    "nics": [
        {
            "subnet_id": "9bfaa83f-9d3e-4f83-9c71-ab1d4b04b3ae",
            "ip_address": "172.48.0.24",
            "security_groups": [
                {
                    "id": "e77b288c-fc8d-4062-aed6-8aa982b7ca51"
                }
            ]
        }
    ],
    
    # Server configuration
    "server": {
        "flavor": "x0.2u.8g",
        "image_id": "91873c3f-2464-4780-b2d8-1ed8c438d32d",
        "vpc_id": "3fd48f1a-11a0-4faf-a858-6e123ebb45de",
        "availability_zone": "la-north-2a"
    }
}

# Create configuration directory
config_dir = "/home/huawei-cloud/latam-cloud-erp-/migration-configs"
os.makedirs(config_dir, exist_ok=True)

# Save as JSON
json_path = os.path.join(config_dir, "sms-create-task-correct.json")
with open(json_path, 'w') as f:
    json.dump(sms_task_config, f, indent=2)

print("=" * 80)
print("✅ CORRECT SMS CreateTask CONFIGURATION")
print("=" * 80)
print(f"File: {json_path}")
print()

print("🔑 CRITICAL PARAMETERS:")
print("-" * 40)
print(f"1. auto_start: {sms_task_config['auto_start']}")
print("   ⚠️  Must be true to start migration immediately")
print()
print(f"2. target_server.vm_id: {sms_task_config['target_server']['vm_id']}")
print("   ✅ Uses existing ECS ID")
print()
print(f"3. type: {sms_task_config['type']}")
print("   ✅ MIGRATE_BLOCK for Windows block-level migration")
print()
print(f"4. os_type: {sms_task_config['os_type']}")
print("   ✅ WINDOWS for Windows Server")
print()
print(f"5. disks[0].device_use: {sms_task_config['disks'][0]['device_use']}")
print("   ✅ 'OS' not 'BOOT' (critical for Windows)")
print()

print("🚀 CREATE TASK COMMAND:")
print("-" * 40)
print("hcloud SMS CreateTask \\")
print("  --cli-region=ap-southeast-3 \\")
print("  --name='CDP-PRTSRV-01-MIGRATION' \\")
print("  --project_id='c5354feed62946958b9554cffb70a13c' \\")
print("  --project_name='CODELPA' \\")
print("  --region_id='ap-southeast-3' \\")
print("  --region_name='ap-southeast-3' \\")
print("  --source_server.id='1becd287-42db-462c-9baf-b088cb3ed90a' \\")
print("  --target_server.name='CDP-PRTSRV-01-TARGET-NEW' \\")
print("  --target_server.vm_id='2c8de6de-b43c-46a5-8650-71a59d9c55e4' \\")
print("  --type='MIGRATE_BLOCK' \\")
print("  --auto_start=true \\")
print("  --os_type='WINDOWS' \\")
print("  --migration_ip='172.48.0.24' \\")
print("  --exist_server=true")
print()

print("📋 OR USE JSON FILE:")
print("-" * 40)
print("hcloud SMS CreateTask \\")
print(f"  --cli-region=ap-southeast-3 \\")
print(f"  --body='@{json_path}'")
print()

print("⚠️  AUTHENTICATION REQUIREMENTS:")
print("-" * 40)
print("• AK/SK must have SMS permissions in ap-southeast-3")
print("• Must be same credentials that created original task")
print("• Or IAM user token with enterprise-wide access")
print("• Console works because of broader IAM permissions")
print()

print("✅ CONFIGURATION READY")
print("Use this with proper authentication credentials")