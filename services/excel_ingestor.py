#!/usr/bin/env python3
"""
Excel/CSV Quotation Normalization Engine
Transforms messy Sales Architect spreadsheets into strict blueprint.json schema
"""

import pandas as pd
import json
import os
import re
from pathlib import Path
from typing import Optional, Dict, List, Any

# ============================================================================
# FUZZY MATCHING DICTIONARY
# Add any column names your Sales Architects like to invent here.
# ============================================================================

COLUMN_MAP = {
    'server_name': [
        'server_name', 'vm name', 'server', 'hostname', 'target name', 'name', 
        'instance name', 'resource name', 'server name', 'host'
    ],
    'flavor': [
        'flavor', 'target flavor', 'instance type', 'specification', 
        'hw flavor', 'vm type', 'server type', 'instance', 'type'
    ],
    'cpu': [
        'cpu', 'vcpu', 'cores', 'vcpus', 'vcores', 'cpu cores'
    ],
    'ram': [
        'ram', 'memory', 'ram (gb)', 'memory (gb)', 'memory_gb', 
        'ram_gb', 'memory mb', 'ram mb'
    ],
    'is_public': [
        'is_public', 'public ip', 'eip', 'internet', 'public access',
        'public', 'has public ip', 'external ip', 'public ip required'
    ],
    'tier': [
        'tier', 'role', 'app tier', 'description', 'notes', 
        'application', 'service', 'function'
    ],
    'os_type': [
        'os_type', 'os', 'operating system', 'os type', 'platform', 
        'image', 'os image'
    ],
    'storage_gb': [
        'storage_gb', 'storage', 'disk', 'disk size', 'storage (gb)', 
        'disk (gb)', 'volume size'
    ]
}

# ============================================================================
# DATA SANITIZATION FUNCTIONS
# ============================================================================

def find_column(df: pd.DataFrame, alias_list: List[str]) -> Optional[str]:
    """
    Searches the dataframe for any column name that matches our known aliases.
    
    Args:
        df: pandas DataFrame
        alias_list: List of possible column name aliases
        
    Returns:
        Column name if found, None otherwise
    """
    # First try exact match (case-insensitive)
    for col in df.columns:
        clean_col = str(col).strip().lower()
        for alias in alias_list:
            if clean_col == alias.lower():
                return col
    
    # Then try partial match
    for col in df.columns:
        clean_col = str(col).strip().lower()
        for alias in alias_list:
            if alias.lower() in clean_col or clean_col in alias.lower():
                return col
    
    return None


def clean_server_name(name: str) -> str:
    """
    Sanitizes server names so they don't crash Bash/jq scripts.
    
    Args:
        name: Raw server name from spreadsheet
        
    Returns:
        Bash-safe server name with hyphens, lowercase, no special chars
    """
    if pd.isna(name):
        return "unnamed-server"
    
    name = str(name).strip()
    
    # Replace spaces, underscores, dots, and special chars with hyphens
    name = re.sub(r'[\s_\.]+', '-', name)
    
    # Remove any remaining special characters except hyphens
    name = re.sub(r'[^a-zA-Z0-9\-]', '', name)
    
    # Convert to lowercase
    name = name.lower()
    
    # Ensure it's not empty
    if not name:
        name = "unnamed-server"
    
    return name


def parse_boolean(val: Any) -> bool:
    """
    Safely converts random spreadsheet inputs (Yes, Y, 1, True) into strict booleans.
    
    Args:
        val: Input value from spreadsheet
        
    Returns:
        Boolean True/False
    """
    if pd.isna(val):
        return False
    
    val = str(val).strip().lower()
    
    truthy_values = ['yes', 'y', 'true', '1', 'enabled', 'public', 'external', 'on']
    falsey_values = ['no', 'n', 'false', '0', 'disabled', 'private', 'internal', 'off']
    
    if val in truthy_values:
        return True
    elif val in falsey_values:
        return False
    
    # Default to False for ambiguous values
    return False


