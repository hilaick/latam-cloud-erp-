# SMS Cross-Region Migration Scripts

Run from the **Live server** (or any Linux host with Python 3).
No local Windows / Hermes required.

## Setup

1. Set environment variables:
```bash
export HUAWEI_AK=your_access_key
export HUAWEI_SK=your_secret_key
export HUAWEI_PROJECT_ID=your_target_project_id  # e.g. 2413708833e14626b37a8da5edf92d8f
export HUAWEI_REGION=la-north-2
```

2. (Optional) If behind a proxy:
```bash
export HUAWEI_PROXY=http://proxy.huawei.com:8080
```

## Usage

### List source servers
```bash
python3 scripts/sms_migration/list_sources.py
```

### Create a migration task
```bash
python3 scripts/sms_migration/create_task.py \
  <source_server_id> \
  <target_server_id> \
  <target_project_id> \
  <target_region> \
  <disk_id>
```

### Check task status
```bash
python3 scripts/sms_migration/check_task.py <task_id>
```

## Agent Fix (Common.0013)

If `Common.0013` occurs during migration, the agent's `sms_agent_config.json`
has the wrong region context. On each source VM:

1. Ensure `auth.cfg` has the **source** AK/SK and source domain.
2. Ensure `sms_agent_config.json` has the **target** AK/SK, target `project_id`,
   and target `region`.
3. Restart the agent:
```bash
cd /opt/SMS-Agent/agent && ./smsagent start
```

## Files

- `list_sources.py` — query registered SMS sources.
- `create_task.py` — create a migration task.
- `check_task.py` — monitor task progress.
