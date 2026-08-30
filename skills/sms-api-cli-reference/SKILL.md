---
name: sms-api-cli-reference
title: SMS API & CLI Reference — hcloud Commands, CTS Operations, IAM Permissions
description: Complete hcloud CLI command reference for SMS operations, CTS trace names, and API parameters for task creation.
tags: [sms, migration, api, cli, hcloud, reference, cts]
created: 2026-08-30
updated: 2026-08-30
author: hermes-agent
---

## hcloud CLI Commands for SMS

### Source Server Management
```bash
# List registered source servers (key: source_servers, NOT sources)
hcloud SMS ListServers --cli-region=<source_region> --cli-profile=erp-target

# Show source server details (disks, physical_volumes, state)
hcloud SMS ShowServer --source_id=<id> --cli-region=<source_region> --cli-profile=erp-target

# Update source disk info (fixes SMS.0515)
hcloud SMS UpdateDiskInfo --source_id=<id> --cli-region=<source_region> --cli-profile=erp-target \
  --disks.1.name=/dev/vda --disks.1.device_use=BOOT --disks.1.size=85899345920 \
  --disks.1.os_disk=true \
  --disks.1.physical_volumes.1.name=/dev/vda1 --disks.1.physical_volumes.1.device_use=OS \
  --disks.1.physical_volumes.1.mount_point=/ --disks.1.physical_volumes.1.file_system=ext4

# Update source server name/migproject
hcloud SMS UpdateServerName --source_id=<id> --migprojectid=<migproject_id> --cli-region=<source_region> --cli-profile=erp-target

# Delete source server record
hcloud SMS DeleteServer --source_id=<id> --cli-region=<source_region> --cli-profile=erp-target
```

### Migration Project Management
```bash
# List migration projects
hcloud SMS ListMigprojects --cli-region=<source_region> --cli-profile=erp-target

# Show migration project details
hcloud SMS ShowMigproject --migproject_id=<id> --cli-region=<source_region> --cli-profile=erp-target

# Update migration project (e.g., use_public_ip)
hcloud SMS UpdateMigproject --migproject_id=<id> --cli-region=<source_region> --cli-profile=erp-target \
  --use_public_ip=false
```

### Task Management
```bash
# List all migration tasks
hcloud SMS ListTasks --cli-region=<source_region> --cli-profile=erp-target

# Show task details (state, progress, sub_tasks, error info)
hcloud SMS ShowTask --task_id=<id> --cli-region=<source_region> --cli-profile=erp-target

# Create migration task
hcloud SMS CreateTask --cli-region=ap-southeast-3 --cli-profile=erp-target \
  --name=MigrationTask01 \
  --project_id=<target_project_id> \
  --project_name=<target_region> \
  --region_id=<target_region> \
  --region_name=<target_region> \
  --type=MIGRATE_FILE \  # or MIGRATE_BLOCK
  --os_type=LINUX \
  --source_server.id=<sms_source_id> \
  --target_server.vm_id=<target_ecs_id> \
  --target_server.name=<target_ecs_name> \
  --use_public_ip=true \
  --migration_ip=<target_EIP> \
  --start_target_server=true \
  --auto_start=false \
  --syncing=true \
  --target_server.disks.1.name=/dev/vda \
  --target_server.disks.1.disk_id=<evs_volume_id> \
  --target_server.disks.1.device_use=BOOT \
  --target_server.disks.1.size=85899345920 \
  --target_server.disks.1.used_size=85898279936 \
  --target_server.disks.1.physical_volumes.1.name=/dev/vda1 \
  --target_server.disks.1.physical_volumes.1.device_use=OS \
  --target_server.disks.1.physical_volumes.1.mount_point=/ \
  --target_server.disks.1.physical_volumes.1.file_system=ext4 \
  --target_server.disks.1.physical_volumes.1.size=85898279936 \
  --target_server.disks.1.physical_volumes.1.used_size=5262282752 \
  --target_server.disks.1.physical_volumes.1.index=1

# Start task
hcloud SMS UpdateTaskStatus --task_id=<id> --operation=start --cli-region=<source_region> --cli-profile=erp-target

# Restart failed task (do NOT delete)
hcloud SMS UpdateTaskStatus --task_id=<id> --operation=restart --cli-region=<source_region> --cli-profile=erp-target

# Stop task
hcloud SMS UpdateTaskStatus --task_id=<id> --operation=stop --cli-region=<source_region> --cli-profile=erp-target

# Delete task
hcloud SMS DeleteTask --task_id=<id> --cli-region=<source_region> --cli-profile=erp-target

# Unlock target ECS (if stuck after failed task)
hcloud SMS UnlockTargetEcs --task_id=<id> --cli-region=<source_region> --cli-profile=erp-target
```

