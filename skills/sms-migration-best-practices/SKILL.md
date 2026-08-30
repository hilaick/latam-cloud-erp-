---
name: sms-migration-best-practices
title: SMS Migration Management & Best Practices — From User Manual
description: Complete migration lifecycle, methods, disk resizing, rate limiting, templates, and constraints from SMS User Guide Issue 33.
tags: [sms, migration, best-practices, management, reference]
created: 2026-08-30
updated: 2026-08-30
author: hermes-agent
---

## Migration Lifecycle

### 1. Configure Target Server (Chapter 3.2)
Prerequisites: Source server Connected, Migration Feasibility Check stage, Pending target configuration status.

Configuration steps:
1. **Basic Settings**: Target region, port (22 default, 8899 control, 8900 block data), network type (Public/Private), IP version (IPv4/IPv6)
2. **Specifications**: Use existing ECS or Create new (SMS auto-recommends specs)
3. **Resource Limits**: CPU limit, memory limit, disk throughput limit, migration rate limit (0-1000 Mbit/s), overrate threshold (%)
4. **Migration Drill**: Optional pre-migration feasibility check (5-15 min, low cost)
5. **Migration Parameters**: Start target, migration method, concurrency, continuous sync, data consistency, disk resizing
6. **Save & Start**: Save and Start (immediately) or Save (start later)

### 2. Full Replication (Chapter 3.3)
- Copies ALL data from source to target
- Speed = min(source outbound bandwidth, target inbound bandwidth)
- Target server locked during replication
- Do NOT: restart source (Windows), restart agent (Windows/block-level), change target OS/billing, modify target disks

### 3. Incremental Sync (Chapter 3.4)
- Only when migration status = Finished
- Transfers new/modified data from source to target
- Overwrites target data with source data
- Excluded paths (not synced): /proc, /sys, /lost+found, /tmp/_MEI*, /var/lib/ntp/proc, /etc/fstab, /etc/X11, /root/initrd_bak, /lib/modules, /boot/grub2

### 4. Launch Target (Chapter 4.3)
- If continuous sync enabled: manually launch target to stop sync and complete migration
- If continuous sync disabled: system auto-launches after full replication

### 5. Cleanup (Chapter 3.7-3.8)
- Delete cutover/sync snapshots (stops billing)
- Delete migration task (cleans console, does NOT delete source/target servers)
- Uninstall SMS-Agent from source

## Migration Methods

| Method | Type | Efficiency | Compatibility | Default |
|--------|------|-----------|---------------|---------|
| Linux Block-level | MIGRATE_BLOCK | High | Poor | No |
| Linux File-level | MIGRATE_FILE | Low | Excellent | Yes |
| Windows Block-level | MIGRATE_BLOCK | High | N/A | Yes (only option) |

- Block-level: migrates by block, efficient but poor compatibility
- File-level: migrates by file, inefficient but excellent compatibility
- Windows: block-level only, cannot be changed

## Disk and Partition Resizing

### Windows
- System/boot partitions CANNOT be resized
- Can upsize partitions, CANNOT downsize
- If total partition size > disk size → expand disk capacity
- If total partition size < disk size → can downsize disk

### Linux
- LVM: can resize logical and physical volumes
- Non-LVM: skip volume group configuration
- Block-level: can upsize, CANNOT downsize partitions
- File-level: can upsize AND downsize (min 1GB larger than used space)
- Btrfs: CANNOT be resized
- Swap partition: always migrated, cannot be changed
- Can choose to migrate all or none volume groups

## Migration Rate Limiting

### Requirements (Linux)
- `tc` command must be installed
- `cbq` or `htb` kernel module must be loaded
- Check: `tc` (returns function list), `lsmod | grep sch_cbq`, `lsmod | grep sch_htb`