def parse_integer(val: Any) -> int:
    """
    Safely converts spreadsheet values to integers.
    
    Args:
        val: Input value
        
    Returns:
        Integer value, 0 if conversion fails
    """
    if pd.isna(val):
        return 0
    
    try:
        # Handle strings like "16 GB", "32GB", "64"
        if isinstance(val, str):
            # Extract numbers from strings
            match = re.search(r'(\d+)', val)
            if match:
                return int(match.group(1))
            return 0
        return int(float(val))
    except (ValueError, TypeError):
        return 0


# ============================================================================
# MAIN PROCESSING FUNCTION
# ============================================================================

def process_quotation(file_path: str, customer_name: str = "TBD_Customer") -> Dict[str, Any]:
    """
    Ingest messy Excel or CSV quotations and normalize into strict blueprint.json schema.
    Auto-detects Huawei Cloud quotation format.
    
    Args:
        file_path: Path to Excel or CSV file
        customer_name: Customer name for the blueprint
        
    Returns:
        Dictionary matching the blueprint.json schema
    """
    print(f"🔄 Ingesting Raw Data: {file_path}")
    
    # Try to detect Huawei format first
    try:
        # Read first few rows to check format
        if file_path.lower().endswith('.csv'):
            df_sample = pd.read_csv(file_path, nrows=5)
        else:
            df_sample = pd.read_excel(file_path, nrows=5, header=None)
        
        # Check if this looks like Huawei quotation (has 'Service' in first row)
        first_row = df_sample.iloc[0].astype(str).str.lower().tolist()
        has_huawei_columns = any('service' in str(cell).lower() for cell in first_row)
        
        if has_huawei_columns:
            print("🔍 Detected Huawei Cloud quotation format")
            return process_huawei_quotation(file_path, customer_name)
            
    except Exception as e:
        print(f"⚠️  Could not detect Huawei format: {str(e)}")
        # Continue with original processing
    
    # 1. EXTRACT: Read the file (original logic)
    try:
        if file_path.lower().endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            # Handle both .xlsx and .xls
            df = pd.read_excel(file_path)
    except Exception as e:
        raise ValueError(f"Failed to read file {file_path}: {str(e)}")
    
    # 2. TRANSFORM: Find columns using fuzzy matching
    col_name = find_column(df, COLUMN_MAP['server_name'])
    col_flavor = find_column(df, COLUMN_MAP['flavor'])
    col_cpu = find_column(df, COLUMN_MAP['cpu'])
    col_ram = find_column(df, COLUMN_MAP['ram'])
    col_public = find_column(df, COLUMN_MAP['is_public'])
    col_tier = find_column(df, COLUMN_MAP['tier'])
    col_os = find_column(df, COLUMN_MAP['os_type'])
    col_storage = find_column(df, COLUMN_MAP['storage_gb'])
    
    # Validate we have at least server names
    if not col_name:
        raise ValueError("Could not find a recognizable 'Hostname' or 'Server Name' column.")
    
    # 3. BUILD THE BLUEPRINT SCHEMA
    blueprint = {
        "customer": customer_name,
        "delivery_scope": "landing_zone_only",
        "governance": {
            "requires_hypercare": False,
            "maintenance_windows": []
        },
        "topology": {
            "network": [],
            "compute": [],
            "databases": []
        }
    }
    
    warnings_count = 0
    
    # 4. PROCESS EACH ROW
    for index, row in df.iterrows():
        # Skip empty rows
        if pd.isna(row[col_name]):
            continue
        
        # Sanitize server name
        server_name = clean_server_name(row[col_name])
        
        # Get flavor with proper handling for missing values
        if col_flavor and pd.notna(row[col_flavor]):
            flavor = str(row[col_flavor]).strip()
            if flavor.lower() in ['', 'nan', 'none', 'null', 'undefined']:
                flavor = "MISSING_FLAVOR"
                status = "WARNING"
                warnings_count += 1
            else:
                status = "OK"
        else:
            flavor = "MISSING_FLAVOR"
            status = "WARNING"
            warnings_count += 1
        
        # Get boolean for public IP
        is_public = False
        if col_public and pd.notna(row[col_public]):
            is_public = parse_boolean(row[col_public])
        
        # Get CPU and RAM
        cpu_cores = parse_integer(row[col_cpu]) if col_cpu and pd.notna(row[col_cpu]) else 0
        ram_gb = parse_integer(row[col_ram]) if col_ram and pd.notna(row[col_ram]) else 0
        
        # Get tier/role
        tier = "Standard Compute"
        if col_tier and pd.notna(row[col_tier]):
            tier_raw = str(row[col_tier]).strip()
            if tier_raw and tier_raw.lower() not in ['', 'nan', 'none']:
                tier = tier_raw
        
        # Get OS type
        os_type = "Linux"
        if col_os and pd.notna(row[col_os]):
            os_raw = str(row[col_os]).strip()
            if os_raw and os_raw.lower() not in ['', 'nan', 'none']:
                if 'windows' in os_raw.lower():
                    os_type = "Windows"
                elif 'linux' in os_raw.lower():
                    os_type = "Linux"
                else:
                    os_type = os_raw
        
        # Get storage
        storage_gb = parse_integer(row[col_storage]) if col_storage and pd.notna(row[col_storage]) else 0
        
        # Create compute resource entry
        compute_resource = {
            "name": server_name,
            "flavor": flavor,
            "is_public": is_public,
            "status": status,
            "metadata": {
                "tier": tier,
                "os_type": os_type,
                "cpu_cores": cpu_cores,
                "ram_gb": ram_gb,
                "storage_gb": storage_gb,
                "original_row": index + 1  # 1-indexed for user reference
            }
        }
        
        blueprint["topology"]["compute"].append(compute_resource)
    
    # 5. VALIDATION AND SUMMARY
    total_servers = len(blueprint["topology"]["compute"])
    
    print(f"✅ Normalization Complete")
    print(f"📊 Customer: {customer_name}")
    print(f"📊 Total Servers Processed: {total_servers}")
    print(f"⚠️  Servers with Warnings: {warnings_count}")
    
    if warnings_count > 0:
        print(f"🔍 Missing flavors detected. These will need manual correction.")
    
    return blueprint


