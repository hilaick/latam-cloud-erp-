#!/bin/bash
# start.sh - Start the Huawei Cloud Infrastructure Dashboard

set -e

cd "$(dirname "$0")"

echo "🚀 Starting Huawei Cloud Infrastructure Dashboard..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Running setup..."
    ./setup.sh
fi

# Activate virtual environment
source venv/bin/activate

# Check if credentials are set
if [ ! -f ~/.huawei_credentials ]; then
    echo "❌ Huawei Cloud credentials not found!"
    echo "   Please copy config/.huawei_credentials.example to ~/.huawei_credentials"
    echo "   and fill in your Huawei Cloud API credentials."
    exit 1
fi

# Check if required files exist
if [ ! -f "app.py" ]; then
    echo "❌ Main app file not found: app.py"
    exit 1
fi

if [ ! -f "templates/index.html" ]; then
    echo "❌ Dashboard HTML not found: templates/index.html"
    exit 1
fi

echo "✅ Starting Flask API on port 9119..."
echo "📊 Dashboard: http://localhost:9119"
echo "📈 API Status: http://localhost:9119/api/status"
echo ""
echo "Press Ctrl+C to stop"

# Start the Flask API
python app.py