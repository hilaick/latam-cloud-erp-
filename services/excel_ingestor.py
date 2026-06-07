#!/usr/bin/env python3
"""
Excel/CSV Quotation Normalization Engine
Transforms messy Sales Architect spreadsheets into strict blueprint.json schema.
Features Bulletproof Parent/Child detection and Aggressive Smart Text Parsing.
"""

import pandas as pd
import re
from typing import Optional, Dict, Any
from services.semantic_classifier import classify_unknown_service_with_ai

# ============================================================================
# AGGRESSIVE SMART LOADER (BYPASSES PANDAS C-ENGINE CRASHES)
# ============================================================================

def load_dataframe_smart(file_path: str) -> pd.DataFrame:
    """
    Aggressively parses Cloud Consoles' messy exports.
    Scans the file in raw text mode to dynamically locate the true header row, 
    bypassing junk lines injected by cloud consoles.
    """
    header_idx = 0
    encodings = ['utf-8-sig', 'utf-8', 'latin1', 'utf-16le', 'cp1252']
    
    # 1. Find the true header line index by scanning raw text directly
    for enc in encodings:
        try:
            with open(file_path, 'r', encoding=enc) as f:
                for i, line in enumerate(f):
                    lower_line = line.lower()
                    if 'service' in lower_line and 'description' in lower_line:
                        header_idx = i
                        break
            break # Found a working encoding without throwing read errors
        except Exception:
            continue

    print(f"📌 Detected true header at row index: {header_idx}")

    # 2. Try parsing as Native Excel first
    if str(file_path).lower().endswith(('.xlsx', '.xls')):
        try:
            return pd.read_excel(file_path, header=header_idx)
        except Exception as e:
            print(f"⚠️ Native Excel parse failed. Attempting text fallback. Error: {e}")

    # 3. Aggressive CSV Parsing (Skips the junk rows at the top)
    for enc in encodings:
        for delim in [',', ';', '\t']:
            try:
                df = pd.read_csv(file_path, skiprows=header_idx, encoding=enc, sep=delim, on_bad_lines='skip')
                # If we parsed more than 1 column, we successfully mapped it
                if not df.empty and len(df.columns) > 1:
                    return df
            except Exception:
                continue

    # 4. Fallback to Pandas Python engine
    try:
        return pd.read_csv(file_path, skiprows=header_idx, sep=None, engine='python', on_bad_lines='skip')
    except Exception:
        pass

    # 5. HTML Table Fallback (for .xls disguised exports)
    try:
        dfs = pd.read_html(file_path, header=header_idx)
        if dfs: return dfs[0]
    except Exception:
        pass

    raise ValueError("Format cannot be determined. File is either completely empty, heavily corrupted, or highly customized.")

# ============================================================================
# GENERIC FALLBACK MATCHING DICTIONARY
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

def find_column(df: pd.DataFrame, alias_list: list) -> Optional[str]:
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
    if pd.isna(name): return "unnamed-resource"
    name = str(name).strip()
    name = re.sub(r'[\s_\.]+', '-', name)
    name = re.sub(r'[^a-zA-Z0-9\-]', '', name)
    name = name.lower()
    return name if name else "unnamed-resource"

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

def parse_huawei_specifications(spec_string):
    if pd.isna(spec_string): return {'vcpus': 0, 'ram_gb': 0, 'os': 'Unknown', 'storage_gb': 0, 'instance_type': 'Unknown'}
    spec = str(spec_string)
    result = {'vcpus': 0, 'ram_gb': 0, 'os': 'Unknown', 'storage_gb': 0, 'instance_type': 'Unknown'}
    
    for p in [r'(\d+)\s*vCPU', r'x(\d+)\.\d+u', r'(\d+)\s*cores?']:
        match = re.search(p, spec, re.IGNORECASE)
        if match: 
            result['vcpus'] = int(match.group(1))
            break
            
    for p in [r'(\d+)\s*GiB', r'(\d+)\s*GB', r'x\d+\.\d+u\.(\d+)g']:
        match = re.search(p, spec, re.IGNORECASE)
        if match: 
            result['ram_gb'] = int(match.group(1))
            break
            
    for p in [r'(Huawei Cloud EulerOS[^;|]*)', r'(CentOS[^;|]*)', r'(Windows[^;|]*)', r'(Ubuntu[^;|]*)', r'(Red Hat[^;|]*)', r'(Debian[^;|]*)', r'(AlmaLinux[^;|]*)', r'(Oracle[^;|]*)']:
        match = re.search(p, spec, re.IGNORECASE)
        if match: 
            result['os'] = match.group(1).strip()
            break
            
    storage_sum = 0
    for match in re.finditer(r'(?:SSD|SAS|SATA|Disk)[^|]*\|\s*(\d+)\s*GB', spec, re.IGNORECASE):
        storage_sum += int(match.group(1))
    if storage_sum > 0:
        result['storage_gb'] = storage_sum
    else:
        fallback = re.search(r'(\d+)\s*GB', spec, re.IGNORECASE)
        if fallback and fallback.group(1) != str(result['ram_gb']):
            result['storage_gb'] = int(fallback.group(1))
    
    type_match = re.search(r'\|\s*([a-zA-Z0-9\.\-]+)\s*\|', spec)
    if type_match:
        result['instance_type'] = type_match.group(1).strip()
    else:
        for p in [r'General computing-plus', r'General computing', r'Flexus X Instance']:
            match = re.search(p, spec, re.IGNORECASE)
            if match: 
                result['instance_type'] = match.group(0).strip()
                break
                
    return result