### Configuration
- Rate limit: integer 0-1000 Mbit/s
- 0 or empty = unrestricted
- Actual rate = min(configured limit, network speed)
- Overrate threshold: % above limit before auto-pause
- Not available for: IPv6 migration, missing tc/cbq/htb, agent < 24.9.0

## Data Consistency Verification

- **Disabled** (default): no verification after full replication
- **Enabled**: auto-verify after full replication (file size + modification time)
- **Hash Verification**: generate and compare hash per file (high CPU/disk overhead)
- **Verification Scope**: exclude paths (max 30, comma-separated), include paths
- **Default excluded**: /bin, /boot, /dev, /home, /etc, /lib, /media, /proc, /sbin, /selinux, /sys, /usr, /var, /run, /tmp
- **Btrfs**: consistency verification NOT supported

## Template Management

### Migration Templates (Chapter 5.2)
Parameters: Name, Description, Region/Project, Migration Method (block/file), Network (public/private), Migration Rate Limit, Target Server (existing/new), Continuous Sync, Start Target Upon Launch, Network Performance Measurement

### Server Templates (Chapter 5.3)
Parameters: Template Name, Region/Project, AZ, Disk type, VPC (create new uses source IP range rules), Subnet, Security Group

### VPC Auto-Creation Rules
- Source 192.168.X.X → VPC 192.168.0.0/16
- Source 172.16.X.X → VPC 172.16.0.0/12
- Source 10.X.X.X → VPC 10.0.0.0/8

## Security Group Rules

### Required Ports
| OS | Migration Type | Ports Required |
|----|---------------|----------------|
| Windows | Block-level | 22, 8899, 8900 |
| Linux | File-level | 22 |
| Linux | Block-level | 22, 8900 |

### Port Purposes
- **Port 22**: SSH initialization port (can be modified in some regions)
- **Port 8899**: Control port for data transmission (CANNOT be modified)
- **Port 8900**: Block data transmission port (CANNOT be modified)

### Security Best Practices
- Only allow traffic from source server IP (not 0.0.0.0/0)
- Agent image auto-uninstalled after migration
- Password-based SSH disabled during migration (certificate/key only)
- Use latest stable rsync with security hardening

## Constraints and Limitations

### During Migration
- Do NOT restart source server (Windows)
- Do NOT restart SMS-Agent (Windows or Linux block-level)
- Do NOT change target OS
- Do NOT change target billing mode to Yearly/Monthly
- Do NOT operate on target OS or disks
- Target server disks WILL be formatted and re-partitioned

### Temporary Resources
- Temporary pay-per-use disk created during migration (auto-deleted after)
- If task manually deleted before completion: manually delete temporary disk
- Cutover and sync snapshots retained (incur charges in some regions)

### Post-Migration
- Adjust target server configurations based on service requirements
- Delete snapshots if no more syncs needed
- Delete migration task to clean console
- Uninstall SMS-Agent from source

## IAM Permissions Required

### System-Defined Policies
- SMS FullAccess
- OBS OperateAccess
- ECS FullAccess
- VPC FullAccess
- IMS FullAccess
- EVS FullAccess
- EIP FullAccess
- EVS KMSAccess (if disk encryption needed)

### Custom Policy Actions (Project-Level)
vpc:securityGroups:create, vpc:securityGroupRules:create, vpc:vpcs:create, vpc:publicIps:create, vpc:subnets:create, ecs:cloudServers:create, ecs:cloudServers:attach, ecs:cloudServers:detachVolume, ecs:cloudServers:start, ecs:cloudServers:stop, ecs:cloudServers:delete, evs:volumes:use, evs:volumes:create, evs:volumes:update, evs:volumes:delete, evs:volumes:attach, evs:volumes:detach, kms:cmk:list, kms:cmk:get, kms:dek:create, kms:dek:decrypt

### Custom Policy Actions (Global)
sms:server:registerServer, sms:server:migrationServer, sms:server:queryServer, iam:roles:listRoles, iam:agencies:listAgencies
