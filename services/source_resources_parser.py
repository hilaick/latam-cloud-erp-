#!/usr/bin/env python3
"""
Source Resources Excel Parser
Parses Excel files containing source environment inventory data
"""

import pandas as pd
import json
import re
from typing import Dict, List, Any, Optional
from pathlib import Path

def parse_source_resources_excel(file_path: str) -> Dict[str, Any]:
    """
    Parse Excel file containing source environment resources
    Expected format: Sheet with resource categories (Servers, Containers, etc.)
    """
    print(f"🔄 Parsing source resources from: {file_path}")
    
    try:
        # Try to read the Excel file
        xls = pd.ExcelFile(file_path)
        sheet_names = xls.sheet_names
        print(f"📄 Sheets found: {sheet_names}")
        
        # Initialize result structure
        result = {
            "success": True,
            "filename": Path(file_path).name,
            "resources": {
                "servers": [],
                "containers": [],
                "middleware": [],
                "databases": [],
                "big_data": [],
                "network": [],
                "storage": []
            },
            "counts": {
                "servers": 0,
                "containers": 0,
                "middleware": 0,
                "databases": 0,
                "big_data": 0,
                "network": 0,
                "storage": 0
            },
            "raw_data": {}
        }
        
        # Look for common sheet names
        target_sheet = None
        for sheet in sheet_names:
            sheet_lower = sheet.lower()
            if any(keyword in sheet_lower for keyword in ['inventory', 'resources', 'servers', 'compute', 'infrastructure']):
                target_sheet = sheet
                break
        
        if not target_sheet:
            target_sheet = sheet_names[0]  # Use first sheet as fallback
            
        print(f"📊 Reading sheet: {target_sheet}")
        df = pd.read_excel(file_path, sheet_name=target_sheet)
        
        # Clean column names
        df.columns = [str(col).strip().lower() for col in df.columns]
        print(f"📋 Columns: {list(df.columns)}")
        
        # Try to detect resource type column
        resource_type_col = None
        for col in df.columns:
            if any(keyword in col for keyword in ['type', 'resource_type', 'category', 'resource']):
                resource_type_col = col
                break
        
        # If no type column, assume all rows are servers
        if not resource_type_col:
            print("⚠️  No resource type column found, assuming all rows are servers")
            for _, row in df.iterrows():
                server_data = extract_server_data(row)
                if server_data:
                    result["resources"]["servers"].append(server_data)
                    result["counts"]["servers"] += 1
        else:
            # Group by resource type
            for _, row in df.iterrows():
                resource_type = str(row[resource_type_col]).strip().lower() if pd.notna(row[resource_type_col]) else "unknown"
                resource_data = extract_resource_data(row, resource_type)
                
                # Map to our categories
                category = map_resource_type_to_category(resource_type)
                if resource_data:
                    result["resources"][category].append(resource_data)
                    result["counts"][category] += 1
        
        # Store raw dataframe for debugging
        result["raw_data"]["columns"] = list(df.columns)
        result["raw_data"]["sample_rows"] = df.head(5).to_dict(orient='records')
        
        print(f"✅ Parsed {len(df)} rows")
        print(f"📊 Resource counts: {result['counts']}")
        
        return result
        
    except Exception as e:
        print(f"❌ Error parsing Excel file: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "resources": {
                "servers": [],
                "containers": [],
                "middleware": [],
                "databases": [],
                "big_data": [],
                "network": [],
                "storage": []
            },
            "counts": {
                "servers": 0,
                "containers": 0,
                "middleware": 0,
                "databases": 0,
                "big_data": 0,
                "network": 0,
                "storage": 0
            }
        }

