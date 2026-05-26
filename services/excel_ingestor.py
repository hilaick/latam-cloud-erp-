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
# ============================================================================

COLUMN_MAP = {
    'server_name': ['server_name', 'vm name', 'server', 'hostname', 'target name', 'name', 'instance name', 'resource name', 'server name', 'host'],
    'flavor': ['flavor', 'target flavor', 'instance type', 'specification', 'hw flavor', 'vm type', 'server type', 'instance', 'type'],
    'cpu': ['cpu', 'vcpu', 'cores', 'vcpus', 'vcores', 'cpu cores'],
    'ram': ['ram', 'memory', 'ram (gb)', 'memory (gb)', 'memory_gb', 'ram_gb', 'memory mb', 'ram mb'],
    'is_public': ['is_public', 'public ip', 'eip', 'internet', 'public access', 'public', 'has public ip', 'external ip', 'public ip required'],
    'tier': ['tier', 'role', 'app tier', 'description', 'notes', 'application', 'service', 'function'],
    'os_type': ['os_type', 'os', 'operating system', 'os type', 'platform', 'image', 'os image'],
    'storage_gb': ['storage_gb', 'storage', 'disk', 'disk size', 'storage (gb)', 'disk (gb)', 'volume size']
}

def find_column(df: pd.DataFrame, alias_list: List[str]) -> Optional[str]:
    for col in df.columns:
        clean_col = str(col).strip().lower()
        for alias in alias_list:
            if clean_col == alias.lower(): return col
    for col in df.columns:
        clean_col = str(col).strip().lower()
        for alias in alias_list:
            if alias.lower() in clean_col or clean_col in alias.lower(): return col
    return None

def clean_server_name(name: str) -> str:
    if pd.isna(name): return "unnamed-server"
    name = str(name).strip()
    name = re.sub(r'[\s_\.]+', '-', name)
    name = re.sub(r'[^a-zA-Z0-9\-]', '', name)
    name = name.lower()
    return name if name else "unnamed-server"

def parse_boolean(val: Any) -> bool:
    if pd.isna(val): return False
    val = str(val).strip().lower()
    return val in ['yes', 'y', 'true', '1', 'enabled', 'public', 'external', 'on']

def parse_integer(val: Any) -> int:
    if pd.isna(val): return 0
    try:
        if isinstance(val, str):
            match = re.search(r'(\d+)', val)
            return int(match.group(1)) if match else 0
        return int(float(val))
    except (ValueError, TypeError): return 0

# ============================================================================
# MAIN PROCESSING FUNCTION
# ============================================================================

def process_quotation(file_path: str, customer_name: str = "TBD_Customer") -> Dict[str, Any]:
    print(f"🔄 Ingesting Raw Data: {file_path}")
    
    # 🚨 BULLETPROOF HUAWEI DETECTION: Scan deep into the file to bypass title rows
    is_huawei = False
    try:
        if file_path.lower().endswith('.csv'):
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = [next(f) for _ in range(20)]
        else:
            df_check = pd.read_excel(file_path, nrows=20, header=None)
            lines = [' '.join(str(x).lower() for x in row) for row in df_check.values]
        
        text_chunk = ''.join(lines).lower()
        if 'elastic cloud server' in text_chunk and 'specifications' in text_chunk:
            print("🔍 Detected Huawei Cloud Price Calculator format")
            return process_huawei_quotation(file_path, customer_name)
    except StopIteration:
        pass
    except Exception as e:
        print(f"⚠️  Detection warning: {str(e)}")
    
    # --- FALLBACK GENERIC PARSER ---
    try:
        df = pd.read_csv(file_path) if file_path.lower().endswith('.csv') else pd.read_excel(file_path)
    except Exception as e:
        raise ValueError(f"Failed to read file {file_path}: {str(e)}")
    
    col_name = find_column(df, COLUMN_MAP['server_name'])
    col_flavor = find_column(df, COLUMN_MAP['flavor'])
    col_cpu = find_column(df, COLUMN_MAP['cpu'])
    col_ram = find_column(df, COLUMN_MAP['ram'])
    col_public = find_column(df, COLUMN_MAP['is_public'])
    col_tier = find_column(df, COLUMN_MAP['tier'])
    col_os = find_column(df, COLUMN_MAP['os_type'])
    col_storage = find_column(df, COLUMN_MAP['storage_gb'])
    
    if not col_name: raise ValueError("Could not find a recognizable 'Hostname' or 'Server Name' column.")
    
    blueprint = {
        "customer": customer_name,
        "delivery_scope": "landing_zone_only",
        "governance": { "requires_hypercare": False, "maintenance_windows": [] },
        "topology": { "network": [], "compute": [], "databases": [] }
    }
    
    for index, row in df.iterrows():
        if pd.isna(row[col_name]): continue
        flavor = str(row[col_flavor]).strip() if col_flavor and pd.notna(row[col_flavor]) else "MISSING_FLAVOR"
        if flavor.lower() in ['', 'nan', 'none']: flavor = "MISSING_FLAVOR"
        
        blueprint["topology"]["compute"].append({
            "name": clean_server_name(row[col_name]),
            "flavor": flavor,
            "is_public": parse_boolean(row[col_public]) if col_public else False,
            "status": "OK" if flavor != "MISSING_FLAVOR" else "WARNING",
            "metadata": {
                "tier": str(row[col_tier]).strip() if col_tier and pd.notna(row[col_tier]) else "Standard Compute",
                "os_type": "Windows" if col_os and 'windows' in str(row[col_os]).lower() else "Linux",
                "cpu_cores": parse_integer(row[col_cpu]) if col_cpu else 0,
                "ram_gb": parse_integer(row[col_ram]) if col_ram else 0,
                "storage_gb": parse_integer(row[col_storage]) if col_storage else 0,
                "original_row": index + 1
            }
        })
    return blueprint