### Template Management
```bash
# List templates
hcloud SMS ListTemplates --cli-region=<region> --cli-profile=erp-target

# Create template
hcloud SMS CreateTemplate --cli-region=<region> --cli-profile=erp-target --name=<name>

# Delete template
hcloud SMS DeleteTemplate --template_id=<id> --cli-region=<region> --cli-profile=erp-target
```

## CreateTask Parameters Reference

| Parameter | Required | Description |
|-----------|----------|-------------|
| name | Yes | Task name (alphanumeric, no special chars) |
| project_id | Yes | Target project ID |
| project_name | Yes | Target project name (region name) |
| region_id | Yes | Target region ID |
| region_name | Yes | Target region name |
| type | Yes | MIGRATE_FILE or MIGRATE_BLOCK |
| os_type | Yes | LINUX or WINDOWS |
| source_server.id | Yes | SMS source server ID (from ListServers) |
| target_server.vm_id | Yes | Target ECS ID |
| target_server.name | Yes | Target ECS name |
| use_public_ip | No | true for cross-region (EIP), false for same VPC |
| migration_ip | Yes | Target EIP (public) or private IP |
| start_target_server | No | Start target after migration completes |
| auto_start | No | Auto-start task after creation |
| syncing | No | Enable continuous synchronization |
| target_server.disks.N.name | Yes | Disk name (must match source: /dev/vda) |
| target_server.disks.N.disk_id | Yes | EVS Volume ID from target ECS |
| target_server.disks.N.device_use | Yes | BOOT for system disk |
| target_server.disks.N.size | Yes | Disk size in bytes |
| target_server.disks.N.used_size | No | Used space in bytes |
| target_server.disks.N.physical_volumes.N.name | Yes | Partition name (/dev/vda1) |
| target_server.disks.N.physical_volumes.N.device_use | Yes | OS for root partition |
| target_server.disks.N.physical_volumes.N.mount_point | Yes | Mount point (/) |
| target_server.disks.N.physical_volumes.N.file_system | Yes | File system (ext4, xfs) |
| target_server.disks.N.physical_volumes.N.size | No | Partition size in bytes |
| target_server.disks.N.physical_volumes.N.used_size | No | Used space in bytes |
| target_server.disks.N.physical_volumes.N.index | No | Partition index |

## CTS Operations (Chapter 6)

### Source Server Operations
| Operation | Resource Type | Trace Name |
|-----------|---------------|------------|
| Register source server | SourceServer | RegisterSourceServer |
| Get source server overview | allSourceServer | getOverview |
| Delete source server | SourceServer | removeSource |
| Batch delete sources | SourceServer | removeSources |
| Update disk info | SourceServer | updateSourceDiskInfo |
| Update source server | SourceServer | updateSource |
| Query source by ID | SourceServer | findSourceServerById |
| Update migration status | SourceServerStatus | updateCopyState |
| List source servers | SourceServer | listSourceServers |
| List failed sources | ErrorInform | listSourceErrorInform |

