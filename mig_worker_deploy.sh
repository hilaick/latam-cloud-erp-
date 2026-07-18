#!/bin/bash
# mig_worker_deploy.sh
# Deploy mig_worker in same subnet as Redis/Memcached

set -e

echo "================================================"
echo "MIG_WORKER DEPLOYMENT SCRIPT"
echo "================================================"

# Configuration
REGION="af-south-1"
VPC_NAME="UMOOC_FA_VPC"
SUBNET_NAME="ummoc_10"
SECURITY_GROUP="UMOOC_AF"
AVAILABILITY_ZONE="AZ1"

# Source credentials (for deployment)
SOURCE_AK="HPUAHMQ1ANAV4VJGYXSX"
SOURCE_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
PROJECT_ID="08720a7af300f48a2f48c00622277d5d"

# Instance configuration
INSTANCE_NAME="mig-worker-ulearning"
INSTANCE_TYPE="c6.large.2"  # 2vCPU, 4GB RAM
IMAGE_NAME="Ubuntu 22.04 server 64bit"
DISK_SIZE=50  # GB
KEYPAIR_NAME="mig-worker-key"  # You need to create this first

# Redis/Memcached endpoints (from console)
REDIS_ENDPOINT="redis-e0b18a2-dcs-r0il.dcs.huaweicloud.com:6379"
MEMCACHED_ENDPOINT="memcached-4e64b6b-dcs-ibu2.dcs.huaweicloud.com:11211"

echo "📋 Deployment Configuration:"
echo "  Region: $REGION"
echo "  VPC: $VPC_NAME"
echo "  Subnet: $SUBNET_NAME"
echo "  Security Group: $SECURITY_GROUP"
echo "  AZ: $AVAILABILITY_ZONE"
echo "  Instance: $INSTANCE_NAME ($INSTANCE_TYPE)"
echo "  Disk: ${DISK_SIZE}GB"
echo "  Redis: $REDIS_ENDPOINT"
echo "  Memcached: $MEMCACHED_ENDPOINT"
echo ""

echo "🔧 Step 1: Create Key Pair (if not exists)"
echo "================================================"
cat > create_keypair.sh << 'EOF'
#!/bin/bash
# Create SSH key pair for mig_worker
KEY_NAME="mig-worker-key"
KEY_FILE="$HOME/.ssh/mig-worker-key.pem"

if [ ! -f "$KEY_FILE" ]; then
    echo "Creating SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f "$KEY_FILE" -N "" -C "mig-worker-key"
    chmod 400 "$KEY_FILE"
    echo "✅ Key pair created: $KEY_FILE"
else
    echo "✅ Key pair already exists: $KEY_FILE"
fi

# Import to Huawei Cloud
echo "Importing key pair to Huawei Cloud..."
hcloud ECS ImportKeypair --cli-region=af-south-1 \
    --keypair_name="mig-worker-key" \
    --public_key="$(cat ${KEY_FILE}.pub)"
EOF
chmod +x create_keypair.sh
echo "Run: ./create_keypair.sh"
echo ""

echo "🔧 Step 2: Create mig_worker EC2 Instance"
echo "================================================"
cat > create_instance.sh << EOF
#!/bin/bash
# Create mig_worker EC2 instance

export HUAWEICLOUD_SDK_AK="$SOURCE_AK"
export HUAWEICLOUD_SDK_SK="$SOURCE_SK"
export HUAWEICLOUD_SDK_REGION="$REGION"

echo "Creating mig_worker instance..."

# First, get VPC ID
echo "Getting VPC ID for $VPC_NAME..."
VPC_ID=\$(hcloud VPC ListVpcs --cli-region=$REGION | \
    jq -r '.vpcs[] | select(.name=="'"$VPC_NAME"'") | .id')

if [ -z "\$VPC_ID" ]; then
    echo "❌ VPC '$VPC_NAME' not found"
    exit 1
fi
echo "✅ VPC ID: \$VPC_ID"

