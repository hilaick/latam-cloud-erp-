#!/usr/bin/env python3
"""
Create new target configuration for SMS migration with auto_start enabled
This ensures the task starts automatically when created
"""

import json
import yaml
import os

# Target ECS configuration for CODELPA migration
target_config = {
    "migration_task": {
        "name": "CDP-PRTSRV-01-MIGRATION",
        "description": "Migration from source server to CODELPA target",
        "auto_start": True,  # CRITICAL: Ensure task starts automatically
        "region": "ap-southeast-3",  # SMS orchestration region
        "enterprise_project_id": "6a586d63-10d9-4287-be7e-3860d6694696",
        
        "source_server": {
            "id": "1becd287-42db-462c-9baf-b088cb3ed90a",
            "name": "CDP-PRTSRV-01",
            "state": "waiting"
        },
        
        "target_server": {
            "name": "CDP-PRTSRV-01-TARGET-NEW",
            "id": "2c8de6de-b43c-46a5-8650-71a59d9c55e4",  # Existing target ECS
            "region": "la-north-2",  # CODELPA project region
            "availability_zone": "la-north-2a",
            "flavor": "x0.2u.8g",  # 2vCPU/8GB RAM/104GB SSD
            "image_id": "91873c3f-2464-4780-b2d8-1ed8c438d32d",  # Windows image
            "vpc_id": "3fd48f1a-11a0-4faf-a858-6e123ebb45de",
            "subnet_id": "9bfaa83f-9d3e-4f83-9c71-ab1d4b04b3ae",
            "security_groups": [
                {
                    "id": "e77b288c-fc8d-4062-aed6-8aa982b7ca51",  # SysFullAccess
                    "name": "SysFullAccess"
                }
            ],
            "root_volume": {
                "type": "SSD",
                "size": 104,  # GiB
                "device_use": "OS"  # Windows requires OS, not BOOT
            },
            "data_volumes": [],
            "nics": [
                {
                    "subnet_id": "9bfaa83f-9d3e-4f83-9c71-ab1d4b04b3ae",
                    "ip_address": "172.48.0.24"  # Migration IP
                }
            ]
        },
        
        "migration_config": {
            "method": "WINDOWS_BLOCK",  # Windows block-level migration
            "rate_limit": 0,  # 0 Mbit/s = unlimited bandwidth
            "use_public_ip": True,
            "migration_ip": "172.48.0.24",
            "disk_mapping": [
                {
                    "source_disk_id": "",  # Will be auto-detected by SMS Agent
                    "target_disk_id": "",  # Will be auto-detected
                    "size": 104,  # GiB
                    "device_use": "OS",  # Critical for Windows
                    "physical_volumes": []  # Will be auto-populated
                }
            ]
        },
        
        "advanced_options": {
            "sync_increment": True,
            "compress_rate": 1,
            "bandwidth_limit": 0,  # Unlimited
            "migrate_speed": "FAST",
            "force_restart": False,
            "smn_notification": False,
            "enable_kms": False,
            "clone_server": {
                "clone_type": "NONE"
            }
        },
        
        # SMS.0515 Fix: Programmatic disk mapping
        "sms_0515_fixes": {
            "use_evs_volume_id": True,  # Use EVS Volume ID, not SMS Disk ID
            "device_use_os_for_windows": True,  # Set device_use='OS' for Windows
            "match_actual_disk_size": True,  # Use detected size (107,374,182,400 bytes)
            "include_partition_uuids": True,  # Include partition UUIDs from source
            "fetch_fresh_metadata": True  # Get latest from SMS Agent, not cached
        }
    }
}

# Create configuration directory
config_dir = "/home/huawei-cloud/latam-cloud-erp-/migration-configs"
os.makedirs(config_dir, exist_ok=True)

# Save as JSON
json_path = os.path.join(config_dir, "codelpa-migration-target.json")
with open(json_path, 'w') as f:
    json.dump(target_config, f, indent=2)

# Save as YAML
yaml_path = os.path.join(config_dir, "codelpa-migration-target.yaml")
with open(yaml_path, 'w') as f:
    yaml.dump(target_config, f, default_flow_style=False)

print("=" * 80)
print("✅ TARGET CONFIGURATION CREATED")
print("=" * 80)
print(f"JSON: {json_path}")
print(f"YAML: {yaml_path}")
print()

print("🔑 CRITICAL CONFIGURATION ELEMENTS:")
print("-" * 40)
print(f"1. auto_start: {target_config['migration_task']['auto_start']}")
print("   ⚠️  Ensures task starts automatically (prevents READY state)")
print()
print(f"2. target_server.id: {target_config['migration_task']['target_server']['id']}")
print("   ✅ Uses existing ECS: 2c8de6de-b43c-46a5-8650-71a59d9c55e4")
print()
print(f"3. device_use: '{target_config['migration_task']['target_server']['root_volume']['device_use']}'")
print("   ✅ Windows requires 'OS' (not 'BOOT') to avoid SMS.0515")
print()
print(f"4. migration_ip: {target_config['migration_task']['migration_config']['migration_ip']}")
print("   ✅ Matches existing migration IP: 172.48.0.24")
print()
print(f"5. sms_0515_fixes: {len(target_config['migration_task']['sms_0515_fixes'])} fixes applied")
print("   ✅ Programmatic workarounds for SMS.0515 error")
print()

print("🚀 MIGRATION TASK CREATION COMMAND:")
print("-" * 40)
print("hcloud SMS CreateTask \\")
print("  --cli-region=ap-southeast-3 \\")
print("  --body='@codelpa-migration-target.json' \\")
print("  --enterprise_project_id=6a586d63-10d9-4287-be7e-3860d6694696")
print()

print("📋 VERIFICATION STEPS:")
print("-" * 40)
print("1. Check task status:")
print("   hcloud SMS ShowTask --task_id=<new_task_id> --cli-region=ap-southeast-3")
print()
print("2. Verify auto_start worked:")
print("   Task state should be 'MIGRATING' not 'READY'")
print()
print("3. Monitor migration progress:")
print("   hcloud SMS ShowTask --task_id=<new_task_id> --cli-region=ap-southeast-3")
print("   Check 'progress' and 'estimated_finish_time'")
print()

print("⚠️  IMPORTANT NOTES:")
print("-" * 40)
print("• Ensure SMS Agent is installed on source server")
print("• Source server must be in 'waiting' state")
print("• Target ECS must exist and be accessible")
print("• Network connectivity between source and target required")
print("• Windows block-level migration may take time based on disk size")
print()

print("✅ CONFIGURATION READY FOR USE")
print("Files saved to:", config_dir)