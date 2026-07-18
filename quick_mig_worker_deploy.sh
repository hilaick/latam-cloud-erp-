#!/bin/bash
# quick_mig_worker_deploy.sh
# Simplified mig_worker deployment

echo "================================================"
echo "QUICK MIG_WORKER DEPLOYMENT"
echo "================================================"

# Export source credentials
export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX"
export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
export HUAWEICLOUD_SDK_REGION="af-south-1"

# Configuration
VPC_NAME="UMOOC_FA_VPC"
SUBNET_NAME="ummoc_10"
SECURITY_GROUP="UMOOC_AF"
AZ="AZ1"

echo "🔍 Step 1: Get Network IDs"
echo "================================================"

# Get VPC ID
echo "Getting VPC ID for $VPC_NAME..."
VPC_ID=$(hcloud VPC ListVpcs --cli-region=af-south-1 | \
    jq -r '.vpcs[] | select(.name=="'"$VPC_NAME"'") | .id')

if [ -z "$VPC_ID" ]; then
    echo "❌ VPC '$VPC_NAME' not found"
    echo "Available VPCs:"
    hcloud VPC ListVpcs --cli-region=af-south-1 | jq -r '.vpcs[] | .name'
    exit 1
fi
echo "✅ VPC ID: $VPC_ID"

# Get Subnet ID
echo "Getting Subnet ID for $SUBNET_NAME..."
SUBNET_ID=$(hcloud VPC ListSubnets --cli-region=af-south-1 --vpc_id="$VPC_ID" | \
    jq -r '.subnets[] | select(.name=="'"$SUBNET_NAME"'") | .id')

if [ -z "$SUBNET_ID" ]; then
    echo "❌ Subnet '$SUBNET_NAME' not found in VPC $VPC_ID"
    echo "Available subnets in VPC $VPC_ID:"
    hcloud VPC ListSubnets --cli-region=af-south-1 --vpc_id="$VPC_ID" | jq -r '.subnets[] | .name'
    exit 1
fi
echo "✅ Subnet ID: $SUBNET_ID"

# Get Security Group ID
echo "Getting Security Group ID for $SECURITY_GROUP..."
SG_ID=$(hcloud VPC ListSecurityGroups --cli-region=af-south-1 | \
    jq -r '.security_groups[] | select(.name=="'"$SECURITY_GROUP"'") | .id')

if [ -z "$SG_ID" ]; then
    echo "❌ Security Group '$SECURITY_GROUP' not found"
    echo "Available Security Groups:"
    hcloud VPC ListSecurityGroups --cli-region=af-south-1 | jq -r '.security_groups[] | .name'
    exit 1
fi
echo "✅ Security Group ID: $SG_ID"

echo ""
echo "🔍 Step 2: Check Existing Instances"
echo "================================================"

# Check if mig_worker already exists
EXISTING_INSTANCE=$(hcloud ECS NovaListServers --cli-region=af-south-1 | \
    jq -r '.servers[] | select(.name | contains("mig-worker")) | .id')

if [ -n "$EXISTING_INSTANCE" ]; then
    echo "⚠️  Existing mig_worker found: $EXISTING_INSTANCE"
    echo "Getting details..."
    INSTANCE_DETAILS=$(hcloud ECS ShowServer --cli-region=af-south-1 --server_id="$EXISTING_INSTANCE")
    INSTANCE_IP=$(echo "$INSTANCE_DETAILS" | jq -r '.server.addresses[] | .[] | select(."OS-EXT-IPS:type"=="fixed") | .addr' | head -1)
    INSTANCE_STATUS=$(echo "$INSTANCE_DETAILS" | jq -r '.server.status')
    
    echo "✅ Existing mig_worker:"
    echo "   ID: $EXISTING_INSTANCE"
    echo "   IP: $INSTANCE_IP"
    echo "   Status: $INSTANCE_STATUS"
    echo ""
    echo "Use existing instance? (y/n)"
    read -r USE_EXISTING
    
    if [[ "$USE_EXISTING" == "y" || "$USE_EXISTING" == "Y" ]]; then
        echo ""
        echo "🎯 USING EXISTING MIG_WORKER"
        echo "================================================"
        echo "SSH to mig_worker:"
        echo "ssh -i ~/.ssh/mig-worker-key.pem ubuntu@$INSTANCE_IP"
        echo ""
        echo "Install tools:"
        echo "wget -O install_tools.sh https://raw.githubusercontent.com/alibaba/RedisShake/master/scripts/install.sh && bash install_tools.sh"
        exit 0
    fi
fi

echo ""
echo "🔧 Step 3: Create mig_worker Instance"
echo "================================================"

