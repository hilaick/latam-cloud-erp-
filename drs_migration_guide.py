#!/usr/bin/env python3
"""
PRACTICAL GUIDE: Creating DRS Online Migration Task for PostgreSQL

Source: cbe5c6ae00db4402b02370493a1ac378in03 (af-south-1)
Target: 9c0b725a512c4a7ea828ffd3936780e3in01 (ap-southeast-3)

This guide shows the exact steps to create the DRS migration task.
"""

def print_guide():
    print("=" * 80)
    print("DRS POSTGRESQL ONLINE MIGRATION - PRACTICAL IMPLEMENTATION GUIDE")
    print("=" * 80)
    
    print("\n📋 PREREQUISITES CHECKLIST:")
    print("1. ✅ Source PostgreSQL instance: cbe5c6ae00db4402b02370493a1ac378in03")
    print("2. ✅ Target PostgreSQL instance: 9c0b725a512c4a7ea828ffd3936780e3in01")
    print("3. ✅ Source credentials: Huawei Cloud AK/SK (cross-account)")
    print("4. ✅ Target credentials: ULEARNING Master AK/SK")
    print("5. ✅ Network: VPC peering between af-south-1 and ap-southeast-3")
    print("6. ✅ Source PostgreSQL: wal_level = logical")
    
    print("\n🔐 CREDENTIALS REQUIRED (from ERP database):")
    print("1. TARGET (ULEARNING project):")
    print("   - customer.ak (Master AK)")
    print("   - customer.sk (Master SK)")
    print("   - customer.region (ap-southeast-3)")
    print("   - customer.project_id")
    
    print("\n2. SOURCE (Cross-account Huawei Cloud):")
    print("   - customer.source_huawei_ak")
    print("   - customer.source_huawei_sk")
    print("   - customer.source_huawei_region (af-south-1)")
    print("   - customer.source_huawei_project_id")
    print("   - customer.source_huawei_domain_id")
    
    print("\n🌐 NETWORK CONFIGURATION:")
    print("1. VPC Peering between:")
    print("   - Source VPC (af-south-1)")
    print("   - Target VPC (ap-southeast-3)")
    print("\n2. Security Groups:")
    print("   - Source: Allow port 5432 from DRS subnet")
    print("   - Target: Allow port 5432 from DRS subnet")
    print("\n3. DRS Subnet:")
    print("   - Create subnet in target VPC for DRS")
    print("   - Ensure route to source VPC via peering")
    
    print("\n🔧 SOURCE DATABASE PREPARATION:")
    print("1. Connect to source PostgreSQL:")
    print("   psql -h cbe5c6ae00db4402b02370493a1ac378in03 -U root -d postgres")
    print("\n2. Update PostgreSQL parameters:")
    print("   ALTER SYSTEM SET wal_level = logical;")
    print("   ALTER SYSTEM SET max_replication_slots = 10;")
    print("   ALTER SYSTEM SET max_wal_senders = 10;")
    print("   ALTER SYSTEM SET max_worker_processes = 8;")
    print("   SELECT pg_reload_conf();")
    print("\n3. Create replication user:")
    print("   CREATE USER drs_replication WITH REPLICATION LOGIN PASSWORD 'SecurePass123!';")
    print("   GRANT rds_replication TO drs_replication;")
    
    print("\n🚀 DRS TASK CREATION STEPS:")
    print("\n1. LOGIN to Huawei Cloud Console")
    print("   - Use ULEARNING Master AK/SK credentials")
    print("   - Region: ap-southeast-3 (Singapore)")
    
    print("\n2. NAVIGATE to DRS Service")
    print("   - Search for 'DRS' in console")
    print("   - Click 'Create Migration Task'")
    
    print("\n3. CONFIGURE TASK:")
    print("   - Task Name: ulearning-pg-migration-full-incr")
    print("   - Region: ap-southeast-3")
    print("   - Source DB: PostgreSQL")
    print("   - Target DB: PostgreSQL")
    print("   - Migration Type: Full+Incremental")
    print("   - Network Type: VPC")
    
    print("\n4. CONFIGURE SOURCE:")
    print("   - Instance Type: RDS")
    print("   - Instance ID: cbe5c6ae00db4402b02370493a1ac378in03")
    print("   - Region: af-south-1")
    print("   - VPC: Source VPC")
    print("   - Subnet: Source subnet")
    print("   - Security Group: Allow 5432")
    print("   - Database Username: root")
    print("   - Database Password: [Source DB password]")
    
    print("\n5. CONFIGURE TARGET:")
    print("   - Instance Type: RDS")
    print("   - Instance ID: 9c0b725a512c4a7ea828ffd3936780e3in01")
    print("   - Region: ap-southeast-3")
    print("   - VPC: Target VPC")
    print("   - Subnet: Target subnet")
    print("   - Security Group: Allow 5432")
    print("   - Database Username: root")
    print("   - Database Password: Ulearning_2015")
    
    print("\n6. CONFIGURE MIGRATION:")
    print("   - Migration Objects: All databases")
    print("   - Conflict Policy: Ignore")
    print("   - Data Verification: Enable")
    print("   - Incremental Sync: Enable")
    print("   - DRS Spec: drs.pg.c2.medium")
    
    print("\n7. PRE-CHECK:")
    print("   - Run pre-check validation")
    print("   - Fix any issues reported")
    print("   - Ensure all checks pass")
    
    print("\n8. START MIGRATION:")
    print("   - Start full migration")
    print("   - Monitor progress")
    print("   - Wait for incremental sync")
    
    print("\n📊 MONITORING METRICS:")
    print("1. Replication Lag: < 30 seconds")
    print("2. Data Transfer Rate: Monitor MB/s")
    print("3. Error Count: Should be 0")
    print("4. DRS Resource Usage: CPU/RAM < 80%")
    
    print("\n🔄 CUTOVER PROCEDURE:")
    print("1. Schedule maintenance window")
    print("2. Stop write operations on source")
    print("3. Wait for replication lag = 0")
    print("4. Stop DRS incremental sync")
    print("5. Switch application connections")
    print("6. Validate data consistency")
    print("7. Update DNS/load balancers")
    
    print("\n⚠️  RISK MITIGATION:")
    print("1. Backup source database before migration")
    print("2. Test cutover on staging first")
    print("3. Have rollback plan ready")
    print("4. Monitor WAL disk usage on source")
    print("5. Set up alerts for replication issues")
    
    print("\n🔧 TROUBLESHOOTING:")
    print("1. Connection failed: Check VPC peering and security groups")
    print("2. Replication lag high: Check network bandwidth")
    print("3. WAL disk full: Increase disk space or adjust retention")
    print("4. DRS task failed: Check logs and retry")
    
    print("\n📞 SUPPORT:")
    print("1. Huawei Cloud DRS Documentation")
    print("2. PostgreSQL Logical Replication Guide")
    print("3. VPC Peering Configuration")
    print("4. ERP System for credential decryption")
    
    print("\n" + "=" * 80)
    print("SUMMARY:")
    print("Source: cbe5c6ae00db4402b02370493a1ac378in03 (af-south-1)")
    print("Target: 9c0b725a512c4a7ea828ffd3936780e3in01 (ap-southeast-3)")
    print("Type: Full+Incremental Online Migration")
    print("DRS Region: ap-southeast-3")
    print("Credentials: ULEARNING Master AK/SK + Source Huawei Cloud AK/SK")
    print("=" * 80)

