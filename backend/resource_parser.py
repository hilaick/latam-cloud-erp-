#!/usr/bin/env python3
"""
Resource log parser for Huawei Cloud Dashboard - Compact version
"""
import os
import re
from datetime import datetime
from typing import List, Dict, Any


def parse_resource_log(filepath: str) -> Dict[str, Any]:
    """Parse a single resource log file."""
    resources = {
        "metadata": {},
        "vpc": {},
        "ecs": [],
        "timestamp": os.path.getmtime(filepath)
    }
    
    try:
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                # Parse VAR="value" format
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"\'')
                    
                    if key == "REGION":
                        resources["metadata"]["region"] = value
                    elif key == "PROJECT_ID":
                        resources["metadata"]["project_id"] = value[:8] + "..." if len(value) > 8 else value
                    elif key == "DEPLOYMENT_TAG":
                        resources["metadata"]["tag"] = value
                    elif key == "DEPLOYMENT_DATE":
                        resources["metadata"]["date"] = value
                    elif key == "VPC_ID":
                        resources["vpc"]["id"] = value[:8] + "..." if len(value) > 8 else value
                    elif key == "VPC_NAME":
                        resources["vpc"]["name"] = value
                    elif key.startswith("ECS_"):
                        name = key.replace("ECS_", "")
                        resources["ecs"].append({
                            "name": name,
                            "id": value[:8] + "..." if len(value) > 8 else value
                        })
                    elif key.startswith("PASS_") and resources["ecs"]:
                        # Match password to last ECS
                        name = key.replace("PASS_", "")
                        for ecs in resources["ecs"]:
                            if ecs["name"] == name:
                                ecs["has_password"] = True
                                break
        
        # Add filename as fallback tag
        if "tag" not in resources["metadata"]:
            filename = os.path.basename(filepath)
            if filename.startswith("huawei_resources_"):
                tag = filename.replace("huawei_resources_", "").replace(".log", "")
                resources["metadata"]["tag"] = tag
        
        # Format timestamp
        resources["metadata"]["time"] = datetime.fromtimestamp(
            resources["timestamp"]
        ).strftime('%Y-%m-%d %H:%M')
        
    except Exception:
        pass  # Silently ignore parsing errors
    
    return resources


def get_all_deployments() -> List[Dict[str, Any]]:
    """Get all deployment logs sorted newest first."""
    logs = []
    for fname in os.listdir("/root"):
        if fname.startswith("huawei_resources_") and fname.endswith(".log"):
            filepath = os.path.join("/root", fname)
            try:
                resources = parse_resource_log(filepath)
                if resources.get("metadata"):
                    logs.append(resources)
            except Exception:
                continue
    
    # Sort by timestamp (newest first)
    logs.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return logs


def get_latest_deployment() -> Dict[str, Any]:
    """Get the most recent deployment."""
    deployments = get_all_deployments()
    return deployments[0] if deployments else {}


def get_deployment_summary() -> Dict[str, Any]:
    """Get summary statistics."""
    deployments = get_all_deployments()
    
    summary = {
        "total_deployments": len(deployments),
        "total_ecs": 0,
        "latest": None,
        "by_date": {}
    }
    
    if deployments:
        summary["latest"] = deployments[0]
        
        for dep in deployments:
            summary["total_ecs"] += len(dep.get("ecs", []))
            
            # Group by date
            date = dep["metadata"].get("time", "").split()[0]
            if date:
                summary["by_date"][date] = summary["by_date"].get(date, 0) + 1
    
    return summary