# Get Subnet ID
echo "Getting Subnet ID for $SUBNET_NAME..."
SUBNET_ID=\$(hcloud VPC ListSubnets --cli-region=$REGION --vpc_id="\$VPC_ID" | \
    jq -r '.subnets[] | select(.name=="'"$SUBNET_NAME"'") | .id')

if [ -z "\$SUBNET_ID" ]; then
    echo "❌ Subnet '$SUBNET_NAME' not found in VPC \$VPC_ID"
    exit 1
fi
echo "✅ Subnet ID: \$SUBNET_ID"

# Get Security Group ID
echo "Getting Security Group ID for $SECURITY_GROUP..."
SG_ID=\$(hcloud VPC ListSecurityGroups --cli-region=$REGION | \
    jq -r '.security_groups[] | select(.name=="'"$SECURITY_GROUP"'") | .id')

if [ -z "\$SG_ID" ]; then
    echo "❌ Security Group '$SECURITY_GROUP' not found"
    exit 1
fi
echo "✅ Security Group ID: \$SG_ID"

# Get Ubuntu 22.04 image ID
echo "Getting Ubuntu 22.04 image ID..."
IMAGE_ID=\$(hcloud IMS ListImages --cli-region=$REGION \
    --os_type="Linux" --platform="Ubuntu" \
    | jq -r '.images[] | select(.name | contains("22.04")) | .id' | head -1)

if [ -z "\$IMAGE_ID" ]; then
    echo "❌ Ubuntu 22.04 image not found"
    exit 1
fi
echo "✅ Image ID: \$IMAGE_ID"

# Create instance
echo "Creating EC2 instance..."
INSTANCE_JSON=\$(hcloud ECS CreateServers --cli-region=$REGION \
    --server.name="$INSTANCE_NAME" \
    --server.imageRef="\$IMAGE_ID" \
    --server.flavorRef="$INSTANCE_TYPE" \
    --server.vpcid="\$VPC_ID" \
    --server.nics[0].subnet_id="\$SUBNET_ID" \
    --server.security_groups[0].id="\$SG_ID" \
    --server.availability_zone="$AVAILABILITY_ZONE" \
    --server.root_volume.type="SSD" \
    --server.root_volume.size="$DISK_SIZE" \
    --server.key_name="mig-worker-key" \
    --server.count=1)

if [ \$? -eq 0 ]; then
    INSTANCE_ID=\$(echo "\$INSTANCE_JSON" | jq -r '.server.id')
    echo "✅ Instance created: \$INSTANCE_ID"
    echo "Instance details:"
    echo "\$INSTANCE_JSON" | jq '.'
    
    # Wait for instance to be running
    echo "Waiting for instance to be active..."
    sleep 30
    
    # Get instance IP
    echo "Getting instance IP..."
    INSTANCE_DETAILS=\$(hcloud ECS ShowServer --cli-region=$REGION --server_id="\$INSTANCE_ID")
    PRIVATE_IP=\$(echo "\$INSTANCE_DETAILS" | jq -r '.server.addresses[] | .[] | select(.OS-EXT-IPS:type=="fixed") | .addr' | head -1)
    echo "✅ Private IP: \$PRIVATE_IP"
    
    echo ""
    echo "================================================"
    echo "🎯 MIG_WORKER DEPLOYED SUCCESSFULLY!"
    echo "================================================"
    echo "Instance ID: \$INSTANCE_ID"
    echo "Private IP: \$PRIVATE_IP"
    echo "Name: $INSTANCE_NAME"
    echo "Type: $INSTANCE_TYPE"
    echo "VPC: $VPC_NAME"
    echo "Subnet: $SUBNET_NAME"
    echo "Security Group: $SECURITY_GROUP"
    echo ""
    echo "🔗 SSH Access:"
    echo "ssh -i ~/.ssh/mig-worker-key.pem ubuntu@\$PRIVATE_IP"
    echo ""
else
    echo "❌ Failed to create instance"
    echo "\$INSTANCE_JSON"
    exit 1
fi
EOF
chmod +x create_instance.sh
echo "Run: ./create_instance.sh"
echo ""