def save_blueprint(blueprint: Dict[str, Any], output_path: str = "config/blueprint.json") -> str:
    """
    Save blueprint dictionary to JSON file.
    
    Args:
        blueprint: Blueprint dictionary
        output_path: Path to save the JSON file
        
    Returns:
        Path to saved file
    """
    # Ensure directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(blueprint, f, indent=2)
    
    print(f"💾 Blueprint saved to: {output_path}")
    return output_path



# ============================================================================
# HUAWEI CLOUD QUOTATION PROCESSING
# ============================================================================

def parse_huawei_specifications(spec_string):
    """
    Parse Huawei Cloud specification strings like:
    'x86 | General computing | x0.8u.16g | 8 vCPUs | 16GiB; Huawei Cloud EulerOS | Huawei Cloud EulerOS 2.0 Standard 64 bit; General Purpose SSD | 280GB;'
    
    Returns dict with: vcpus, ram_gb, os, storage_gb, instance_type
    """
    import pandas as pd
    import re
    
    if pd.isna(spec_string):
        return {'vcpus': 0, 'ram_gb': 0, 'os': 'Unknown', 'storage_gb': 0, 'instance_type': 'Unknown'}
    
    spec = str(spec_string)
    result = {'vcpus': 0, 'ram_gb': 0, 'os': 'Unknown', 'storage_gb': 0, 'instance_type': 'Unknown'}
    
    # Parse vCPUs - look for patterns like '8 vCPUs' or 'x0.8u.16g'
    vcpu_patterns = [
        r'(\d+)\s*vCPU',  # 8 vCPUs
        r'x(\d+)\.\d+u',  # x0.8u.16g -> 8
        r'(\d+)\s*cores?',  # 8 cores
    ]
    
    for pattern in vcpu_patterns:
        match = re.search(pattern, spec, re.IGNORECASE)
        if match:
            result['vcpus'] = int(match.group(1))
            break
    
    # Parse RAM - look for patterns like '16GiB' or '16GB' or 'x0.8u.16g'
    ram_patterns = [
        r'(\d+)\s*GiB',  # 16GiB
        r'(\d+)\s*GB',    # 16GB
        r'x\d+\.\d+u\.(\d+)g',  # x0.8u.16g -> 16
    ]
    
    for pattern in ram_patterns:
        match = re.search(pattern, spec, re.IGNORECASE)
        if match:
            result['ram_gb'] = int(match.group(1))
            break
    
    # Parse OS
    os_patterns = [
        r'(Huawei Cloud EulerOS[^;]*)',
        r'(CentOS[^;]*)',
        r'(Windows[^;]*)',
        r'(Ubuntu[^;]*)',
        r'(Red Hat[^;]*)',
        r'(Debian[^;]*)',
    ]
    
    for pattern in os_patterns:
        match = re.search(pattern, spec, re.IGNORECASE)
        if match:
            result['os'] = match.group(1).strip()
            break
    
    # Parse storage - look for 'General Purpose SSD | 280GB'
    storage_match = re.search(r'General Purpose SSD\s*\|\s*(\d+)GB', spec, re.IGNORECASE)
    if storage_match:
        result['storage_gb'] = int(storage_match.group(1))
    
    # Parse instance type - look for patterns like 'General computing', 'General computing-plus'
    instance_patterns = [
        r'General computing-plus',
        r'General computing',
        r'x86\s*\|\s*([^|]+)',  # First part after x86 |
    ]
    
    for pattern in instance_patterns:
        match = re.search(pattern, spec)
        if match:
            # Check if match has groups
            if match.groups():
                result['instance_type'] = match.group(1).strip()
            else:
                result['instance_type'] = match.group(0).strip()
            break
    
    return result

