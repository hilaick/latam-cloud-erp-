#!/bin/bash
# mig_worker_deploy_final.sh

echo "==============================================="
echo "MIG_WORKER DEPLOYMENT - FINAL INSTRUCTIONS"
echo "==============================================="

echo ""
echo "Since the Huawei Cloud CLI is having issues, deploy MANUALLY via Console:"
echo ""
echo "1. LOGIN TO CONSOLE:"
echo "   https://console.huaweicloud.com/ecs"
echo ""
echo "2. SELECT PROJECT & REGION:"
echo "   - Project: 08720a7af300f48a2f48c00622277d5d"
echo "   - Region: af-south-1 (AF-Johannesburg)"
echo ""
echo "3. CREATE ECS INSTANCE:"
echo "   - Click 'Create ECS'"
echo "   - Configure:"
echo "     * Name: mig-worker-ulearning"
echo "     * Billing: Pay-per-use"
echo "     * AZ: AZ1"
echo "     * Flavor: c6.large.2 (2vCPU, 4GB RAM)"
echo "     * Image: Ubuntu 22.04 server 64bit"
echo "     * System Disk: 50GB SSD"
echo ""
echo "4. CONFIGURE NETWORK:"
echo "   - VPC: UMOOC_FA_VPC"
echo "   - Subnet: ummoc_10"
echo "   - Security Group: UMOOC_AF"
echo "   - Elastic IP: None (use private IP)"
echo ""
echo "5. ADVANCED SETTINGS:"
echo "   - Login Method: Key Pair"
echo "   - Key Pair: Create new 'mig-worker-key'"
echo "   - Agency: Attach 'mig-worker-agency' (create if doesn't exist)"
echo "   - User Data (paste in Advanced Options):"
echo ""
cat << 'USERDATA'
#!/bin/bash
# mig_worker bootstrap
set -e

echo "================================================"
echo "MIG_WORKER BOOTSTRAP"
echo "================================================"

# Update system
apt-get update
apt-get upgrade -y

# Install tools
apt-get install -y \
    redis-tools \
    libmemcached-tools \
    netcat-openbsd \
    curl wget git \
    htop iotop iftop nload \
    python3 python3-pip python3-venv

# Install RedisShake
cd /tmp
wget -q https://github.com/alibaba/RedisShake/releases/download/v3.1.7/redis-shake-linux-amd64.tar.gz
tar -xzf redis-shake-linux-amd64.tar.gz
chmod +x redis-shake
mv redis-shake /usr/local/bin/
rm redis-shake-linux-amd64.tar.gz

# Install Huawei Cloud CLI
wget -q https://hwcloudcli.obs.cn-north-1.myhuaweicloud.com/cli/latest/huaweicloud-cli-linux-amd64.tar.gz
tar -xzf huaweicloud-cli-linux-amd64.tar.gz
chmod +x huaweicloud-cli
mv huaweicloud-cli /usr/local/bin/hcloud
rm huaweicloud-cli-linux-amd64.tar.gz

# Create migration directory
mkdir -p /opt/migration
cd /opt/migration

# Create discovery script
cat > discover.sh << 'EOF'
#!/bin/bash
echo "================================================"
echo "DCS INSTANCE DISCOVERY"
echo "================================================"

echo "1. Listing all DCS instances..."
hcloud DCS ListInstances --limit=50

echo ""
echo "2. Finding Redis instances..."
hcloud DCS ListInstances --engine=redis --limit=50

echo ""
echo "3. Finding Memcached instances..."
hcloud DCS ListInstances --engine=memcached --limit=50

echo ""
echo "4. Getting instance details..."
echo "   Run: hcloud DCS ShowInstance --instance_id=[INSTANCE_ID]"
echo ""
echo "5. Testing connectivity..."
echo "   Redis: redis-cli -h [IP] -p 6379 INFO | head -20"
echo "   Memcached: echo 'stats' | nc [IP] 11211 | head -20"
EOF

chmod +x discover.sh

