#!/bin/bash
# discover.sh - DCS instance discovery script for mig_worker
# This runs on the mig_worker after deployment

set -e

echo "================================================"
echo "DCS INSTANCE DISCOVERY - ULEARNING MIGRATION"
echo "================================================"
echo "Timestamp: $(date)"
echo ""

# Check if Huawei Cloud CLI is installed
if ! command -v hcloud &> /dev/null; then
    echo "❌ Huawei Cloud CLI not found. Installing..."
    wget -q https://hwcloudcli.obs.cn-north-1.myhuaweicloud.com/cli/latest/huaweicloud-cli-linux-amd64.tar.gz -O /tmp/huaweicloud-cli.tar.gz
    tar -xzf /tmp/huaweicloud-cli.tar.gz -C /tmp
    chmod +x /tmp/huaweicloud-cli
    sudo mv /tmp/huaweicloud-cli /usr/local/bin/hcloud
    rm /tmp/huaweicloud-cli.tar.gz
    echo "✅ Huawei Cloud CLI installed"
fi

# Set region
REGION="af-south-1"
PROJECT_ID="08720a7af300f48a2f48c00622277d5d"

echo "🔧 Configuration:"
echo "  Region: $REGION"
echo "  Project: $PROJECT_ID"
echo ""

# Test agency permissions
echo "🔍 Testing agency permissions..."
hcloud DCS ListInstances --cli-region=$REGION --limit=1 > /tmp/dcs_test.txt 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Agency permissions working"
else
    echo "❌ Agency permissions issue:"
    cat /tmp/dcs_test.txt
    echo ""
    echo "⚠️  Please ensure mig_access agency has:"
    echo "   - DCS FullAccess"
    echo "   - VPC FullAccess"
    echo "   - Assigned to project: $PROJECT_ID"
    exit 1
fi

echo ""
echo "================================================"
echo "1. LISTING ALL DCS INSTANCES"
echo "================================================"
hcloud DCS ListInstances --cli-region=$REGION --limit=50

echo ""
echo "================================================"
echo "2. FINDING REDIS INSTANCES"
echo "================================================"
REDIS_INSTANCES=$(hcloud DCS ListInstances --cli-region=$REGION --engine=redis --limit=50)
echo "$REDIS_INSTANCES"

# Extract Redis instance IDs
REDIS_IDS=$(echo "$REDIS_INSTANCES" | grep -o '"instance_id":"[^"]*"' | cut -d'"' -f4)
echo ""
echo "📊 Found $(echo "$REDIS_IDS" | wc -w) Redis instances"

for INSTANCE_ID in $REDIS_IDS; do
    echo ""
    echo "🔍 Redis Instance: $INSTANCE_ID"
    echo "----------------------------------------"
    hcloud DCS ShowInstance --cli-region=$REGION --instance_id=$INSTANCE_ID | grep -E '(name|engine|engine_version|specification|capacity|status|ip|port|vpc_name|subnet_name)'
done

echo ""
echo "================================================"
echo "3. FINDING MEMCACHED INSTANCES"
echo "================================================"
MEMCACHED_INSTANCES=$(hcloud DCS ListInstances --cli-region=$REGION --engine=memcached --limit=50)
echo "$MEMCACHED_INSTANCES"

# Extract Memcached instance IDs
MEMCACHED_IDS=$(echo "$MEMCACHED_INSTANCES" | grep -o '"instance_id":"[^"]*"' | cut -d'"' -f4)
echo ""
echo "📊 Found $(echo "$MEMCACHED_IDS" | wc -w) Memcached instances"

for INSTANCE_ID in $MEMCACHED_IDS; do
    echo ""
    echo "🔍 Memcached Instance: $INSTANCE_ID"
    echo "----------------------------------------"
    hcloud DCS ShowInstance --cli-region=$REGION --instance_id=$INSTANCE_ID | grep -E '(name|engine|specification|capacity|status|ip|port|vpc_name|subnet_name)'
done

echo ""
echo "================================================"
echo "4. SPECIFIC INSTANCES (ULEARNING)"
echo "================================================"

# Target instances
TARGET_REDIS="e0b18a26-385a-44c6-8bba-8cdf7b6533f1"
TARGET_MEMCACHED="4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2"

echo ""
echo "🎯 Target Redis: $TARGET_REDIS"
echo "----------------------------------------"
hcloud DCS ShowInstance --cli-region=$REGION --instance_id=$TARGET_REDIS 2>/dev/null || echo "❌ Redis instance not found or no access"

