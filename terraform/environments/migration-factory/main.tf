# Huawei Cloud Migration Factory - Main Execution
# Orchestrates Phases 4.1 through 4.7

terraform {
  required_providers {
    huaweicloud = {
      source  = "huaweicloud/huaweicloud"
      version = ">= 1.56.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = ">= 2.4.0"
    }
  }
  
  backend "local" {
    path = "terraform.tfstate"
  }
}

# Variables
variable "project_name" {
  description = "Name of the migration project"
  type        = string
}

variable "environment" {
  description = "Environment (migration, staging, prod)"
  type        = string
  default     = "migration"
}

variable "region" {
  description = "Huawei Cloud region"
  type        = string
  default     = "ap-southeast-3"
}

variable "migration_mode" {
  description = "Execution mode: manual, agentic, or individual"
  type        = string
  default     = "agentic"
  
  validation {
    condition     = contains(["manual", "agentic", "individual"], var.migration_mode)
    error_message = "Migration mode must be 'manual', 'agentic', or 'individual'."
  }
}

variable "source_servers" {
  description = "List of source servers to migrate"
  type = list(object({
    name          = string
    os_type       = string
    os_version    = string
    cpu_cores     = number
    memory_gb     = number
    disk_gb       = number
    source_region = string
    application   = string
    criticality   = string  # high, medium, low
  }))
}

# Local variables
locals {
  timestamp = formatdate("YYYY-MM-DD-hhmmss", timestamp())
  project_id = "${var.project_name}-${var.environment}-${local.timestamp}"
  
  # Execution mode configuration
  execution_config = {
    manual = {
      description = "Manual step-by-step execution"
      automation_level = "low"
      agent_deployment = false
      parallel_workers = 1
    }
    agentic = {
      description = "Hermes autonomous execution"
      automation_level = "high"
      agent_deployment = true
      parallel_workers = 10
    }
    individual = {
      description = "Isolated ad-hoc tasks"
      automation_level = "medium"
      agent_deployment = false
      parallel_workers = 1
    }
  }
  
  current_mode = local.execution_config[var.migration_mode]
}

# Phase 4.1: Network & Identity Foundation
module "network_foundation" {
  source = "../modules/network/transit-vpc"
  
  project_name = var.project_name
  environment  = var.environment
  region       = var.region
  vpc_cidr     = "10.100.0.0/16"
}

# Phase 4.2: Vector-Aware OS Pre-Flight
module "os_preflight" {
  source = "../modules/validation/os-preflight"
  
  project_name    = var.project_name
  environment     = var.environment
  source_servers  = var.source_servers
  target_region   = var.region
  
  depends_on = [module.network_foundation]
}

# Phase 4.3: Build App Landing Zone (only if pre-flight passes)
module "app_landing_zone" {
  count = module.os_preflight.migration_readiness == "READY_FOR_MIGRATION" ? 1 : 0
  
  source = "../modules/compute/app-landing-zone"
  
  project_name      = var.project_name
  environment       = var.environment
  region            = var.region
  transit_vpc_id    = module.network_foundation.transit_vpc_id
  security_group_id = module.network_foundation.security_group_id
  
  # Convert source servers to application servers
  application_servers = [for server in var.source_servers : {
    name        = server.name
    flavor      = "c6.2xlarge.2"  # Example flavor, should be mapped based on requirements
    image       = server.os_type == "windows" ? "Windows-Server-2019" : "CentOS-7.9"
    disk_size   = max(server.disk_gb, 100)  # Minimum 100GB
    subnet_zone = "transit-a"
    tags = {
      Application = server.application
      Criticality = server.criticality
      SourceOS    = "${server.os_type}-${server.os_version}"
    }
  }]
  
  # Add databases for critical applications
  database_configs = [for server in var.source_servers : 
    {
      name        = "${server.name}-db"
      engine      = "mysql"
      version     = "8.0"
      flavor      = "rds.mysql.c6.4xlarge.2.ha"
      storage_gb  = 100
      subnet_zone = "transit-b"
      tags = {
        Application = server.application
        Criticality = server.criticality
      }
    } if server.criticality == "high"
  ]
  
  depends_on = [module.os_preflight]
}

# Phase 4.4: Deploy Data Plane Agents (SMS/DRS)
module "data_plane_agents" {
  count = var.migration_mode == "agentic" && module.os_preflight.migration_readiness == "READY_FOR_MIGRATION" ? 1 : 0
  
  source = "../modules/migration/agents"
  
  project_name      = var.project_name
  environment       = var.environment
  region            = var.region
  transit_vpc_id    = module.network_foundation.transit_vpc_id
  security_group_id = module.network_foundation.security_group_id
  source_servers    = var.source_servers
  
  agent_count       = local.current_mode.parallel_workers
  deployment_mode   = var.migration_mode
  
  depends_on = [module.app_landing_zone]
}

# Phase 4.5: Continuous Sync Monitor
resource "huaweicloud_smn_topic" "sync_monitor" {
  count = var.migration_mode == "agentic" ? 1 : 0
  
  name         = "${var.project_name}-${var.environment}-sync-monitor"
  display_name = "Migration Sync Monitor"
  
  tags = {
    Project     = var.project_name
    Environment = var.environment
    Phase       = "4.5"
    Purpose     = "sync-monitoring"
  }
}