# Create test scripts
cat > test_redis.sh << 'EOF'
#!/bin/bash
REDIS_HOST="${1:-localhost}"
REDIS_PORT="${2:-6379}"
echo "Testing Redis at $REDIS_HOST:$REDIS_PORT..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" PING
if [ $? -eq 0 ]; then
    echo "✅ Redis connected"
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO | grep -E "(redis_version|used_memory_human|connected_clients|role)"
else
    echo "❌ Redis connection failed"
fi
EOF

cat > test_memcached.sh << 'EOF'
#!/bin/bash
MEMCACHED_HOST="${1:-localhost}"
MEMCACHED_PORT="${2:-11211}"
echo "Testing Memcached at $MEMCACHED_HOST:$MEMCACHED_PORT..."
echo "stats" | timeout 5 nc "$MEMCACHED_HOST" "$MEMCACHED_PORT" | head -20
EOF

chmod +x test_redis.sh test_memcached.sh

echo ""
echo "✅ MIG_WORKER READY"
echo "================================================"
echo "Run: cd /opt/migration && ./discover.sh"
USERDATA

echo ""
echo "6. REVIEW AND CREATE:"
echo "   - Review all settings"
echo "   - Click 'Create Now'"
echo "   - Wait 2-3 minutes for instance to be active"
echo ""
echo "7. AFTER CREATION:"
echo "   - Note the Private IP address"
echo "   - Download the key pair (mig-worker-key.pem)"
echo "   - Save to: ~/.ssh/mig-worker-key.pem"
echo "   - Set permissions: chmod 400 ~/.ssh/mig-worker-key.pem"
echo ""
echo "8. ATTACH AGENCY:"
echo "   - Go to ECS → mig-worker-ulearning"
echo "   - Agency → Select 'mig-worker-agency'"
echo "   - If agency doesn't exist, create it:"
echo "     * IAM → Agencies → Create"
echo "     * Name: mig-worker-agency"
echo "     * Type: Cloud service"
echo "     * Cloud service: ECS"
echo "     * Permissions: DCS FullAccess, VPC FullAccess"
echo ""
echo "9. SSH TO MIG_WORKER:"
echo "   ssh -i ~/.ssh/mig-worker-key.pem ubuntu@[PRIVATE_IP]"
echo ""
echo "10. DISCOVER DCS INSTANCES:"
echo "    cd /opt/migration"
echo "    ./discover.sh"
echo ""
echo "================================================"
echo "AGENCY CONFIGURATION (CRITICAL)"
echo "================================================"
echo ""
echo "The mig_worker MUST have DCS permissions via agency:"
echo ""
echo "1. Create Agency in IAM Console:"
echo "   - Name: mig-worker-agency"
echo "   - Type: Cloud service"
echo "   - Cloud service: ECS"
echo "   - Duration: Permanent"
echo ""
echo "2. Grant Permissions:"
echo "   - DCS FullAccess"
echo "   - VPC FullAccess"
echo "   - ECS FullAccess (optional)"
echo ""
echo "3. Assign to mig_worker instance"
echo ""
echo "================================================"
echo "EXPECTED OUTPUT FROM DISCOVERY"
echo "================================================"
echo ""
echo "After running ./discover.sh, you should see:"
echo ""
echo "1. List of all DCS instances"
echo "2. Redis instance: dcs-r0il (e0b18a26-385a-44c6-8bba-8cdf7b6533f1)"
echo "3. Memcached instance: dcs-ibu2 (4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2)"
echo "4. Private IP addresses"
echo "5. Specifications (capacity, version, etc.)"
echo ""
echo "Share this output with me to proceed with migration planning."
echo ""
echo "================================================"
echo "TIME ESTIMATE"
echo "================================================"
echo ""
echo "Deployment: 10-15 minutes"
echo "Agency setup: 5 minutes"
echo "Discovery: 2 minutes"
echo "Total: ~20 minutes"
echo ""
echo "Ready to deploy? Go to console and create the instance!"