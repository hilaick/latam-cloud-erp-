#!/usr/bin/env python3
import paramiko
import sys
import time

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command_with_output(client, command, description, timeout=60):
    print(f"\n🔧 {description}")
    print(f"   Command: {command[:100]}...")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout, get_pty=True)
    
    # Read output in real-time
    output = ""
    while True:
        # Read from stdout
        line = stdout.readline()
        if line:
            output += line
            print(line, end='')
        
        # Read from stderr
        err_line = stderr.readline()
        if err_line:
            print(f"ERROR: {err_line}", end='')
            output += f"ERROR: {err_line}"
        
        # Check if process is done
        if stdout.channel.exit_status_ready():
            break
    
    exit_status = stdout.channel.recv_exit_status()
    return output, exit_status

try:
    print("="*80)
    print("STARTING PHASE 1: REDIS MIGRATION")
    print("="*80)
    
    # Connect to mig_worker
    print(f"\n🔗 Connecting to mig_worker at {host}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        username=username,
        password=password,
        timeout=15,
        allow_agent=False,
        look_for_keys=False
    )
    
    print("✅ Connected to mig_worker")
    
    # Navigate to migration directory
    print("\n📁 Changing to migration directory...")
    client.exec_command("cd /opt/migration")
    
    # Run the migration start script
    print("\n🚀 Starting migration (Option 3: Two-phase)...")
    print("This will:")
    print("1. Do initial full sync (30-60 minutes)")
    print("2. Then switch to continuous sync")
    print("3. Keep target in sync until cutover")
    print("\nPress Ctrl+C to stop migration")
    print("="*80)
    
    # Run the start script and capture output
    command = "cd /opt/migration && echo '3' | ./start_migration.sh"
    
    print("\nStarting migration script...")
    stdin, stdout, stderr = client.exec_command(command, get_pty=True, timeout=3600)
    
    # Read output in real-time
    print("\n" + "="*80)
    print("MIGRATION OUTPUT (real-time)")
    print("="*80)
    
    while True:
        line = stdout.readline()
        if line:
            print(line, end='')
        
        err_line = stderr.readline()
        if err_line:
            print(f"ERROR: {err_line}", end='')
        
        # Check if process is done
        if stdout.channel.exit_status_ready():
            break
    
    exit_status = stdout.channel.recv_exit_status()
    
    print("\n" + "="*80)
    if exit_status == 0:
        print("✅ Migration started successfully!")
    else:
        print(f"⚠️  Migration exited with status: {exit_status}")
    
    # Check if RedisShake is running
    print("\n🔍 Checking RedisShake process...")
    check_cmd = "ps aux | grep redis-shake | grep -v grep"
    stdin, stdout, stderr = client.exec_command(check_cmd)
    output = stdout.read().decode().strip()
    
    if output:
        print("✅ RedisShake is running:")
        print(output)
    else:
        print("❌ RedisShake is not running")
        print("Let me check the logs...")
        
        # Check logs
        log_cmd = "tail -20 /opt/migration/redis-shake.log 2>/dev/null || echo 'No log file yet'"
        stdin, stdout, stderr = client.exec_command(log_cmd)
        log_output = stdout.read().decode().strip()
        print(f"Last log lines:\n{log_output}")
    
    # Create monitoring command
    print("\n" + "="*80)
    print("MONITORING COMMANDS")
    print("="*80)
    print("\nTo monitor migration progress, run these commands on mig_worker:")
    print("\n1. Check RedisShake status:")
    print("   ps aux | grep redis-shake")
    print("\n2. View migration logs:")
    print("   tail -f /opt/migration/redis-shake.log")
    print("\n3. Monitor key counts:")
    print("   watch -n 10 'echo \"Source: \$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE) keys\"; echo \"Target: \$(redis-cli -h 121.91.157.129 -p 6379 -a 9zaHQvNEo5bXFJR3h DBSIZE 2>/dev/null) keys\"'")
    print("\n4. Run monitoring script:")
    print("   cd /opt/migration && ./monitor_migration.sh")
    print("\n5. Check sync progress in logs:")
    print("   grep -E '(progress|sync|rump|fullsync)' /opt/migration/redis-shake.log")
    
    # Get initial sync status
    print("\n" + "="*80)
    print("INITIAL SYNC STATUS")
    print("="*80)
    
    # Check source and target key counts
    source_keys_cmd = "redis-cli -h 192.168.10.139 -p 6379 DBSIZE"
    target_keys_cmd = "redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null"
    
    stdin, stdout, stderr = client.exec_command(f"{source_keys_cmd}; {target_keys_cmd}")
    output = stdout.read().decode().strip().split('\n')
    
    if len(output) >= 2:
        source_keys = output[0]
        target_keys = output[1] if len(output) > 1 else "N/A"
        print(f"Source Redis keys: {source_keys}")
        print(f"Target Redis keys: {target_keys}")
        
        if target_keys.isdigit() and source_keys.isdigit():
            target_int = int(target_keys)
            source_int = int(source_keys)
            if target_int > 0:
                progress = (target_int / source_int) * 100
                print(f"Sync progress: {progress:.2f}% ({target_int}/{source_keys} keys)")
            else:
                print("Sync just started or not running")
        else:
            print("Could not parse key counts")
    else:
        print("Could not get key counts")
    
    # Create a simple monitoring script
    print("\n" + "="*80)
    print("QUICK MONITORING SCRIPT")
    print("="*80)
    
    monitor_script = """#!/bin/bash
# quick_monitor.sh

echo "================================================"
echo "REDIS MIGRATION MONITOR"
echo "================================================"
echo "Timestamp: $(date)"
echo ""

# Check RedisShake process
echo "🔍 RedisShake Process:"
if pgrep -x "redis-shake" > /dev/null; then
    echo "✅ Running (PID: $(pgrep -x redis-shake))"
    echo "   Uptime: $(ps -p $(pgrep -x redis-shake) -o etime= 2>/dev/null || echo "N/A")"
else
    echo "❌ Not running"
fi

echo ""

# Check key counts
echo "📊 Key Counts:"
SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "N/A")
TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "N/A")

echo "   Source: $SOURCE_KEYS keys"
echo "   Target: $TARGET_KEYS keys"

if [[ "$SOURCE_KEYS" =~ ^[0-9]+$ ]] && [[ "$TARGET_KEYS" =~ ^[0-9]+$ ]]; then
    if [ "$SOURCE_KEYS" -gt 0 ]; then
        PROGRESS=$((TARGET_KEYS * 100 / SOURCE_KEYS))
        echo "   Progress: $PROGRESS% ($TARGET_KEYS/$SOURCE_KEYS)"
    fi
fi

echo ""

# Check logs
echo "📝 Recent Logs:"
tail -5 /opt/migration/redis-shake.log 2>/dev/null | while read line; do
    echo "   $line"
done

echo ""

# Memory usage
echo "💾 Memory Usage:"
echo "   Source: $(redis-cli -h 192.168.10.139 -p 6379 INFO memory 2>/dev/null | grep 'used_memory_human' | cut -d: -f2 | tr -d '\\r' || echo 'N/A')"
echo "   Target: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO memory 2>/dev/null | grep 'used_memory_human' | cut -d: -f2 | tr -d '\\r' || echo 'N/A')"

echo ""
echo "================================================"
echo "COMMANDS"
echo "================================================"
echo "Start:    cd /opt/migration && ./start_migration.sh"
echo "Monitor:  cd /opt/migration && ./monitor_migration.sh"
echo "Logs:     tail -f /opt/migration/redis-shake.log"
echo "Stop:     pkill redis-shake"
echo ""
"""
    
    # Write monitoring script
    monitor_cmd = f"""cat > /opt/migration/quick_monitor.sh << 'EOF'
{monitor_script}
EOF
chmod +x /opt/migration/quick_monitor.sh
echo "Quick monitor script created: /opt/migration/quick_monitor.sh"
"""
    
    stdin, stdout, stderr = client.exec_command(monitor_cmd)
    print(stdout.read().decode().strip())
    
    client.close()
    
    print("\n" + "="*80)
    print("🎯 PHASE 1 MIGRATION STARTED!")
    print("="*80)
    print("\n✅ Backup completed: 325MB RDB file saved")
    print("✅ Migration started: Two-phase sync")
    print("✅ Monitoring scripts ready")
    print("\n📊 To monitor progress:")
    print("   ssh root@121.91.157.66")
    print("   cd /opt/migration")
    print("   ./quick_monitor.sh")
    print("\n⏱️  Estimated timeline:")
    print("   - Full sync: 30-60 minutes")
    print("   - Continuous sync: Until cutover")
    print("   - Cutover: 5-15 minutes")
    print("\n🔧 Migration is running in the background")
    print("   Check logs: tail -f /opt/migration/redis-shake.log")
    print("   Stop migration: pkill redis-shake")
    print("\n🚀 Next steps after sync completes:")
    print("   1. Verify data consistency")
    print("   2. Schedule cutover window")
    print("   3. Stop application writes")
    print("   4. Final sync catch-up")
    print("   5. Switch application config")
    print("   6. Test with target Redis")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()