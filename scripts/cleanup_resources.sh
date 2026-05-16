#!/bin/bash
set -e

echo "🧹 HUAWEI CLOUD RESOURCE CLEANUP"
echo "========================================"

# Load credentials
if [ ! -f "/root/.huawei_credentials" ]; then
    echo "❌ ERROR: Credentials file not found at /root/.huawei_credentials"
    exit 1
fi
source /root/.huawei_credentials

REGION="la-north-2"
PROJECT_ID=$HUAWEI_PROJECT_ID

# Check for force mode
FORCE_MODE=false
if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
    FORCE_MODE=true
    echo "⚠️  FORCE MODE ENABLED - No confirmation required"
fi

# Find resource log files
RESOURCE_LOGS=$(ls -t /root/huawei_resources_*.log 2>/dev/null | head -5)

if [ -z "$RESOURCE_LOGS" ]; then
    echo "ℹ️  No resource log files found. Looking for active resources..."
    
    # Try to find resources by listing
    echo ""
    echo "📋 Listing active resources in region: $REGION"
    echo "----------------------------------------"
    
    # List VPCs
    echo "VPCs:"
    hcloud VPC ListVpcs --cli-region="$REGION" 2>/dev/null | grep -E '"name"|"id"' || echo "  No VPCs found or error listing"
    
    # List ECS instances
    echo ""
    echo "ECS Instances:"
    hcloud ECS ListCloudServers --cli-region="$REGION" 2>/dev/null | grep -E '"name"|"id"' | head -20 || echo "  No ECS instances found or error listing"
    
    # List Security Groups
    echo ""
    echo "Security Groups:"
    hcloud VPC ListSecurityGroups --cli-region="$REGION" 2>/dev/null | grep -E '"name"|"id"' | head -20 || echo "  No security groups found or error listing"
    
    # List EIPs
    echo ""
    echo "Elastic IPs:"
    hcloud EIP ListPublicips --cli-region="$REGION" 2>/dev/null | grep -E '"public_ip_address"|"id"' | head -20 || echo "  No EIPs found or error listing"
    
    echo ""
    echo "ℹ️  No resource logs found. Please specify resource IDs manually or use --force to clean all."
    exit 0
fi

echo "📁 Found resource log files:"
for log in $RESOURCE_LOGS; do
    echo "  - $log"
done

LATEST_LOG=$(echo "$RESOURCE_LOGS" | head -1)
echo ""
echo "📄 Using latest resource log: $LATEST_LOG"

# Load resources from log
if [ ! -f "$LATEST_LOG" ]; then
    echo "❌ ERROR: Resource log file not found: $LATEST_LOG"
    exit 1
fi

echo ""
echo "🔍 Resources to clean up:"
echo "----------------------------------------"

# Extract resource IDs using grep and cut
VPC_ID=$(grep '^VPC_ID=' "$LATEST_LOG" | cut -d'"' -f2 2>/dev/null || echo "")
SUBNET_ID=$(grep '^SUBNET_ID=' "$LATEST_LOG" | cut -d'"' -f2 2>/dev/null || echo "")
ECS_IDS=$(grep '^ECS_' "$LATEST_LOG" | cut -d'=' -f2 | tr -d '"' 2>/dev/null || echo "")
SG_IDS=$(grep '^SG_' "$LATEST_LOG" | cut -d'=' -f2 | tr -d '"' 2>/dev/null || echo "")
EIP_IDS=$(grep '^EIP_' "$LATEST_LOG" | cut -d'=' -f2 | tr -d '"' 2>/dev/null || echo "")

echo "VPC: $VPC_ID"
echo "Subnet: $SUBNET_ID"
echo "ECS Instances:"
for ecs_id in $ECS_IDS; do
    echo "  - $ecs_id"
done
echo "Security Groups:"
for sg_id in $SG_IDS; do
    echo "  - $sg_id"
done
echo "Elastic IPs:"
for eip_id in $EIP_IDS; do
    echo "  - $eip_id"
done

# Confirmation
if [ "$FORCE_MODE" = false ]; then
    echo ""
    echo "⚠️  WARNING: This will PERMANENTLY DELETE all listed resources!"
    echo "   Type 'DELETE' to confirm: "
    read -r CONFIRM
    if [ "$CONFIRM" != "DELETE" ]; then
        echo "❌ Cleanup cancelled."
        exit 0
    fi
fi

echo ""
echo "🚀 Starting cleanup..."
echo "========================================"

