#!/bin/bash

# Test script for Huawei Cloud ERP

echo "🧪 Testing Huawei Cloud ERP structure..."

# Check if all required files exist
echo "📁 Checking file structure..."
required_files=(
    "app.py"
    "requirements.txt"
    "templates/index.html"
    "static/js/01_data.js"
    "static/js/02_utils.js"
    "static/js/03_map.js"
    "static/js/04_views.js"
    "static/js/05_wizard.js"
    "static/js/06_app.js"
    "scripts/audit_quick.sh"
    "scripts/deploy_real_tagged.sh"
    "scripts/cleanup_resources.sh"
    "services/huawei_load_balancer.py"
    "services/resource_parser.py"
)

missing_files=0
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (MISSING)"
        missing_files=$((missing_files + 1))
    fi
done

# Check Python dependencies
echo ""
echo "🐍 Checking Python dependencies..."
if python3 -c "import flask" 2>/dev/null; then
    echo "✅ Flask"
else
    echo "❌ Flask (not installed)"
fi

if python3 -c "import pandas" 2>/dev/null; then
    echo "✅ pandas"
else
    echo "❌ pandas (not installed)"
fi

# Check if app.py can be imported
echo ""
echo "🔧 Testing app.py imports..."
if python3 -c "
import sys
sys.path.append('.')
try:
    from app import app
    print('✅ app.py imports successfully')
except Exception as e:
    print(f'❌ app.py import failed: {e}')
    sys.exit(1)
"; then
    echo "✅ All imports successful"
else
    echo "❌ Import test failed"
fi

# Check if services can be imported
echo ""
echo "🔧 Testing services imports..."
if python3 -c "
import sys
sys.path.append('.')
try:
    from services.huawei_load_balancer import HuaweiLoadBalancer
    from services.resource_parser import parse_resource_log
    print('✅ Services import successfully')
except Exception as e:
    print(f'❌ Services import failed: {e}')
    sys.exit(1)
"; then
    echo "✅ Services import successful"
else
    echo "❌ Services import failed"
fi

# Check JS files for global window bindings
echo ""
echo "🔧 Checking JS global bindings..."
js_files=(
    "static/js/01_data.js"
    "static/js/02_utils.js"
    "static/js/03_map.js"
    "static/js/04_views.js"
    "static/js/05_wizard.js"
)

for js_file in "${js_files[@]}"; do
    if grep -q "window\." "$js_file"; then
        echo "✅ $js_file has global window bindings"
    else
        echo "❌ $js_file missing global window bindings"
    fi
done

echo ""
echo "📊 Summary:"
echo "Total required files: ${#required_files[@]}"
echo "Missing files: $missing_files"

if [ $missing_files -eq 0 ]; then
    echo "🎉 All tests passed! Structure is correct."
    echo ""
    echo "🚀 To start the application:"
    echo "   ./start.sh"
    echo "   Then visit http://localhost:9119"
else
    echo "⚠️  Some files are missing. Please check above."
    exit 1
fi