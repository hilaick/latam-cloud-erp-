# OS Pre-Flight Validation Module
# Phase 4.2: Vector-Aware OS Pre-Flight

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

variable "source_servers" {
  description = "List of source servers to validate"
  type = list(object({
    name          = string
    os_type       = string  # windows, linux, etc.
    os_version    = string
    cpu_cores     = number
    memory_gb     = number
    disk_gb       = number
    source_region = string
  }))
}

variable "target_region" {
  description = "Target Huawei Cloud region"
  type        = string
  default     = "ap-southeast-3"
}

# Data sources for quota validation
data "huaweicloud_compute_flavors" "available_flavors" {
  availability_zone = "${var.target_region}-a"
}

data "huaweicloud_evs_volumes" "available_volumes" {
  availability_zone = "${var.target_region}-a"
}

# Local variables for validation
locals {
  # OS Compatibility Matrix
  os_compatibility = {
    "windows" = ["Windows Server 2012", "Windows Server 2016", "Windows Server 2019", "Windows Server 2022"]
    "linux"   = ["CentOS 7", "CentOS 8", "Ubuntu 18.04", "Ubuntu 20.04", "Ubuntu 22.04", "RedHat 7", "RedHat 8"]
  }
  
  # Minimum requirements for migration
  min_requirements = {
    cpu_cores  = 2
    memory_gb  = 4
    disk_gb    = 50
  }
  
  # Calculate required resources
  required_resources = {
    total_cpu_cores = sum([for s in var.source_servers : s.cpu_cores])
    total_memory_gb = sum([for s in var.source_servers : s.memory_gb])
    total_disk_gb   = sum([for s in var.source_servers : s.disk_gb])
  }
}

# Validation outputs
output "validation_results" {
  description = "OS Pre-Flight validation results"
  value = {
    # OS Compatibility Check
    os_compatible = [for s in var.source_servers : 
      contains(local.os_compatibility[lower(s.os_type)], s.os_version) ? "PASS" : "FAIL"
    ]
    
    # Resource Requirements Check
    resource_check = [for s in var.source_servers :
      s.cpu_cores >= local.min_requirements.cpu_cores &&
      s.memory_gb >= local.min_requirements.memory_gb &&
      s.disk_gb >= local.min_requirements.disk_gb ? "PASS" : "FAIL"
    ]
    
    # Cloud Quota Check
    quota_check = {
      cpu_available  = try(data.huaweicloud_compute_flavors.available_flavors.flavors[0].vcpus, 0)
      cpu_required   = local.required_resources.total_cpu_cores
      cpu_sufficient = try(data.huaweicloud_compute_flavors.available_flavors.flavors[0].vcpus, 0) >= local.required_resources.total_cpu_cores
      
      memory_available  = try(data.huaweicloud_compute_flavors.available_flavors.flavors[0].ram, 0)
      memory_required   = local.required_resources.total_memory_gb
      memory_sufficient = try(data.huaweicloud_compute_flavors.available_flavors.flavors[0].ram, 0) >= local.required_resources.total_memory_gb
      
      disk_available  = try(data.huaweicloud_evs_volumes.available_volumes.volumes[0].size, 0)
      disk_required   = local.required_resources.total_disk_gb
      disk_sufficient = try(data.huaweicloud_evs_volumes.available_volumes.volumes[0].size, 0) >= local.required_resources.total_disk_gb
    }
    
    # BOM (Bill of Materials) Validation
    bom_validation = {
      total_servers = length(var.source_servers)
      windows_count = length([for s in var.source_servers : s if lower(s.os_type) == "windows"])
      linux_count   = length([for s in var.source_servers : s if lower(s.os_type) == "linux"])
      total_cpu     = local.required_resources.total_cpu_cores
      total_memory  = "${local.required_resources.total_memory_gb} GB"
      total_disk    = "${local.required_resources.total_disk_gb} GB"
      estimated_cost = local.required_resources.total_cpu_cores * 0.05 + 
                      local.required_resources.total_memory_gb * 0.01 + 
                      local.required_resources.total_disk_gb * 0.0001
    }
    
    # Overall Validation Status
    overall_status = (
      alltrue([for s in var.source_servers : 
        contains(local.os_compatibility[lower(s.os_type)], s.os_version)
      ]) &&
      alltrue([for s in var.source_servers :
        s.cpu_cores >= local.min_requirements.cpu_cores &&
        s.memory_gb >= local.min_requirements.memory_gb &&
        s.disk_gb >= local.min_requirements.disk_gb
      ]) &&
      local.quota_check.cpu_sufficient &&
      local.quota_check.memory_sufficient &&
      local.quota_check.disk_sufficient
    ) ? "READY_FOR_MIGRATION" : "VALIDATION_FAILED"
  }
}

# Generate validation report
resource "local_file" "preflight_report" {
  filename = "${path.module}/preflight-validation-${var.project_name}-${var.environment}.json"
  content = jsonencode({
    timestamp         = timestamp()
    project           = var.project_name
    environment       = var.environment
    target_region     = var.target_region
    source_servers    = var.source_servers
    validation        = output.validation_results.value
    recommendations   = local.recommendations
  })
}

# Recommendations based on validation
locals {
  recommendations = {
    os_upgrades = [for s in var.source_servers : 
      "Upgrade ${s.name} from ${s.os_version} to supported version" 
      if !contains(local.os_compatibility[lower(s.os_type)], s.os_version)
    ]
    
    resource_upgrades = [for s in var.source_servers :
      "Increase resources for ${s.name}: CPU ${s.cpu_cores}→${local.min_requirements.cpu_cores}, Memory ${s.memory_gb}GB→${local.min_requirements.memory_gb}GB, Disk ${s.disk_gb}GB→${local.min_requirements.disk_gb}GB"
      if s.cpu_cores < local.min_requirements.cpu_cores || 
         s.memory_gb < local.min_requirements.memory_gb || 
         s.disk_gb < local.min_requirements.disk_gb
    ]
    
    quota_requests = concat(
      local.quota_check.cpu_sufficient ? [] : ["Request CPU quota increase: ${local.required_resources.total_cpu_cores} cores needed"],
      local.quota_check.memory_sufficient ? [] : ["Request memory quota increase: ${local.required_resources.total_memory_gb} GB needed"],
      local.quota_check.disk_sufficient ? [] : ["Request disk quota increase: ${local.required_resources.total_disk_gb} GB needed"]
    )
  }
}

output "validation_report_path" {
  description = "Path to pre-flight validation report"
  value       = local_file.preflight_report.filename
}

output "migration_readiness" {
  description = "Overall migration readiness status"
  value       = output.validation_results.value.overall_status
}

output "recommendations" {
  description = "Recommendations for migration preparation"
  value       = local.recommendations
}