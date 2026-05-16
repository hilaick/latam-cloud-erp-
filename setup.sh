#!/bin/bash
# setup.sh - Setup script for LATAM Cloud Delivery ERP

set -e

echo "🚀 Setting up LATAM Cloud Delivery ERP..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.8+"
    exit 1
fi

echo "✅ Python3 found: $(python3 --version)"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check Huawei Cloud CLI
if ! command -v hcloud &> /dev/null; then
    echo "⚠️  Huawei Cloud CLI (hcloud) not found."
    echo "   Install with: curl -sSL https://hwcloudcli.obs.cn-north-1.myhuaweicloud.com/cli/latest/hcloud-install.sh | bash"
    echo "   Or download from: https://console.huaweicloud.com/cli/"
fi

# Create credentials template if not exists
if [ ! -f config/.huawei_credentials.example ]; then
    echo "📝 Creating credentials template..."
    cat > config/.huawei_credentials.example << 'EOF'
# Huawei Cloud Credentials
HUAWEI_ACCESS_KEY=your_access_key_here
HUAWEI_SECRET_KEY=your_secret_key_here
HUAWEI_PROJECT_ID=your_project_id_here
HUAWEI_REGION=la-north-2

# Dashboard password
DASHBOARD_PASSWORD=Cac-Prod!2024

# ModelArts API Keys (for load balancer)
API_KEY_1=your_api_key_1
API_KEY_2=your_api_key_2
API_KEY_3=your_api_key_3
API_KEY_4=your_api_key_4
API_KEY_5=your_api_key_5
API_KEY_6=your_api_key_6
EOF
    echo "✅ Created config/.huawei_credentials.example"
    echo "   Copy to ~/.huawei_credentials and fill in your credentials"
fi

# Create deployment logs directory
mkdir -p deployments

# Make scripts executable
chmod +x scripts/*.sh
chmod +x start.sh test.sh

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy config/.huawei_credentials.example to ~/.huawei_credentials"
echo "2. Edit ~/.huawei_credentials with your actual credentials"
echo "3. Start the Flask API:"
echo "   ./start.sh"
echo "4. Access dashboard at: http://localhost:9119"
echo ""
echo "🔧 For Huawei Cloud CLI setup, visit:"
echo "   https://support.huaweicloud.com/intl/en-us/usermanual-huaweicloudcli/huaweicloudcli_01_0001.html"