### Task Operations
| Operation | Resource Type | Trace Name |
|-----------|---------------|------------|
| Query advanced options | TaskConfig | getTaskConfig |
| Configure advanced options | Task | updateSpecialConfigSetting |
| Query rate limiting | taskSpeedLimit | getSpeedLimit |
| Set rate limiting | taskSpeed | updateSpeedLimit |
| Upload logs | collectLog | task-collect-log-request |
| Create task | Task | CreateTask |
| Manage task status | Task | updateTaskStatus |
| Update task | Task | UpdateTask |
| Query cert passphrase | taskPassPhrase | getTaskPassPhrase |
| Delete task | Task | deleteTask |
| Batch delete tasks | Task | deleteTasks |
| Report progress | Task | updateTaskProgressSpeed |
| List tasks | Task | getTasks |
| Query task by ID | Task | getTask |

### Migration Project Operations
| Operation | Resource Type | Trace Name |
|-----------|---------------|------------|
| Create project | MigProject | addMigProject |
| List projects | MigProject | listMigProject |
| Query project | MigProject | getMigProject |
| Set default project | MigProject | setMigProjectDefault |
| Delete project | MigProject | removeMigProject |
| Update project | MigProject | updateMigProject |
| Update network info | Task | updateNetworkCheckInfo |

### Template Operations
| Operation | Resource Type | Trace Name |
|-----------|---------------|------------|
| Create template | Template | addTemplate |
| Delete template | Template | deleteTemplate |
| List templates | Templates | getTemplates |
| Query template | Template | getTemplate |
| Update template | Template | updateTemplate |
| Batch delete templates | Template | deleteTemplates |
| Query target password | TemplatePassword | getTargetPassword |

### Other Operations
| Operation | Resource Type | Trace Name |
|-----------|---------------|------------|
| Get agent config | getConfig | getConfig |
| Query API version | api | getApiInfo |
| List API versions | api | listApi |
| Get task commands | TaskCommand | getTaskCommand |
| Report command result | commandResult | processCommandResult |
| Get consistency results (batch) | ConsistencyCheckResult | GetBatchConsistencyCheckResult |
| Get consistency results | ConsistencyCheckResult | GetConsistencyCheckResult |
| Upload consistency results | ConsistencyCheckResult | UpdateConsistencyResult |
| Get SSL certificate | CertKey | getCertKey |
| Agree to privacy | PrivacyAgreement | CreatePrivacyAgreements |
| Check privacy agreement | PrivacyAgreement | GetPrivacyAgreement |

## Common hcloud Patterns

### Get Target ECS EVS Volume ID
```bash
hcloud ECS NovaShowServer --server_id=<ecs_id> --cli-region=<region> --cli-profile=erp-target | \
  python3 -c "import sys,json; d=json.load(sys.stdin); vols=d.get('server',d).get('os-extended-volumes:volumes_attached',[]); print(vols[0]['id'] if vols else '')"
```

### Get Target EIP
```bash
hcloud EIP ListPublicips --cli-region=<region> --cli-profile=erp-target | \
  python3 -c "import sys,json; d=json.load(sys.stdin); [print(f'{ip[\"public_ip_address\"]} -> {ip.get(\"vnic\",{}).get(\"device_id\",\"\")}') for ip in d.get('publicips',[])]"
```

### Get Source Disk Info
```bash
hcloud SMS ShowServer --source_id=<id> --cli-region=<source_region> --cli-profile=erp-target | \
  python3 -c "import sys,json; d=json.load(sys.stdin); [print(f'disk={dk[\"name\"]} size={dk[\"size\"]} use={dk[\"device_use\"]}') for dk in d.get('disks',[])]"
```

### Associate SG with ECS Port
```bash
# Get port_id from ECS
hcloud ECS NovaShowServer --server_id=<ecs_id> --cli-region=<region> --cli-profile=erp-target | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('server',d).get('addresses',{}).get(list(d.get('server',d).get('addresses',{}).keys())[0],[{}])[0].get('port_id',''))"

# Update port with SG
hcloud VPC UpdatePort --port_id=<port_id> --port.security_groups.1=<sg_id> --cli-region=<region> --cli-profile=erp-target
```
