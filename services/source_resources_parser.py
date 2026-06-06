import pandas as pd
import re
import math

def load_dataframe_safely(file_path: str):
    """Fallback handler for disguised MgC exports"""
    if str(file_path).lower().endswith('.csv'):
        return pd.read_csv(file_path)
    try:
        return pd.read_excel(file_path)
    except Exception as e:
        print(f"⚠️ Native Excel parse failed in Discovery parser. Attempting fallback... {e}")
        try:
            return pd.read_csv(file_path, sep=None, engine='python')
        except:
            raise ValueError("Could not read MgC export. Please resave as a standard CSV or XLSX.")

def parse_source_resources_excel(file_path: str) -> dict:
    try:
        df = load_dataframe_safely(file_path)
        
        # Clean column names to make matching easier
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        resources = {
            "servers": [],
            "databases": [],
            "storage": [],
            "network": []
        }
        
        def find_col(aliases):
            for col in df.columns:
                if col in aliases or any(a in col for a in aliases):
                    return col
            return None
            
        name_col = find_col(['name', 'resource', 'host', 'server', 'instance'])
        type_col = find_col(['type', 'flavor', 'instance type', 'engine', 'os', 'system'])
        ip_col = find_col(['ip', 'address', 'private ip', 'endpoint', 'cidr'])
        
        if not name_col:
            return {"success": False, "error": "Could not identify a 'Name' column in the uploaded file."}
            
        for _, row in df.iterrows():
            name = str(row.get(name_col, '')).strip()
            if not name or name == 'nan':
                continue
                
            type_val = str(row.get(type_col, 'Unknown')).strip() if type_col else 'Unknown'
            ip_val = str(row.get(ip_col, 'N/A')).strip() if ip_col else 'N/A'
            
            type_lower = type_val.lower()
            if any(k in type_lower for k in ['sql', 'db', 'oracle', 'postgres', 'mongo', 'redis', 'rds']):
                resources["databases"].append({"name": name, "engine": type_val, "ip": ip_val, "source": "Offline Import"})
            elif any(k in type_lower for k in ['vpc', 'subnet', 'nat', 'gateway', 'vpn', 'firewall', 'sg']):
                resources["network"].append({"name": name, "type": type_val, "cidr": ip_val, "source": "Offline Import"})
            elif any(k in type_lower for k in ['storage', 'disk', 'volume', 's3', 'obs', 'backup', 'nfs']):
                resources["storage"].append({"name": name, "type": type_val, "location": ip_val, "source": "Offline Import"})
            else:
                resources["servers"].append({
                    "name": name,
                    "os": type_val,
                    "ip": ip_val,
                    "vcpus": parse_numeric(row, ['cpu', 'vcpus', 'core']),
                    "ram_gb": parse_numeric(row, ['ram', 'memory', 'mem']),
                    "storage_gb": parse_numeric(row, ['storage', 'disk', 'size']),
                    "source": "Offline Import"
                })
                
        return {
            "success": True,
            "resources": resources,
            "counts": {
                "compute": len(resources["servers"]),
                "database": len(resources["databases"]),
                "network": len(resources["network"]),
                "storage": len(resources["storage"])
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def parse_numeric(row, aliases):
    for col in row.index:
        col_str = str(col).lower()
        if any(a in col_str for a in aliases):
            val = str(row[col])
            nums = re.findall(r'\d+', val)
            if nums:
                return int(nums[0])
    return 0
