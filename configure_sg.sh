#!/bin/bash
# Configure security group for mig_worker

export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX"
export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
export HUAWEICLOUD_SDK_REGION="af-south-1"

# Get Security Group ID
SG_ID=$(hcloud VPC ListSecurityGroups --cli-region=af-south-1 |     jq -r '.security_groups[] | select(.name=="'"UMOOC_AF"'") | .id')

if [ -z "$SG_ID" ]; then
    echo "❌ Security Group 'UMOOC_AF' not found"
    exit 1
fi

echo "Configuring Security Group: UMOOC_AF ($SG_ID)"

# Add SSH rule (port 22)
echo "Adding SSH rule (port 22)..."
hcloud VPC CreateSecurityGroupRule --cli-region=af-south-1     --security_group_id="$SG_ID"     --security_group_rule.protocol="tcp"     --security_group_rule.ethertype="IPv4"     --security_group_rule.port_range_min=22     --security_group_rule.port_range_max=22     --security_group_rule.direction="ingress"     --security_group_rule.remote_ip_prefix="0.0.0.0/0"

# Add Redis rule (port 6379)
echo "Adding Redis rule (port 6379)..."
hcloud VPC CreateSecurityGroupRule --cli-region=af-south-1     --security_group_id="$SG_ID"     --security_group_rule.protocol="tcp"     --security_group_rule.ethertype="IPv4"     --security_group_rule.port_range_min=6379     --security_group_rule.port_range_max=6379     --security_group_rule.direction="ingress"     --security_group_rule.remote_ip_prefix="0.0.0.0/0"

# Add Memcached rule (port 11211)
echo "Adding Memcached rule (port 11211)..."
hcloud VPC CreateSecurityGroupRule --cli-region=af-south-1     --security_group_id="$SG_ID"     --security_group_rule.protocol="tcp"     --security_group_rule.ethertype="IPv4"     --security_group_rule.port_range_min=11211     --security_group_rule.port_range_max=11211     --security_group_rule.direction="ingress"     --security_group_rule.remote_ip_prefix="0.0.0.0/0"

echo "✅ Security Group rules configured"
