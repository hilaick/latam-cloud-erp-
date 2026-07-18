#!/bin/bash
# deploy_mig_worker_simple.sh
# Simple mig_worker deployment with agency

echo "================================================"
echo "MIG_WORKER DEPLOYMENT - SIMPLE VERSION"
echo "================================================"

echo ""
echo "🚀 DEPLOYMENT STEPS:"
echo "================================================"

echo ""
echo "1. LOGIN TO HUAWEI CLOUD CONSOLE"
echo "----------------------------------------"
echo "   URL: https://console.huaweicloud.com/ecs"
echo "   Project: 08720a7af300f48a2f48c00622277d5d"
echo "   Region: af-south-1 (AF-Johannesburg)"
echo ""

echo "2. CREATE ECS INSTANCE"
echo "----------------------------------------"
echo "   Click 'Create ECS'"
echo "   Configure:"
echo "   - Name: mig-worker-ulearning"
echo "   - Billing: Pay-per-use"
echo "   - Region: af-south-1"
echo "   - AZ: AZ1"
echo "   - Flavor: c6.large.2 (2vCPU, 4GB RAM)"
echo "   - Image: Ubuntu 22.04 server 64bit"
echo "   - System Disk: 50GB SSD"
echo ""

echo "3. CONFIGURE NETWORK"
echo "----------------------------------------"
echo "   - VPC: UMOOC_FA_VPC"
echo "   - Subnet: ummoc_10"
echo "   - Security Group: UMOOC_AF"
echo "   - Elastic IP: None (use private IP)"
echo ""

echo "4. ADVANCED SETTINGS"
echo "----------------------------------------"
echo "   - Login Method: Key Pair"
echo "   - Key Pair: Create new 'mig-worker-key'"
echo "   - Agency: Attach agency with DCS FullAccess"
echo "   - Advanced Options → User Data (paste below):"
echo ""

cat << 'USERDATA'
#!/bin/bash
# mig_worker bootstrap script
set -e

echo "================================================"
echo "MIG_WORKER BOOTSTRAP SCRIPT"
echo "================================================"

# Update system
echo "Updating system..."
apt-get update
apt-get upgrade -y

# Install basic tools
echo "Installing basic tools..."
apt-get install -y \
    curl \
    wget \
    git \
    htop \
    iotop \
    iftop \
    nload \
    net-tools \
    dnsutils \
    python3 \
    python3-pip \
    python3-venv

# Install Redis tools
echo "Installing Redis tools..."
apt-get install -y redis-tools

# Install Memcached tools
echo "Installing Memcached tools..."
apt-get install -y libmemcached-tools netcat-openbsd

# Install RedisShake
echo "Installing RedisShake..."
cd /tmp
wget -q https://github.com/alibaba/RedisShake/releases/download/v3.1.7/redis-shake-linux-amd64.tar.gz
tar -xzf redis-shake-linux-amd64.tar.gz
chmod +x redis-shake
mv redis-shake /usr/local/bin/
rm redis-shake-linux-amd64.tar.gz

# Install Huawei Cloud CLI
echo "Installing Huawei Cloud CLI..."
curl -sSL https://hwcloudcli.obs.cn-north-1.myhuaweicloud.com/cli/latest/huaweicloud-cli-linux-amd64.tar.gz -o huaweicloud-cli.tar.gz
tar -xzf huaweicloud-cli.tar.gz
chmod +x huaweicloud-cli
mv huaweicloud-cli /usr/local/bin/hcloud
rm huaweicloud-cli.tar.gz

# Create migration directory
echo "Creating migration directory..."
mkdir -p /opt/migration
cd /opt/migration

# Create discovery script
cat > discover_instances.sh << 'EOF'
#!/bin/bash
echo "================================================"
echo "DISCOVER DCS INSTANCES"
echo "================================================"

# Set credentials from agency
export HUAWEICLOUD_SDK_AK=""
export HUAWEICLOUD_SDK_SK=""
export HUAWEICLOUD_SDK_REGION="af-south-1"

echo "1. Listing DCS instances..."
hcloud DCS ListInstances --limit=50

echo ""
echo "2. Finding Redis instances..."
hcloud DCS ListInstances --engine=redis --limit=50

echo ""
echo "3. Finding Memcached instances..."
hcloud DCS ListInstances --engine=memcached --limit=50

echo ""
echo "4. Getting network information..."
hcloud VPC ListVpcs
hcloud VPC ListSubnets
EOF

chmod +x discover_instances.sh

# Create test scripts
cat > test_redis.sh << 'EOF'
#!/bin/bash
REDIS_HOST="${1:-localhost}"
REDIS_PORT="${2:-6379}"
REDIS_PASSWORD="${3:-}"

