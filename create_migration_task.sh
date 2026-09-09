#!/bin/bash
# Create SMS migration task with auto_start enabled
# Uses the target configuration with proper authentication context

set -e

echo "========================================="
echo "SMS Migration Task Creation Script"
echo "========================================="

# Configuration
CONFIG_FILE="/home/huawei-cloud/latam-cloud-erp-/migration-configs/codelpa-migration-target.json"
SMS_REGION="ap-southeast-3"
ENTERPRISE_PROJECT="6a586d63-10d9-4287-be7e-3860d6694696"

# Check if configuration exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Configuration file not found: $CONFIG_FILE"
    exit 1
fi

echo "📋 Configuration file: $CONFIG_FILE"
echo "🌍 SMS Region: $SMS_REGION"
echo "🏢 Enterprise Project: $ENTERPRISE_PROJECT"
echo ""

# Check current authentication context
echo "🔐 Checking authentication context..."
echo ""

# Method 1: Try with current AK/SK (likely to fail due to SMS.6527)
echo "1. Testing with ERP AK/SK (HPUAHMQ1ANAV4VJGYXSX)..."
hcloud SMS ListTasks --cli-region="$SMS_REGION" --limit=1 2>&1 | grep -E "error_code|count" || true
echo ""

# Method 2: Try with agency authentication
echo "2. Testing with agency authentication..."
hcloud configure set --cli-profile=codelpa-agency --cli-mode=ecsAgency --cli-agency-name=mig_access --cli-agency-domain-id=dd2da61cbb454c009813c4acaae61d31 --cli-source-profile=default --cli-region="$SMS_REGION" --cli-project-id=c5354feed62946958b9554cffb70a13c 2>/dev/null || true
hcloud SMS ListTasks --cli-profile=codelpa-agency --cli-region="$SMS_REGION" --limit=1 2>&1 | grep -E "error_code|count" || true
echo ""

# Method 3: Create task with auto_start (if authentication works)
echo "3. Creating migration task with auto_start=true..."
echo ""
echo "⚠️  IMPORTANT: This will fail if authentication doesn't have SMS permissions"
echo "   Error SMS.6527 means 'resource does not belong to you'"
echo "   Error APIGW.0301 means 'incorrect IAM authentication'"
echo ""

# Create the task
echo "🚀 Creating migration task..."
TASK_OUTPUT=$(hcloud SMS CreateTask \
  --cli-region="$SMS_REGION" \
  --body="@$CONFIG_FILE" \
  --enterprise_project_id="$ENTERPRISE_PROJECT" 2>&1) || true

echo "$TASK_OUTPUT"
echo ""

# Check for success
if echo "$TASK_OUTPUT" | grep -q '"id"'; then
    TASK_ID=$(echo "$TASK_OUTPUT" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Migration task created successfully!"
    echo "📋 Task ID: $TASK_ID"
    echo ""
    
    # Verify auto_start worked
    echo "🔄 Checking task status (should be 'MIGRATING' not 'READY')..."
    sleep 5
    hcloud SMS ShowTask --task_id="$TASK_ID" --cli-region="$SMS_REGION" 2>&1 | grep -E "state|status|progress" || true
    
else
    echo "❌ Failed to create migration task"
    echo ""
    echo "🔍 Error analysis:"
    echo ""
    
    if echo "$TASK_OUTPUT" | grep -q "SMS.6527"; then
        echo "• SMS.6527: 'the resource in the task does not belong to you!'"
        echo "  → Task exists but current credentials lack permission"
        echo "  → Use console or credentials that created the original task"
    elif echo "$TASK_OUTPUT" | grep -q "APIGW.0301"; then
        echo "• APIGW.0301: 'Incorrect IAM authentication information'"
        echo "  → AK/SK invalid for SMS service in $SMS_REGION"
        echo "  → Need AK/SK with SMS permissions in ap-southeast-3"
    elif echo "$TASK_OUTPUT" | grep -q "SMS.0515"; then
        echo "• SMS.0515: Disk mapping payload mismatch"
        echo "  → Use console workaround or implement programmatic fixes"
        echo "  → See sms_0515_fixes in configuration"
    else
        echo "• Unknown error: Check Huawei Cloud Console for details"
    fi
    
    echo ""
    echo "💡 Solutions:"
    echo "1. Use Huawei Cloud Console (already works)"
    echo "2. Get AK/SK from IAM user who created original task"
    echo "3. Add 'SMS FullAccess' role to current AK/SK"
    echo "4. Use agency authentication with proper permissions"
fi

echo ""
echo "========================================="
echo "Next Steps:"
echo "========================================="
echo "1. Check Huawei Cloud Console → SMS → Migration Tasks"
echo "2. Verify task state is 'MIGRATING' (not 'READY')"
echo "3. Monitor progress in console or via API"
echo "4. Target ECS: 2c8de6de-b43c-46a5-8650-71a59d9c55e4"
echo "5. Migration IP: 172.48.0.24"
echo ""
echo "⚠️  Note: Console access works because:"
echo "   • IAM user token has enterprise-wide permissions"
echo "   • Cross-project visibility enabled"
echo "   • Proper SMS roles assigned"
echo ""
echo "✅ Configuration includes auto_start=true to prevent READY state"