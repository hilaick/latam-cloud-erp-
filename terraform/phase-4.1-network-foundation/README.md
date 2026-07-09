# Phase 4.1: Network & Identity Foundation - README

## Overview
This Terraform module creates the network foundation for Huawei Cloud migration Wave 0, including:
- Transit VPC with isolated subnets for management, data, and staging
- Security groups with required ports for SMS/DRS agents
- ECS instances for SMS and DRS migration agents
- Elastic IP for agent management access

## Architecture
```
Transit VPC (10.100.0.0/16)
├── Management Subnet (10.100.10.0/24)
│   ├── SMS Agent (8443, 8900)
│   └── DRS Agent (8635, 8636)
├── Data Subnet (10.100.20.0/24) - Replication traffic
└── Staging Subnet (10.100.30.0/24) - Temporary resources
```

## Prerequisites
1. Huawei Cloud account with appropriate permissions
2. SSH keypair created in Huawei Cloud
3. Project ID for billing/access control
4. Access Key and Secret Key for Terraform authentication

## Deployment Steps

### 1. Configure Authentication
```bash
export HW_ACCESS_KEY="your-access-key"
export HW_SECRET_KEY="your-secret-key"
export HW_PROJECT_ID="your-project-id"
```

### 2. Copy Variables File
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### 3. Initialize Terraform
```bash
terraform init
```

### 4. Plan Deployment
```bash
terraform plan -var-file="terraform.tfvars"
```

### 5. Apply Infrastructure
```bash
terraform apply -var-file="terraform.tfvars" -auto-approve
```

## Post-Deployment

### Access SMS Agent
- URL: https://<sms-agent-public-ip>:8443
- Default credentials: admin / (set during first login)

### Access DRS Agent
- Monitoring: http://<drs-agent-private-ip>:8635
- Data port: 8636

### Verification Commands
```bash
# Check SMS agent status
curl -k https://<sms-agent-public-ip>:8443/health

# Check DRS agent status
curl http://<drs-agent-private-ip>:8635/status
```

## Next Phase
After successful deployment, proceed to **Phase 4.2: Vector-Aware OS Pre-Flight** to configure source system discovery and assessment.

## Cleanup
```bash
terraform destroy -var-file="terraform.tfvars" -auto-approve
```

## Security Notes
- Security group allows SSH from 0.0.0.0/0 - restrict to your IP in production
- SMS agent uses self-signed certificate by default
- Consider using Huawei Cloud IAM roles for enhanced security
- Enable Cloud Eye monitoring for all resources