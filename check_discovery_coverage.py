#!/usr/bin/env python3
"""
Huawei Cloud Service Discovery Coverage Check

This script checks which Huawei Cloud services we're currently discovering
and identifies missing services.
"""

services_to_discover = {
    "compute": [
        "ECS",  # Elastic Cloud Server
        "BMS",  # Bare Metal Server
        "AS",   # Auto Scaling
        "IMS",  # Image Management Service
        "IMS (Image)",  # Images
        "FunctionGraph",  # Serverless Function
        "CCI",  # Cloud Container Instance
        "CCE",  # Cloud Container Engine
    ],
    "databases": [
        "RDS",      # Relational Database Service
        "DDS",      # Document Database Service (MongoDB)
        "DCS",      # Distributed Cache Service (Redis)
        "GaussDB",  # GaussDB
        "GeminiDB", # GeminiDB
        "DDM",      # Distributed Database Middleware
        "DRS",      # Data Replication Service
    ],
    "network": [
        "VPC",      # Virtual Private Cloud
        "Subnet",   # Subnet
        "SecurityGroup",  # Security Group
        "EIP",      # Elastic IP
        "ELB",      # Elastic Load Balance
        "NAT",      # NAT Gateway
        "VPN",      # VPN Gateway
        "Direct Connect",  # Direct Connect
        "VPC Peering",     # VPC Peering
    ],
    "storage": [
        "EVS",      # Elastic Volume Service
        "OBS",      # Object Storage Service
        "SFS",      # Scalable File Service
        "SFS Turbo", # SFS Turbo
        "CBR",      # Cloud Backup and Recovery
    ],
    "other": [
        "IAM",      # Identity and Access Management
        "CES",      # Cloud Eye Service (Monitoring)
        "CTS",      # Cloud Trace Service
        "TMS",      # Tag Management Service
        "KMS",      # Key Management Service
        "SMN",      # Simple Message Notification
        "APIG",     # API Gateway
        "DMS",      # Distributed Message Service
        "DIS",      # Data Ingestion Service
    ]
}

# Current coverage in our discovery code
current_coverage = {
    "compute": ["ECS", "AS", "FunctionGraph"],
    "databases": ["RDS", "DDS", "DCS"],
    "network": ["VPC", "Subnet", "SecurityGroup", "EIP", "ELB", "NAT", "VPN"],
    "storage": ["EVS", "OBS", "CBR"],
    "other": []
}

print("HUAWEI CLOUD DISCOVERY COVERAGE ANALYSIS")
print("=" * 60)

for category, services in services_to_discover.items():
    print(f"\n{category.upper()}:")
    covered = current_coverage.get(category, [])
    missing = [s for s in services if s not in covered]
    
    print(f"  ✓ Covered ({len(covered)}/{len(services)}):")
    for service in covered:
        print(f"    • {service}")
    
    if missing:
        print(f"  ✗ Missing ({len(missing)}/{len(services)}):")
        for service in missing:
            print(f"    • {service}")

print("\n" + "=" * 60)
print(f"TOTAL COVERAGE: {sum(len(v) for v in current_coverage.values())}/{sum(len(v) for v in services_to_discover.values())} services")
print(f"COVERAGE PERCENTAGE: {(sum(len(v) for v in current_coverage.values()) / sum(len(v) for v in services_to_discover.values()) * 100):.1f}%")

print("\n" + "=" * 60)
print("RECOMMENDATIONS:")
print("1. Fix RMS unified discovery (preferred)")
print("2. Add missing service SDKs and discovery methods")
print("3. Prioritize: BMS, IMS, GaussDB, SFS, DMS, APIG")
print("4. Check API permissions for RMS access")