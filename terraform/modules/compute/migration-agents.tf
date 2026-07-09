# Huawei Cloud ECS instances for migration agents
# Creates SMS and DRS agent instances in the transit VPC

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

variable "transit_vpc_id" {
  description = "Transit VPC ID from network module"
  type        = string
}

variable "management_subnet_id" {
  description = "Management subnet ID for agents"
  type        = string
}

variable "security_group_id" {
  description = "Security group ID for migration"
  type        = string
}

variable "keypair_name" {
  description = "SSH keypair name"
  type        = string
}

# Data source for Ubuntu 20.04 image
data "huaweicloud_images_image" "ubuntu_2004" {
  name        = "Ubuntu 20.04 server 64bit"
  most_recent = true
}

# Data source for flavor (2vCPU, 4GB RAM)
data "huaweicloud_compute_flavors" "agent_flavor" {
  availability_zone = "${var.region}-a"
  performance_type  = "normal"
  vcpus             = 2
  memory            = 4
}

# SMS Agent Instance
resource "huaweicloud_compute_instance" "sms_agent" {
  name              = "${var.project_name}-sms-agent"
  image_id          = data.huaweicloud_images_image.ubuntu_2004.id
  flavor_id         = data.huaweicloud_compute_flavors.agent_flavor.ids[0]
  availability_zone = "${var.region}-a"
  key_pair          = var.keypair_name
  
  network {
    uuid = var.management_subnet_id
  }
  
  security_groups = [var.security_group_id]
  
  system_disk_type = "SSD"
  system_disk_size = 50
  
  # User data to install SMS agent
  user_data = <<-EOF
              #!/bin/bash
              apt-get update
              apt-get install -y python3-pip wget curl
              
              # Create SMS agent directory
              mkdir -p /opt/sms-agent
              
              # Download and install SMS agent (placeholder - replace with actual agent)
              wget -O /opt/sms-agent/install.sh https://example.com/sms-agent-install.sh
              chmod +x /opt/sms-agent/install.sh
              
              # Start SMS agent service
              systemctl enable sms-agent
              systemctl start sms-agent
              EOF
  
  tags = {
    Role        = "SMS-Agent"
    Project     = var.project_name
    Wave        = "0"
    ManagedBy   = "ERP-Automation"
    Environment = "Migration"
  }
}

# DRS Agent Instance
resource "huaweicloud_compute_instance" "drs_agent" {
  name              = "${var.project_name}-drs-agent"
  image_id          = data.huaweicloud_images_image.ubuntu_2004.id
  flavor_id         = data.huaweicloud_compute_flavors.agent_flavor.ids[0]
  availability_zone = "${var.region}-a"
  key_pair          = var.keypair_name
  
  network {
    uuid = var.management_subnet_id
  }
  
  security_groups = [var.security_group_id]
  
  system_disk_type = "SSD"
  system_disk_size = 100  # Larger disk for DRS data
  
  # User data to install DRS agent
  user_data = <<-EOF
              #!/bin/bash
              apt-get update
              apt-get install -y python3-pip wget curl mysql-client
              
              # Create DRS agent directory
              mkdir -p /opt/drs-agent
              mkdir -p /opt/drs-agent/data
              
              # Download and install DRS agent (placeholder - replace with actual agent)
              wget -O /opt/drs-agent/install.sh https://example.com/drs-agent-install.sh
              chmod +x /opt/drs-agent/install.sh
              
              # Configure DRS agent
              cat > /opt/drs-agent/config.json <<CONFIG
              {
                "replication_mode": "full",
                "source_type": "onprem",
                "target_type": "huaweicloud",
                "monitoring_port": 8635,
                "data_port": 8636
              }
              CONFIG
              
              # Start DRS agent service
              systemctl enable drs-agent
              systemctl start drs-agent
              EOF
  
  tags = {
    Role        = "DRS-Agent"
    Project     = var.project_name
    Wave        = "0"
    ManagedBy   = "ERP-Automation"
    Environment = "Migration"
  }
}

# EIP for agent management access
resource "huaweicloud_vpc_eip" "sms_agent_eip" {
  publicip {
    type = "5_bgp"
  }
  
  bandwidth {
    name        = "${var.project_name}-sms-agent-bandwidth"
    size        = 10
    share_type  = "PER"
    charge_mode = "traffic"
  }
  
  tags = {
    Project = var.project_name
    Purpose = "SMS-Agent-Management"
  }
}

resource "huaweicloud_compute_eip_associate" "sms_agent_eip_assoc" {
  public_ip   = huaweicloud_vpc_eip.sms_agent_eip.address
  instance_id = huaweicloud_compute_instance.sms_agent.id
}

# Outputs
output "sms_agent_private_ip" {
  value       = huaweicloud_compute_instance.sms_agent.access_ip_v4
  description = "SMS Agent private IP"
}

output "sms_agent_public_ip" {
  value       = huaweicloud_vpc_eip.sms_agent_eip.address
  description = "SMS Agent public EIP"
}

output "drs_agent_private_ip" {
  value       = huaweicloud_compute_instance.drs_agent.access_ip_v4
  description = "DRS Agent private IP"
}

output "sms_agent_id" {
  value       = huaweicloud_compute_instance.sms_agent.id
  description = "SMS Agent instance ID"
}

output "drs_agent_id" {
  value       = huaweicloud_compute_instance.drs_agent.id
  description = "DRS Agent instance ID"
}