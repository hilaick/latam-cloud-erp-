#!/usr/bin/env python3
"""
Debug the RI count discrepancy
"""

import sys
sys.path.append('.')

from app import app, db
from models import ProjectData
import json

def analyze_ri_data():
    """Analyze the RI data in the project"""
    
    with app.app_context():
        project = ProjectData.query.filter_by(id='1782256193604').first()
        if not project:
            print("Project not found")
            return
            
        project_data = json.loads(project.data)
        
        print("=== QUOTED RIS (Excel Upload) ===")
        if 'ri_quotation' in project_data and 'servers' in project_data['ri_quotation']:
            quoted = project_data['ri_quotation']['servers']
            print(f"Count: {len(quoted)} servers")
            print(f"Total quantity: {sum(s['quantity'] for s in quoted)}")
            
            # Group by specification
            spec_counts = {}
            for server in quoted:
                spec = server.get('specification', 'Unknown')
                spec_counts[spec] = spec_counts.get(spec, 0) + server.get('quantity', 1)
            
            print("\nBy specification:")
            for spec, count in sorted(spec_counts.items()):
                print(f"  {spec}: {count}")
        
        print("\n=== CONSOLE RIS (CSV Upload) ===")
        if 'console_ri_export' in project_data and 'servers' in project_data['console_ri_export']:
            console = project_data['console_ri_export']['servers']
            print(f"Count: {len(console)} servers")
            print(f"Total quantity: {sum(s.get('quantity', 1) for s in console)}")
            
            # Group by specification
            spec_counts = {}
            for server in console:
                spec = server.get('specification', 'Unknown')
                spec_counts[spec] = spec_counts.get(spec, 0) + server.get('quantity', 1)
            
            print("\nBy specification:")
            for spec, count in sorted(spec_counts.items()):
                print(f"  {spec}: {count}")
        
        print("\n=== ANALYSIS ===")
        print("If console has 14 RIs but reconciliation shows 13:")
        print("1. Check for duplicate specifications")
        print("2. Check if any specification doesn't match quoted specs")
        print("3. Check normalization differences")

if __name__ == "__main__":
    analyze_ri_data()