echo ""
echo "🎯 Target Memcached: $TARGET_MEMCACHED"
echo "----------------------------------------"
hcloud DCS ShowInstance --cli-region=$REGION --instance_id=$TARGET_MEMCACHED 2>/dev/null || echo "❌ Memcached instance not found or no access"

echo ""
echo "================================================"
echo "5. NETWORK INFORMATION"
echo "================================================"

echo ""
echo "🔍 VPCs:"
hcloud VPC ListVpcs --cli-region=$REGION --limit=10 | grep -E '(name|id|cidr|status)'

echo ""
echo "🔍 Subnets:"
hcloud VPC ListSubnets --cli-region=$REGION --limit=20 | grep -E '(name|id|cidr|vpc_id|availability_zone)'

echo ""
echo "🔍 Security Groups:"
hcloud VPC ListSecurityGroups --cli-region=$REGION --limit=10 | grep -E '(name|id|description)'

echo ""
echo "================================================"
echo "6. CONNECTIVITY TEST"
echo "================================================"

# Get private IPs from instances
echo "Testing connectivity to instances..."
echo "Note: This requires instances to be in the same VPC/subnet"

# Try to get IPs from API
echo ""
echo "🔍 Attempting to get instance IPs..."

for INSTANCE_ID in $TARGET_REDIS $TARGET_MEMCACHED; do
    INSTANCE_INFO=$(hcloud DCS ShowInstance --cli-region=$REGION --instance_id=$INSTANCE_ID 2>/dev/null || echo "{}")
    IP=$(echo "$INSTANCE_INFO" | grep -o '"ip":"[^"]*"' | cut -d'"' -f4)
    PORT=$(echo "$INSTANCE_INFO" | grep -o '"port":[0-9]*' | cut -d':' -f2)
    NAME=$(echo "$INSTANCE_INFO" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$IP" ] && [ -n "$PORT" ]; then
        echo ""
        echo "🔗 $NAME ($INSTANCE_ID)"
        echo "   IP: $IP, Port: $PORT"
        
        if [ "$INSTANCE_ID" = "$TARGET_REDIS" ]; then
            echo "   Testing Redis connection..."
            redis-cli -h $IP -p $PORT PING 2>/dev/null && echo "   ✅ Redis accessible" || echo "   ❌ Redis not accessible"
        else
            echo "   Testing Memcached connection..."
            echo "stats" | timeout 2 nc $IP $PORT 2>/dev/null | head -1 && echo "   ✅ Memcached accessible" || echo "   ❌ Memcached not accessible"
        fi
    else
        echo "   ❌ Could not get IP/Port for $INSTANCE_ID"
    fi
done

echo ""
echo "================================================"
echo "7. MIGRATION SPECIFICATIONS"
echo "================================================"

echo ""
echo "📋 Required information for migration:"
echo ""
echo "For EACH Redis/Memcached instance, we need:"
echo "1. Private IP Address"
echo "2. Port"
echo "3. Specification (e.g., redis.ha.xu1.large.4)"
echo "4. Capacity (GB)"
echo "5. Engine Version"
echo "6. Architecture (Single/HA/Cluster)"
echo "7. Password (if enabled)"
echo "8. VPC/Subnet/Security Group"
echo ""

echo "================================================"
echo "SUMMARY"
echo "================================================"
echo ""
echo "✅ Discovery complete"
echo "📊 Redis instances found: $(echo "$REDIS_IDS" | wc -w)"
echo "📊 Memcached instances found: $(echo "$MEMCACHED_IDS" | wc -w)"
echo ""
echo "Next steps:"
echo "1. Share this output for migration planning"
echo "2. Get missing specifications from console if needed"
echo "3. Create target instances in destination account"
echo "4. Configure migration tools"
echo ""

# Save results to file
RESULTS_FILE="/opt/migration/discovery_results_$(date +%Y%m%d_%H%M%S).txt"
echo "$(date)" > $RESULTS_FILE
echo "DCS Discovery Results" >> $RESULTS_FILE
echo "====================" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE
echo "Redis Instances:" >> $RESULTS_FILE
echo "$REDIS_INSTANCES" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE
echo "Memcached Instances:" >> $RESULTS_FILE
echo "$MEMCACHED_INSTANCES" >> $RESULTS_FILE

echo "📄 Results saved to: $RESULTS_FILE"
echo "🔗 Share this file for migration planning"