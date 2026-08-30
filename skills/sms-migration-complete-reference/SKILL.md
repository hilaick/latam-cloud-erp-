---
name: sms-migration-complete-reference
title: SMS Migration Complete Reference — All Learned Patterns from Live Execution
description: Comprehensive SMS migration reference covering agent install, auth, disk sizing, SG rules, task creation, cross-region migration, and all error codes with fixes. Compiled from multiple live execution sessions.
tags: [sms, migration, execution, learned, cross-region, auth, sg-rules, disk-sizing, error-codes, best-practices]
created: 2026-08-30
updated: 2026-08-30
author: hermes-agent
---

## SMS Migration Complete Reference

### 1. Agent Installation (linuxmain)

#### Non-Interactive Install (bypass startup.sh)
```bash
# Kill old processes
pkill -f linuxmain; pkill -f startup.sh
screen -ls 2>/dev/null | grep sms_agent | cut -d. -f1 | xargs -I{} screen -S {} -X quit 2>/dev/null

# Write auth.cfg directly with TARGET MASTER AK/SK
cat > /tmp/SMS-Agent/agent/config/auth.cfg << 'EOF'
[proxy-config]
enable = false
proxy_addr = proxyip
proxy_port = proxyport
proxy_user =
use_password = false

[auth]
ak = <TARGET_MASTER_AK>
sk = <TARGET_MASTER_SK>
EOF

# Start agent directly (bypass interactive startup.sh)
cd /tmp/SMS-Agent/agent && nohup ./linuxmain <<< '<AK> <SK> sms.<source_region>.myhuaweicloud.com' > /dev/null 2>&1 &
```

#### Key Rules
- **AK/SK**: SMS agent MUST use TARGET account's MASTER AK/SK (full IAM across all regions)
- **startup.sh**: Interactive — printf piping doesn't work for SK (uses read -n 1 -s). Bypass with linuxmain direct.
- **auth.cfg**: Can be written directly — no need for interactive setup
- **Verification**: hcloud SMS ListServers --cli-region=<source_region> --cli-profile=erp-target (key is `source_servers` not `sources`)

### 2. Disk Size Matching (CRITICAL — prevents SMS.0806)

#### Root Cause
Target ECS provisioned with 40GB disk but source has 80GB. SMS.0806: "Failed to synchronize partition / to target server /mnt/vdb1" — target disk too small.

#### Prevention
1. Terraform MUST provision target disk_size = source disk_size (from raw_inventory root_volume.size)
2. Simulation preflight MUST verify target disk size >= source disk size (BLOCKING check)
3. hcloud ECS CreateServers MUST use --server.root_volume.size=<source_size_gb>

#### Fix (if already provisioned wrong)
```bash
# Resize EVS volume
hcloud EVS ResizeVolume --volume_id=<evs_id> --new_size=80 --cli-region=<target_region> --cli-profile=erp-target

# SSH to target and grow partition
ssh root@<eip>
lsblk  # find device name
growpart /dev/sda 1  # or /dev/vda 1
resize2fs /dev/sda1  # or /dev/vda1
df -h /  # verify
```

### 3. Security Group Rules (CRITICAL — prevents SMS.3805)

#### Requirements
- Target SG MUST have TCP ports 22, 8900, 8899 ingress open
- Port 22: SSH initialization port
- Port 8899: Control port for data transmission (cannot be modified)
- Port 8900: Block data transmission port (cannot be modified)
- SG MUST be associated with the target ECS (check with hcloud ECS ShowServer)

#### SG Rule Creation (use v2 API)
```bash
hcloud VPC CreateSecurityGroupRule/v2 \
  --security_group_rule.direction=ingress \
  --security_group_rule.ethertype=IPv4 \
  --security_group_rule.protocol=tcp \
  --security_group_rule.port_range_min=1 \
  --security_group_rule.port_range_max=65535 \
  --security_group_rule.remote_ip_prefix=0.0.0.0/0 \
  --security_group_id=<sg_id> \
  --cli-region=<target_region> --cli-profile=erp-target
```

#### Common Issue
- v3 API silently fails — use v2 API with `--security_group_rule.*` prefix
- ECS may not have SG associated even if SG exists — verify with ShowServer

### 4. Cross-Region Migration IP (CRITICAL — prevents SMS.3805)

#### Root Cause
SMS task used migration_ip=<private_ip> but source server is in a different region and can only reach target via public EIP.

#### Fix
- migration_ip MUST be the TARGET ECS EIP (public IP), NOT private IP
- use_public_ip=true flag must be set
- Port 22 must be open on the EIP (verify with: telnet <eip> 22)

#### EIP Resolution
```bash
hcloud EIP ListPublicips --cli-region=<target_region> --cli-profile=erp-target
# Match by device_id = target ECS ID
```

### 5. SMS Task Creation

#### hcloud API Profiles
- SMS API operations use TARGET profile (erp-target), NOT source (erp-source)
- ListServers response key: `source_servers` (NOT `sources`)
- SG rules: use `CreateSecurityGroupRule/v2` with `--security_group_rule.*` prefix

#### Migration Project (migproject)
- Source server's migproject MUST target the destination region
- Check: hcloud SMS ListMigprojects --cli-region=<source_region> --cli-profile=erp-target
- Update: hcloud SMS UpdateServerName --source_id=<id> --migprojectid=<correct_id>

