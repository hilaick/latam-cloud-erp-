---
name: sms-error-codes-troubleshooting
title: SMS Error Codes & Troubleshooting — Complete Reference from User Manual
description: All SMS error codes with causes, solutions, and prevention. Compiled from SMS User Guide Issue 33 (2026-08-05) plus live execution findings.
tags: [sms, migration, error-codes, troubleshooting, reference]
created: 2026-08-30
updated: 2026-08-30
author: hermes-agent
---

## SMS Error Codes — Complete Reference

### Error Code Table

| Error | Description | Root Cause | Fix |
|-------|-------------|------------|-----|
| SMS.0202 | AK/SK Authentication Failed | SMS agent has wrong AK/SK or lacks IAM permissions | Use TARGET account MASTER AK/SK in auth.cfg, restart linuxmain |
| SMS.0306 | GET /v3/config failed | Agent can't reach SMS API | Verify AK length=20, SK length=40, network to sms.region.myhuaweicloud.com |
| SMS.0515 | Source disk info changed | Disk info mismatch between source and SMS record | hcloud SMS UpdateDiskInfo, then recreate task |
| SMS.0806 | Failed to synchronize partition | Target disk too small or disk name mismatch (/dev/sda vs /dev/vda) | Provision target disk = source size, use correct /dev/vda disk name |
| SMS.1107 | Instance could not be found | Target ECS deleted or wrong ID | Verify ECS exists with hcloud ECS ShowServer |
| SMS.1414 | Migration module stopped abnormally | Agent crash or resource exhaustion | Restart SMS agent, check source server CPU/memory |
| SMS.1902 | Failed to start I/O monitoring module | Source server missing kernel modules | Check tc/cbq/htb modules on Linux source |
| SMS.3803 | Public key verification failed on target | Target OS changed (host keys differ) | Restart SMS agent on source to clear cached host keys, do NOT change target OS |
| SMS.3805 | Connection to target server timed out | SG not attached, port 22 closed, or migration_ip is private IP | Attach SG with TCP 22+8900+8899 ingress, use EIP as migration_ip |
| SMS.6517 | rsync not installed on source | Missing rsync binary | apt-get install rsync (Linux) |
| SMS.6519 | Cannot find disk | Wrong EVS Volume ID in task config | Use os-extended-volumes:volumes_attached[0].id from ECS ShowServer |
| SMS.6520 | Source server not available | Source in unavailable/error state | UpdateDiskInfo, restart SMS agent, wait for state=waiting |
| SMS.6602 | Invalid floating IP | migration_ip set to private IP | Set use_public_ip=true and migration_ip=EIP |
| SMS.6103 | Wrong disk ID type | Using SMS disk ID instead of EVS Volume ID | Use EVS Volume ID from target ECS |
| SMS.7711 | Illegal task name | Special characters in task name | Use simple alphanumeric name (e.g., MigrationTask01) |
| SMS.7605 | Target server already in another task | Existing task holds the target | Delete existing task first |

### Troubleshooting by Phase

#### Agent Installation (Chapter 2)
- **SMS.0202**: AK/SK auth failed → Use TARGET MASTER AK/SK, not source account
- **SMS.1902**: I/O monitoring failed → Install tc/cbq/htb kernel modules
- **Source not in SMS console**: Agent didn't register → Check auth.cfg, restart linuxmain, verify network to SMS API

#### Target Configuration (Chapter 3.2)
- **SG port errors**: Windows needs 8899+8900+22, Linux file-level needs 22, Linux block-level needs 8900+22
- **Disk size mismatch**: Target disk must be >= source disk size
- **Network type**: Public requires EIP, Private requires Direct Connect/VPN/VPC peering

#### Full Replication (Chapter 3.3)
- **Do NOT restart source server** during Windows migration
- **Do NOT restart SMS-Agent** during Windows or Linux block-level migration
- **Do NOT change OS or billing mode** of target during migration
- **Temporary disk**: SMS creates a pay-per-use disk during migration — auto-deleted after completion
- **SMS.0806**: Partition sync failed → Target disk too small, resize or reprovision
- **SMS.1414**: Module stopped → Restart agent, check resources

#### Incremental Sync (Chapter 3.4)
- **SMS.0806**: Same as full replication — disk size issue
- **SMS.1414**: Module stopped → Restart agent
- **Excluded paths**: /proc, /sys, /lost+found, /tmp, /etc/fstab, /etc/X11, /lib/modules, /boot/grub2 — not synced to preserve target compatibility

#### ATTACH_AGENT_IMAGE (Live Execution Finding)
- Fails at 80% consistently → Check EVS quota, AZ capacity, ECS flavor disk attachment limits
- The temporary agent image disk creation may fail if account has too many EVS volumes
- Try MIGRATE_FILE instead of MIGRATE_BLOCK (different agent image requirements)
- Ensure target ECS is stopped before task starts (SMS manages this automatically)

### Prevention Checklist
1. ✅ Target disk size = source disk size (from raw_inventory)
2. ✅ SG associated with target ECS (TCP 22+8900+8899 ingress)
3. ✅ migration_ip = EIP (not private IP)
4. ✅ AK/SK = TARGET MASTER credentials
5. ✅ Disk name = /dev/vda (matching source, NOT /dev/sda)
6. ✅ Source state = waiting (not error/unavailable)
7. ✅ rsync installed on source (for file-level migration)
8. ✅ No OS changes on target during migration
