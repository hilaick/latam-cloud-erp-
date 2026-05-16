# LATAM Cloud Delivery ERP - Huawei Cloud Infrastructure

A comprehensive Huawei Cloud infrastructure management system with Flask API backend and modular React frontend.

## 🏗️ Architecture

```
latam-cloud-erp/
│
├── .gitignore                  # Prevents pushing sensitive logs/keys to GitHub
├── requirements.txt            # Python dependencies (flask, pandas)
├── app.py                      # The Flask Backend (The Bridge)
│
├── services/                   # Business logic services
│   ├── huawei_load_balancer.py # Huawei ModelArts API key rotation
│   └── resource_parser.py      # Resource log parsing
│
├── config/                     # Configuration files
│   ├── blueprint.json          # Infrastructure blueprint
│   └── .huawei_credentials.example # Credentials template
│
├── scripts/                    # 🚀 The DevOps Zone (Hermes's Playground)
│   ├── audit_quick.sh          # Huawei pre-flight checks
│   ├── deploy_real_tagged.sh   # Huawei infrastructure execution
│   └── cleanup_resources.sh    # Teardown and log cleanup
│
├── templates/                  # 🌐 The HTML Shell
│   └── index.html              # Loads Tailwind, Babel, Leaflet, and JS modules
│
└── static/
    └── js/                     # 🧩 The React Modules (Babel Standalone)
        ├── 01_data.js          # Playbooks, mock projects, templates
        ├── 02_utils.js         # Formatters, EditableCell, Modals
        ├── 03_map.js           # The Leaflet GeospatialMap component
        ├── 04_views.js         # Dashboard, Pipeline, Radar, Process
        ├── 05_wizard.js        # Command Center, FinOps, Execution Hub
        └── 06_app.js           # Main App() function and Router
```

## 🚀 Features

- **Modular React Frontend** - Zero-build-step Babel Standalone architecture
- **Flask API Backend** - RESTful API for Huawei Cloud operations
- **Huawei Cloud Integration** - Direct integration with Huawei Cloud services
- **Load Balancer** - 6-API key rotation for Huawei ModelArts
- **Infrastructure Management** - Deploy, monitor, and cleanup cloud resources
- **Geospatial Visualization** - Interactive Leaflet maps for regional tracking
- **Dynamic Playbooks** - Customizable migration methodologies

## 🛠️ Setup

### Prerequisites
- Python 3.8+
- Huawei Cloud CLI (`hcloud`)
- Huawei Cloud API credentials

### Installation
```bash
# Clone repository
git clone https://github.com/hilaick/latam-cloud-erp.git
cd latam-cloud-erp

# Run setup script
./setup.sh

# Configure credentials
cp config/.huawei_credentials.example ~/.huawei_credentials
# Edit with your Huawei Cloud credentials
```

### Quick Start
```bash
# Start the dashboard
./start.sh

# Access at: http://localhost:9119
```

## 📦 Zero-Build Architecture

The frontend uses **Babel Standalone** with sequentially loaded JS modules:
- No npm, webpack, or build tools required
- ES6 JSX transpiled in the browser
- Global `window` bindings for module communication
- Fast iteration - just edit JS files and refresh

## 🔧 API Endpoints

- `GET /` - Serve dashboard HTML
- `GET /static/<path:filename>` - Serve JS/CSS assets
- `GET /api/status` - Check deployment status
- `POST /api/blueprint` - Update infrastructure blueprint
- `POST /api/deploy` - Trigger deployment (`deploy_real_tagged.sh`)
- `POST /api/destroy` - Trigger teardown (`cleanup_resources.sh`)
- `POST /api/huawei/chat` - Huawei ModelArts chat completion (load balanced)
- `GET /api/huawei/keys/status` - Huawei API key status

## 🎯 DevOps Scripts

### `scripts/audit_quick.sh`
- Huawei Cloud pre-flight checks
- Environment validation
- Resource quota verification

### `scripts/deploy_real_tagged.sh`
- Huawei infrastructure execution
- VPC, subnets, security groups
- ECS instances with tagging
- Load balancer configuration

### `scripts/cleanup_resources.sh`
- Teardown Huawei Cloud resources
- Clean deployment logs
- Resource cleanup with confirmation

## 🔒 Security

- Credentials stored in `~/.huawei_credentials` (gitignored)
- API keys rotated via load balancer
- No hardcoded secrets in repository
- Environment-based configuration

## 📈 Monitoring

- Deployment logs in `deployments/` directory
- Resource tracking with timestamps
- API usage statistics
- Error logging and alerting

## 🧪 Testing

```bash
# Run comprehensive tests
./test.sh

# Check structure and dependencies
python app.py --check
```

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
- Babel Standalone for zero-build frontend
- Open source contributors