# Create key pair first if not exists
KEY_FILE="$HOME/.ssh/mig-worker-key.pem"
if [ ! -f "$KEY_FILE" ]; then
    echo "Creating SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f "$KEY_FILE" -N "" -C "mig-worker-key"
    chmod 400 "$KEY_FILE"
    
    # Import to Huawei Cloud
    echo "Importing key pair to Huawei Cloud..."
    hcloud ECS ImportKeypair --cli-region=af-south-1 \
        --keypair_name="mig-worker-key" \
        --public_key="$(cat ${KEY_FILE}.pub)"
    echo "✅ Key pair created and imported"
else
    echo "✅ SSH key pair already exists: $KEY_FILE"
fi

# Get Ubuntu 22.04 image
echo "Getting Ubuntu 22.04 image..."
IMAGE_ID=$(hcloud IMS ListImages --cli-region=af-south-1 \
    --os_type="Linux" --platform="Ubuntu" \
    | jq -r '.images[] | select(.name | contains("22.04")) | .id' | head -1)

if [ -z "$IMAGE_ID" ]; then
    echo "❌ Ubuntu 22.04 image not found"
    echo "Available Ubuntu images:"
    hcloud IMS ListImages --cli-region=af-south-1 --os_type="Linux" --platform="Ubuntu" | jq -r '.images[] | .name'
    exit 1
fi
echo "✅ Image ID: $IMAGE_ID"

# Create instance
echo "Creating mig_worker instance..."
INSTANCE_JSON=$(hcloud ECS CreateServers --cli-region=af-south-1 \
    --server.name="mig-worker-ulearning" \
    --server.imageRef="$IMAGE_ID" \
    --server.flavorRef="c6.large.2" \
    --server.vpcid="$VPC_ID" \
    --server.nics[0].subnet_id="$SUBNET_ID" \
    --server.security_groups[0].id="$SG_ID" \
    --server.availability_zone="$AZ" \
    --server.root_volume.type="SSD" \
    --server.root_volume.size="50" \
    --server.key_name="mig-worker-key" \
    --server.count=1)

if [ $? -eq 0 ]; then
    INSTANCE_ID=$(echo "$INSTANCE_JSON" | jq -r '.server.id')
    echo "✅ Instance created: $INSTANCE_ID"
    
    # Wait for instance
    echo "Waiting 30 seconds for instance to be active..."
    sleep 30
    
    # Get instance IP
    INSTANCE_DETAILS=$(hcloud ECS ShowServer --cli-region=af-south-1 --server_id="$INSTANCE_ID")
    PRIVATE_IP=$(echo "$INSTANCE_DETAILS" | jq -r '.server.addresses[] | .[] | select(."OS-EXT-IPS:type"=="fixed") | .addr' | head -1)
    
    echo ""
    echo "🎯 MIG_WORKER DEPLOYED SUCCESSFULLY!"
    echo "================================================"
    echo "Instance ID: $INSTANCE_ID"
    echo "Private IP: $PRIVATE_IP"
    echo "Name: mig-worker-ulearning"
    echo "Type: c6.large.2 (2vCPU, 4GB RAM)"
    echo "VPC: $VPC_NAME"
    echo "Subnet: $SUBNET_NAME"
    echo "Security Group: $SECURITY_GROUP"
    echo "AZ: $AZ"
    echo ""
    echo "🔗 SSH Access:"
    echo "ssh -i ~/.ssh/mig-worker-key.pem ubuntu@$PRIVATE_IP"
    echo ""
    echo "📦 Installation Commands (run on mig_worker):"
    echo "================================================"
    echo "# Update system"
    echo "sudo apt update && sudo apt upgrade -y"
    echo ""
    echo "# Install Redis tools"
    echo "sudo apt install -y redis-tools"
    echo ""
    echo "# Install Memcached tools"
    echo "sudo apt install -y libmemcached-tools netcat-openbsd"
    echo ""
    echo "# Install RedisShake"
    echo "wget https://github.com/alibaba/RedisShake/releases/download/v3.1.7/redis-shake-linux-amd64.tar.gz"
    echo "tar -xzf redis-shake-linux-amd64.tar.gz"
    echo "chmod +x redis-shake"
    echo "sudo mv redis-shake /usr/local/bin/"
    echo ""
    echo "# Test connectivity (replace IPs)"
    echo "redis-cli -h REDIS_PRIVATE_IP -p 6379 PING"
    echo "echo \"stats\" | nc MEMCACHED_PRIVATE_IP 11211"
    
else
    echo "❌ Failed to create instance"
    echo "$INSTANCE_JSON"
    exit 1
fi

echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "================================================"
echo "1. Get Redis/Memcached private IPs from DCS console"
echo "2. SSH to mig_worker and install tools"
echo "3. Test connectivity to Redis/Memcached"
echo "4. Get instance specifications"
echo "5. Create target instances in ULEARNING account"
echo "6. Start migration"