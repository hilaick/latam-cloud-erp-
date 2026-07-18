#!/usr/bin/env python3
"""Check ULEARNING project database services and resources"""

import os
import json
import sys

# Read database URL from .env
db_url = None
with open('.env', 'r') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.strip().split('=', 1)[1]
            break

if not db_url:
    print("❌ DATABASE_URL not found in .env")
    sys.exit(1)

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("❌ psycopg2 not installed")
    sys.exit(1)

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Get ULEARNING project
    cursor.execute("SELECT data FROM projects WHERE id = '1784063810266';")
    result = cursor.fetchone()
    
    if not result:
        print("❌ ULEARNING project not found")
        sys.exit(1)
    
    data = json.loads(result['data'])
    
    print("📊 ULEARNING PROJECT - DATABASE SERVICES & RESOURCES")
    print("=" * 60)
    
    # Basic info
    print(f"\n📋 PROJECT INFO:")
    print(f"  • Name: {data.get('name', 'N/A')}")
    print(f"  • Customer: {data.get('customerName', 'N/A')}")
    print(f"  • Region: {data.get('region', 'N/A')}")
    print(f"  • Lifecycle: {data.get('lifecycleState', 'N/A')}")
    print(f"  • Health: {data.get('health', 'N/A')}")
    print(f"  • Delivery Scope: {data.get('deliveryScope', 'N/A')}")
    
    # Check MGC data
    mgc_data = data.get('mgcData')
    if not mgc_data:
        print("\n❌ No MGC inventory data available")
        sys.exit(0)
    
    raw_inventory = mgc_data.get('raw_inventory', {})
    
    # Database services
    print("\n🗄️  DATABASE SERVICES:")
    db_services = []
    
    # Check for RDS
    if 'rds' in raw_inventory and isinstance(raw_inventory['rds'], list):
        for rds in raw_inventory['rds']:
            if isinstance(rds, dict):
                db_services.append({
                    'type': 'RDS',
                    'name': rds.get('name', 'Unknown'),
                    'engine': rds.get('engine', 'Unknown'),
                    'status': rds.get('status', 'Unknown')
                })
    
    # Check for DDS
    if 'dds' in raw_inventory and isinstance(raw_inventory['dds'], list):
        for dds in raw_inventory['dds']:
            if isinstance(dds, dict):
                db_services.append({
                    'type': 'DDS',
                    'name': dds.get('name', 'Unknown'),
                    'engine': dds.get('engine', 'Unknown'),
                    'status': dds.get('status', 'Unknown')
                })
    
    # Check for GaussDB
    if 'gaussdb' in raw_inventory and isinstance(raw_inventory['gaussdb'], list):
        for gauss in raw_inventory['gaussdb']:
            if isinstance(gauss, dict):
                db_services.append({
                    'type': 'GaussDB',
                    'name': gauss.get('name', 'Unknown'),
                    'engine': gauss.get('engine', 'Unknown'),
                    'status': gauss.get('status', 'Unknown')
                })
    
    if db_services:
        print(f"  Found {len(db_services)} database service(s):")
        for db in db_services:
            print(f"    • {db['type']}: {db['name']} ({db['engine']}) - {db['status']}")
    else:
        print("  No database services found in inventory")
    
    # Compute resources
    print("\n🖥️  COMPUTE RESOURCES:")
    compute = raw_inventory.get('compute', [])
    if isinstance(compute, list):
        print(f"  Total servers: {len(compute)}")
        if compute:
            # Count by flavor
            flavors = {}
            for server in compute:
                if isinstance(server, dict):
                    flavor = server.get('flavor', 'Unknown')
                    flavors[flavor] = flavors.get(flavor, 0) + 1
            
            print("  Breakdown by flavor:")
            for flavor, count in sorted(flavors.items()):
                print(f"    • {flavor}: {count}")
            
            # Show sample servers
            print("\n  Sample servers (first 5):")
            for i, server in enumerate(compute[:5], 1):
                if isinstance(server, dict):
                    name = server.get('name', 'Unknown')
                    flavor = server.get('flavor', 'Unknown')
                    status = server.get('status', 'Unknown')
                    print(f"    {i}. {name} - {flavor} - {status}")
    else:
        print("  No compute data available")
    
    # Storage resources
    print("\n💾 STORAGE RESOURCES:")
    storage = raw_inventory.get('storage', [])
    if isinstance(storage, list):
        print(f"  Total volumes: {len(storage)}")
        total_gb = 0
        for vol in storage:
            if isinstance(vol, dict):
                size = vol.get('size', 0)
                if isinstance(size, (int, float)):
                    total_gb += size
        print(f"  Total capacity: {total_gb} GB")
    else:
        print("  No storage data available")
    
    # Network resources
    print("\n🌐 NETWORK RESOURCES:")
    network = raw_inventory.get('network', [])
    if isinstance(network, list):
        print(f"  Total network resources: {len(network)}")
    else:
        print("  No network data available")
    
    # List all inventory keys
    print("\n🔍 FULL INVENTORY CATEGORIES:")
    for key in sorted(raw_inventory.keys()):
        value = raw_inventory[key]
        if isinstance(value, list):
            print(f"  • {key}: {len(value)} items")
        elif isinstance(value, dict):
            print(f"  • {key}: dict with {len(value)} keys")
        else:
            print(f"  • {key}: {type(value).__name__}")
    
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()