def _finalize_resource(res, blueprint):
    cat = res['category']
    if cat == 'compute':
        parsed = parse_huawei_specifications(res['specs'])
        blueprint["topology"]["compute"].append({
            "name": clean_server_name(res['name']),
            "flavor": parsed['instance_type'] if parsed['instance_type'] != 'Unknown' else res['type'],
            "is_public": False,
            "status": "OK" if parsed['vcpus'] > 0 else "WARNING",
            "metadata": { 
                "tier": res['type'], 
                "os_type": parsed['os'], 
                "cpu_cores": parsed['vcpus'], 
                "ram_gb": parsed['ram_gb'],
                "storage_gb": parsed['storage_gb']
            }
        })
    elif cat == 'database':
        blueprint["topology"]["databases"].append({
            "name": clean_server_name(res['name']), "engine": res['type'], "version": "Unknown", "status": "OK"
        })
    elif cat == 'network':
        net_type = 'NAT' if 'NAT' in res['type'] else 'VPN' if 'Virtual Private' in res['type'] else 'EIP' if 'Elastic IP' in res['type'] else 'VPC'
        blueprint["topology"]["network"].append({
            "name": clean_server_name(res['name']), "type": net_type, "cidr": "N/A", "status": "OK"
        })
    elif cat == 'storage':
        st_type = 'CBR' if 'Backup' in res['type'] else 'OBS'
        blueprint["topology"]["storage"].append({
            "name": clean_server_name(res['name']), "type": st_type, "location": "Global", "status": "OK"
        })
    elif cat == 'security':
        blueprint["topology"]["security"].append({
            "name": clean_server_name(res['name']), "type": res['type'], "status": "OK"
        })

# ============================================================================
# MODERN HUAWEI NESTED PARSER 
# ============================================================================

def process_huawei_quotation(file_path: str, customer_name: str = "TBD_Customer") -> Dict[str, Any]:
    print(f"🔄 Ingesting Raw Data: {file_path}")
    
    # Safely load the dataframe using our new aggressive brute-force method
    df = load_dataframe_smart(file_path)
    
    # Normalize columns
    df.columns = [str(c).strip().lower() for c in df.columns]
    
    # Verify Huawei Format
    if 'service' not in df.columns or 'description' not in df.columns:
        print("🔍 Columns don't match Huawei structure. Switching to Generic Parser.")
        return process_generic_quotation_df(df, customer_name)
    
    blueprint = {
        "customer": customer_name,
        "delivery_scope": "landing_zone_only",
        "governance": { "requires_hypercare": False, "maintenance_windows": [] },
        "topology": { "network": [], "compute": [], "databases": [], "storage": [], "security": [] }
    }

    current_resource = None

    for index, row in df.iterrows():
        svc_val = str(row.get('service', ''))
        desc_val = str(row.get('description', ''))
        region_val = str(row.get('region', ''))
        
        if not svc_val.strip() or svc_val == 'nan':
            continue
        
        is_main_resource = bool(region_val.strip() and region_val != 'nan')
        
        if not is_main_resource:
            if current_resource and current_resource['category'] == 'compute':
                current_resource['specs'] += f" | {svc_val.strip()}: {desc_val.strip()}"
            continue

        if current_resource:
            _finalize_resource(current_resource, blueprint)
        
        svc_name = svc_val.strip()
        svc_type = desc_val.strip()

        cat = 'unknown'
        if any(x in svc_type for x in ['Elastic Cloud Server', 'Bare Metal', 'Flexus X Instance', 'ECS']):
            cat = 'compute'
        elif any(x in svc_type for x in ['Relational Database', 'GaussDB', 'Document Database', 'RDS', 'Redis']):
            cat = 'database'
        elif any(x in svc_type for x in ['NAT Gateway', 'Virtual Private Network', 'Elastic IP', 'VPC', 'Direct Connect', 'Bandwidth', 'Content Delivery Network', 'Whole Site Acceleration', 'CDN', 'Edge']):
            cat = 'network'
        elif any(x in svc_type for x in ['Cloud Backup and Recovery', 'Object Storage', 'SFS']):
            cat = 'storage'
        elif any(x in svc_type for x in ['Host Security', 'Web Application Firewall', 'WAF', 'Anti-DDoS', 'Cloud Bastion Host']):
            cat = 'security'

        if cat == 'unknown':
            print(f"⚠️ Unrecognized service '{svc_name}'. Triggering AI Semantic Fallback...")
            cat = classify_unknown_service_with_ai(svc_name, svc_type)

        current_resource = {
            'name': svc_name,
            'type': svc_type,
            'category': cat,
            'specs': svc_type 
        }

    if current_resource:
        _finalize_resource(current_resource, blueprint)

    return blueprint

def process_generic_quotation_df(df: pd.DataFrame, customer_name: str) -> Dict[str, Any]:
    col_name = find_column(df, COLUMN_MAP['server_name'])
    col_flavor = find_column(df, COLUMN_MAP['flavor'])
    col_cpu = find_column(df, COLUMN_MAP['cpu'])
    col_ram = find_column(df, COLUMN_MAP['ram'])
    col_public = find_column(df, COLUMN_MAP['is_public'])
    col_tier = find_column(df, COLUMN_MAP['tier'])
    col_os = find_column(df, COLUMN_MAP['os_type'])
    col_storage = find_column(df, COLUMN_MAP['storage_gb'])
    
    if not col_name: raise ValueError("Could not find a recognizable 'Hostname' or 'Server Name' column. Please verify your file headers.")
    
    blueprint = {
        "customer": customer_name,
        "delivery_scope": "landing_zone_only",
        "governance": { "requires_hypercare": False, "maintenance_windows": [] },
        "topology": { "network": [], "compute": [], "databases": [], "storage": [], "security": [] }
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
