#!/bin/bash
# Create mig_worker EC2 instance

export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX"
export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
export HUAWEICLOUD_SDK_REGION="af-south-1"

echo "Creating mig_worker instance..."

# First, get VPC ID
echo "Getting VPC ID for UMOOC_FA_VPC..."
VPC_ID=$(hcloud VPC ListVpcs --cli-region=af-south-1 |     jq -r '.vpcs[] | select(.name=="'"UMOOC_FA_VPC"'") | .id')

if [ -z "$VPC_ID" ]; then
    echo "❌ VPC 'UMOOC_FA_VPC' not found"
    exit 1
fi
echo "✅ VPC ID: $VPC_ID"

# Get Subnet ID
echo "Getting Subnet ID for ummoc_10..."
SUBNET_ID=$(hcloud VPC ListSubnets --cli-region=af-south-1 --vpc_id="$VPC_ID" |     jq -r '.subnets[] | select(.name=="'"ummoc_10"'") | .id')

if [ -z "$SUBNET_ID" ]; then
    echo "❌ Subnet 'ummoc_10' not found in VPC $VPC_ID"
    exit 1
fi
echo "✅ Subnet ID: $SUBNET_ID"

# Get Security Group ID
echo "Getting Security Group ID for UMOOC_AF..."
SG_ID=$(hcloud VPC ListSecurityGroups --cli-region=af-south-1 |     jq -r '.security_groups[] | select(.name=="'"UMOOC_AF"'") | .id')

if [ -z "$SG_ID" ]; then
    echo "❌ Security Group 'UMOOC_AF' not found"
    exit 1
fi
echo "✅ Security Group ID: $SG_ID"

# Get Ubuntu 22.04 image ID
echo "Getting Ubuntu 22.04 image ID..."
IMAGE_ID=$(hcloud IMS ListImages --cli-region=af-south-1     --os_type="Linux" --platform="Ubuntu"     | jq -r '.images[] | select(.name | contains("22.04")) | .id' | head -1)

if [ -z "$IMAGE_ID" ]; then
    echo "❌ Ubuntu 22.04 image not found"
    exit 1
fi
echo "✅ Image ID: $IMAGE_ID"

# Create instance
echo "Creating EC2 instance..."
INSTANCE_JSON=$(hcloud ECS CreateServers --cli-region=af-south-1     --server.name="mig-worker-ulearning"     --server.imageRef="$IMAGE_ID"     --server.flavorRef="c6.large.2"     --server.vpcid="$VPC_ID"     --server.nics[0].subnet_id="$SUBNET_ID"     --server.security_groups[0].id="$SG_ID"     --server.availability_zone="AZ1"     --server.root_volume.type="SSD"     --server.root_volume.size="50"     --server.key_name="mig-worker-key"     --server.count=1)

if [ $? -eq 0 ]; then
    INSTANCE_ID=$(echo "$INSTANCE_JSON" | jq -r '.server.id')
    echo "✅ Instance created: $INSTANCE_ID"
    echo "Instance details:"
    echo "$INSTANCE_JSON" | jq '.'
    
    # Wait for instance to be running
    echo "Waiting for instance to be active..."
    sleep 30
    
    # Get instance IP
    echo "Getting instance IP..."
    INSTANCE_DETAILS=$(hcloud ECS ShowServer --cli-region=af-south-1 --server_id="$INSTANCE_ID")
    PRIVATE_IP=$(echo "$INSTANCE_DETAILS" | jq -r '.server.addresses[] | .[] | select(.OS-EXT-IPS:type=="fixed") | .addr' | head -1)
    echo "✅ Private IP: $PRIVATE_IP"
    
    echo ""
    echo "================================================"
    echo "🎯 MIG_WORKER DEPLOYED SUCCESSFULLY!"
    echo "================================================"
    echo "Instance ID: $INSTANCE_ID"
    echo "Private IP: $PRIVATE_IP"
    echo "Name: mig-worker-ulearning"
    echo "Type: c6.large.2"
    echo "VPC: UMOOC_FA_VPC"
    echo "Subnet: ummoc_10"
    echo "Security Group: UMOOC_AF"
    echo ""
    echo "🔗 SSH Access:"
    echo "ssh -i ~/.ssh/mig-worker-key.pem ubuntu@$PRIVATE_IP"
    echo ""
else
    echo "❌ Failed to create instance"
    echo "$INSTANCE_JSON"
    exit 1
fi
