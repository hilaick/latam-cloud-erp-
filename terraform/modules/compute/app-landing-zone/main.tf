# Application Landing Zone Module
# Phase 4.3: Build App Landing Zone

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
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment"
  type        = string
  default     = "migration"
}

variable "region" {
  description = "Huawei Cloud region"
  type        = string
  default     = "ap-southeast-3"
}

variable "transit_vpc_id" {
  description = "ID of Transit VPC from Phase 4.1"
  type        = string
}

variable "application_servers" {
  description = "List of application servers to provision"
  type = list(object({
    name        = string
    flavor      = string
    image       = string
    disk_size   = number
    subnet_zone = string  # transit-a, transit-b, transit-c
    tags        = map(string)
  }))
}

variable "database_configs" {
  description = "Database configurations"
  type = list(object({
    name        = string
    engine      = string  # mysql, postgresql, sqlserver
    version     = string
    flavor      = string
    storage_gb  = number
    subnet_zone = string
    tags        = map(string)
  }))
  default = []
}

# Application VPC (separate from transit for isolation)
resource "huaweicloud_vpc" "app_vpc" {
  name = "${var.project_name}-${var.environment}-app-vpc"
  cidr = "10.200.0.0/16"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-app-vpc"
    Environment = var.environment
    Project     = var.project_name
    Phase       = "4.3"
    Module      = "app-landing-zone"
    Type        = "application"
  }
}

resource "huaweicloud_vpc_subnet" "app_subnets" {
  for_each = {
    app-a = "10.200.1.0/24"
    app-b = "10.200.2.0/24"
    app-c = "10.200.3.0/24"
  }

  name       = "${var.project_name}-${var.environment}-app-${each.key}"
  cidr       = each.value
  gateway_ip = cidrhost(each.value, 1)
  vpc_id     = huaweicloud_vpc.app_vpc.id
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-app-${each.key}"
    Environment = var.environment
    Project     = var.project_name
    Zone        = each.key
    Phase       = "4.3"
    Purpose     = "application"
  }
}

# VPC Peering between Transit and App VPCs
resource "huaweicloud_vpc_peering_connection" "transit_to_app" {
  name        = "${var.project_name}-${var.environment}-transit-app-peering"
  vpc_id      = var.transit_vpc_id
  peer_vpc_id = huaweicloud_vpc.app_vpc.id
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-transit-app-peering"
    Environment = var.environment
    Project     = var.project_name
    Phase       = "4.3"
    Type        = "transit-to-app"
  }
}

# Application ECS Instances
resource "huaweicloud_compute_instance" "app_servers" {
  for_each = { for idx, server in var.application_servers : server.name => server }

  name              = "${var.project_name}-${var.environment}-${each.value.name}"
  flavor_id         = each.value.flavor
  image_id          = each.value.image
  availability_zone = "${var.region}-${replace(each.value.subnet_zone, "transit-", "")}"
  
  network {
    uuid = huaweicloud_vpc_subnet.app_subnets[replace(each.value.subnet_zone, "transit-", "app-")].id
  }
  
  system_disk_type = "SAS"
  system_disk_size = each.value.disk_size
  
  security_group_ids = [var.security_group_id]
  
  tags = merge(each.value.tags, {
    Name        = "${var.project_name}-${var.environment}-${each.value.name}"
    Environment = var.environment
    Project     = var.project_name
    Phase       = "4.3"
    Role        = "application-server"
    ServerType  = "ecs"
  })
}

# PaaS Databases (RDS instances)
resource "huaweicloud_rds_instance" "app_databases" {
  for_each = { for idx, db in var.database_configs : db.name => db }

  name                = "${var.project_name}-${var.environment}-${each.value.name}-db"
  flavor             = each.value.flavor
  ha_replication_mode = "async"
  availability_zone = ["${var.region}-${replace(each.value.subnet_zone, "transit-", "")}"]
  
  db {
    type     = each.value.engine
    version  = each.value.version
    password = random_password.db_passwords[each.value.name].result
  }
  
  volume {
    type = "ULTRAHIGH"
    size = each.value.storage_gb
  }
  
  vpc_id    = huaweicloud_vpc.app_vpc.id
  subnet_id = huaweicloud_vpc_subnet.app_subnets[replace(each.value.subnet_zone, "transit-", "app-")].id
  
  security_group_id = var.security_group_id
  
  tags = merge(each.value.tags, {
    Name        = "${var.project_name}-${var.environment}-${each.value.name}-db"
    Environment = var.environment
    Project     = var.project_name
    Phase       = "4.3"
    Engine      = each.value.engine
    Role        = "database"
  })
}

# Database passwords
resource "random_password" "db_passwords" {
  for_each = { for db in var.database_configs : db.name => db }

  length  = 16
  special = true
}

# Load Balancer for application tier
resource "huaweicloud_elb_loadbalancer" "app_loadbalancer" {
  name          = "${var.project_name}-${var.environment}-app-lb"
  vpc_id        = huaweicloud_vpc.app_vpc.id
  type          = "application"
  ipv4_subnet_id = huaweicloud_vpc_subnet.app_subnets["app-a"].id
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-app-lb"
    Environment = var.environment
    Project     = var.project_name
    Phase       = "4.3"
    Type        = "application-loadbalancer"
  }
}

# Outputs
output "app_vpc_id" {
  description = "ID of Application VPC"
  value       = huaweicloud_vpc.app_vpc.id
}

output "app_subnet_ids" {
  description = "IDs of Application VPC subnets"
  value       = { for k, v in huaweicloud_vpc_subnet.app_subnets : k => v.id }
}

output "app_server_ips" {
  description = "Private IPs of application servers"
  value       = { for k, v in huaweicloud_compute_instance.app_servers : k => v.access_ip_v4 }
}

output "database_endpoints" {
  description = "Connection endpoints for databases"
  value       = { for k, v in huaweicloud_rds_instance.app_databases : k => v.private_ips }
}

output "database_passwords" {
  description = "Database passwords (sensitive)"
  value       = { for k, v in random_password.db_passwords : k => v.result }
  sensitive   = true
}

output "loadbalancer_ip" {
  description = "IP address of application load balancer"
  value       = huaweicloud_elb_loadbalancer.app_loadbalancer.ipv4_address
}

output "landing_zone_summary" {
  description = "Summary of landing zone deployment"
  value = {
    vpc_created     = huaweicloud_vpc.app_vpc.name
    subnets_created = length(huaweicloud_vpc_subnet.app_subnets)
    servers_created = length(huaweicloud_compute_instance.app_servers)
    databases_created = length(huaweicloud_rds_instance.app_databases)
    loadbalancer_created = huaweicloud_elb_loadbalancer.app_loadbalancer.name != "" ? true : false
    peering_established = huaweicloud_vpc_peering_connection.transit_to_app.id != "" ? true : false
    phase_complete = "4.3-Application-Landing-Zone-Built"
  }
}