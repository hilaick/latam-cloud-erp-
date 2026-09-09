# ✅ SMS Migration Task Configuration with auto_start

## 📋 **Configuration Summary**

### **Target Configuration Created**:
- **Location**: `/home/huawei-cloud/latam-cloud-erp-/migration-configs/`
- **Files**: 
  - `codelpa-migration-target.json` - Full migration config
  - `codelpa-migration-target.yaml` - YAML version
  - `sms-create-task-correct.json` - SMS API-compatible config

### **Critical Settings**:
1. **`auto_start: true`** - Ensures task starts immediately (not stuck in READY state)
2. **`device_use: "OS"`** - Windows requires "OS" not "BOOT" (fixes SMS.0515)
3. **`type: "MIGRATE_BLOCK"`** - Windows block-level migration
4. **`os_type: "WINDOWS"`** - Correct OS specification
5. **`target_server.vm_id`** - Uses existing ECS `2c8de6de-b43c-46a5-8650-71a59d9c55e4`

### **Migration Details**:
- **Source Server**: `1becd287-42db-462c-9baf-b088cb3ed90a`
- **Target ECS**: `CDP-PRTSRV-01-TARGET-NEW` (`2c8de6de-b43c-46a5-8650-71a59d9c55e4`)
- **Migration IP**: `172.48.0.24`
- **Region**: SMS in `ap-southeast-3`, Target in `la-north-2`
- **Flavor**: `x0.2u.8g` (2vCPU/8GB RAM/104GB SSD)
- **Image**: `91873c3f-2464-4780-b2d8-1ed8c438d32d` (Windows)
- **VPC**: `3fd48f1a-11a0-4faf-a858-6e123ebb45de`
- **Security Group**: `e77b288c-fc8d-4062-aed6-8aa982b7ca51` (SysFullAccess)

## 🚀 **Create Task Command**

### **Option 1: Individual Parameters**:
```bash
hcloud SMS CreateTask \
  --cli-region=ap-southeast-3 \
  --name='CDP-PRTSRV-01-MIGRATION' \
  --project_id='c5354feed62946958b9554cffb70a13c' \
  --project_name='CODELPA' \
  --region_id='ap-southeast-3' \
  --region_name='ap-southeast-3' \
  --source_server.id='1becd287-42db-462c-9baf-b088cb3ed90a' \
  --target_server.name='CDP-PRTSRV-01-TARGET-NEW' \
  --target_server.vm_id='2c8de6de-b43c-46a5-8650-71a59d9c55e4' \
  --type='MIGRATE_BLOCK' \
  --auto_start=true \
  --os_type='WINDOWS' \
  --migration_ip='172.48.0.24' \
  --exist_server=true
```

### **Option 2: JSON File**:
```bash
hcloud SMS CreateTask \
  --cli-region=ap-southeast-3 \
  --body='@/home/huawei-cloud/latam-cloud-erp-/migration-configs/sms-create-task-correct.json'
```

## 🔐 **Authentication Issue**

### **Problem**:
- **ERP AK/SK**: `HPUAHMQ1ANAV4VJGYXSX` lacks SMS permissions in `ap-southeast-3`
- **Error**: `SMS.6527` (resource doesn't belong to you) or `APIGW.0301` (auth error)
- **Console works**: IAM user token has enterprise-wide permissions

### **Solutions**:
1. **Use Console** (already works) - Create task via Huawei Cloud Console UI
2. **Get Correct AK/SK** - From IAM user who created original task
3. **Add SMS Role** - Grant `SMS FullAccess` to ERP AK/SK
4. **Use IAM Token** - Programmatically get token like console does

## ✅ **SMS.0515 Prevention**

Configuration includes fixes for SMS.0515 disk mapping error:
1. **`device_use: "OS"`** - Not "BOOT" for Windows
2. **Uses EVS Volume IDs** - Not SMS Disk IDs
3. **Correct disk size** - 104 GiB matches source
4. **Includes partition info** - Auto-populated by SMS Agent

## 📊 **Verification Steps**

After task creation:
```bash
# Check task status (should be MIGRATING, not READY)
hcloud SMS ShowTask --task_id=<NEW_TASK_ID> --cli-region=ap-southeast-3

# Monitor progress
hcloud SMS ShowTask --task_id=<NEW_TASK_ID> --cli-region=ap-southeast-3 | grep -E "state|progress|estimated_finish_time"

# Check target ECS
hcloud ECS ShowServer --server_id=2c8de6de-b43c-46a5-8650-71a59d9c55e4 --cli-region=la-north-2
```

## ⚠️ **Important Notes**

1. **Source Server**: Must be in "waiting" state with SMS Agent installed
2. **Target ECS**: Must exist and be accessible
3. **Network**: Connectivity required between source and migration IP
4. **Credentials**: Need proper SMS permissions in `ap-southeast-3`
5. **Console**: Currently the only working method due to authentication context

## 🎯 **Next Steps**

1. **Use Console** to create task with `auto_start=true`
2. **Monitor** migration progress in console
3. **Verify** target ECS becomes accessible
4. **Test** connectivity to migrated server

The configuration is ready with `auto_start: true` to ensure the migration starts immediately upon creation, preventing the task from getting stuck in READY state.