echo "Testing Redis connection to $REDIS_HOST:$REDIS_PORT..."
if [ -n "$REDIS_PASSWORD" ]; then
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" PING
else
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" PING
fi

if [ $? -eq 0 ]; then
    echo "✅ Redis connection successful"
    echo ""
    echo "Redis INFO:"
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" INFO
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO
    fi
else
    echo "❌ Redis connection failed"
fi
EOF

cat > test_memcached.sh << 'EOF'
#!/bin/bash
MEMCACHED_HOST="${1:-localhost}"
MEMCACHED_PORT="${2:-11211}"

echo "Testing Memcached connection to $MEMCACHED_HOST:$MEMCACHED_PORT..."
echo "stats" | timeout 5 nc "$MEMCACHED_HOST" "$MEMCACHED_PORT"

if [ $? -eq 0 ]; then
    echo "✅ Memcached connection successful"
else
    echo "❌ Memcached connection failed"
fi
EOF

chmod +x test_redis.sh test_memcached.sh

echo ""
echo "✅ MIG_WORKER SETUP COMPLETE"
echo "================================================"
echo "Available commands:"
echo "  ./discover_instances.sh    - Discover DCS instances"
echo "  ./test_redis.sh <ip> <port> - Test Redis connection"
echo "  ./test_memcached.sh <ip> <port> - Test Memcached connection"
echo "  redis-shake                - Redis migration tool"
echo "  memcat/memdump             - Memcached tools"
echo ""
echo "Next steps:"
echo "1. Run: ./discover_instances.sh"
echo "2. Get Redis/Memcached private IPs"
echo "3. Test connectivity"
echo "4. Get instance specifications"
USERDATA

echo ""
echo "5. REVIEW AND CREATE"
echo "----------------------------------------"
echo "   - Review configuration"
echo "   - Click 'Create Now'"
echo "   - Wait for instance to be active (2-3 minutes)"
echo ""

echo "6. GET INSTANCE DETAILS"
echo "----------------------------------------"
echo "   After creation:"
echo "   - Note Private IP address"
echo "   - Download key pair (mig-worker-key.pem)"
echo "   - Save key to ~/.ssh/mig-worker-key.pem"
echo "   - Set permissions: chmod 400 ~/.ssh/mig-worker-key.pem"
echo ""

echo "7. SSH TO MIG_WORKER"
echo "----------------------------------------"
echo "   ssh -i ~/.ssh/mig-worker-key.pem ubuntu@[PRIVATE_IP]"
echo ""

echo "8. DISCOVER DCS INSTANCES"
echo "----------------------------------------"
echo "   cd /opt/migration"
echo "   ./discover_instances.sh"
echo ""

echo "9. TEST CONNECTIVITY"
echo "----------------------------------------"
echo "   # Test Redis"
echo "   ./test_redis.sh [REDIS_PRIVATE_IP] 6379"
echo ""
echo "   # Test Memcached"
echo "   ./test_memcached.sh [MEMCACHED_PRIVATE_IP] 11211"
echo ""

echo "🔧 AGENCY CONFIGURATION"
echo "================================================"
echo ""
echo "The mig_worker needs DCS permissions via agency:"
echo ""
echo "1. Go to IAM → Agencies"
echo "2. Create Agency:"
echo "   - Name: mig-worker-agency"
echo "   - Type: Cloud service"
echo "   - Cloud service: ECS"
echo "   - Duration: Permanent"
echo ""
echo "3. Grant Permissions:"
echo "   - DCS FullAccess"
echo "   - VPC FullAccess"
echo "   - ECS FullAccess"
echo ""
echo "4. Assign to mig_worker:"
echo "   - Go to ECS → mig-worker-ulearning"
echo "   - Agency → Select 'mig-worker-agency'"
echo ""

echo "📋 WHAT THE MIG_WORKER WILL DO:"
echo "================================================"
echo ""
echo "1. Discover all DCS instances in the project"
echo "2. Get Redis/Memcached private IPs and specs"
echo "3. Test connectivity to each instance"
echo "4. Collect migration requirements:"
echo "   - Redis version, memory usage, persistence"
echo "   - Memcached version, memory usage, items"
echo "5. Create migration plan"
echo ""

echo "🚀 READY TO DEPLOY!"
echo "================================================"
echo ""
echo "Next actions:"
echo "1. Deploy mig_worker via Console (steps 1-5)"
echo "2. Attach agency with DCS permissions"
echo "3. SSH to mig_worker"
echo "4. Run discovery script"
echo "5. Share results for migration planning"
echo ""
echo "Estimated time: 10-15 minutes"