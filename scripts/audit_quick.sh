#!/bin/bash

echo "🛠️ INITIATING SELF-HEALING ENVIRONMENT AUDIT..."
echo "----------------------------------------"

ERRORS=0
WARNINGS=0

# 1. Self-Healing Dependencies & Permissions
echo "⚙️  STEP 1: SYSTEM DEPENDENCIES (SELF-HEALING)"

echo -n "   📦 Checking for jq binary... "
if command -v jq &> /dev/null; then 
    echo "✅ OK"
else 
    echo "⚠️ MISSING (Auto-installing jq...)"
    apt-get update -qq && apt-get install -y jq -qq >/dev/null 2>&1
    if command -v jq &> /dev/null; then echo "      -> ✅ FIXED: jq installed."; else echo "      -> ❌ FAILED to install jq."; ERRORS=$((ERRORS+1)); fi
fi

echo -n "   📦 Checking for hcloud CLI... "
if command -v hcloud &> /dev/null; then 
    echo "✅ OK"
else 
    echo "⚠️ MISSING (Attempting auto-install...)"
    if [ -f "./install_huawei_cli.sh" ]; then
        bash ./install_huawei_cli.sh >/dev/null 2>&1
        if command -v hcloud &> /dev/null; then echo "      -> ✅ FIXED: hcloud CLI installed."; else echo "      -> ❌ FAILED to install hcloud."; ERRORS=$((ERRORS+1)); fi
    else
        echo "      -> ❌ FAILED: install_huawei_cli.sh not found."
        ERRORS=$((ERRORS+1))
    fi
fi

echo -n "   🔐 Checking script execution permissions... "
chmod +x *.sh 2>/dev/null || true
echo "✅ FORCED (Applied chmod +x to all .sh files)"

# 2. Hard Requirements (Cannot auto-fix)
echo ""
echo "🔑 STEP 2: HARD REQUIREMENTS"
echo -n "   🛡️ Checking for Huawei credentials... "
if [ -f "$HOME/.huawei_credentials" ] || [ -f "config/.huawei_credentials" ]; then 
    echo "✅ OK"
else 
    echo "❌ MISSING (Cannot auto-fix. Please create credentials file.)"
    ERRORS=$((ERRORS+1))
fi

# 3. Huawei Cloud Quota Check
echo ""
echo "☁️  STEP 3: HUAWEI CLOUD QUOTA CHECK"
if command -v hcloud &> /dev/null && { [ -f "$HOME/.huawei_credentials" ] || [ -f "config/.huawei_credentials" ]; }; then
    echo -n "   📊 Checking VPC quota... "
    VPC_COUNT=$(hcloud VPC ListVpcs --cli-region="la-north-2" 2>/dev/null | grep -c '"name"' || echo "0")
    if [ "$VPC_COUNT" -ge 3 ]; then
        echo "⚠️ WARNING: You have $VPC_COUNT VPCs (approaching or at quota limit)"
        WARNINGS=$((WARNINGS+1))
        echo "      -> Consider deleting unused VPCs before deployment"
        echo "      -> Current VPCs:"
        hcloud VPC ListVpcs --cli-region="la-north-2" 2>/dev/null | grep -E '"name"|"id"' | head -20
    else
        echo "✅ OK ($VPC_COUNT VPCs, quota likely available)"
    fi
    
    echo -n "   🔧 Testing Huawei Cloud API connectivity... "
    if hcloud ECS ListFlavors --cli-region="la-north-2" --limit=1 >/dev/null 2>&1; then
        echo "✅ OK"
    else
        echo "❌ FAILED"
        echo "      -> Cannot connect to Huawei Cloud API"
        echo "      -> Check credentials and network connectivity"
        ERRORS=$((ERRORS+1))
    fi
else
    echo "   ⚠️ Skipping Huawei Cloud checks (hcloud CLI or credentials missing)"
    WARNINGS=$((WARNINGS+1))
fi

# 4. Self-Healing File Health
echo ""
echo "🧹 STEP 4: FILE SANITIZATION (SELF-HEALING)"
if [ ! -f "config/blueprint.json" ]; then
    echo "   ❌ MISSING: config/blueprint.json not found. (Cannot auto-fix)"
    ERRORS=$((ERRORS+1))
elif [ ! -s "config/blueprint.json" ]; then
    echo "   ❌ CORRUPTED: config/blueprint.json is 0 bytes. (Cannot auto-fix)"
    ERRORS=$((ERRORS+1))
else
    # Automatically strip UTF-8 BOM
    echo -n "   🧬 Checking for invisible UTF-8 BOM... "
    sed -i '1s/^\xEF\xBB\xBF//' config/blueprint.json
    echo "✅ SANITIZED"

    # Automatically strip Windows CRLF
    echo -n "   📄 Checking for Windows CRLF... "
    sed -i 's/\r//g' config/blueprint.json
    echo "✅ SANITIZED"

    # 5. JSON Syntax & Schema Audit
    echo ""
    echo "🧩 STEP 5: JSON SCHEMA VALIDATION"
    echo -n "   🧱 Validating raw JSON structure... "
    if jq empty config/blueprint.json >/dev/null 2>&1; then 
        echo "✅ VALID"
        
        echo -n "   🗂️ Checking for 'servers' array... "
        if [ "$(jq '.servers | type' config/blueprint.json 2>/dev/null)" == '"array"' ]; then
            echo "✅ OK"
            
            SERVER_COUNT=$(jq '.servers | length' config/blueprint.json)
            echo "   📊 Found $SERVER_COUNT server(s) configured."
            
            # Check each server has required fields
            for i in $(seq 0 $((SERVER_COUNT - 1))); do
                SERVER_NAME=$(jq -r ".servers[$i].server_name" config/blueprint.json 2>/dev/null)
                FLAVOR=$(jq -r ".servers[$i].flavor" config/blueprint.json 2>/dev/null)
                
                if [ -z "$SERVER_NAME" ] || [ "$SERVER_NAME" = "null" ]; then
                    echo "   ❌ Server $((i+1)) missing 'server_name'"
                    ERRORS=$((ERRORS+1))
                fi
                
                if [ -z "$FLAVOR" ] || [ "$FLAVOR" = "null" ]; then
                    echo "   ❌ Server $((i+1)) missing 'flavor'"
                    ERRORS=$((ERRORS+1))
                fi
            done
            
            if [ $ERRORS -eq 0 ]; then
                echo "   ✅ All servers have required fields"
            fi
            
        else
            echo "   ❌ SCHEMA ERROR: Root 'servers' array is missing or invalid."
            ERRORS=$((ERRORS+1))
        fi
        
    else 
        echo "❌ CORRUPTED"
        echo "----------------------------------------"
        echo "🚨 JQ SYNTAX ERROR REPORT:"
        jq empty config/blueprint.json 2>&1
        echo "----------------------------------------"
        ERRORS=$((ERRORS+1))
    fi
fi

echo ""
echo "----------------------------------------"
echo "📊 AUDIT SUMMARY:"
echo "   Errors: $ERRORS"
echo "   Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -gt 0 ]; then
        echo "🟡 SYSTEM YELLOW. Environment is ready but has warnings."
        echo "   Warnings won't block deployment but should be reviewed."
    else
        echo "🟢 SYSTEM GREEN. Environment is fully sanitized and ready."
    fi
    exit 0
else
    echo "🔴 SYSTEM RED. Found $ERRORS error(s) requiring manual intervention."
    exit 1
fi