def extract_server_data(row) -> Optional[Dict]:
    """Extract server data from a row"""
    try:
        # Try to find name column
        name = None
        for col in row.index:
            if any(keyword in str(col).lower() for keyword in ['name', 'hostname', 'server', 'instance', 'vm']):
                if pd.notna(row[col]):
                    name = str(row[col]).strip()
                    break
        
        if not name:
            return None
            
        server = {
            "name": name,
            "type": "server",
            "specs": {}
        }
        
        # Extract common specs
        for col in row.index:
            col_lower = str(col).lower()
            value = row[col]
            
            if pd.isna(value):
                continue
                
            if 'cpu' in col_lower or 'vcore' in col_lower or 'core' in col_lower:
                server["specs"]["cpu"] = parse_numeric(value)
            elif 'ram' in col_lower or 'memory' in col_lower:
                server["specs"]["ram_gb"] = parse_numeric(value)
            elif 'storage' in col_lower or 'disk' in col_lower or 'size' in col_lower:
                server["specs"]["storage_gb"] = parse_numeric(value)
            elif 'os' in col_lower or 'operating' in col_lower:
                server["specs"]["os"] = str(value).strip()
            elif 'ip' in col_lower or 'address' in col_lower:
                server["specs"]["ip"] = str(value).strip()
            elif 'status' in col_lower:
                server["specs"]["status"] = str(value).strip()
            elif 'environment' in col_lower or 'env' in col_lower:
                server["specs"]["environment"] = str(value).strip()
        
        return server
    except Exception as e:
        print(f"⚠️  Error extracting server data: {e}")
        return None

def extract_resource_data(row, resource_type: str) -> Optional[Dict]:
    """Extract generic resource data from a row"""
    try:
        # Try to find name column
        name = None
        for col in row.index:
            if any(keyword in str(col).lower() for keyword in ['name', 'hostname', 'resource', 'instance', 'id']):
                if pd.notna(row[col]):
                    name = str(row[col]).strip()
                    break
        
        if not name:
            return None
            
        resource = {
            "name": name,
            "type": resource_type,
            "specs": {}
        }
        
        # Extract all columns as specs
        for col in row.index:
            if pd.notna(row[col]):
                col_name = str(col).strip()
                value = row[col]
                
                # Convert numeric values
                if isinstance(value, (int, float)):
                    resource["specs"][col_name] = value
                else:
                    resource["specs"][col_name] = str(value).strip()
        
        return resource
    except Exception as e:
        print(f"⚠️  Error extracting resource data: {e}")
        return None

def map_resource_type_to_category(resource_type: str) -> str:
    """Map resource type string to our category"""
    resource_type = resource_type.lower()
    
    if any(keyword in resource_type for keyword in ['server', 'vm', 'instance', 'compute', 'ecs', 'host']):
        return "servers"
    elif any(keyword in resource_type for keyword in ['container', 'docker', 'kubernetes', 'k8s', 'pod', 'aks', 'eks']):
        return "containers"
    elif any(keyword in resource_type for keyword in ['middleware', 'app server', 'tomcat', 'jboss', 'weblogic', 'websphere', 'iis', 'nginx', 'apache']):
        return "middleware"
    elif any(keyword in resource_type for keyword in ['database', 'db', 'sql', 'oracle', 'mysql', 'postgres', 'mongodb', 'redis']):
        return "databases"
    elif any(keyword in resource_type for keyword in ['big data', 'hadoop', 'spark', 'kafka', 'data lake', 'data warehouse', 'hive']):
        return "big_data"
    elif any(keyword in resource_type for keyword in ['network', 'vpc', 'subnet', 'router', 'firewall', 'load balancer', 'lb', 'gateway', 'vpn']):
        return "network"
    elif any(keyword in resource_type for keyword in ['storage', 'disk', 'volume', 'nas', 'san', 'object', 's3', 'obs', 'backup']):
        return "storage"
    else:
        return "servers"  # Default to servers

def parse_numeric(value) -> float:
    """Parse numeric value from string"""
    try:
        if pd.isna(value):
            return 0
        if isinstance(value, (int, float)):
            return float(value)
        
        # Extract numbers from string
        str_val = str(value)
        match = re.search(r'(\d+(?:\.\d+)?)', str_val)
        if match:
            return float(match.group(1))
        return 0
    except:
        return 0

# Test function
if __name__ == "__main__":
    # Test with a sample file
    import sys
    if len(sys.argv) > 1:
        result = parse_source_resources_excel(sys.argv[1])
        print(json.dumps(result, indent=2))
    else:
        print("Usage: python source_resources_parser.py <excel_file>")