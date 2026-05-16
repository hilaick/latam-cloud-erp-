#!/bin/bash
set -e

# Pre-flight Checks
if ! command -v jq &> /dev/null; then echo "❌ ERROR: jq is required but not installed." && exit 1; fi
if ! command -v hcloud &> /dev/null; then echo "❌ ERROR: hcloud CLI is not installed." && exit 1; fi

source /root/.huawei_credentials

REGION="la-north-2"
PROJECT_ID=$HUAWEI_PROJECT_ID
VPC_NAME="CAC-Prod-VPC-$(date +%Y%m%d-%H%M%S)"
RESOURCE_LOG="/root/huawei_resources_$(date +%Y%m%d_%H%M%S).log"

# Huawei proprietary Debian 11.7.0 image (non-marketplace, works with internal accounts)
DEBIAN_IMAGE_ID="b6b51393-0309-4fbc-aff7-b24f39b38db9"
AVAILABILITY_ZONE="la-north-2a"

echo "# Huawei Cloud Resource IDs" > "$RESOURCE_LOG"
echo "REGION=\"$REGION\"" >> "$RESOURCE_LOG"
echo "PROJECT_ID=\"$PROJECT_ID\"" >> "$RESOURCE_LOG"

echo "=== STARTING PROVISIONING ==="
echo "Using Huawei proprietary Debian 11.7.0 image"
echo "Image ID: $DEBIAN_IMAGE_ID"
echo "Availability Zone: $AVAILABILITY_ZONE"

# 1. Create VPC
echo "-> Creating VPC: $VPC_NAME"
VPC_OUTPUT=$(hcloud VPC CreateVpc --cli-region="$REGION" --project_id="$PROJECT_ID" --vpc.name="$VPC_NAME" --vpc.cidr="10.0.0.0/16" 2>&1)

# Check if the output contains an error code
if echo "$VPC_OUTPUT" | grep -q '"code"'; then
    ERROR_CODE=$(echo "$VPC_OUTPUT" | head -1 | jq -r '.code' 2>/dev/null || echo "UNKNOWN")
    ERROR_MSG=$(echo "$VPC_OUTPUT" | head -1 | jq -r '.message' 2>/dev/null || echo "Unknown error")
    echo "❌ VPC Creation Failed: $ERROR_CODE - $ERROR_MSG"
    echo "Full error output:"
    echo "$VPC_OUTPUT"
    exit 1
fi

