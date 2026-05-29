#!/usr/bin/env python3
"""
Source Resources Excel & CSV Parser
Intelligently handles Huawei MgC Exports, dynamic header detection, multi-sheet reading, and duplicated columns.
"""

import pandas as pd
import re
from typing import Dict, Any, Optional
from pathlib import Path

def find_header_row_and_set(df: pd.DataFrame) -> pd.DataFrame:
    """Finds the true row containing common headers and sets it, bypassing MgC super-headers."""
    header_idx = 0
    for idx, row in df.iterrows():
        # Check if this row looks like the real header (contains name + id/status/platform)
        row_str = ' '.join([str(x).lower() for x in row.values])
        if 'name' in row_str and ('id' in row_str or 'platform' in row_str or 'status' in row_str):
            header_idx = idx
            break
            
    # Set the discovered row as the header
    df.columns = df.iloc[header_idx]
    df = df.iloc[header_idx+1:].reset_index(drop=True)
    
    # CRITICAL FIX: Deduplicate column names. 
    cols = []
    counts = {}
    for c in df.columns:
        c_clean = str(c).strip().lower()
        if c_clean in counts:
            counts[c_clean] += 1
            cols.append(f"{c_clean}_{counts[c_clean]}")
        else:
            counts[c_clean] = 0
            cols.append(c_clean)
            
    df.columns = cols
    return df

def parse_source_resources_excel(file_path: str) -> Dict[str, Any]:
    print(f"🔄 Parsing source resources from: {file_path}")
    
    result = {
        "success": True,
        "filename": Path(file_path).name,
        "resources": {"servers": [], "containers": [], "middleware": [], "databases": [], "big_data": [], "network": [], "storage": []},
        "counts": {"servers": 0, "containers": 0, "middleware": 0, "databases": 0, "big_data": 0, "network": 0, "storage": 0}
    }
    
    try:
        file_lower = str(file_path).lower()
        dfs = {}
        
        # 1. Detect File Type and Load ALL Sheets
        if file_lower.endswith('.csv'):
            print("📄 Detected CSV format.")
            dfs['Sheet1'] = pd.read_csv(file_path, header=None, dtype=str)
        elif file_lower.endswith('.tsv') or file_lower.endswith('.txt'):
            print("📄 Detected Paste/TSV format.")
            dfs['Sheet1'] = pd.read_csv(file_path, sep='\t', header=None, dtype=str)
        else:
            try:
                xls = pd.ExcelFile(file_path)
                print(f"📄 Excel Sheets found: {xls.sheet_names}")
                for sheet in xls.sheet_names:
                    # Load every sheet into the dictionary
                    dfs[sheet] = pd.read_excel(file_path, sheet_name=sheet, header=None, dtype=str)
            except ImportError:
                raise Exception("Missing Excel library. Please run in your terminal: pip install openpyxl")
        
        # 2. Process Every Sheet Found
        for sheet_name, df in dfs.items():
            if df.empty:
                continue
                
            df = df.fillna('')
            df = find_header_row_and_set(df)
            
            # Determine category primarily by sheet name
            sheet_lower = sheet_name.lower()
            default_category = "servers"
            if 'database' in sheet_lower: default_category = "databases"
            elif 'network' in sheet_lower: default_category = "network"
            elif 'storage' in sheet_lower: default_category = "storage"
            elif 'container' in sheet_lower: default_category = "containers"
            
            # Fallback column checking for CSVs (which are always named 'Sheet1')
            if default_category == "servers" and 'engine' in df.columns and 'version' in df.columns:
                default_category = "databases"
            
            resource_type_col = next((col for col in df.columns if any(k in col for k in ['type', 'resource_type', 'category', 'resource'])), None)
            
            # 3. Extract Rows
            for _, row in df.iterrows():
                # Skip entirely empty rows
                if all(row[c] == '' or pd.isna(row[c]) for c in df.columns):
                    continue
                    
                category = default_category
                if resource_type_col and row[resource_type_col] != '':
                    category = map_resource_type_to_category(str(row[resource_type_col]).strip())
                    
                res_data = extract_huawei_resource(row, category)
                if res_data:
                    result["resources"][category].append(res_data)
                    result["counts"][category] += 1
        
        return result
        
    except Exception as e:
        print(f"❌ Error parsing file: {str(e)}")
        result["success"] = False
        result["error"] = str(e)
        return result

