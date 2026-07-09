# Main deployment for Phase 4.1: Network & Identity Foundation

terraform {
  required_providers {
    huaweicloud = {
      source  = "huaweicloud/huaweicloud"
      version = "~> 1.50"
    }
  }
  
  backend "local" {
    path = "terraform.tfstate"
  }
}

module "transit_network" {
  source = "../modules/network/transit-vpc"
  
  project_name = var.project_name
  region       = var.region
  vpc_cidr     = var.vpc_cidr
}

module "migration_agents" {
  source = "../modules/compute/migration-agents"
  
  project_name          = var.project_name
  region               = var.region
  transit_vpc_id       = module.transit_network.transit_vpc_id
  management_subnet_id = module.transit_network.management_subnet_id
  security_group_id    = module.transit_network.security_group_id
  keypair_name         = var.keypair_name
}

# Variables
variable "project_name" {
  description = "Project name for resource tagging"
  type        = string
}

variable "region" {
  description = "Huawei Cloud region"
  type        = string
  default     = "ap-southeast-3"
}

variable "vpc_cidr" {
  description = "CIDR block for Transit VPC"
  type        = string
  default     = "10.100.0.0/16"
}

variable "keypair_name" {
  description = "SSH keypair name for instance access"
  type        = string
}

# Outputs
output "phase_4_1_summary" {
  value = <<-EOT
  Phase 4.1: Network & Identity Foundation Complete
  
  Created Resources:
  - Transit VPC: ${module.transit_network.transit_vpc_id}
  - Management Subnet: ${module.transit_network.management_subnet_id}
  - Data Subnet: ${module.transit_network.data_subnet_id}
  - Staging Subnet: ${module.transit_network.staging_subnet_id}
  - Security Group: ${module.transit_network.security_group_id}
  
  Migration Agents:
  - SMS Agent: ${module.migration_agents.sms_agent_private_ip} (Public: ${module.migration_agents.sms_agent_public_ip})
  - DRS Agent: ${module.migration_agents.drs_agent_private_ip}
  
  Next Steps:
  1. Configure SMS agent at https://${module.migration_agents.sms_agent_public_ip}:8443
  2. Configure DRS agent at ${module.migration_agents.drs_agent_private_ip}:8635
  3. Proceed to Phase 4.2: Vector-Aware OS Pre-Flight
  EOT
}

output "sms_agent_endpoint" {
  value       = "https://${module.migration_agents.sms_agent_public_ip}:8443"
  description = "SMS Agent management endpoint"
}

output "drs_agent_endpoint" {
  value       = "${module.migration_agents.drs_agent_private_ip}:8635"
  description = "DRS Agent monitoring endpoint"
}

output "network_diagram" {
  value = <<-EOT
  Network Topology:
  
  Transit VPC: ${var.vpc_cidr}
  ├── Management Subnet: 10.100.10.0/24
  │   ├── SMS Agent: ${module.migration_agents.sms_agent_private_ip}
  │   └── DRS Agent: ${module.migration_agents.drs_agent_private_ip}
  ├── Data Subnet: 10.100.20.0/24 (Replication traffic)
  └── Staging Subnet: 10.100.30.0/24 (Temporary resources)
  EOT
}