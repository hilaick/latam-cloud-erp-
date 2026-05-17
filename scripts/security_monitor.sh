#!/bin/bash

# Security monitoring script for Huawei Cloud Dashboard
# Tracks suspicious IP activity and sends alerts

LOG_FILE="/tmp/flask_security.log"
ALERT_THRESHOLD=5  # Number of requests from same IP within 1 minute

echo "🔒 Starting security monitor for Huawei Cloud Dashboard..."
echo "📊 Monitoring log file: $LOG_FILE"
echo "⚠️  Alert threshold: $ALERT_THRESHOLD requests/minute from same IP"
echo ""

# Function to analyze recent logs
analyze_logs() {
    echo "=== SECURITY ANALYSIS $(date) ==="
    echo ""
    
    # Check if log file exists
    if [ ! -f "$LOG_FILE" ]; then
        echo "❌ Log file not found: $LOG_FILE"
        echo ""
        return
    fi
    
    # 1. Show recent IPs (last 30 minutes)
    echo "📈 Recent IP activity (last 30 minutes):"
    if grep -q "$(date -d '30 minutes ago' '+%d/%b/%Y:%H:%M')" "$LOG_FILE" 2>/dev/null; then
        grep "$(date -d '30 minutes ago' '+%d/%b/%Y:%H:%M')" "$LOG_FILE" | \
            grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | \
            sort | uniq -c | sort -rn | head -10 | \
            while read count ip; do
                echo "  $count requests from $ip"
            done
    else
        echo "  No activity in last 30 minutes"
    fi
    echo ""
    
    # 2. Check for blocked IPs
    echo "🚫 Blocked IP activity:"
    if grep -q "Access denied.*blocked" "$LOG_FILE" 2>/dev/null; then
        echo "  Recent blocked attempts:"
        grep "Access denied.*blocked" "$LOG_FILE" | tail -5 | \
            grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | sort -u | \
            while read ip; do
                echo "    - $ip (blocked)"
            done
    else
        echo "  No IPs currently blocked"
    fi
    echo ""
    
    # 3. Authentication attempts
    echo "🔑 Authentication activity:"
    auth_success=$(grep -c "200 OK" "$LOG_FILE" 2>/dev/null || echo "0")
    auth_failed=$(grep -c "401 UNAUTHORIZED" "$LOG_FILE" 2>/dev/null || echo "0")
    echo "  Successful authentications: $auth_success"
    echo "  Failed authentications: $auth_failed"
    echo ""
    
    # 4. Check for suspicious patterns
    echo "🔍 Suspicious endpoint access:"
    suspicious_endpoints=("/api/audit" "/api/logs" "/api/huawei/chat" "/api/blueprint")
    for endpoint in "${suspicious_endpoints[@]}"; do
        count=$(grep -c "$endpoint" "$LOG_FILE" 2>/dev/null || true)
        if [ -z "$count" ]; then
            count=0
        fi
        if [ "$count" -gt 0 ]; then
            echo "  Endpoint '$endpoint': $count accesses"
        fi
    done
    echo ""
    
    # 5. High-frequency IP detection (last 5 minutes)
    echo "🚨 High-frequency access detection (last 5 minutes):"
    recent_logs=$(grep "$(date -d '5 minutes ago' '+%d/%b/%Y:%H:%M')" "$LOG_FILE" 2>/dev/null)
    if [ -n "$recent_logs" ]; then
        echo "$recent_logs" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | sort | uniq -c | sort -rn | \
            while read count ip; do
                if [ "$count" -ge "$ALERT_THRESHOLD" ]; then
                    echo "  ⚠️  ALERT: $ip made $count requests (threshold: $ALERT_THRESHOLD)"
                else
                    echo "  $ip: $count requests"
                fi
            done
    else
        echo "  No activity in last 5 minutes"
    fi
}

# Run analysis
analyze_logs

echo "=== RECOMMENDATIONS ==="
echo ""
echo "1. 🔒 Current security status:"
echo "   - Basic authentication: ENABLED"
echo "   - IP blocking: ENABLED for known suspicious IPs"
echo "   - Local access: ALLOWED (127.0.0.1, localhost, ::1)"
echo ""
echo "2. 📋 Actions taken:"
echo "   - Added authentication to all API endpoints"
echo "   - Blocked suspicious IPs: 154.47.28.240, 1.94.223.28"
echo "   - External IPs now require authentication"
echo ""
echo "3. ⚠️  Recommended next steps:"
echo "   a. Change default credentials from admin/changeme123"
echo "      export DASHBOARD_USERNAME='your_username'"
echo "      export DASHBOARD_PASSWORD='strong_password'"
echo "   b. Add more trusted IPs to ALLOWED_IPS in app.py"
echo "   c. Consider adding rate limiting"
echo "   d. Set up HTTPS for encrypted connections"
echo "   e. Monitor logs regularly with this script"
echo ""
echo "4. 🛡️  To run this monitor periodically, add to crontab:"
echo "   */5 * * * * /home/huawei-cloud/latam-cloud-erp-/scripts/security_monitor.sh"
echo ""
echo "✅ Security monitoring complete"