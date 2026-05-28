#!/usr/bin/env python3
"""
Source Resources Excel & CSV Parser
Parses inventory data safely while stripping Numpy/NaN types for JSON
"""

import pandas as pd
import json
import re
from typing import Dict, List, Any, Optional
from pathlib import Path

def parse_source_resources_excel(file_path: str) -> Dict[str, Any]:
    print(f"🔄 Parsing source resources from: {file_path}")
    
    result = {
        "success": True,
        "filename": Path(file_path).name,
        "resources": {"servers": [], "containers": [], "middleware": [], "databases": [], "big_data": [], "network": [], "storage": []},
        "counts": {"servers": 0, "containers": 0, "middleware": 0, "databases": 0, "big_data": 0, "network": 0, "storage": 0}
    }
    
    try:
        # Detect file type and parse accordingly
        if str(file_path).lower().endswith('.csv'):
            print("📄 Detected CSV format.")
            df = pd.read_csv(file_path)
        else:
            try:
                xls = pd.ExcelFile(file_path)
                sheet_names = xls.sheet_names
                target_sheet = sheet_names[0]
                for sheet in sheet_names:
                    if any(k in sheet.lower() for k in ['inventory', 'resources', 'servers', 'compute', 'infrastructure']):
                        target_sheet = sheet; break
                print(f"📄 Reading Excel sheet: {target_sheet}")
                df = pd.read_excel(file_path, sheet_name=target_sheet)
            except ImportError:
                raise Exception("Missing Excel library. Please run in your terminal: pip install openpyxl")
        
        # 🚨 FIX: Convert NaNs to empty strings to prevent JSON 500 errors
        df = df.fillna('')
        df.columns = [str(col).strip().lower() for col in df.columns]
        
        resource_type_col = None
        for col in df.columns:
            if any(k in col for k in ['type', 'resource_type', 'category', 'resource']):
                resource_type_col = col; break
        
        if not resource_type_col:
            for _, row in df.iterrows():
                server_data = extract_server_data(row)
                if server_data:
                    result["resources"]["servers"].append(server_data)
                    result["counts"]["servers"] += 1
        else:
            for _, row in df.iterrows():
                resource_type = str(row[resource_type_col]).strip().lower() if row[resource_type_col] != '' else "unknown"
                resource_data = extract_resource_data(row, resource_type)
                category = map_resource_type_to_category(resource_type)
                if resource_data:
                    result["resources"][category].append(resource_data)
                    result["counts"][category] += 1
        
        return result
        
    except Exception as e:
        print(f"❌ Error parsing file: {str(e)}")
        result["success"] = False
        result["error"] = str(e)
        return result

def extract_server_data(row) -> Optional[Dict]:
    try:
        name = None
        for col in row.index:
            if any(k in str(col).lower() for k in ['name', 'hostname', 'server', 'instance', 'vm']):
                if row[col] != '': name = str(row[col]).strip(); break
        
        if not name: return None
            
        server = {"name": name, "type": "server", "specs": {}}
        
        for col in row.index:
            val = row[col]
            if val == '': continue
            
            col_lower = str(col).lower()
            if 'cpu' in col_lower or 'vcore' in col_lower or 'core' in col_lower: server["specs"]["cpu"] = parse_numeric(val)
            elif 'ram' in col_lower or 'memory' in col_lower: server["specs"]["ram_gb"] = parse_numeric(val)
            elif 'storage' in col_lower or 'disk' in col_lower or 'size' in col_lower: server["specs"]["storage_gb"] = parse_numeric(val)
            elif 'os' in col_lower or 'operating' in col_lower: server["specs"]["os"] = str(val).strip()
            elif 'ip' in col_lower or 'address' in col_lower: server["specs"]["ip"] = str(val).strip()
            elif 'status' in col_lower: server["specs"]["status"] = str(val).strip()
            elif 'environment' in col_lower or 'env' in col_lower: server["specs"]["environment"] = str(val).strip()
        
        return server
    except Exception:
        return None

def extract_resource_data(row, resource_type: str) -> Optional[Dict]:
    try:
        name = None
        for col in row.index:
            if any(k in str(col).lower() for k in ['name', 'hostname', 'resource', 'instance', 'id']):
                if row[col] != '': name = str(row[col]).strip(); break
        
        if not name: return None
            
        resource = {"name": name, "type": resource_type, "specs": {}}
        
        for col in row.index:
            val = row[col]
            if val != '':
                # 🚨 FIX: Safe casting to standard Python ints/floats to bypass Numpy serialization 500 crashes
                if isinstance(val, (int, float)):
                    resource["specs"][str(col).strip()] = float(val) if isinstance(val, float) else int(val)
                else:
                    resource["specs"][str(col).strip()] = str(val).strip()
        return resource
    except Exception:
        return None

def map_resource_type_to_category(resource_type: str) -> str:
    t = resource_type.lower()
    if any(k in t for k in ['server', 'vm', 'instance', 'compute', 'ecs', 'host']): return "servers"
    elif any(k in t for k in ['container', 'docker', 'kubernetes', 'k8s', 'pod', 'aks', 'eks']): return "containers"
    elif any(k in t for k in ['middleware', 'app server', 'tomcat', 'jboss', 'weblogic', 'websphere', 'iis', 'nginx', 'apache']): return "middleware"
    elif any(k in t for k in ['database', 'db', 'sql', 'oracle', 'mysql', 'postgres', 'mongodb', 'redis']): return "databases"
    elif any(k in t for k in ['big data', 'hadoop', 'spark', 'kafka', 'data lake', 'data warehouse', 'hive']): return "big_data"
    elif any(k in t for k in ['network', 'vpc', 'subnet', 'router', 'firewall', 'load balancer', 'lb', 'gateway', 'vpn']): return "network"
    elif any(k in t for k in ['storage', 'disk', 'volume', 'nas', 'san', 'object', 's3', 'obs', 'backup']): return "storage"
    return "servers"

def parse_numeric(value) -> float:
    try:
        if value == '': return 0.0
        if isinstance(value, (int, float)): return float(value)
        str_val = str(value)
        match = re.search(r'(\d+(?:\.\d+)?)', str_val)
        if match: return float(match.group(1))
        return 0.0
    except: return 0.0