def generate_api_curl_command():
    """Generate curl command for DRS API (for reference)"""
    
    curl_command = '''# Example curl command for DRS API (replace placeholders)
curl -X POST https://drs.ap-southeast-3.myhuaweicloud.com/v3/{project_id}/jobs \\
  -H "Content-Type: application/json" \\
  -H "X-Auth-Token: YOUR_TOKEN_HERE" \\
  -d '{
    "job": {
      "name": "ulearning-pg-migration-full-incr",
      "job_type": "migration",
      "engine_type": "postgresql",
      "direction": "up",
      "net_type": "vpc",
      "node_type": "medium",
      "source_endpoint": {
        "db_type": "postgresql",
        "db_password": "SOURCE_DB_PASSWORD",
        "db_user": "root",
        "ip": "SOURCE_RDS_ENDPOINT",
        "port": 5432,
        "instance_id": "cbe5c6ae00db4402b02370493a1ac378in03",
        "region": "af-south-1",
        "subnet_id": "SOURCE_SUBNET_ID",
        "security_group_id": "SOURCE_SECURITY_GROUP_ID"
      },
      "target_endpoint": {
        "db_type": "postgresql",
        "db_password": "Ulearning_2015",
        "db_user": "root",
        "ip": "TARGET_RDS_ENDPOINT",
        "port": 5432,
        "instance_id": "9c0b725a512c4a7ea828ffd3936780e3in01",
        "region": "ap-southeast-3",
        "subnet_id": "TARGET_SUBNET_ID",
        "security_group_id": "TARGET_SECURITY_GROUP_ID"
      },
      "period_type": "FULL_INCR",
      "policy_config": {
        "throttle": {
          "period": "1",
          "flow_limit": "100"
        },
        "conflict_policy": "ignore"
      },
      "object_switch": true,
      "data_verification": true
    }
  }'
'''
    
    return curl_command

if __name__ == "__main__":
    print_guide()
    
    print("\n\n🔧 API REFERENCE (curl command):")
    print(generate_api_curl_command())
    
    print("\n🎯 NEXT ACTION:")
    print("1. Get decrypted credentials from ERP database")
    print("2. Configure VPC peering and security groups")
    print("3. Prepare source PostgreSQL for logical replication")
    print("4. Create DRS task via Console or API")
    print("5. Run pre-check and start migration")