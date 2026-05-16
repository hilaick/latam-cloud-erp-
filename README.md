# LATAM Cloud Delivery ERP - Huawei Cloud Infrastructure

A comprehensive Huawei Cloud infrastructure management system with Flask API backend and React frontend.

## 🚀 Features

- **Flask API Backend** - RESTful API for Huawei Cloud operations
- **React Frontend** - Modern web interface for infrastructure management
- **Huawei Cloud Integration** - Direct integration with Huawei Cloud services
- **Load Balancer** - Intelligent API key rotation for Huawei ModelArts
- **Infrastructure Management** - Deploy, monitor, and cleanup cloud resources
- **Resource Tracking** - Log-based deployment history and tracking

## 📁 Project Structure

```
latam-cloud-erp-/
├── backend/              # Flask API backend
│   ├── api.py           # Main Flask application
│   ├── huawei_load_balancer.py  # API key load balancer
│   └── resource_parser.py        # Resource log parser
├── scripts/             # Deployment and management scripts
│   ├── deploy_real.sh           # Main deployment script
│   ├── audit.sh                 # Environment audit
│   ├── cleanup_resources.sh     # Resource cleanup
│   └── list_tagged_resources.sh # Tagged resource listing
├── templates/           # HTML templates
│   ├── index.html              # Original React template
│   └── regional_delivery-17.html # Huawei Cloud dashboard
├── static/             # Static assets (JS, CSS)
│   └── js/            # React components
├── config/             # Configuration files
│   └── blueprint.json  # Infrastructure blueprint
├── deployments/        # Deployment logs (gitignored)
├── docs/              # Documentation
└── .gitignore         # Git ignore rules
```

## 🛠️ Setup

### Prerequisites
- Python 3.8+
- Huawei Cloud CLI (`hcloud`)
- Huawei Cloud API credentials

### Installation
```bash
# Clone repository
git clone https://github.com/hilaick/latam-cloud-erp-.git
cd latam-cloud-erp-

# Install Python dependencies
pip install flask

# Set up Huawei Cloud credentials
cp config/.huawei_credentials.example ~/.huawei_credentials
# Edit with your credentials
```

### Configuration
1. Copy `.huawei_credentials.example` to `~/.huawei_credentials`
2. Add your Huawei Cloud API keys and credentials
3. Configure deployment settings in `config/blueprint.json`

## 🚀 Usage

### Start the Flask API
```bash
cd backend
python api.py
# Server runs on http://localhost:9119
```

### Access the Dashboard
Open `http://localhost:9119` in your browser

### Deploy Infrastructure
```bash
./scripts/deploy_real.sh
```

### Run Environment Audit
```bash
./scripts/audit.sh
```

### Cleanup Resources
```bash
./scripts/cleanup_resources.sh
```

## 🔧 API Endpoints

- `GET /` - Serve dashboard HTML
- `GET /api/status` - Check deployment status
- `POST /api/blueprint` - Update infrastructure blueprint
- `POST /api/deploy` - Trigger deployment
- `POST /api/destroy` - Trigger teardown

## 📊 Features

### Dashboard Features
- Real-time infrastructure visualization
- Deployment history tracking
- Resource status monitoring
- One-click deployment and cleanup
- Blueprint management

### Huawei Cloud Integration
- VPC and subnet management
- ECS instance deployment
- Security group configuration
- Load balancer setup
- Resource tagging and organization

### Load Balancer
- 6-API key rotation for Huawei ModelArts
- 3 million TPM capacity
- Automatic failover
- Usage statistics and monitoring

## 🔒 Security

- Credentials stored in `~/.huawei_credentials` (gitignored)
- API keys rotated via load balancer
- No hardcoded secrets in repository
- Environment-based configuration

## 📈 Monitoring

- Deployment logs in `deployments/` directory
- Resource tracking logs
- API usage statistics
- Error logging and alerting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 👥 Authors

- Hermes Agent - Initial implementation
- Huawei Cloud Team - Infrastructure expertise

## 🙏 Acknowledgments

- Huawei Cloud for the robust infrastructure platform
- Flask and React communities for excellent tools
- Open source contributors