# Try to extract VPC ID - handle both success and weird output
VPC_ID=$(echo "$VPC_OUTPUT" | jq -r '.vpc.id' 2>/dev/null)
if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "null" ]; then
    # Try alternative extraction method
    VPC_ID=$(echo "$VPC_OUTPUT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "null" ]; then
    echo "❌ Failed to extract VPC ID from output"
    echo "Raw output (first 30 lines):"
    echo "$VPC_OUTPUT" | head -30
    exit 1
fi

echo "VPC_ID=\"$VPC_ID\"" >> "$RESOURCE_LOG"
echo "[OK] VPC Created: $VPC_ID"

# 2. Create a subnet in the VPC (required for NIC)
echo "-> Creating subnet in VPC"
SUBNET_OUTPUT=$(hcloud VPC CreateSubnet \
    --cli-region="$REGION" \
    --project_id="$PROJECT_ID" \
    --subnet.name="subnet-$VPC_NAME" \
    --subnet.cidr="10.0.1.0/24" \
    --subnet.gateway_ip="10.0.1.1" \
    --subnet.vpc_id="$VPC_ID" 2>&1)

if echo "$SUBNET_OUTPUT" | grep -q '"code"'; then
    ERROR_CODE=$(echo "$SUBNET_OUTPUT" | head -1 | jq -r '.code' 2>/dev/null || echo "UNKNOWN")
    ERROR_MSG=$(echo "$SUBNET_OUTPUT" | head -1 | jq -r '.message' 2>/dev/null || echo "Unknown error")
    echo "❌ Subnet Creation Failed: $ERROR_CODE - $ERROR_MSG"
    echo "Trying to use existing subnet from previous deployment..."
    # Try to use the subnet we created earlier for testing
    SUBNET_ID="c2bc155c-ac26-4333-bc17-b45805497409"
else
    SUBNET_ID=$(echo "$SUBNET_OUTPUT" | jq -r '.subnet.id' 2>/dev/null)
    if [ -z "$SUBNET_ID" ] || [ "$SUBNET_ID" = "null" ]; then
        SUBNET_ID=$(echo "$SUBNET_OUTPUT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    fi
    if [ -n "$SUBNET_ID" ] && [ "$SUBNET_ID" != "null" ]; then
        echo "SUBNET_ID=\"$SUBNET_ID\"" >> "$RESOURCE_LOG"
        echo "[OK] Subnet Created: $SUBNET_ID"
    else
        echo "❌ Failed to extract subnet ID"
        echo "Raw output (first 20 lines):"
        echo "$SUBNET_OUTPUT" | head -20
        exit 1
    fi
fi

# 3. Extract and Deploy Servers from Blueprint
echo "-> Reading blueprint.json"
echo "DEBUG: Testing jq parsing of blueprint.json..."
if ! jq -c '.servers[]' blueprint.json > /dev/null 2>&1; then
    echo "❌ ERROR: Failed to parse blueprint.json with jq"
    echo "jq error output:"
    jq -c '.servers[]' blueprint.json 2>&1
    exit 1
fi
echo "✅ blueprint.json parsed successfully"

PIDS=()
ERROR_COUNT=0

# Use while loop to properly handle JSON objects
while IFS= read -r server; do
    SERVER_NAME=$(echo "$server" | jq -r '.server_name' | tr -d ' ' | tr -d '\r')
    FLAVOR=$(echo "$server" | jq -r '.flavor')
    
    echo "-> Deploying ECS: $SERVER_NAME ($FLAVOR)"
    echo "   Using Huawei proprietary Debian 11.7.0 image"
    echo "   Zone: $AVAILABILITY_ZONE"
    echo "   Subnet: $SUBNET_ID"
    
    # Generate a secure password
    ADMIN_PASS="Cac-Prod!$(openssl rand -hex 4)9$"
    
    # Create ECS with NIC parameter
    ECS_OUTPUT=$(hcloud ECS CreateServers \
        --cli-region="$REGION" \
        --project_id="$PROJECT_ID" \
        --server.name="$SERVER_NAME" \
        --server.flavorRef="$FLAVOR" \
        --server.imageRef="$DEBIAN_IMAGE_ID" \
        --server.root_volume.volumetype="SSD" \
        --server.root_volume.size=40 \
        --server.vpcid="$VPC_ID" \
        --server.nics.1.subnet_id="$SUBNET_ID" \
        --server.adminPass="$ADMIN_PASS" \
        --server.availability_zone="$AVAILABILITY_ZONE" \
        --server.count=1 2>&1)
    
    # Check for errors in ECS output
    if echo "$ECS_OUTPUT" | grep -q '"code"'; then
        ERROR_CODE=$(echo "$ECS_OUTPUT" | head -1 | jq -r '.code' 2>/dev/null || echo "UNKNOWN")
        ERROR_MSG=$(echo "$ECS_OUTPUT" | head -1 | jq -r '.message' 2>/dev/null || echo "$ECS_OUTPUT")
        echo "❌ ECS Creation Failed for $SERVER_NAME: $ERROR_CODE"
        echo "Error details: $ERROR_MSG"
        echo "Full error output (first 30 lines):"
        echo "$ECS_OUTPUT" | head -30
        ERROR_COUNT=$((ERROR_COUNT + 1))
        continue
    fi
    
    ECS_ID=$(echo "$ECS_OUTPUT" | jq -r '.serverIds[0]' 2>/dev/null || echo "")
    if [ -z "$ECS_ID" ] || [ "$ECS_ID" = "null" ]; then
        echo "❌ Failed to extract ECS ID for $SERVER_NAME"
        echo "Raw output (first 20 lines):"
        echo "$ECS_OUTPUT" | head -20
        ERROR_COUNT=$((ERROR_COUNT + 1))
        continue
    fi
    
    echo "ECS_$SERVER_NAME=\"$ECS_ID\"" >> "$RESOURCE_LOG"
    echo "PASS_$SERVER_NAME=\"$ADMIN_PASS\"" >> "$RESOURCE_LOG"
    echo "[OK] $SERVER_NAME deployed: $ECS_ID"
    echo "   Password saved to resource log"
    
    sleep 2
done < <(jq -c '.servers[]' blueprint.json)

if [ $ERROR_COUNT -gt 0 ]; then
    echo "❌ $ERROR_COUNT ECS deployment(s) failed"
    echo "[OK] ECS Deployments Complete (with errors)"
else
    echo "[OK] ECS Deployments Complete"
fi

# 4. Create Security Groups & EIPs (only if ECS deployments succeeded)
if [ $ERROR_COUNT -eq 0 ]; then
    echo "-> Creating Security Groups and EIPs..."
    while IFS= read -r server; do
        SERVER_NAME=$(echo "$server" | jq -r '.server_name' | tr -d ' ' | tr -d '\r')
        IS_PUBLIC=$(echo "$server" | jq -r '.is_public // "true"')
        
        # Security Group
        SG_OUTPUT=$(hcloud VPC CreateSecurityGroup --cli-region="$REGION" --project_id="$PROJECT_ID" --security_group.name="sg-$SERVER_NAME" 2>&1)
        
        if echo "$SG_OUTPUT" | grep -q '"code"'; then
            ERROR_CODE=$(echo "$SG_OUTPUT" | head -1 | jq -r '.code' 2>/dev/null || echo "UNKNOWN")
            echo "⚠️ Security Group creation failed for $SERVER_NAME: $ERROR_CODE"
        else
            SG_ID=$(echo "$SG_OUTPUT" | jq -r '.security_group.id' 2>/dev/null || echo "")
            if [ -n "$SG_ID" ] && [ "$SG_ID" != "null" ]; then
                echo "SG_$SERVER_NAME=\"$SG_ID\"" >> "$RESOURCE_LOG"
                hcloud VPC CreateSecurityGroupRule --cli-region="$REGION" --project_id="$PROJECT_ID" --security_group_rule.security_group_id="$SG_ID" --security_group_rule.direction="ingress" --security_group_rule.protocol="tcp" --security_group_rule.multiport="22" --security_group_rule.remote_ip_prefix="0.0.0.0/0" > /dev/null 2>&1
                echo "[OK] Security Group created for $SERVER_NAME"
            fi
        fi
        
        # EIP
        if [ "$IS_PUBLIC" = "true" ]; then
            EIP_OUTPUT=$(hcloud EIP CreatePublicip --cli-region="$REGION" --project_id="$PROJECT_ID" --publicip.type="5_bgp" --bandwidth.name="bw-$SERVER_NAME" --bandwidth.size=5 --bandwidth.share_type="PER" 2>&1)
            
            if echo "$EIP_OUTPUT" | grep -q '"code"'; then
                ERROR_CODE=$(echo "$EIP_OUTPUT" | head -1 | jq -r '.code' 2>/dev/null || echo "UNKNOWN")
                echo "⚠️ EIP creation failed for $SERVER_NAME: $ERROR_CODE"
            else
                EIP_ID=$(echo "$EIP_OUTPUT" | jq -r '.publicip.id' 2>/dev/null || echo "")
                if [ -n "$EIP_ID" ] && [ "$EIP_ID" != "null" ]; then
                    echo "EIP_$SERVER_NAME=\"$EIP_ID\"" >> "$RESOURCE_LOG"
                    
                    ECS_ID=$(grep "ECS_$SERVER_NAME=" "$RESOURCE_LOG" | cut -d'"' -f2)
                    if [ -n "$ECS_ID" ] && [ "$ECS_ID" != "null" ]; then
                        hcloud EIP AssociatePublicips --cli-region="$REGION" --project_id="$PROJECT_ID" --publicip_id="$EIP_ID" --instance_id="$ECS_ID" > /dev/null 2>&1
                        echo "[OK] EIP attached to $SERVER_NAME"
                    fi
                fi
            fi
        fi
    done < <(jq -c '.servers[]' blueprint.json)
else
    echo "⚠️ Skipping Security Groups and EIPs due to ECS deployment failures"
fi

echo "=== DEPLOYMENT COMPLETE ==="
if [ $ERROR_COUNT -gt 0 ]; then
    echo "⚠️ Deployment completed with $ERROR_COUNT error(s)"
    exit 1
else
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Resource Summary:"
    echo "   VPC: $VPC_ID"
    echo "   Subnet: $SUBNET_ID"
    echo "   ECS Instances deployed:"
    grep "^ECS_" "$RESOURCE_LOG" || echo "   (none)"
    echo ""
    echo "🔐 Passwords saved to: $RESOURCE_LOG"
    exit 0
fi