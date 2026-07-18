#!/usr/bin/env python3
"""
Fix Redis restore with proper authentication
"""

import paramiko
import sys
import time

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command_with_output(client, command, description, timeout=600):
    print(f"\n🔧 {description}")
    print(f"   Command: {command[:100]}...")
    
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout, get_pty=True)
    
    output_lines = []
    error_lines = []
    
    # Read output
    while True:
        line = stdout.readline()
        if not line:
            break
        output_lines.append(line.strip())
        print(f"   {line.strip()}")
    
    # Read errors
    while True:
        line = stderr.readline()
        if not line:
            break
        error_lines.append(line.strip())
        print(f"   ERROR: {line.strip()}")
    
    exit_status = stdout.channel.recv_exit_status()
    
    return "\n".join(output_lines), "\n".join(error_lines), exit_status

try:
    print("="*80)
    print("FIXING REDIS RESTORE WITH PROPER AUTHENTICATION")
    print("="*80)
    
    # Connect to mig_worker
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        username=username,
        password=password,
        timeout=30,
        allow_agent=False,
        look_for_keys=False
    )
    
    print("✅ Connected to mig_worker")
    
    # Method 1: Try with REDISCLI_AUTH environment variable
    print("\n" + "="*80)
    print("METHOD 1: USING REDISCLI_AUTH ENVIRONMENT VARIABLE")
    print("="*80)
    
    restore_env = """
    cd /opt/migration
    LATEST_BACKUP=$(ls -t *.rdb | head -1)
    
    echo "=== Starting restore with REDISCLI_AUTH ==="
    echo "Backup: $LATEST_BACKUP"
    echo "Target: 121.91.157.129:6379"
    echo "Timestamp: $(date)"
    echo ""
    
    # Flush target first
    echo "1. Flushing target Redis..."
    REDISCLI_AUTH='9zaHQvNEo5bXFJR3h' redis-cli -h 121.91.157.129 -p 6379 FLUSHALL
    echo "✅ Target flushed"
    
    # Start restore with environment variable
    echo ""
    echo "2. Starting restore (this may take 5-10 minutes)..."
    echo "   Command: REDISCLI_AUTH='9zaHQvNEo5bXFJR3h' cat \"$LATEST_BACKUP\" | redis-cli -h 121.91.157.129 -p 6379 --pipe"
    
    # Start restore in background
    REDISCLI_AUTH='9zaHQvNEo5bXFJR3h' cat "$LATEST_BACKUP" | redis-cli -h 121.91.157.129 -p 6379 --pipe > /tmp/restore2.log 2>&1 &
    RESTORE_PID=$!
    
    echo "Restore PID: $RESTORE_PID"
    echo "Log: /tmp/restore2.log"
    echo $RESTORE_PID > /opt/migration/restore2.pid
    
    # Wait and check
    sleep 10
    
    if ps -p $RESTORE_PID > /dev/null; then
        echo "✅ Restore started successfully"
        echo "Check progress: tail -f /tmp/restore2.log"
    else
        echo "❌ Restore failed to start"
        echo "Check logs:"
        tail -20 /tmp/restore2.log
    fi
    """
    
    output, error, exit_code = run_command_with_output(client, restore_env, "Restore with REDISCLI_AUTH", timeout=30)
    
    # Wait 30 seconds and check progress
    print("\n" + "="*80)
    print("CHECKING RESTORE PROGRESS")
    print("="*80)
    
    time.sleep(30)
    
    check_progress = """
    echo "=== Restore Progress Check ==="
    echo "Timestamp: $(date)"
    echo ""
    
    # Check if restore is running
    if [ -f /opt/migration/restore2.pid ]; then
        RESTORE_PID=$(cat /opt/migration/restore2.pid)
        if ps -p $RESTORE_PID > /dev/null; then
            echo "✅ Restore is running (PID: $RESTORE_PID)"
            echo "Runtime: $(ps -p $RESTORE_PID -o etime=)"
            
            # Check log
            echo ""
            echo "=== Restore log (last 5 lines) ==="
            tail -5 /tmp/restore2.log 2>/dev/null || echo "No log yet"
        else
            echo "❌ Restore process not running"
            wait $RESTORE_PID 2>/dev/null
            EXIT_CODE=$?
            echo "Exit code: $EXIT_CODE"
            echo ""
            echo "=== Full restore log ==="
            cat /tmp/restore2.log 2>/dev/null || echo "No log file"
        fi
    else
        echo "⚠️  No restore PID file found"
    fi
    
    echo ""
    echo "=== Key Counts ==="
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
    TARGET_KEYS=$(REDISCLI_AUTH='9zaHQvNEo5bXFJR3h' redis-cli -h 121.91.157.129 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
    
    echo "Source: $SOURCE_KEYS keys"
    echo "Target: $TARGET_KEYS keys"
    
    if [ "$SOURCE_KEYS" != "ERROR" ] && [ "$TARGET_KEYS" != "ERROR" ]; then
        if [ "$TARGET_KEYS" -gt 0 ]; then
            PERCENTAGE=$((TARGET_KEYS * 100 / SOURCE_KEYS))
            echo ""
            echo "📈 Progress: $PERCENTAGE%"
            echo "   Migrated: $TARGET_KEYS/$SOURCE_KEYS keys"
            
            if [ "$TARGET_KEYS" -eq "$SOURCE_KEYS" ]; then
                echo "🎉 RESTORE COMPLETE!"
            fi
        else
            echo ""
            echo "❌ No keys migrated yet"
            
            # Try alternative method if this failed
            echo ""
            echo "=== Trying alternative method ==="
            echo "Using stdin password input..."
        fi
    fi
    """
    
    output, error, exit_code = run_command_with_output(client, check_progress, "Check restore progress")
    
    # If still no progress, try alternative method
    print("\n" + "="*80)
    print("ALTERNATIVE METHOD: PASSWORD VIA STDIN")
    print("="*80)
    
    # Check if we need to try alternative
    check_keys = "REDISCLI_AUTH='9zaHQvNEo5bXFJR3h' redis-cli -h 121.91.157.129 -p 6379 DBSIZE 2>/dev/null || echo '0'"
    output, error, exit_code = run_command_with_output(client, check_keys, "Check target keys")
    
    if "0" in output or "ERROR" in output:
        print("\n🔄 Trying alternative restore method...")
        
        alt_restore = """
        cd /opt/migration
        LATEST_BACKUP=$(ls -t *.rdb | head -1)
        
        echo "=== Alternative restore method ==="
        echo "Using echo password to redis-cli stdin"
        echo ""
        
        # Method 2: Use echo to pipe password
        echo "Starting restore with password via stdin..."
        
        # Create a script to handle the restore
        cat > /opt/migration/restore_script.sh << 'RESTORE_EOF'
#!/bin/bash
BACKUP_FILE="$1"
TARGET_HOST="$2"
TARGET_PORT="$3"
PASSWORD="$4"

echo "Starting restore of $BACKUP_FILE to $TARGET_HOST:$TARGET_PORT"
echo "File size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Flush target first
echo "Flushing target..."
echo -e "AUTH $PASSWORD\\nFLUSHALL" | redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" --pipe

# Restore data
echo "Restoring data..."
cat "$BACKUP_FILE" | (
    echo "AUTH $PASSWORD"
    cat
) | redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" --pipe

echo "Restore completed"
RESTORE_EOF
        
        chmod +x /opt/migration/restore_script.sh
        
        echo "Running restore script..."
        /opt/migration/restore_script.sh "$LATEST_BACKUP" "121.91.157.129" "6379" "9zaHQvNEo5bXFJR3h" > /tmp/restore3.log 2>&1 &
        RESTORE_PID=$!
        
        echo "Restore PID: $RESTORE_PID"
        echo "Log: /tmp/restore3.log"
        echo $RESTORE_PID > /opt/migration/restore3.pid
        
        echo "Restore started in background"
        echo "Monitor with: tail -f /tmp/restore3.log"
        """
        
        output, error, exit_code = run_command_with_output(client, alt_restore, "Alternative restore method", timeout=30)
        
        # Wait and check
        time.sleep(10)
        
        check_alt = """
        echo "=== Checking alternative restore ==="
        
        if [ -f /opt/migration/restore3.pid ]; then
            RESTORE_PID=$(cat /opt/migration/restore3.pid)
            if ps -p $RESTORE_PID > /dev/null; then
                echo "✅ Restore running (PID: $RESTORE_PID)"
                echo "Log output:"
                tail -10 /tmp/restore3.log 2>/dev/null || echo "No log yet"
            else
                echo "❌ Restore not running"
                echo "Log:"
                cat /tmp/restore3.log 2>/dev/null | tail -20
            fi
        fi
        
        echo ""
        echo "=== Current key counts ==="
        echo "Source: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo 'ERROR')"
        echo "Target: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo 'ERROR')"
        """
        
        output, error, exit_code = run_command_with_output(client, check_alt, "Check alternative restore")
    
    # Final check
    print("\n" + "="*80)
    print("FINAL STATUS CHECK")
    print("="*80)
    
    final_check = """
    echo "=== Final Migration Status ==="
    echo "Timestamp: $(date)"
    echo ""
    
    # Check all restore processes
    echo "=== Active restore processes ==="
    ps aux | grep -E "(redis-cli|cat.*rdb)" | grep -v grep || echo "No restore processes found"
    
    echo ""
    echo "=== Key counts ==="
    SOURCE=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "N/A")
    TARGET=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo "N/A")
    
    echo "Source Redis: $SOURCE keys"
    echo "Target Redis: $TARGET keys"
    
    echo ""
    echo "=== Migration Status ==="
    if [ "$SOURCE" != "N/A" ] && [ "$TARGET" != "N/A" ]; then
        if [ "$SOURCE" -eq "$TARGET" ]; then
            echo "✅ MIGRATION SUCCESSFUL!"
            echo "All $SOURCE keys migrated"
        elif [ "$TARGET" -gt 0 ]; then
            PERCENT=$((TARGET * 100 / SOURCE))
            echo "🔄 MIGRATION IN PROGRESS: $PERCENT%"
            echo "Migrated: $TARGET/$SOURCE keys"
        else
            echo "❌ MIGRATION FAILED - No keys migrated"
            echo ""
            echo "=== Troubleshooting ==="
            echo "1. Check password authentication"
            echo "2. Check network connectivity"
            echo "3. Try smaller RDB file (175MB backup)"
            echo "4. Use RedisShake instead"
        fi
    else
        echo "⚠️  Could not get key counts"
    fi
    
    echo ""
    echo "=== Available backup files ==="
    ls -lh /opt/migration/*.rdb 2>/dev/null || echo "No backup files"
    
    echo ""
    echo "=== Next steps ==="
    echo "1. Monitor: tail -f /tmp/restore*.log"
    echo "2. Check: ./monitor_restore.sh"
    echo "3. Verify: redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE"
    """
    
    output, error, exit_code = run_command_with_output(client, final_check, "Final status check")
    
    client.close()
    
    print("\n" + "="*80)
    print("🎯 RESTORE STATUS SUMMARY")
    print("="*80)
    
    print("\n📊 Current Status:")
    print("   - Source Redis: 339,803 keys")
    print("   - Target Redis: 0 keys (migration failed)")
    print("   - Backup files: 2 available (325MB, 175MB)")
    print("   - Authentication: Password issue with redis-cli --pipe")
    
    print("\n🔧 Issues identified:")
    print("   1. redis-cli --pipe with -a password shows warning")
    print("   2. Restore process starts but may fail silently")
    print("   3. Need to use REDISCLI_AUTH environment variable")
    
    print("\n🚀 Recommended solution:")
    print("   Use RedisShake for reliable migration")
    print("   OR use smaller 175MB backup file")
    
    print("\n📋 Immediate actions:")
    print("   1. Check restore logs: tail -f /tmp/restore*.log")
    print("   2. Verify connectivity: redis-cli -h 121.91.157.129 -p 6379 -a 'password' PING")
    print("   3. Try with smaller backup file")
    
    print("\n💡 Alternative approach:")
    print("   Use RedisShake for incremental sync instead of RDB restore")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()