# ============================================================================
# HUAWEI CLOUD QUOTATION PROCESSING
# ============================================================================

def parse_huawei_specifications(spec_string):
    import re
    if pd.isna(spec_string): return {'vcpus': 0, 'ram_gb': 0, 'os': 'Unknown', 'storage_gb': 0, 'instance_type': 'Unknown'}
    spec = str(spec_string)
    result = {'vcpus': 0, 'ram_gb': 0, 'os': 'Unknown', 'storage_gb': 0, 'instance_type': 'Unknown'}
    
    for p in [r'(\d+)\s*vCPU', r'x(\d+)\.\d+u', r'(\d+)\s*cores?']:
        match = re.search(p, spec, re.IGNORECASE)
        if match: result['vcpus'] = int(match.group(1)); break
            
    for p in [r'(\d+)\s*GiB', r'(\d+)\s*GB', r'x\d+\.\d+u\.(\d+)g']:
        match = re.search(p, spec, re.IGNORECASE)
        if match: result['ram_gb'] = int(match.group(1)); break
            
    for p in [r'(Huawei Cloud EulerOS[^;]*)', r'(CentOS[^;]*)', r'(Windows[^;]*)', r'(Ubuntu[^;]*)', r'(Red Hat[^;]*)', r'(Debian[^;]*)']:
        match = re.search(p, spec, re.IGNORECASE)
        if match: result['os'] = match.group(1).strip(); break
            
    storage_match = re.search(r'General Purpose SSD\s*\|\s*(\d+)GB', spec, re.IGNORECASE)
    if storage_match: result['storage_gb'] = int(storage_match.group(1))
    
    for p in [r'General computing-plus', r'General computing', r'x86\s*\|\s*([^|]+)']:
        match = re.search(p, spec)
        if match: 
            result['instance_type'] = match.group(1).strip() if match.groups() else match.group(0).strip()
            break
            
    return result

def process_huawei_quotation(file_path: str, customer_name: str = "TBD_Customer"):
    print(f"🔄 Processing Huawei Quotation: {file_path}")
    
    # 🚨 BULLETPROOF HEADER EXTRACTION: Finds the real header row
    try:
        header_idx = 0
        if file_path.lower().endswith('.csv'):
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for i, line in enumerate(f):
                    if 'Service' in line and 'Description' in line and 'Specifications' in line:
                        header_idx = i
                        break
            df = pd.read_csv(file_path, header=header_idx)
        else:
            df_temp = pd.read_excel(file_path, nrows=20, header=None)
            for i in range(len(df_temp)):
                row_str = ' '.join(str(x) for x in df_temp.iloc[i].values)
                if 'Service' in row_str and 'Description' in row_str and 'Specifications' in row_str:
                    header_idx = i
                    break
            df = pd.read_excel(file_path, header=header_idx)
            
    except Exception as e:
        raise ValueError(f"Failed to isolate Huawei header row: {str(e)}")
        
    blueprint = {
        "customer": customer_name,
        "delivery_scope": "landing_zone_only",
        "governance": { "requires_hypercare": False, "maintenance_windows": [] },
        "topology": { "network": [], "compute": [], "databases": [] }
    }
    
    for index, row in df.iterrows():
        if pd.isna(row.get('Description')): continue
        service_type = str(row.get('Service', '')).strip()
        if 'Elastic Cloud Server' not in service_type: continue
        
        parsed_specs = parse_huawei_specifications(str(row.get('Specifications', '')))
        
        blueprint["topology"]["compute"].append({
            "name": clean_server_name(str(row.get('Description', '')).strip()),
            "flavor": parsed_specs['instance_type'] or service_type,
            "is_public": False,
            "status": "OK" if parsed_specs['vcpus'] > 0 else "WARNING",
            "metadata": {
                "tier": service_type,
                "os_type": parsed_specs['os'],
                "cpu_cores": parsed_specs['vcpus'],
                "ram_gb": parsed_specs['ram_gb'],
                "storage_gb": parsed_specs['storage_gb'],
                "region": str(row.get('Region', '')).strip(),
                "billing_mode": str(row.get('Billing Mode', '')).strip().lower().replace('-', '_'),
                "original_row": index + 2
            }
        })
        
    return blueprint