echo "🔧 Step 3: Install Migration Tools (After SSH)"
echo "================================================"
cat > install_tools.sh << 'EOF'
#!/bin/bash
# Install migration tools on mig_worker

set -e

echo "Updating system..."
sudo apt update && sudo apt upgrade -y

echo "Installing Redis tools..."
sudo apt install -y redis-tools

echo "Installing Memcached tools..."
sudo apt install -y libmemcached-tools netcat-openbsd

echo "Installing RedisShake..."
wget https://github.com/alibaba/RedisShake/releases/download/v3.1.7/redis-shake-linux-amd64.tar.gz
tar -xzf redis-shake-linux-amd64.tar.gz
chmod +x redis-shake
sudo mv redis-shake /usr/local/bin/

echo "Installing monitoring tools..."
sudo apt install -y htop iotop iftop nload

echo "Installing Python and pip..."
sudo apt install -y python3 python3-pip python3-venv

echo "Creating migration directory..."
mkdir -p ~/migration
cd ~/migration

echo "Creating Redis test script..."
cat > test_redis.sh << 'REDIS_EOF'
#!/bin/bash
REDIS_HOST="$1"
REDIS_PORT="${2:-6379}"

echo "Testing Redis connection to $REDIS_HOST:$REDIS_PORT..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" PING
if [ $? -eq 0 ]; then
    echo "✅ Redis connection successful"
    echo "Getting Redis info..."
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO | head -50
else
    echo "❌ Redis connection failed"
fi
REDIS_EOF
chmod +x test_redis.sh

echo "Creating Memcached test script..."
cat > test_memcached.sh << 'MEMCACHED_EOF'
#!/bin/bash
MEMCACHED_HOST="$1"
MEMCACHED_PORT="${2:-11211}"

echo "Testing Memcached connection to $MEMCACHED_HOST:$MEMCACHED_PORT..."
echo "stats" | nc "$MEMCACHED_HOST" "$MEMCACHED_PORT" | head -20
if [ $? -eq 0 ]; then
    echo "✅ Memcached connection successful"
else
    echo "❌ Memcached connection failed"
fi
MEMCACHED_EOF
chmod +x test_memcached.sh

echo "Creating migration configuration..."
cat > redis_shake.conf << 'CONFIG_EOF'
# RedisShake configuration for ULEARNING migration
source.type = "standalone"
source.address = "REDIS_SOURCE_IP:6379"
source.password_raw = ""

target.type = "standalone"
target.address = "REDIS_TARGET_IP:6379"
target.password_raw = ""

# Performance tuning
parallel = 32
psync = true
# ... rest of config
CONFIG_EOF

echo "✅ Migration tools installed successfully!"
echo ""
echo "Usage:"
echo "  Test Redis: ./test_redis.sh <redis_ip> <port>"
echo "  Test Memcached: ./test_memcached.sh <memcached_ip> <port>"
echo "  Start RedisShake: ./redis-shake -conf=redis_shake.conf"
EOF
chmod +x install_tools.sh
echo "Run on mig_worker: ./install_tools.sh"
echo ""

echo "🔧 Step 4: Configure Security Group Rules"
echo "================================================"
cat > configure_sg.sh << EOF
#!/bin/bash
# Configure security group for mig_worker

export HUAWEICLOUD_SDK_AK="$SOURCE_AK"
export HUAWEICLOUD_SDK_SK="$SOURCE_SK"
export HUAWEICLOUD_SDK_REGION="$REGION"

# Get Security Group ID
SG_ID=\$(hcloud VPC ListSecurityGroups --cli-region=$REGION | \
    jq -r '.security_groups[] | select(.name=="'"$SECURITY_GROUP"'") | .id')

if [ -z "\$SG_ID" ]; then
    echo "❌ Security Group '$SECURITY_GROUP' not found"
    exit 1
fi

echo "Configuring Security Group: $SECURITY_GROUP (\$SG_ID)"

