#!/usr/bin/env python3
"""
Check project data structure
"""

import sys
sys.path.append('.')

from app import app, db
from models import ProjectData
import json

def check_project_data():
    """Check what's in the project data"""
    
    with app.app_context():
        project = ProjectData.query.filter_by(id='1782256193604').first()
        if not project:
            print("Project not found")
            return
            
        project_data = json.loads(project.data)
        
        print("=== PROJECT DATA KEYS ===")
        for key in project_data.keys():
            print(f"  {key}: {type(project_data[key])}")
        
        print("\n=== RI QUOTATION DATA ===")
        if 'ri_quotation' in project_data:
            ri_data = project_data['ri_quotation']
            if isinstance(ri_data, dict):
                for key, value in ri_data.items():
                    if key == 'servers':
                        print(f"  {key}: {len(value) if isinstance(value, list) else value}")
                    else:
                        print(f"  {key}: {value}")
            else:
                print(f"  ri_quotation is not a dict: {type(ri_data)}")
        
        print("\n=== CONSOLE RI EXPORT ===")
        if 'console_ri_export' in project_data:
            console_data = project_data['console_ri_export']
            if console_data is None:
                print("  console_ri_export: None")
            elif isinstance(console_data, dict):
                for key, value in console_data.items():
                    if key == 'servers':
                        print(f"  {key}: {len(value) if isinstance(value, list) else value}")
                    else:
                        print(f"  {key}: {value}")
            else:
                print(f"  console_ri_export is {type(console_data)}: {console_data}")
        else:
            print("  console_ri_export: Not found")

if __name__ == "__main__":
    check_project_data()