def process_huawei_quotation(file_path: str, customer_name: str = "TBD_Customer"):
    """
    Process Huawei Cloud quotation Excel files.
    """
    print(f"🔄 Processing Huawei Quotation: {file_path}")
    
    # Read the file
    try:
        # Try with header=1 (second row) for Huawei format
        df = pd.read_excel(file_path, header=1)
    except Exception as e:
        raise ValueError(f"Failed to read Huawei quotation file {file_path}: {str(e)}")
    
    # Clean column names
    df.columns = [str(col).strip() for col in df.columns]
    
    print(f"📊 Found {len(df)} rows, {len(df.columns)} columns")
    print(f"📋 Columns: {list(df.columns)}")
    
    # Check for required Huawei columns
    required_columns = ['Service', 'Description', 'Specifications']
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        raise ValueError(f"Missing required Huawei columns: {missing_columns}. Found columns: {list(df.columns)}")
    
    # Build blueprint
    blueprint = {
        "customer": customer_name,
        "delivery_scope": "landing_zone_only",
        "governance": {
            "requires_hypercare": False,
            "maintenance_windows": []
        },
        "topology": {
            "network": [],
            "compute": [],
            "databases": []
        }
    }
    
    warnings_count = 0
    compute_resources = []
    
    # Process each row
    for index, row in df.iterrows():
        # Skip empty rows
        if pd.isna(row.get('Description')):
            continue
        
        service_type = str(row.get('Service', '')).strip()
        description = str(row.get('Description', '')).strip()
        region = str(row.get('Region', '')).strip()
        az = str(row.get('AZ', '')).strip()
        billing_mode = str(row.get('Billing Mode', '')).strip()
        specs = str(row.get('Specifications', ''))
        
        # Only process Elastic Cloud Servers
        if 'Elastic Cloud Server' not in service_type:
            continue  # Skip non-ECS rows
        
        # Parse specifications
        parsed_specs = parse_huawei_specifications(specs)
        
        # Create compute resource for ECS instances
        compute_resource = {
            "name": clean_server_name(description),
            "flavor": parsed_specs['instance_type'] or service_type,
            "is_public": False,  # Default, can be updated later
            "status": "OK" if parsed_specs['vcpus'] > 0 else "WARNING",
            "metadata": {
                "tier": service_type,
                "os_type": parsed_specs['os'],
                "cpu_cores": parsed_specs['vcpus'],
                "ram_gb": parsed_specs['ram_gb'],
                "storage_gb": parsed_specs['storage_gb'],
                "region": region,
                "az": az,
                "billing_mode": billing_mode.lower().replace('-', '_') if pd.notna(billing_mode) else "pay_per_use",
                "original_row": index + 2,  # +2 because header is row 1
                "service_type": service_type,
                "description": description
            }
        }
        
        if parsed_specs['vcpus'] == 0:
            warnings_count += 1
        
        compute_resources.append(compute_resource)
    
    blueprint["topology"]["compute"] = compute_resources
    
    print(f"✅ Huawei Quotation Processing Complete")
    print(f"📊 Customer: {customer_name}")
    print(f"📊 Total ECS Servers Processed: {len(compute_resources)}")
    print(f"⚠️  Servers with Warnings: {warnings_count}")
    
    if warnings_count > 0:
        print(f"🔍 Some servers missing vCPU/RAM specs. Manual correction may be needed.")
    
    return blueprint