# Add SSH rule (port 22)
echo "Adding SSH rule (port 22)..."
hcloud VPC CreateSecurityGroupRule --cli-region=$REGION \
    --security_group_id="\$SG_ID" \
    --security_group_rule.protocol="tcp" \
    --security_group_rule.ethertype="IPv4" \
    --security_group_rule.port_range_min=22 \
    --security_group_rule.port_range_max=22 \
    --security_group_rule.direction="ingress" \
    --security_group_rule.remote_ip_prefix="0.0.0.0/0"

# Add Redis rule (port 6379)
echo "Adding Redis rule (port 6379)..."
hcloud VPC CreateSecurityGroupRule --cli-region=$REGION \
    --security_group_id="\$SG_ID" \
    --security_group_rule.protocol="tcp" \
    --security_group_rule.ethertype="IPv4" \
    --security_group_rule.port_range_min=6379 \
    --security_group_rule.port_range_max=6379 \
    --security_group_rule.direction="ingress" \
    --security_group_rule.remote_ip_prefix="0.0.0.0/0"

# Add Memcached rule (port 11211)
echo "Adding Memcached rule (port 11211)..."
hcloud VPC CreateSecurityGroupRule --cli-region=$REGION \
    --security_group_id="\$SG_ID" \
    --security_group_rule.protocol="tcp" \
    --security_group_rule.ethertype="IPv4" \
    --security_group_rule.port_range_min=11211 \
    --security_group_rule.port_range_max=11211 \
    --security_group_rule.direction="ingress" \
    --security_group_rule.remote_ip_prefix="0.0.0.0/0"

echo "✅ Security Group rules configured"
EOF
chmod +x configure_sg.sh
echo "Run: ./configure_sg.sh"
echo ""

echo "🔧 Step 5: Test Connectivity"
echo "================================================"
cat > test_connectivity.sh << 'EOF'
#!/bin/bash
# Test connectivity from mig_worker to Redis/Memcached

echo "Testing connectivity to Redis/Memcached..."

# Get Redis private IP (you'll need to provide this)
REDIS_IP="REDIS_PRIVATE_IP"  # Replace with actual IP
MEMCACHED_IP="MEMCACHED_PRIVATE_IP"  # Replace with actual IP

echo "1. Testing Redis connection..."
if redis-cli -h "$REDIS_IP" -p 6379 PING; then
    echo "✅ Redis connection successful"
    echo "Redis INFO:"
    redis-cli -h "$REDIS_IP" -p 6379 INFO | grep -E "(redis_version|used_memory_human|connected_clients|role|master|slave)"
else
    echo "❌ Redis connection failed"
fi

echo ""
echo "2. Testing Memcached connection..."
if echo "stats" | timeout 5 nc "$MEMCACHED_IP" 11211 | head -5; then
    echo "✅ Memcached connection successful"
else
    echo "❌ Memcached connection failed"
fi

echo ""
echo "3. Testing network latency..."
ping -c 3 "$REDIS_IP"
ping -c 3 "$MEMCACHED_IP"
EOF
chmod +x test_connectivity.sh
echo "Run on mig_worker after deployment"
echo ""

echo "================================================"
echo "🚀 DEPLOYMENT SUMMARY"
echo "================================================"
echo "1. Create SSH key pair: ./create_keypair.sh"
echo "2. Create mig_worker instance: ./create_instance.sh"
echo "3. Configure security group: ./configure_sg.sh"
echo "4. SSH to mig_worker and install tools"
echo "5. Test connectivity: ./test_connectivity.sh"
echo ""
echo "📋 NEXT STEPS AFTER DEPLOYMENT:"
echo "1. Get Redis/Memcached private IPs from console"
echo "2. Update test_connectivity.sh with actual IPs"
echo "3. Run connectivity tests"
echo "4. Get instance specs via mig_worker"
echo "5. Create target instances in ULEARNING account"
echo "6. Start migration"
echo ""
echo "⚠️  IMPORTANT: You need Redis/Memcached private IPs!"
echo "   Get them from DCS console and update the scripts."