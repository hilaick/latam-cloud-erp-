# SQL Server (Windows, 3 TB C:) → Huawei ECS (5 TB target)
## Meeting One-Pager — confirmed paths only

## Summary

- **Can't shrink C:**, can't use customer image (1 TiB cap), can't export to OBS.
- SMS itself has **no 1 TB limit on Windows** (official). The 1 TB ceiling is the **target ECS boot disk**.
- **Workable path:** SQL backup to a data disk on source → attach data disk to a **carrier Windows box** → SMS-migrate both the carrier's small OS (→ 1 TB boot) and the backup disk (→ 5 TB data EVS) → launch target → install SQL → RESTORE.

## Constraint map

| Constraint | Source | Effect |
|---|---|---|
| System boot EVS ≤ 1 TB | Huawei EVS | 5 TB can't be a boot disk |
| Image import >1 TiB | IMS service | Customer image route blocked |
| No OBS | Customer policy | Can't stage .bak in object storage |
| Can't shrink C: | Customer ops | Source OS stays 3 TB |
| Can't encrypt volume | SMS constraint (BitLocker/EFS blocked) | Keep volume plain; use SQL-level AES-256 encryption |

## Options table

| # | Path | How SQL moves to 5 TB EVS | Downtime | SQL on target | Verdict |
|---|---|---|---|---|---|
| **A** | **SQL backup → data disk → SMS carrier → RESTORE** | Dump databases to separate data disk; detach → attach to carrier box → SMS the backup disk to 5 TB EVS → fresh SQL install + restore | **~5–7 h** (stop SQL → final dump → delta sync → launch → install SQL → restore) | Fresh SQL instance, same databases, AES-256 encrypted .bak | ✅ **Recommended** |
| **B** | **SMS carrier (no backup)** | Detach source C: → mount on carrier → SMS raw volume to 5 TB EVS → FOR ATTACH | **~2 days** (source offline entire SMS sync) | Fresh SQL needed; FOR ATTACH works but db files must be consistent | ⚠️ Only if dump impossible |
| **C** | **DRS → RDS for SQL** | CDC replication from source SQL to RDS; no carrier, no SMS, no disk handling | **Minutes** | Managed RDS — not self-managed ECS | ✅ Best if RDS is acceptable |

**The 3 TB system disk never touches the target in any option.** It either stays on source (A, C) or moves as raw data to a data EVS (B).

## Option A — detailed timeline

| Phase | Step | Who | Duration | Source state |
|---|---|---|---|---|
| Pre-cutover | Attach empty data disk to source SQL server | Customer | 15 min | Running |
| Pre-cutover | FULL BACKUP of all databases + AES-256 encryption | DBA | 2–4 h | Running |
| Pre-cutover | Detach backup disk → attach to carrier Windows box | Customer | 15 min | Running |
| Pre-cutover | SMS initial sync: carrier C:→1 TB boot; backup disk→5 TB data EVS | You | 26–30 h | **Running** |
| **Cutover** | STOP SQL Server on source | DBA | 1 min | ⛔ **Down** |
| **Cutover** | Tail-log backup to the backup disk (still on carrier) | DBA | 5–15 min | ⛔ Down |
| **Cutover** | Final SMS delta sync (only new .bak tail) | You | 15–30 min | ⛔ Down |
| **Cutover** | Launch target ECS (boots carrier OS) | You | 5 min | ⛔ Down |
| **Cutover** | Install SQL Server on target, restore encrypted .bak with private key | You/DBA | 2–4 h | ⛔ Down |
| **Cutover** | DBCC CHECKDB, recreate logins, jobs, linked servers | DBA | 1–2 h | ⛔ Down |
| **Go live** | Repoint apps | Customer | — | ✅ **Live** |

**Total downtime: ~5–7 hours.** The 26–30 h SMS sync is invisible (pre-cutover).

## Security: no OBS needed

| Risk | Protection |
|---|---|
| In transit | SMS TLS channel (SSL_CONFIG subtask). Data never touches object storage. |
| At rest (backup file) | **SQL Server backup encryption — AES-256.** Certificate + private key kept separately, backed up offline. Without it, .bak is unreadable. |
| At rest (volume) | Plain volume (SMS refuses encrypted volumes). Encryption is at SQL level, not volume level. |

## Meeting checklist — confirm these 4

1. **Can source SQL Server attach an empty data disk?** (USB / iSCSI / Hyper-V pass-through / cloud block volume — whatever the source environment supports)
2. **Is there a Windows box (real or VM) that can serve as the carrier?** Minimal specs: 1 CPU, 4 GB RAM, ≤1 TB system disk, outbound internet to `sms.{region}.myhuaweicloud.com:443`.
3. **Are OBS transfers banned categorically, or is it "no customer credentials in a bucket"?** If the latter, SMS already complies (no OBS involved). If the former, only VPN/DC changes things.
4. **Is RDS for SQL Server acceptable?** If yes, DRS makes the whole 3 TB problem disappear — no carrier, no SMS, no 5 TB EVS discussion, minutes of downtime.