def extract_huawei_resource(row, category: str) -> Optional[Dict]:
    """Extracts specs dynamically while normalizing Huawei metrics"""
    try:
        name = None
        # Find primary identifier
        for col in row.index:
            if str(col).lower() in ['name', 'server_name', 'instance_name', 'hostname']:
                if row[col] != '': 
                    name = str(row[col]).strip()
                    break
        # Fallback to ID if no name exists
        if not name and 'id' in row.index and row['id'] != '':
            name = str(row['id']).strip()
            
        if not name or str(name) == 'nan': 
            return None
            
        resource = {"name": name, "type": category, "specs": {}}
        
        for col in row.index:
            val = row[col]
            if val == '' or str(val).lower() == 'nan' or 'unnamed' in str(col).lower(): continue
            
            col_name = str(col).strip()
            
            if isinstance(val, (int, float)):
                resource["specs"][col_name] = float(val) if isinstance(val, float) else int(val)
            else:
                resource["specs"][col_name] = str(val).strip()
                
        # Huawei specific normalizations for UI clarity
        if category == 'servers':
            if 'cpu_cores' in resource["specs"]: resource["specs"]["cpu"] = parse_numeric(resource["specs"]["cpu_cores"])
            if 'mem' in resource["specs"]: 
                mem_val = parse_numeric(resource["specs"]["mem"])
                # Huawei MgC often exports memory in bytes. Convert to GB if massive.
                if mem_val > 1000000:
                    resource["specs"]["ram_gb"] = round(mem_val / (1024**3), 2)
                else:
                    resource["specs"]["ram_gb"] = mem_val
            if 'system_type' in resource["specs"]: resource["specs"]["os"] = resource["specs"]["system_type"]
            if 'private_ip_address' in resource["specs"]: resource["specs"]["ip"] = resource["specs"]["private_ip_address"]
            if 'server_status' in resource["specs"]: resource["specs"]["status"] = resource["specs"]["server_status"]

        elif category == 'databases':
            if 'engine' in resource["specs"]: resource["specs"]["engine"] = resource["specs"]["engine"]
            if 'version' in resource["specs"]: resource["specs"]["version"] = resource["specs"]["version"]
            if 'instance_type' in resource["specs"]: resource["specs"]["flavor"] = resource["specs"]["instance_type"]
            
        return resource
    except Exception:
        return None

def map_resource_type_to_category(resource_type: str) -> str:
    t = resource_type.lower()
    if any(k in t for k in ['server', 'vm', 'instance', 'compute', 'ecs', 'host']): return "servers"
    elif any(k in t for k in ['container', 'docker', 'kubernetes', 'k8s', 'pod', 'aks', 'eks']): return "containers"
    elif any(k in t for k in ['middleware', 'app server', 'tomcat', 'jboss', 'weblogic', 'websphere', 'iis', 'nginx']): return "middleware"
    elif any(k in t for k in ['database', 'db', 'sql', 'oracle', 'mysql', 'postgres', 'mongodb', 'redis']): return "databases"
    elif any(k in t for k in ['big data', 'hadoop', 'spark', 'kafka', 'data lake', 'data warehouse', 'hive']): return "big_data"
    elif any(k in t for k in ['network', 'vpc', 'subnet', 'router', 'firewall', 'load balancer', 'lb', 'gateway']): return "network"
    elif any(k in t for k in ['storage', 'disk', 'volume', 'nas', 'san', 'object', 's3', 'obs', 'backup']): return "storage"
    return "servers"

def parse_numeric(value) -> float:
    try:
        if value == '' or str(value).lower() == 'nan': return 0.0
        if isinstance(value, (int, float)): return float(value)
        str_val = str(value)
        match = re.search(r'(\d+(?:\.\d+)?)', str_val)
        if match: return float(match.group(1))
        return 0.0
    except: return 0.0