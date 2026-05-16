#!/bin/bash
set -e

echo "🔍 LISTING HUAWEI CLOUD RESOURCES"
echo "========================================"

# Load credentials
if [ ! -f "/root/.huawei_credentials" ]; then
    echo "❌ ERROR: Credentials file not found at /root/.huawei_credentials"
    exit 1
fi
source /root/.huawei_credentials

REGION="la-north-2"
PROJECT_ID=$HUAWEI_PROJECT_ID

echo "🔍 Scanning all resources in region: $REGION"
echo ""

TOTAL_RESOURCES=0

# 1. List VPCs
echo "1. VPCs:"
echo "--------"
VPCS_OUTPUT=$(hcloud VPC ListVpcs --cli-region="$REGION" 2>/dev/null || echo "{}")
VPC_COUNT=$(echo "$VPCS_OUTPUT" | jq -r '.vpcs | length' 2>/dev/null || echo "0")

if [ "$VPC_COUNT" -gt 0 ]; then
    echo "$VPCS_OUTPUT" | jq -r '.vpcs[] | "  - \(.name) (\(.id)) - CIDR: \(.cidr) - Status: \(.status)"' 2>/dev/null
    echo "  Tags:"
    echo "$VPCS_OUTPUT" | jq -r '.vpcs[] | "    \(.name): \(.tags[] | "\(.key)=\(.value)" | select(. != "null"))"' 2>/dev/null | grep -v "null" || echo "    (no tags)"
    TOTAL_RESOURCES=$((TOTAL_RESOURCES + VPC_COUNT))
else
    echo "   No VPCs found"
fi

# 2. List Subnets
echo ""
echo "2. Subnets:"
echo "-----------"
SUBNETS_OUTPUT=$(hcloud VPC ListSubnets --cli-region="$REGION" 2>/dev/null || echo "{}")
SUBNET_COUNT=$(echo "$SUBNETS_OUTPUT" | jq -r '.subnets | length' 2>/dev/null || echo "0")

if [ "$SUBNET_COUNT" -gt 0 ]; then
    echo "$SUBNETS_OUTPUT" | jq -r '.subnets[] | "  - \(.name) (\(.id)) - CIDR: \(.cidr) - VPC: \(.vpc_id)"' 2>/dev/null
    echo "  Tags:"
    echo "$SUBNETS_OUTPUT" | jq -r '.subnets[] | "    \(.name): \(.tags[] | "\(.key)=\(.value)" | select(. != "null"))"' 2>/dev/null | grep -v "null" || echo "    (no tags)"
    TOTAL_RESOURCES=$((TOTAL_RESOURCES + SUBNET_COUNT))
else
    echo "   No Subnets found"
fi

# 3. List Security Groups
echo ""
echo "3. Security Groups:"
echo "-------------------"
SGS_OUTPUT=$(hcloud VPC ListSecurityGroups --cli-region="$REGION" 2>/dev/null || echo "{}")
SG_COUNT=$(echo "$SGS_OUTPUT" | jq -r '.security_groups | length' 2>/dev/null || echo "0")

if [ "$SG_COUNT" -gt 0 ]; then
    echo "$SGS_OUTPUT" | jq -r '.security_groups[] | "  - \(.name) (\(.id))"' 2>/dev/null
    echo "  Tags:"
    echo "$SGS_OUTPUT" | jq -r '.security_groups[] | "    \(.name): \(.tags[] | "\(.key)=\(.value)" | select(. != "null"))"' 2>/dev/null | grep -v "null" || echo "    (no tags)"
    TOTAL_RESOURCES=$((TOTAL_RESOURCES + SG_COUNT))
else
    echo "   No Security Groups found"
fi

# 4. List ECS instances
echo ""
echo "4. ECS Instances:"
echo "-----------------"
ECS_OUTPUT=$(hcloud ECS ListCloudServers --cli-region="$REGION" 2>/dev/null || echo "{}")
ECS_COUNT=$(echo "$ECS_OUTPUT" | jq -r '.servers | length' 2>/dev/null || echo "0")

if [ "$ECS_COUNT" -gt 0 ]; then
    echo "$ECS_OUTPUT" | jq -r '.servers[] | "  - \(.name) (\(.id)) - Status: \(.status) - Flavor: \(.flavor.name)"' 2>/dev/null
    echo "  Tags:"
    echo "$ECS_OUTPUT" | jq -r '.servers[] | "    \(.name): \(.tags[]? | select(. != null))"' 2>/dev/null | grep -v "null" || echo "    (no tags)"
    TOTAL_RESOURCES=$((TOTAL_RESOURCES + ECS_COUNT))
else
    echo "   No ECS instances found"
fi

# 5. List EIPs
echo ""
echo "5. Elastic IPs:"
echo "---------------"
EIPS_OUTPUT=$(hcloud EIP ListPublicips --cli-region="$REGION" 2>/dev/null || echo "{}")
EIP_COUNT=$(echo "$EIPS_OUTPUT" | jq -r '.publicips | length' 2>/dev/null || echo "0")

if [ "$EIP_COUNT" -gt 0 ]; then
    echo "$EIPS_OUTPUT" | jq -r '.publicips[] | "  - \(.public_ip_address) (\(.id)) - Type: \(.type) - Status: \(.status)"' 2>/dev/null
    echo "  Tags:"
    echo "$EIPS_OUTPUT" | jq -r '.publicips[] | "    \(.public_ip_address): \(.tags[] | "\(.key)=\(.value)" | select(. != "null"))"' 2>/dev/null | grep -v "null" || echo "    (no tags)"
    TOTAL_RESOURCES=$((TOTAL_RESOURCES + EIP_COUNT))
else
    echo "   No Elastic IPs found"
fi

# 6. List resource logs
echo ""
echo "6. Resource Logs:"
echo "-----------------"
RESOURCE_LOGS=$(ls -t /root/huawei_resources_*.log 2>/dev/null | head -10)
LOG_COUNT=0

if [ -n "$RESOURCE_LOGS" ]; then
    for LOG in $RESOURCE_LOGS; do
        echo "  - $LOG"
        LOG_COUNT=$((LOG_COUNT + 1))
    done
else
    echo "   No resource logs found"
fi

echo ""
echo "========================================"
echo "📊 SUMMARY"
echo "   Total resources found: $TOTAL_RESOURCES"
echo "   Resource logs: $LOG_COUNT"
echo ""
echo "🔧 Management Commands:"
echo "   To deploy new infrastructure:"
echo "   ./deploy_real_tagged.sh"
echo ""
echo "   To clean up ALL resources (aggressive):"
echo "   ./cleanup_all.sh"
echo ""
echo "   To clean up specific resources from logs:"
echo "   ./cleanup_resources.sh"
echo ""
echo "   To clean up tagged resources:"
echo "   ./cleanup_tagged.sh --tags \"Project=ERP-Test,Environment=Test\""
echo ""
echo "🏷️  Note: Resources are tagged with:"
echo "   - Project=ERP-Test"
echo "   - Environment=Test"
echo "   - Deployment=<timestamp>"