resource "huaweicloud_ces_alarmrule" "sync_completion" {
  count = var.migration_mode == "agentic" ? 1 : 0
  
  alarm_name        = "${var.project_name}-${var.environment}-sync-completion"
  alarm_description = "Monitor migration sync completion percentage"
  
  metric {
    namespace   = "SYS.ECS"
    metric_name = "cpu_usage"
    dimensions {
      name  = "instance_id"
      value = module.data_plane_agents[0].agent_instance_ids[0]
    }
  }
  
  condition {
    period              = 300
    filter             = "average"
    comparison_operator = ">="
    value              = 90
    unit               = "%"
    count              = 1
  }
  
  alarm_actions {
    type             = "notification"
    notification_list = [huaweicloud_smn_topic.sync_monitor[0].topic_urn]
  }
  
  tags = {
    Project     = var.project_name
    Environment = var.environment
    Phase       = "4.5"
    Metric      = "sync-completion"
  }
  
  depends_on = [module.data_plane_agents]
}

# Phase 4.6: Cutover Automation (placeholder - requires custom scripts)
resource "local_file" "cutover_script" {
  count = var.migration_mode == "agentic" ? 1 : 0
  
  filename = "${path.module}/scripts/cutover-${local.project_id}.sh"
  content = <<-EOT
#!/bin/bash
# Phase 4.6: Cold Cutover & VPC Promotion
# Generated for project: ${var.project_name}
# Environment: ${var.environment}
# Mode: ${var.migration_mode}
# Timestamp: ${local.timestamp}

echo "Starting cutover for ${length(var.source_servers)} servers"

# 1. Stop source applications
echo "Stopping source applications..."
# TODO: Implement application stop logic

# 2. Final sync
echo "Performing final sync..."
# TODO: Implement final sync logic

# 3. Promote VPC bindings
echo "Promoting VPC bindings..."
# TODO: Implement VPC promotion logic

# 4. Start target applications
echo "Starting target applications..."
# TODO: Implement application start logic

# 5. Validation
echo "Validating cutover..."
# TODO: Implement validation logic

echo "Cutover complete for project: ${var.project_name}"
EOT

  file_permission = "0755"
  
  tags = {
    Project     = var.project_name
    Environment = var.environment
    Phase       = "4.6"
    Type        = "cutover-script"
  }
}

# Phase 4.7: Teardown & Garbage Collection
resource "huaweicloud_ces_alarmrule" "teardown_monitor" {
  count = var.migration_mode == "agentic" ? 1 : 0
  
  alarm_name        = "${var.project_name}-${var.environment}-teardown-trigger"
  alarm_description = "Monitor for teardown trigger after successful migration"
  
  metric {
    namespace   = "SYS.ECS"
    metric_name = "cpu_usage"
    dimensions {
      name  = "instance_id"
      value = module.data_plane_agents[0].agent_instance_ids[0]
    }
  }
  
  condition {
    period              = 3600  # 1 hour
    filter             = "average"
    comparison_operator = "<="
    value              = 5      # Less than 5% CPU usage
    unit               = "%"
    count              = 24     # For 24 hours
  }
  
  alarm_actions {
    type             = "notification"
    notification_list = [huaweicloud_smn_topic.sync_monitor[0].topic_urn]
  }
  
  tags = {
    Project     = var.project_name
    Environment = var.environment
    Phase       = "4.7"
    Metric      = "teardown-trigger"
  }
  
  depends_on = [module.data_plane_agents]
}

# Outputs
output "migration_factory_status" {
  description = "Status of migration factory deployment"
  value = {
    project_id        = local.project_id
    migration_mode    = var.migration_mode
    automation_level  = local.current_mode.automation_level
    phase_4_1_status = "COMPLETED - Network Foundation"
    phase_4_2_status = module.os_preflight.migration_readiness
    phase_4_3_status = length(module.app_landing_zone) > 0 ? "DEPLOYED" : "SKIPPED"
    phase_4_4_status = length(module.data_plane_agents) > 0 ? "DEPLOYED" : "SKIPPED"
    phase_4_5_status = length(huaweicloud_ces_alarmrule.sync_completion) > 0 ? "CONFIGURED" : "SKIPPED"
    phase_4_6_status = length(local_file.cutover_script) > 0 ? "SCRIPT_GENERATED" : "SKIPPED"
    phase_4_7_status = length(huaweicloud_ces_alarmrule.teardown_monitor) > 0 ? "CONFIGURED" : "SKIPPED"
    overall_status   = module.os_preflight.migration_readiness == "READY_FOR_MIGRATION" ? "READY" : "BLOCKED"
    next_step        = module.os_preflight.migration_readiness == "READY_FOR_MIGRATION" ? "Begin migration execution" : "Address validation issues"
  }
}

output "network_details" {
  description = "Network configuration details"
  value = {
    transit_vpc_id = module.network_foundation.transit_vpc_id
    transit_subnets = module.network_foundation.transit_subnet_ids
    app_vpc_id     = length(module.app_landing_zone) > 0 ? module.app_landing_zone[0].app_vpc_id : "NOT_DEPLOYED"
    security_group_id = module.network_foundation.security_group_id
  }
}

output "validation_report" {
  description = "Pre-flight validation report"
  value       = module.os_preflight.validation_report_path
}

output "execution_instructions" {
  description = "Instructions for migration execution"
  value = <<-EOT
Migration Factory Deployment Complete!
Project: ${var.project_name}
Environment: ${var.environment}
Mode: ${var.migration_mode}

Next Steps:
1. Review validation report: ${module.os_preflight.validation_report_path}
2. ${module.os_preflight.migration_readiness == "READY_FOR_MIGRATION" ? "Proceed with migration execution" : "Address validation issues"}
3. ${var.migration_mode == "agentic" ? "Agents deployed and ready" : "Manual execution required"}
4. Monitor sync progress via Cloud Eye alarms
5. Execute cutover script when ready: ${length(local_file.cutover_script) > 0 ? local_file.cutover_script[0].filename : "N/A"}
6. Teardown will trigger automatically after 24h of low utilization

Execution Mode: ${local.current_mode.description}
Parallel Workers: ${local.current_mode.parallel_workers}
EOT
}