#### Task Creation with Exact Disk Config
```bash
hcloud SMS CreateTask --cli-region=ap-southeast-3 --cli-profile=erp-target \
  --name=MigrationTask01 --type=MIGRATE_BLOCK --os_type=LINUX \
  --source_server.id=<sms_source_id> --target_server.vm_id=<target_ecs_id> \
  --use_public_ip=true --migration_ip=<EIP> \
  --start_target_server=true --auto_start=false \
  --target_server.disks.1.name=/dev/vda \
  --target_server.disks.1.disk_id=<EVS_volume_id> \
  --target_server.disks.1.device_use=BOOT \
  --target_server.disks.1.size=85899345920 \
  --target_server.disks.1.physical_volumes.1.name=/dev/vda1 \
  --target_server.disks.1.physical_volumes.1.device_use=OS \
  --target_server.disks.1.physical_volumes.1.mount_point=/ \
  --target_server.disks.1.physical_volumes.1.file_system=ext4
```

#### Task Operations
- Start: hcloud SMS UpdateTaskStatus --task_id=<id> --operation=start
- Restart (for failed tasks): hcloud SMS UpdateTaskStatus --task_id=<id> --operation=restart
- Delete: hcloud SMS DeleteTask --task_id=<id>
- Monitor: hcloud SMS ShowTask --task_id=<id>

### 6. Complete Error Code Reference

| Error | Cause | Fix |
|-------|-------|-----|
| SMS.0202 | AK/SK auth failed | Use TARGET MASTER AK/SK in auth.cfg, restart linuxmain |
| SMS.0306 | GET /v3/config failed | Check AK/SK length (AK=20, SK=40), network to SMS API |
| SMS.0515 | Disk info changed | UpdateDiskInfo, then recreate task |
| SMS.3803 | Public key verification failed | Target OS changed → restart SMS agent on source to clear cached host key |
| SMS.3805 | Connection timeout (port 22) | SG must have TCP 22+8900+8899 ingress, ECS associated with SG, migration_ip=EIP |
| SMS.0806 | Partition sync failed | Target disk too small → resize to match source, or provision with correct size |
| SMS.6602 | Invalid floating IP | use_public_ip=true + migration_ip=EIP (not private IP) |
| SMS.6103 | Wrong disk ID | Use EVS Volume ID from target ECS, not SMS disk ID |
| SMS.6517 | rsync not installed | Install rsync on source: apt-get install rsync |
| SMS.6519 | Cannot find disk | Use correct EVS Volume ID from os-extended-volumes:volumes_attached |
| SMS.7711 | Illegal task name | Use simple name like MigrationTask01 (no special chars) |
| SMS.7605 | Target in another task | Delete existing task first |
| SMS.1902 | I/O monitoring module failed | Check source server resources |

### 7. SSL_CONFIG Subtask
- 0-50%: Download cert from SMS (uses AK/SK to SMS API)
- 50-100%: Upload cert to target ECS (uses AK/SK to ECS API — needs cross-region IAM)
- Fails at 50%: AK/SK doesn't have ECS permissions in target region → use MASTER AK/SK

### 8. Migration Best Practices (from SMS User Manual)

#### Before Migration
- Install Agent on source server with TARGET account AK/SK
- Ensure source server OS is supported
- No antivirus software on source (may prevent Agent from starting)
- Back up target server data (disks will be formatted)
- Do NOT change OS or billing mode of target during migration
- Do NOT restart source server during Windows migration
- Do NOT restart SMS-Agent during Windows or Linux block-level migration

#### Network Configuration
- Public network: target server must have EIP bound
- Private network: Direct Connect, VPN, VPC peering, or Cloud Connect required
- SG ports: Windows=8899+8900+22, Linux file-level=22, Linux block-level=8900+22
- Only allow traffic from source server IP (not 0.0.0.0/0) for security

#### Migration Methods
- Linux block-level (MIGRATE_BLOCK): efficient, poor compatibility
- Linux file-level (MIGRATE_FILE): inefficient, excellent compatibility (default)
- Windows: block-level only (cannot be changed)

#### Disk and Partition Resizing
- Windows: system/boot partitions cannot be resized; can upsize but not downsize
- Linux LVM: can resize logical and physical volumes
- Linux block-level: can upsize but not downsize partitions
- Linux file-level: can upsize or downsize (min 1GB larger than used space)
- Btrfs partitions cannot be resized
- Swap partition is always migrated

#### Continuous Synchronization
- Disabled (default): auto-launches target after full replication
- Enabled: periodic incremental sync after full replication; must manually launch target

#### After Migration
- Adjust target server configurations based on service requirements
- Delete cutover/sync snapshots if no more syncs needed (stops billing)
- Delete migration task to clean up console
- Uninstall SMS-Agent from source server

### 9. Tool Chain Standard
MCP → hcloud → SDK → troubleshoot later
If MCP fails, immediately fallback to hcloud/SDK. Do NOT spend time troubleshooting MCP during execution.

### 10. Knowledge Tree Sources (4)
1. Live ERP server Hermes skills (registered)
2. Local Windows Hermes external knowledge (synced)
3. GitHub Repository external knowledge
4. Historical tasks / CognitiveLearningLog (learn from itself)
Execution results MUST feed back to CognitiveLearningLog.

### 11. CTS Operations (for audit/troubleshooting)
Key SMS operations recorded by CTS:
- RegisterSourceServer, listSourceServers, removeSource
- updateSourceDiskInfo, updateSource, findSourceServerById
- CreateTask, updateTaskStatus, UpdateTask, deleteTask
- getTask, getTasks, updateTaskProgressSpeed
- addTemplate, deleteTemplate, getTemplates
- getCertKey (SSL cert), getTaskPassPhrase
