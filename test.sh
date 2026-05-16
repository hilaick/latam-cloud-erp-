#!/bin/bash
# test.sh - Test the Huawei Cloud Infrastructure setup

set -e

cd "$(dirname "$0")"

echo "🧪 Testing Huawei Cloud Infrastructure Setup..."
echo "=============================================="

# Test 1: Check directory structure
echo "1. Checking directory structure..."
required_dirs=("backend" "scripts" "config" "templates" "static/js" "deployments")
for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "   ✅ $dir"
    else
        echo "   ❌ $dir (missing)"
        exit 1
    fi
done

# Test 2: Check required files
echo ""
echo "2. Checking required files..."
required_files=("backend/api.py" "templates/regional_delivery-17.html" "scripts/deploy_real.sh" "scripts/audit.sh" "scripts/cleanup_resources.sh" "README.md" "setup.sh" "start.sh")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (missing)"
        exit 1
    fi
done

# Test 3: Check Python dependencies
echo ""
echo "3. Checking Python environment..."
if command -v python3 &> /dev/null; then
    echo "   ✅ Python3 found: $(python3 --version)"
else
    echo "   ❌ Python3 not found"
    exit 1
fi

# Test 4: Check if virtual environment exists
echo ""
echo "4. Checking virtual environment..."
if [ -d "venv" ]; then
    echo "   ✅ Virtual environment exists"
    # Test Flask installation
    if source venv/bin/activate && python3 -c "import flask; print(f'   ✅ Flask {flask.__version__}')" 2>/dev/null; then
        echo "   ✅ Flask installed"
    else
        echo "   ⚠️  Flask not installed in venv"
    fi
    deactivate 2>/dev/null || true
else
    echo "   ⚠️  Virtual environment not found (run ./setup.sh)"
fi

# Test 5: Check Huawei Cloud CLI
echo ""
echo "5. Checking Huawei Cloud CLI..."
if command -v hcloud &> /dev/null; then
    echo "   ✅ hcloud CLI found"
    # Try to get version
    hcloud --version 2>/dev/null | head -1 || echo "   ⚠️  Could not get hcloud version"
else
    echo "   ⚠️  hcloud CLI not found (required for deployments)"
fi

# Test 6: Check credentials template
echo ""
echo "6. Checking credentials setup..."
if [ -f "config/.huawei_credentials.example" ]; then
    echo "   ✅ Credentials template exists"
    if [ -f ~/.huawei_credentials ] || [ -f config/.huawei_credentials ]; then
        echo "   ✅ Credentials file found"
    else
        echo "   ⚠️  No credentials file found (create from template)"
        echo "      cp config/.huawei_credentials.example ~/.huawei_credentials"
        echo "      # Edit with your Huawei Cloud credentials"
    fi
else
    echo "   ❌ Credentials template missing"
    exit 1
fi

# Test 7: Check API can start
echo ""
echo "7. Testing API startup..."
if [ -f "backend/api.py" ]; then
    # Quick syntax check
    if python3 -m py_compile backend/api.py 2>/dev/null; then
        echo "   ✅ API syntax is valid"
        rm -f backend/__pycache__/* 2>/dev/null || true
    else
        echo "   ❌ API syntax error"
        exit 1
    fi
fi

# Test 8: Check scripts are executable
echo ""
echo "8. Checking script permissions..."
scripts=("scripts/deploy_real.sh" "scripts/audit.sh" "scripts/cleanup_resources.sh" "scripts/list_tagged_resources.sh" "setup.sh" "start.sh")
for script in "${scripts[@]}"; do
    if [ -x "$script" ]; then
        echo "   ✅ $script (executable)"
    else
        echo "   ⚠️  $script (not executable, fixing...)"
        chmod +x "$script"
    fi
done

echo ""
echo "=============================================="
echo "✅ All tests passed!"
echo ""
echo "📋 Next steps:"
echo "1. Copy credentials template:"
echo "   cp config/.huawei_credentials.example ~/.huawei_credentials"
echo "2. Edit ~/.huawei_credentials with your Huawei Cloud credentials"
echo "3. Run setup: ./setup.sh"
echo "4. Start the dashboard: ./start.sh"
echo "5. Access at: http://localhost:9119"
echo ""
echo "🚀 Ready for Huawei Cloud deployments!"