import pandas as pd
import re
import csv
from io import StringIO

def load_dataframe_smart(file_path: str) -> pd.DataFrame:
    """
    Robust fallback handler for disguised MgC exports and Azure Graph Results.
    Scans through multiple encodings and delimiters to strip out junk headers.
    """
    if str(file_path).lower().endswith(('.xlsx', '.xls')):
        try:
            df = pd.read_excel(file_path, header=None)
            if not df.empty:
                header_idx = 0
                for i in range(min(30, len(df))):
                    row_str = ' '.join(str(x).lower() for x in df.iloc[i].values)
                    if 'name' in row_str and ('type' in row_str or 'ip' in row_str):
                        header_idx = i
                        break
                return pd.read_excel(file_path, header=header_idx)
        except Exception as e:
            print(f"⚠️ Native Excel parse failed. Attempting brute-force fallback. Error: {e}")
            
    encodings = ['utf-8-sig', 'utf-8', 'latin1', 'utf-16le', 'cp1252']
    for enc in encodings:
        try:
            with open(file_path, 'r', encoding=enc, errors='replace') as f:
                content = f.read()
            
            if not content.strip(): continue

            delim = ','
            if content.count(';') > content.count(','): delim = ';'
            if content.count('\t') > content.count(','): delim = '\t'

            reader = csv.reader(StringIO(content), delimiter=delim)
            data = list(reader)
            if not data: continue
                
            header_idx = 0
            for i, row in enumerate(data[:30]):
                row_str = ' '.join(str(x).lower() for x in row)
                if 'name' in row_str and ('type' in row_str or 'ip' in row_str):
                    header_idx = i
                    break
            
            headers = data[header_idx]
            max_cols = max(len(row) for row in data[header_idx:])
            
            unique_headers = []
            for i in range(max_cols):
                col_name = headers[i] if i < len(headers) and str(headers[i]).strip() else f"Unnamed_{i}"
                col_name = str(col_name).strip()
                if col_name in unique_headers:
                    col_name = f"{col_name}_{i}"
                unique_headers.append(col_name)

            parsed_data = []
            for row in data[header_idx+1:]:
                padded_row = row + [''] * (max_cols - len(row))
                parsed_data.append(padded_row)
                
            df = pd.DataFrame(parsed_data, columns=unique_headers)
            if not df.empty and len(df.columns) > 1:
                return df
        except Exception as e:
            continue
            
    try:
        dfs = pd.read_html(file_path)
        if dfs: 
            df = dfs[0]
            header_idx = 0
            for i in range(min(30, len(df))):
                row_str = ' '.join(str(x).lower() for x in df.iloc[i].values)
                if 'name' in row_str and ('type' in row_str or 'ip' in row_str):
                    header_idx = i
                    break
            df.columns = df.iloc[header_idx]
            return df.iloc[header_idx+1:].reset_index(drop=True)
    except Exception:
        pass
        
    raise ValueError("Could not parse MgC or Azure Graph export. Format not recognized.")

def parse_source_resources_excel(file_path: str) -> dict:
    try:
        df = load_dataframe_smart(file_path)
        
        # Clean column names
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
        ip_col = find_col(['ip', 'address', 'private ip', 'endpoint', 'cidr', 'location']) # Added location to extract region
        
        if not name_col:
            return {"success": False, "error": "Could not identify a 'Name' column in the uploaded file."}
            
        for _, row in df.iterrows():
            name = str(row.get(name_col, '')).strip()
            if not name or name == 'nan':
                continue
                
            type_val = str(row.get(type_col, 'Unknown')).strip() if type_col else 'Unknown'
            ip_val = str(row.get(ip_col, 'N/A')).strip() if ip_col else 'N/A'
            
            type_lower = type_val.lower()
            
            # 🚨 NEW: Azure Resource Graph (ARG) keyword detection mapped securely
            if any(k in type_lower for k in ['sql', 'db', 'oracle', 'postgres', 'mongo', 'redis', 'rds', 'microsoft.sql', 'microsoft.dbfor']):
                resources["databases"].append({"name": name, "engine": type_val, "ip": ip_val, "source": "Offline Import"})
            elif any(k in type_lower for k in ['vpc', 'subnet', 'nat', 'gateway', 'vpn', 'firewall', 'sg', 'microsoft.network']):
                resources["network"].append({"name": name, "type": type_val, "cidr": ip_val, "source": "Offline Import"})
            elif any(k in type_lower for k in ['storage', 'disk', 'volume', 's3', 'obs', 'backup', 'nfs', 'microsoft.storage']):
                resources["storage"].append({"name": name, "type": type_val, "location": ip_val, "source": "Offline Import"})
            elif any(k in type_lower for k in ['compute', 'virtualmachines', 'server', 'ecs']):
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
