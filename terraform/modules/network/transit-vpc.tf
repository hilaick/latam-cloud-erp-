# Huawei Cloud Transit VPC for Migration Wave 0
# Creates isolated network foundation for SMS/DRS migration

terraform {
  required_providers {
    huaweicloud = {
      source  = "huaweicloud/huaweicloud"
      version = "~> 1.50"
    }
  }
}

variable "region" {
  description = "Huawei Cloud region"
  type        = string
  default     = "ap-southeast-3"
}

variable "project_name" {
  description = "Project name for tagging"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for Transit VPC"
  type        = string
  default     = "10.100.0.0/16"
}

resource "huaweicloud_vpc" "transit_vpc" {
  name        = "${var.project_name}-transit-vpc"
  cidr        = var.vpc_cidr
  description = "Transit VPC for migration Wave 0"
  
  tags = {
    Environment = "Migration"
    Wave        = "0"
    Project     = var.project_name
    ManagedBy   = "ERP-Automation"
  }
}

# Subnets for different migration tiers
resource "huaweicloud_vpc_subnet" "management_subnet" {
  name       = "${var.project_name}-management-subnet"
  cidr       = cidrsubnet(var.vpc_cidr, 8, 10) # 10.100.10.0/24
  gateway_ip = cidrhost(cidrsubnet(var.vpc_cidr, 8, 10), 1)
  vpc_id     = huaweicloud_vpc.transit_vpc.id
  
  tags = {
    Tier       = "Management"
    Purpose    = "SMS/DRS Management"
    Project    = var.project_name
  }
}

resource "huaweicloud_vpc_subnet" "data_subnet" {
  name       = "${var.project_name}-data-subnet"
  cidr       = cidrsubnet(var.vpc_cidr, 8, 20) # 10.100.20.0/24
  gateway_ip = cidrhost(cidrsubnet(var.vpc_cidr, 8, 20), 1)
  vpc_id     = huaweicloud_vpc.transit_vpc.id
  
  tags = {
    Tier       = "Data"
    Purpose    = "Data replication traffic"
    Project    = var.project_name
  }
}

resource "huaweicloud_vpc_subnet" "staging_subnet" {
  name       = "${var.project_name}-staging-subnet"
  cidr       = cidrsubnet(var.vpc_cidr, 8, 30) # 10.100.30.0/24
  gateway_ip = cidrhost(cidrsubnet(var.vpc_cidr, 8, 30), 1)
  vpc_id     = huaweicloud_vpc.transit_vpc.id
  
  tags = {
    Tier       = "Staging"
    Purpose    = "Temporary migration resources"
    Project    = var.project_name
  }
}

# Security Groups
resource "huaweicloud_networking_secgroup" "migration_sg" {
  name        = "${var.project_name}-migration-sg"
  description = "Security group for migration traffic"
  
  tags = {
    Project = var.project_name
    Purpose = "Migration Security"
  }
}

# SMS Agent ports (8443, 8900)
resource "huaweicloud_networking_secgroup_rule" "sms_agent_ports" {
  security_group_id = huaweicloud_networking_secgroup.migration_sg.id
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 8443
  port_range_max    = 8443
  remote_ip_prefix  = "0.0.0.0/0"
  description       = "SMS Agent HTTPS"
}

resource "huaweicloud_networking_secgroup_rule" "sms_agent_data" {
  security_group_id = huaweicloud_networking_secgroup.migration_sg.id
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 8900
  port_range_max    = 8900
  remote_ip_prefix  = "0.0.0.0/0"
  description       = "SMS Agent Data Port"
}

# DRS ports (8635, 8636)
resource "huaweicloud_networking_secgroup_rule" "drs_ports" {
  security_group_id = huaweicloud_networking_secgroup.migration_sg.id
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 8635
  port_range_max    = 8636
  remote_ip_prefix  = "0.0.0.0/0"
  description       = "DRS Replication Ports"
}

# SSH for management
resource "huaweicloud_networking_secgroup_rule" "ssh_access" {
  security_group_id = huaweicloud_networking_secgroup.migration_sg.id
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "0.0.0.0/0"
  description       = "SSH Management"
}

# Outputs
output "transit_vpc_id" {
  value       = huaweicloud_vpc.transit_vpc.id
  description = "Transit VPC ID"
}

output "management_subnet_id" {
  value       = huaweicloud_vpc_subnet.management_subnet.id
  description = "Management subnet ID for SMS/DRS agents"
}

output "data_subnet_id" {
  value       = huaweicloud_vpc_subnet.data_subnet.id
  description = "Data subnet ID for replication traffic"
}

output "staging_subnet_id" {
  value       = huaweicloud_vpc_subnet.staging_subnet.id
  description = "Staging subnet ID for temporary resources"
}

output "security_group_id" {
  value       = huaweicloud_networking_secgroup.migration_sg.id
  description = "Migration security group ID"
}