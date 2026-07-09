# Sync Monitoring Dashboard Module
# Phase 4.5: Continuous Sync Monitor

terraform {
  required_providers {
    huaweicloud = {
      source  = "huaweicloud/huaweicloud"
      version = ">= 1.56.0"
    }
    grafana = {
      source  = "grafana/grafana"
      version = ">= 2.0.0"
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

variable "agent_instance_ids" {
  description = "List of SMS/DRS agent instance IDs"
  type        = list(string)
  default     = []
}

variable "source_servers" {
  description = "List of source servers being migrated"
  type = list(object({
    name          = string
    os_type       = string
    os_version    = string
    cpu_cores     = number
    memory_gb     = number
    disk_gb       = number
    source_region = string
    application   = string
    criticality   = string
  }))
  default = []
}

# Cloud Eye (CES) Dashboard for migration monitoring
resource "huaweicloud_ces_alarmrule" "sync_progress" {
  for_each = { for idx, server in var.source_servers : server.name => server }

  alarm_name        = "${var.project_name}-${var.environment}-sync-${each.value.name}"
  alarm_description = "Sync progress for ${each.value.name}"
  
  metric {
    namespace   = "SYS.SMS"
    metric_name = "sync_progress"
    dimensions {
      name  = "server_name"
      value = each.value.name
    }
  }
  
  condition {
    period              = 300  # 5 minutes
    filter             = "average"
    comparison_operator = "<="
    value              = 100
    unit               = "%"
    count              = 1
  }
  
  alarm_actions {
    type             = "notification"
    notification_list = [var.smn_topic_urn]
  }
  
  ok_actions {
    type             = "notification"
    notification_list = [var.smn_topic_urn]
  }
  
  tags = {
    Project     = var.project_name
    Environment = var.environment
    Phase       = "4.5"
    Server      = each.value.name
    Application = each.value.application
    Criticality = each.value.criticality
  }
}

resource "huaweicloud_ces_alarmrule" "data_transfer_rate" {
  for_each = { for idx, server in var.source_servers : server.name => server }

  alarm_name        = "${var.project_name}-${var.environment}-transfer-rate-${each.value.name}"
  alarm_description = "Data transfer rate for ${each.value.name}"
  
  metric {
    namespace   = "SYS.SMS"
    metric_name = "data_transfer_rate"
    dimensions {
      name  = "server_name"
      value = each.value.name
    }
  }
  
  condition {
    period              = 300
    filter             = "average"
    comparison_operator = "<"
    value              = 10  # MB/s
    unit               = "MB/s"
    count              = 3   # 15 minutes below threshold
  }
  
  alarm_actions {
    type             = "notification"
    notification_list = [var.smn_topic_urn]
  }
  
  tags = {
    Project     = var.project_name
    Environment = var.environment
    Phase       = "4.5"
    Server      = each.value.name
    Metric      = "transfer-rate"
  }
}

resource "huaweicloud_ces_alarmrule" "agent_health" {
  for_each = toset(var.agent_instance_ids)

  alarm_name        = "${var.project_name}-${var.environment}-agent-health-${each.value}"
  alarm_description = "Health check for agent ${each.value}"
  
  metric {
    namespace   = "SYS.ECS"
    metric_name = "agent_status"
    dimensions {
      name  = "instance_id"
      value = each.value
    }
  }
  
  condition {
    period              = 60  # 1 minute
    filter             = "average"
    comparison_operator = "!="
    value              = 1   # 1 = healthy, 0 = unhealthy
    unit               = ""
    count              = 1
  }
  
  alarm_actions {
    type             = "notification"
    notification_list = [var.smn_topic_urn]
  }
  
  tags = {
    Project     = var.project_name
    Environment = var.environment
    Phase       = "4.5"
    AgentID     = each.value
    Metric      = "agent-health"
  }
}

# Grafana Dashboard for visualization
resource "grafana_dashboard" "migration_monitor" {
  config_json = jsonencode({
    title = "${var.project_name} - ${var.environment} Migration Monitor"
    tags  = ["migration", "huawei-cloud", "sms", "drs", var.environment]
    time  = {
      from = "now-6h"
      to   = "now"
    }
    
    panels = [
      # Sync Progress Panel
      {
        title = "Sync Progress by Server"
        type  = "bargauge"
        gridPos = {
          h = 8,
          w = 12,
          x = 0,
          y = 0
        }
        targets = [{
          expr = "sms_sync_progress{project=\"${var.project_name}\", environment=\"${var.environment}\"}"
          legendFormat = "{{server}}"
        }]
        fieldConfig = {
          defaults = {
            unit = "percent"
            min  = 0
            max  = 100
          }
        }
      },
      
      # Data Transfer Rate Panel
      {
        title = "Data Transfer Rate (MB/s)"
        type  = "timeseries"
        gridPos = {
          h = 8,
          w = 12,
          x = 12,
          y = 0
        }
        targets = [{
          expr = "rate(sms_data_transferred_bytes[5m]) / 1024 / 1024"
          legendFormat = "{{server}}"
        }]
        fieldConfig = {
          defaults = {
            unit = "MBps"
          }
        }
      },
      
      # Agent Health Status
      {
        title = "Agent Health Status"
        type  = "stat"
        gridPos = {
          h = 4,
          w = 8,
          x = 0,
          y = 8
        }
        targets = [{
          expr = "sms_agent_status{project=\"${var.project_name}\", environment=\"${var.environment}\"}"
          legendFormat = "{{agent}}"
        }]
        fieldConfig = {
          defaults = {
            thresholds = {
              steps = [
                { color = "red", value = 0 },
                { color = "green", value = 1 }
              ]
            }
          }
        }
      },
      
      # Migration Timeline
      {
        title = "Migration Timeline"
        type  = "state-timeline"
        gridPos = {
          h = 8,
          w = 24,
          x = 0,
          y = 12
        }
        targets = [{
          expr = "sms_migration_state{project=\"${var.project_name}\", environment=\"${var.environment}\"}"
          legendFormat = "{{server}} - {{state}}"
        }]
      },
      
      # Disk Space Utilization
      {
        title = "Target Disk Space Utilization"
        type  = "gauge"
        gridPos = {
          h = 6,
          w = 8,
          x = 8,
          y = 8
        }
        targets = [{
          expr = "sms_disk_utilization{project=\"${var.project_name}\", environment=\"${var.environment}\"}"
          legendFormat = "{{server}}"
        }]
        fieldConfig = {
          defaults = {
            unit = "percent"
            min  = 0
            max  = 100
            thresholds = {
              steps = [
                { color = "green", value = 0 },
                { color = "yellow", value = 80 },
                { color = "red", value = 90 }
              ]
            }
          }
        }
      },
      
      # Estimated Completion Time
      {
        title = "Estimated Completion Time"
        type  = "table"
        gridPos = {
          h = 6,
          w = 8,
          x = 16,
          y = 8
        }
        targets = [{
          expr = "sms_estimated_completion_seconds{project=\"${var.project_name}\", environment=\"${var.environment}\"}"
          instant = true
          format = "table"
        }]
        fieldConfig = {
          defaults = {
            unit = "datetime"
          }
        }
      }
    ]
    
    refresh = "30s"
    schemaVersion = 35
    version = 1
  })
  
  message = "Migration monitoring dashboard for ${var.project_name} - ${var.environment}"
}

# Cloud Eye Dashboard (Huawei Cloud native)
resource "huaweicloud_ces_dashboard" "migration_ces" {
  dashboard_name = "${var.project_name}-${var.environment}-migration"
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "singleValue"
        properties = {
          title = "Total Servers"
          metric = {
            namespace = "SYS.SMS"
            metric_name = "server_count"
            dimensions = [
              {
                name = "project"
                value = var.project_name
              },
              {
                name = "environment"
                value = var.environment
              }
            ]
          }
          unit = ""
        }
        position = {
          x = 0
          y = 0
          width = 4
          height = 4
        }
      },
      {
        type = "singleValue"
        properties = {
          title = "Sync Progress"
          metric = {
            namespace = "SYS.SMS"
            metric_name = "sync_progress_average"
            dimensions = [
              {
                name = "project"
                value = var.project_name
              },
              {
                name = "environment"
                value = var.environment
              }
            ]
          }
          unit = "%"
        }
        position = {
          x = 4
          y = 0
          width = 4
          height = 4
        }
      },
      {
        type = "line"
        properties = {
          title = "Data Transfer Rate"
          metrics = [
            {
              namespace = "SYS.SMS"
              metric_name = "data_transfer_rate"
              dimensions = [
                {
                  name = "project"
                  value = var.project_name
                },
                {
                  name = "environment"
                  value = var.environment
                }
              ]
            }
          ]
          unit = "MB/s"
        }
        position = {
          x = 8
          y = 0
          width = 8
          height = 4
        }
      },
      {
        type = "bar"
        properties = {
          title = "Sync Progress by Server"
          metrics = [
            {
              namespace = "SYS.SMS"
              metric_name = "sync_progress"
              dimensions = [
                {
                  name = "project"
                  value = var.project_name
                },
                {
                  name = "environment"
                  value = var.environment
                }
              ]
            }
          ]
          unit = "%"
        }
        position = {
          x = 0
          y = 4
          width = 16
          height = 8
        }
      },
      {
        type = "table"
        properties = {
          title = "Migration Status"
          metrics = [
            {
              namespace = "SYS.SMS"
              metric_name = "migration_status"
              dimensions = [
                {
                  name = "project"
                  value = var.project_name
                },
                {
                  name = "environment"
                  value = var.environment
                }
              ]
            }
          ]
        }
        position = {
          x = 0
          y = 12
          width = 16
          height = 8
        }
      }
    ]
    period = 300
    auto_refresh = true
  })
  
  tags = {
    Project     = var.project_name
    Environment = var.environment
    Phase       = "4.5"
    Type        = "migration-monitor"
  }
}

