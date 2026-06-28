#!/usr/bin/env python3
"""
Debug: Check what the console API returns
"""

import requests

def debug_console_api():
    cookies = {
        "cbc-sid": "204938483755399ea52dab7d70abfd71b88849bf81f979e6bd0d43954091e3182264907b5bdf3726369b",
        "SessionID": "64e6cf08-a503-4d41-8a11-e7d04bafa391", 
        "J_SESSION_ID": "09227d072309dac50e194869a03355710d64d49f911feb1a",
        "csrf": "8bb0e2ed-1fd7-477c-9625-9da2581be4ee",
        "agencyID": "6bfff7d0cea9495e9e81aae71407acb9",
        "cftk": "8H5Q-FEWU-O27O-1EFW-8XYH-V4RC-WW3H-IWE7",
        "businessKey": "6a841a17d552490d8a7d01f76a8fb0223a37e2feed1e4350",
        "cloud_verify_ticket": "63555391-0f1e-4190-9dc3-34b0d040da07",
    }
    
    url = "https://la-north-2-console.huaweicloud.com/ecm/rest/cbc/rest/cbc/csborderadapterservice/v1/queryRiInstance"
    
    payload = {
        "tenantId": "",
        "regionId": "la-north-2",
        "cloudServiceType": "hws.service.type.ec2",
        "resourceType": "hws.resource.type.vm",
        "sortName": "validTime",
        "sortOrder": "desc",
        "curPage": 1,
        "pageSize": 100
    }
    
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Host": "la-north-2-console.huaweicloud.com",
        "Origin": "https://la-north-2-console.huaweicloud.com",
        "Referer": "https://la-north-2-console.huaweicloud.com/ecm/?region=la-north-2",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
        "X-Language": "en-us",
        "X-Requested-With": "XMLHttpRequest",
        "X-Target-Services": "cbc-iam5",
        "agencyid": "6bfff7d0cea9495e9e81aae71407acb9",
        "cftk": "8H5Q-FEWU-O27O-1EFW-8XYH-V4RC-WW3H-IWE7",
        "projectname": "la-north-2",
        "region": "la-north-2",
    }
    
    session = requests.Session()
    
    # Set cookies
    for key, value in cookies.items():
        session.cookies.set(key, value)
    
    print("Debugging Console API response...")
    
    try:
        response = session.post(url, json=payload, headers=headers, timeout=30)
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type', 'unknown')}")
        print(f"Content-Length: {len(response.content)} bytes")
        print(f"\nFirst 500 chars of response:")
        print(response.text[:500])
        
        # Try to parse as JSON
        try:
            data = response.json()
            print(f"\n✓ Valid JSON response!")
            print(f"Total RIs: {data.get('page', {}).get('totalRecord', 0)}")
        except:
            print(f"\n✗ Not valid JSON")
            print(f"Response might be HTML (login page?)")
            
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    debug_console_api()