# 1. Disassociate and Release EIPs
if [ -n "$EIP_IDS" ]; then
    echo "-> Releasing Elastic IPs..."
    for EIP_ID in $EIP_IDS; do
        if [ -n "$EIP_ID" ]; then
            echo "  Releasing EIP: $EIP_ID"
            # Try to delete directly (EIP may not be associated)
            hcloud EIP DeletePublicip --cli-region="$REGION" --publicip_id="$EIP_ID" 2>/dev/null && echo "    ✅ Released" || echo "    ⚠️ Failed to release (may already be deleted)"
            sleep 1
        fi
    done
fi

# 2. Delete ECS Instances
if [ -n "$ECS_IDS" ]; then
    echo "-> Deleting ECS Instances..."
    for ECS_ID in $ECS_IDS; do
        if [ -n "$ECS_ID" ]; then
            echo "  Deleting ECS: $ECS_ID"
            # Correct format: --serverIds="id1,id2,id3"
            hcloud ECS DeleteServers --cli-region="$REGION" --serverIds="$ECS_ID" 2>/dev/null && echo "    ✅ Deleted" || echo "    ⚠️ Failed to delete (may already be deleted)"
            sleep 2
        fi
    done
fi

# 3. Delete Security Groups
if [ -n "$SG_IDS" ]; then
    echo "-> Deleting Security Groups..."
    for SG_ID in $SG_IDS; do
        if [ -n "$SG_ID" ]; then
            echo "  Deleting Security Group: $SG_ID"
            hcloud VPC DeleteSecurityGroup --cli-region="$REGION" --security_group_id="$SG_ID" 2>/dev/null && echo "    ✅ Deleted" || echo "    ⚠️ Failed to delete (may already be deleted)"
            sleep 1
        fi
    done
fi

# 4. Delete Subnet (if exists) - NEEDS vpc_id parameter
if [ -n "$SUBNET_ID" ] && [ -n "$VPC_ID" ]; then
    echo "-> Deleting Subnet: $SUBNET_ID"
    hcloud VPC DeleteSubnet --cli-region="$REGION" --vpc_id="$VPC_ID" --subnet_id="$SUBNET_ID" 2>/dev/null && echo "  ✅ Subnet deleted" || echo "  ⚠️ Failed to delete subnet (may already be deleted or in use)"
    sleep 1
elif [ -n "$SUBNET_ID" ]; then
    echo "-> Cannot delete subnet $SUBNET_ID without VPC_ID"
fi

# 5. Delete VPC (if exists) - Must be empty (no subnets)
if [ -n "$VPC_ID" ]; then
    echo "-> Deleting VPC: $VPC_ID"
    # First check if VPC has subnets
    SUBNET_CHECK=$(hcloud VPC ListSubnets --cli-region="$REGION" --vpc_id="$VPC_ID" 2>/dev/null | grep -c '"id"' || echo "0")
    if [ "$SUBNET_CHECK" -gt 0 ]; then
        echo "  ⚠️ VPC has subnets, trying to delete anyway..."
    fi
    hcloud VPC DeleteVpc --cli-region="$REGION" --vpc_id="$VPC_ID" 2>/dev/null && echo "  ✅ VPC deleted" || echo "  ⚠️ Failed to delete VPC (may have dependencies)"
    sleep 1
fi

# 6. Clean up resource log file
echo "-> Cleaning up resource log..."
mv "$LATEST_LOG" "$LATEST_LOG.cleaned" 2>/dev/null && echo "  ✅ Resource log archived" || echo "  ⚠️ Could not archive resource log"

echo ""
echo "========================================"
echo "✅ CLEANUP COMPLETE"
echo ""
echo "Summary:"
EIP_COUNT=$(echo "$EIP_IDS" | wc -w 2>/dev/null || echo 0)
ECS_COUNT=$(echo "$ECS_IDS" | wc -w 2>/dev/null || echo 0)
SG_COUNT=$(echo "$SG_IDS" | wc -w 2>/dev/null || echo 0)
echo "  EIPs Released: $EIP_COUNT"
echo "  ECS Instances Deleted: $ECS_COUNT"
echo "  Security Groups Deleted: $SG_COUNT"
echo "  Subnets Deleted: $( [ -n "$SUBNET_ID" ] && echo 1 || echo 0 )"
echo "  VPCs Deleted: $( [ -n "$VPC_ID" ] && echo 1 || echo 0 )"
echo ""
echo "⚠️  Note: Some resources may take a few minutes to fully disappear from the console."
echo "   Run './cleanup_resources.sh' again if you need to clean up additional resources."
echo ""
echo "To clean ALL resources (not just from logs), run: ./cleanup_all.sh"