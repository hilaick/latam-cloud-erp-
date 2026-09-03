#!/usr/bin/env python3
"""
Huawei Cloud On-Demand Pricing Estimator for LATAM regions.

Provides monthly cost estimates for ECS, RDS, DDS, DCS, OBS, EVS, SFS, 
EIP, ELB, NAT, and VPC based on resource specs (flavor, CPU, RAM, storage).

Prices are based on Huawei Cloud international (LA) on-demand pricing in USD.
These are reference rates for budgeting — actual invoices may vary by region,
zone, and promotional discounts.

Used by /api/finops/query_price to generate BOM from target architecture nodes.
"""

import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# ── On-Demand Monthly Pricing (USD, LA regions) ──
# Source: Huawei Cloud Pricing Calculator (intl/en-us) 
# Rates are per-unit per-month, 730 hours/month

# ECS: priced by vCPU + RAM (general-purpose s6/ac7 instances)
ECS_PRICE_PER_VCPU_HOUR = 0.034   # ~$24.82/mo per vCPU
ECS_PRICE_PER_GB_RAM_HOUR = 0.014  # ~$10.22/mo per GB RAM
ECS_FLAVOR_OVERRIDES = {
    # Common flavors: {flavor_prefix: (vcpu, ram_gb, monthly_usd)}
    's6.small.1': (1, 1, 35.0),
    's6.medium.2': (1, 2, 45.0),
    's6.large.2': (2, 2, 70.0),
    's6.large.4': (2, 4, 90.0),
    's6.xlarge.2': (4, 2, 140.0),
    's6.xlarge.4': (4, 4, 180.0),
    's6.xlarge.8': (4, 8, 220.0),
    's6.2xlarge.4': (8, 4, 280.0),
    's6.2xlarge.8': (8, 8, 340.0),
    's6.4xlarge.8': (16, 8, 560.0),
    's6.4xlarge.16': (16, 16, 680.0),
    'ac7.large.4': (2, 4, 110.0),
    'ac7.xlarge.4': (4, 4, 200.0),
    'ac7.2xlarge.8': (8, 8, 400.0),
    'ac7.4xlarge.16': (16, 16, 800.0),
}

# RDS: priced by vCPU + RAM + storage
RDS_PRICE_PER_VCPU_HOUR = 0.068   # ~$49.64/mo per vCPU
RDS_PRICE_PER_GB_RAM_HOUR = 0.020  # ~$14.60/mo per GB RAM
RDS_BASE_FLAVORS = {
    'rds.mysql.n1.large.2': (2, 2, 130.0),
    'rds.mysql.n1.large.4': (2, 4, 170.0),
    'rds.mysql.n1.xlarge.4': (4, 4, 260.0),
    'rds.mysql.n1.xlarge.8': (4, 8, 320.0),
    'rds.pg.n1.large.2': (2, 2, 150.0),
    'rds.pg.n1.large.4': (2, 4, 190.0),
    'rds.pg.n1.xlarge.4': (4, 4, 290.0),
    'rds.pg.n1.xlarge.8': (4, 8, 360.0),
}

# DDS (MongoDB-compatible): similar to RDS but slightly higher
DDS_PRICE_PER_VCPU_HOUR = 0.075
DDS_PRICE_PER_GB_RAM_HOUR = 0.022

# DCS (Redis): priced by GB memory
DCS_PRICE_PER_GB_MONTH = 18.50  # single-node, standard edition

# EVS (Elastic Volume Service): priced by GB/month
EVS_SAS_PRICE_PER_GB = 0.12   # High I/O
EVS_SSD_PRICE_PER_GB = 0.20   # Ultra-high I/O SSD
EVS_GPSSD_PRICE_PER_GB = 0.10 # General purpose SSD
EVS_SATA_PRICE_PER_GB = 0.05  # Common I/O (SATA)

# OBS (Object Storage): priced by GB/month + requests
OBS_STANDARD_PRICE_PER_GB = 0.023  # Standard storage
OBS_INFREQUENT_PRICE_PER_GB = 0.012  # Infrequent access
OBS_ARCHIVE_PRICE_PER_GB = 0.003    # Archive

# SFS (SFS Turbo): priced by GB/month
SFS_TURBO_PRICE_PER_GB = 0.30

# CBR (Cloud Backup and Recovery): priced by GB/month
CBR_PRICE_PER_GB = 0.05

# EIP (Elastic IP): base fee + bandwidth
EIP_BASE_FEE_MONTHLY = 5.0  # retention fee
EIP_BANDWIDTH_PER_MBPS = 3.0  # per Mbps per month (shared bandwidth)

# ELB (Elastic Load Balancer): fixed monthly
ELB_MONTHLY = 25.0  # L7 application load balancer
ELB_L4_MONTHLY = 18.0  # L4 network load balancer

# NAT Gateway: fixed monthly
NAT_SMALL_MONTHLY = 45.0
NAT_MEDIUM_MONTHLY = 90.0
NAT_LARGE_MONTHLY = 180.0

