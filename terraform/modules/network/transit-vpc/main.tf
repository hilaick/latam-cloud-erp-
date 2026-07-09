# Huawei Cloud Transit VPC Module
# Phase 4.1: Network & Identity Foundation

terraform {
  required_providers {
    huaweicloud = {
      source  = "huaweicloud/huaweicloud"
      version = ">= 1.56.0"
    }
  }
}

# Variables
variable "project_name" {
  description = "Project name for tagging"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "migration"
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

variable "subnet_cidrs" {
  description = "CIDR blocks for subnets"
  type        = map(string)
  default = {
    transit-a = "10.100.1.0/24"
    transit-b = "10.100.2.0/24"
    transit-c = "10.100.3.0/24"
  }
}

# Resources
resource "huaweicloud_vpc" "transit_vpc" {
  name = "${var.project_name}-${var.environment}-transit-vpc"
  cidr = var.vpc_cidr
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-transit-vpc"
    Environment = var.environment
    Project     = var.project_name
    Phase       = "4.1"
    Module      = "network-foundation"
  }
}

resource "huaweicloud_vpc_subnet" "transit_subnets" {
  for_each = var.subnet_cidrs

  name       = "${var.project_name}-${var.environment}-transit-${each.key}"
  cidr       = each.value
  gateway_ip = cidrhost(each.value, 1)
  vpc_id     = huaweicloud_vpc.transit_vpc.id
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-transit-${each.key}"
    Environment = var.environment
    Project     = var.project_name
    Zone        = each.key
    Phase       = "4.1"
    Purpose     = "migration-transit"
  }
}

# Security Groups for Migration
resource "huaweicloud_networking_secgroup" "migration_sg" {
  name        = "${var.project_name}-${var.environment}-migration-sg"
  description = "Security group for migration traffic"

  tags = {
    Name        = "${var.project_name}-${var.environment}-migration-sg"
    Environment = var.environment
    Project     = var.project_name
    Phase       = "4.1"
  }
}

# Ingress rules for SMS/DRS agents
resource "huaweicloud_networking_secgroup_rule" "sms_ingress" {
  security_group_id = huaweicloud_networking_secgroup.migration_sg.id
  
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  ports             = "8000-9000"
  remote_ip_prefix  = "0.0.0.0/0"
  
  description = "SMS/DRS agent communication ports"
}

resource "huaweicloud_networking_secgroup_rule" "ssh_ingress" {
  security_group_id = huaweicloud_networking_secgroup.migration_sg.id
  
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  ports             = "22"
  remote_ip_prefix  = "0.0.0.0/0"
  
  description = "SSH for administration"
}

# Egress rules for internet access
resource "huaweicloud_networking_secgroup_rule" "internet_egress" {
  security_group_id = huaweicloud_networking_secgroup.migration_sg.id
  
  direction         = "egress"
  ethertype         = "IPv4"
  protocol          = "all"
  remote_ip_prefix  = "0.0.0.0/0"
  
  description = "Allow all outbound traffic"
}

# VPC Peering (if needed for multi-VPC architecture)
resource "huaweicloud_vpc_peering_connection" "app_peering" {
  name        = "${var.project_name}-${var.environment}-peering"
  vpc_id      = huaweicloud_vpc.transit_vpc.id
  peer_vpc_id = var.peer_vpc_id
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-peering"
    Environment = var.environment
    Project     = var.project_name
    Phase       = "4.1"
    Type        = "transit-to-app"
  }
}

# Outputs
output "transit_vpc_id" {
  description = "ID of the Transit VPC"
  value       = huaweicloud_vpc.transit_vpc.id
}

output "transit_subnet_ids" {
  description = "IDs of Transit VPC subnets"
  value       = { for k, v in huaweicloud_vpc_subnet.transit_subnets : k => v.id }
}

output "security_group_id" {
  description = "ID of migration security group"
  value       = huaweicloud_networking_secgroup.migration_sg.id
}

output "vpc_cidr" {
  description = "CIDR of Transit VPC"
  value       = huaweicloud_vpc.transit_vpc.cidr
}