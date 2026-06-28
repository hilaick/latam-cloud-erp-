#!/usr/bin/env python3
"""
Upload the console RI export file to the system
"""

import requests
import json
import sys

def upload_console_ris():
    """Upload the console RI export file"""
    
    url = "http://localhost:9119/api/finops/upload-console-ris"
    file_path = "/root/.hermes/cache/documents/doc_c15df74fd7b1_Reserved Instance-LA-Mexico City2-2026-06-23_10-17-45.xlsx"
    project_id = "1782256193604"
    
    print(f"Uploading console RI export file: {file_path}")
    print(f"Project ID: {project_id}")
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {'project_id': project_id}
            
            response = requests.post(url, files=files, data=data)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"\n✅ Success! Uploaded {result.get('summary', {}).get('total_ris', 0)} console RIs")
                print(f"Message: {result.get('message', 'No message')}")
            else:
                print(f"\n❌ Upload failed: {response.text}")
                
    except Exception as e:
        print(f"Error uploading file: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    upload_console_ris()