# VPC: free
VPC_MONTHLY = 0.0

# VPN: fixed monthly per connection
VPN_MONTHLY = 30.0

# DNS: per zone per month
DNS_ZONE_MONTHLY = 5.0

# DRS (Data Replication Service): per hour of usage
DRS_PRICE_PER_HOUR = 0.15


def _parse_storage_gb(storage_value) -> float:
    """Parse storage value to GB (float)."""
    if not storage_value:
        return 0.0
    if isinstance(storage_value, (int, float)):
        return float(storage_value)
    s = str(storage_value).strip().lower()
    # Handle formats like "500GB", "1TB", "500 GB", "1.5TB"
    try:
        if 'tb' in s:
            return float(s.replace('tb', '').replace(' ', '').strip()) * 1024
        if 'gb' in s:
            return float(s.replace('gb', '').replace(' ', '').strip())
        return float(s)
    except (ValueError, TypeError):
        return 0.0


def _parse_cpu(cpu_value) -> int:
    """Parse CPU value to vCPU count."""
    if not cpu_value:
        return 0
    if isinstance(cpu_value, (int, float)):
        return int(cpu_value)
    s = str(cpu_value).strip()
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return 0


def _parse_memory_gb(memory_value) -> float:
    """Parse memory value to GB."""
    if not memory_value:
        return 0.0
    if isinstance(memory_value, (int, float)):
        return float(memory_value)
    s = str(memory_value).strip().lower()
    try:
        return float(s.replace('gb', '').replace(' ', '').strip())
    except (ValueError, TypeError):
        return 0.0


def _match_flavor(flavor_str: str, flavor_table: dict) -> Optional[tuple]:
    """Match a flavor string against a flavor table."""
    if not flavor_str:
        return None
    f_lower = flavor_str.lower().strip()
    # Exact match
    if f_lower in flavor_table:
        return flavor_table[f_lower]
    # Prefix match (e.g., "s6.large.2" matches "s6.large.2")
    for key, val in flavor_table.items():
        if f_lower.startswith(key) or key.startswith(f_lower):
            return val
    return None