# Outputs
output "dashboard_urls" {
  description = "URLs for monitoring dashboards"
  value = {
    grafana_dashboard = "https://grafana.example.com/d/${grafana_dashboard.migration_monitor.uid}"  # Replace with actual Grafana URL
    ces_dashboard     = "https://console.huaweicloud.com/ces/${var.region}/dashboard/${huaweicloud_ces_dashboard.migration_ces.id}"
    smn_topic         = var.smn_topic_urn
  }
}

output "alarm_count" {
  description = "Number of monitoring alarms configured"
  value = {
    sync_progress_alarms    = length(huaweicloud_ces_alarmrule.sync_progress)
    transfer_rate_alarms    = length(huaweicloud_ces_alarmrule.data_transfer_rate)
    agent_health_alarms     = length(huaweicloud_ces_alarmrule.agent_health)
    total_alarms            = length(huaweicloud_ces_alarmrule.sync_progress) + 
                             length(huaweicloud_ces_alarmrule.data_transfer_rate) + 
                             length(huaweicloud_ces_alarmrule.agent_health)
  }
}

output "monitoring_summary" {
  description = "Summary of monitoring configuration"
  value = {
    servers_monitored = length(var.source_servers)
    agents_monitored  = length(var.agent_instance_ids)
    dashboards_created = 2  # Grafana + CES
    alarms_configured = length(huaweicloud_ces_alarmrule.sync_progress) + 
                       length(huaweicloud_ces_alarmrule.data_transfer_rate) + 
                       length(huaweicloud_ces_alarmrule.agent_health)
    phase_status = "4.5-Sync-Monitoring-Configured"
  }
}