# Update the main process_quotation function to detect Huawei format
def process_quotation(file_path: str, customer_name: str = "TBD_Customer"):
    """
    Ingest messy Excel or CSV quotations and normalize into strict blueprint.json schema.
    Auto-detects Huawei Cloud quotation format.
    
    Args:
        file_path: Path to Excel or CSV file
        customer_name: Customer name for the blueprint
        
    Returns:
        Dictionary matching the blueprint.json schema
    """
    print(f"🔄 Ingesting Raw Data: {file_path}")
    
    # Try to detect Huawei format first
    try:
        # Read first few rows to check format
        df_sample = pd.read_excel(file_path, nrows=5, header=None)
        
        # Check if this looks like Huawei quotation (has 'Service' in first row)
        first_row = df_sample.iloc[0].astype(str).str.lower().tolist()
        has_huawei_columns = any('service' in str(cell).lower() for cell in first_row)
        
        if has_huawei_columns:
            print("🔍 Detected Huawei Cloud quotation format")
            return process_huawei_quotation(file_path, customer_name)
            
    except Exception as e:
        print(f"⚠️  Could not detect Huawei format: {str(e)}")
        # Continue with original processing
    
    # 1. EXTRACT: Read the file (original logic)
    try:
        if file_path.lower().endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            # Handle both .xlsx and .xls
            df = pd.read_excel(file_path)
    except Exception as e:
        raise ValueError(f"Failed to read file {file_path}: {str(e)}")
    
    # Rest of original function continues...
# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python excel_ingestor.py <path_to_excel_or_csv> [Customer_Name]")
        print("")
        print("Examples:")
        print("  python excel_ingestor.py quotation.xlsx \"Acme Corp\"")
        print("  python excel_ingestor.py servers.csv")
        print("")
        print("Output will be saved to config/blueprint.json")
        sys.exit(1)
    
    target_file = sys.argv[1]
    customer_name = sys.argv[2] if len(sys.argv) > 2 else "Unknown Customer"
    
    try:
        # Process the quotation
        blueprint = process_quotation(target_file, customer_name)
        
        # Save to default location
        output_path = save_blueprint(blueprint)
        
        # Print summary
        print("\n📋 Blueprint Summary:")
        print(f"  Customer: {blueprint['customer']}")
        print(f"  Delivery Scope: {blueprint['delivery_scope']}")
        print(f"  Compute Resources: {len(blueprint['topology']['compute'])}")
        
        # Show servers with warnings
        warning_servers = [s for s in blueprint['topology']['compute'] if s['status'] == 'WARNING']
        if warning_servers:
            print(f"\n⚠️  Servers requiring attention:")
            for server in warning_servers:
                print(f"    - {server['name']}: {server['flavor']}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)