def estimate_node_monthly_cost(node: dict) -> Dict[str, Any]:
    """
    Estimate the monthly on-demand cost for a single resource node.
    
    Returns: {
        'id': str,
        'service': str,      # Huawei service code (ECS, RDS, etc.)
        'name': str,
        'spec': str,         # Human-readable spec
        'qty': int,
        'cost_per_month': float,
        'selected': bool
    }
    """
    node_type = str(node.get('type', '')).upper().strip()
    node_id = node.get('id', f'{node_type}-{node.get("name", "")}')
    node_name = node.get('name', node_id)
    flavor = str(node.get('flavor', '')).strip()
    cpu = _parse_cpu(node.get('cpu') or node.get('vcpus') or node.get('vcpu'))
    memory = _parse_memory_gb(node.get('memory') or node.get('ram'))
    storage = _parse_storage_gb(node.get('storage') or node.get('disk') or node.get('storage_gb'))
    
    cost = 0.0
    spec = ''
    
    if node_type in ('ECS', 'VM', 'CCE', 'AS', 'ASG'):
        # Try exact flavor match first
        flavor_match = _match_flavor(flavor, ECS_FLAVOR_OVERRIDES)
        if flavor_match:
            _, _, cost = flavor_match
            spec = f'{flavor} ({cpu or flavor_match[0]}vCPU/{memory or flavor_match[1]}GB)'
        else:
            # Calculate from specs
            vcpu = cpu or 2
            ram = memory or 4
            cost = (vcpu * ECS_PRICE_PER_VCPU_HOUR + ram * ECS_PRICE_PER_GB_RAM_HOUR) * 730
            spec = f'{vcpu}vCPU/{ram}GB'
        
        # Add storage (EVS disk)
        if storage > 0:
            disk_cost = storage * EVS_SAS_PRICE_PER_GB
            cost += disk_cost
            spec += f' + {int(storage)}GB EVS'
        
        service = 'ECS'
    
    elif node_type in ('RDS', 'GAUSSDB'):
        flavor_match = _match_flavor(flavor, RDS_BASE_FLAVORS)
        if flavor_match:
            _, _, cost = flavor_match
            spec = f'{flavor}'
        else:
            vcpu = cpu or 2
            ram = memory or 4
            cost = (vcpu * RDS_PRICE_PER_VCPU_HOUR + ram * RDS_PRICE_PER_GB_RAM_HOUR) * 730
            spec = f'{vcpu}vCPU/{ram}GB'
        
        if storage > 0:
            cost += storage * EVS_SAS_PRICE_PER_GB
            spec += f' + {int(storage)}GB'
        
        service = 'RDS'
    
    elif node_type == 'DDS':
        vcpu = cpu or 2
        ram = memory or 4
        cost = (vcpu * DDS_PRICE_PER_VCPU_HOUR + ram * DDS_PRICE_PER_GB_RAM_HOUR) * 730
        if storage > 0:
            cost += storage * EVS_SAS_PRICE_PER_GB
        spec = f'{vcpu}vCPU/{ram}GB + {int(storage)}GB'
        service = 'DDS'
    
    elif node_type == 'DCS':
        ram = memory or 2
        cost = ram * DCS_PRICE_PER_GB_MONTH
        spec = f'{ram}GB Redis'
        service = 'DCS'
    
    elif node_type == 'OBS':
        cost = storage * OBS_STANDARD_PRICE_PER_GB
        spec = f'{int(storage)}GB Standard'
        service = 'OBS'
    
    elif node_type == 'SFS' or node_type == 'SFSTURBO':
        cost = storage * SFS_TURBO_PRICE_PER_GB
        spec = f'{int(storage)}GB SFS Turbo'
        service = 'SFS'
    
    elif node_type == 'EVS':
        cost = storage * EVS_SAS_PRICE_PER_GB
        spec = f'{int(storage)}GB EVS'
        service = 'EVS'
    
    elif node_type == 'CBR':
        cost = storage * CBR_PRICE_PER_GB
        spec = f'{int(storage)}GB CBR'
        service = 'CBR'
    
    elif node_type == 'EIP':
        bandwidth = node.get('bandwidth', 5)
        try:
            bw = int(float(bandwidth))
        except (ValueError, TypeError):
            bw = 5
        cost = EIP_BASE_FEE_MONTHLY + (bw * EIP_BANDWIDTH_PER_MBPS)
        spec = f'{bw}Mbps'
        service = 'EIP'
    
    elif node_type == 'ELB':
        lb_type = str(node.get('lb_type', node.get('loadbalancer_type', ''))).lower()
        if 'l4' in lb_type or 'tcp' in lb_type or 'udp' in lb_type:
            cost = ELB_L4_MONTHLY
            spec = 'L4 Network LB'
        else:
            cost = ELB_MONTHLY
            spec = 'L7 Application LB'
        service = 'ELB'
    
    elif node_type == 'NAT':
        spec_str = str(node.get('spec', '')).lower()
        if 'large' in spec_str or 's2' in spec_str:
            cost = NAT_LARGE_MONTHLY
            spec = 'Large'
        elif 'medium' in spec_str or 's1' in spec_str:
            cost = NAT_MEDIUM_MONTHLY
            spec = 'Medium'
        else:
            cost = NAT_SMALL_MONTHLY
            spec = 'Small'
        service = 'NAT'
    
    elif node_type == 'VPC' or node_type == 'SUBNET' or node_type == 'SG':
        cost = VPC_MONTHLY
        spec = 'VPC (free)'
        service = 'VPC'
    
    elif node_type == 'VPN':
        cost = VPN_MONTHLY
        spec = 'VPN Connection'
        service = 'VPN'
    
    elif node_type == 'DNS':
        cost = DNS_ZONE_MONTHLY
        spec = 'DNS Zone'
        service = 'DNS'
    
    elif node_type == 'DRS':
        # DRS is charged per-hour of migration usage
        # Estimate: duration_months * 30 days * 8 hours/day
        cost = DRS_PRICE_PER_HOUR * 30 * 8  # one month of migration
        spec = 'DRS Migration Job'
        service = 'DRS'
    
    else:
        # Unknown resource type — minimal estimate
        cost = 10.0
        spec = f'{node_type} (estimated)'
        service = node_type
    
    return {
        'id': node_id,
        'service': service,
        'name': node_name,
        'spec': spec,
        'qty': 1,
        'cost_per_month': round(cost, 2),
        'selected': True,
    }


def generate_bom_from_nodes(nodes: List[dict], duration_months: int = 3) -> Dict[str, Any]:
    """
    Generate a Bill of Materials with monthly costs from target architecture nodes.
    
    Returns: {
        'success': bool,
        'bom_items': [...],
        'overhead_cost': float,  # total monthly cost * duration
        'total_monthly': float,
        'resource_count': int
    }
    """
    if not nodes:
        return {
            'success': False,
            'error': 'No nodes provided',
            'bom_items': [],
            'overhead_cost': 0,
            'total_monthly': 0,
            'resource_count': 0
        }
    
    bom_items = []
    total_monthly = 0.0
    
    for node in nodes:
        try:
            item = estimate_node_monthly_cost(node)
            bom_items.append(item)
            total_monthly += item['cost_per_month']
        except Exception as e:
            logger.warning(f"Failed to estimate cost for node {node.get('id', '?')}: {e}")
            continue
    
    overhead_cost = round(total_monthly * duration_months, 2)
    
    return {
        'success': True,
        'bom_items': bom_items,
        'overhead_cost': overhead_cost,
        'total_monthly': round(total_monthly, 2),
        'resource_count': len(bom_items)
    }
