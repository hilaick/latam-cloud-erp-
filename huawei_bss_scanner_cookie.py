#!/usr/bin/env python3
"""
Updated Huawei BSS Scanner with Cookie-based Console API support
"""

import logging
import requests
import json
from urllib.parse import urlparse, parse_qsl, quote

logger = logging.getLogger(__name__)

class HuaweiBSSScanner:
    def __init__(self, raw_ak: str, raw_sk: str, region: str = 'la-north-2', 
                 console_cookies: dict = None, console_headers: dict = None):
        self.raw_ak = raw_ak
        self.raw_sk = raw_sk
        self.region = region
        self.console_cookies = console_cookies or {}
        self.console_headers = console_headers or {}
        
    def get_active_ris_via_cookies(self) -> tuple:
        """
        Try to get RIs using console session cookies
        This is the most reliable method if we have valid session cookies
        """
        diagnostics = []
        bought_ris = []
        
        if not self.console_cookies:
            diagnostics.append("No console cookies provided")
            return bought_ris, diagnostics
        
        try:
            console_url = f"https://{self.region}-console.huaweicloud.com/ecm/rest/cbc/rest/cbc/csborderadapterservice/v1/queryRiInstance"
            
            payload = {
                "tenantId": "",  # Will be filled if we can get it
                "regionId": self.region,
                "cloudServiceType": "hws.service.type.ec2",
                "resourceType": "hws.resource.type.vm",
                "sortName": "validTime",
                "sortOrder": "desc",
                "curPage": 1,
                "pageSize": 100
            }
            
            # Default headers for console API
            headers = {
                "Accept": "application/json, text/plain, */*",
                "Content-Type": "application/json",
                "Host": f"{self.region}-console.huaweicloud.com",
                "Origin": f"https://{self.region}-console.huaweicloud.com",
                "Referer": f"https://{self.region}-console.huaweicloud.com/ecm/?region={self.region}",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
                "X-Language": "en-us",
                "X-Requested-With": "XMLHttpRequest",
                "X-Target-Services": "cbc-iam5",
                "projectname": self.region,
                "region": self.region,
            }
            
            # Add custom headers if provided
            headers.update(self.console_headers)
            
            session = requests.Session()
            
            # Set cookies
            for key, value in self.console_cookies.items():
                session.cookies.set(key, value)
            
            diagnostics.append(f"Attempting Console API with session cookies...")
            
            resp = session.post(console_url, json=payload, headers=headers, timeout=30)
            
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    ri_instances = data.get('riInstances', [])
                    total_ris = data.get('page', {}).get('totalRecord', 0)
                    
                    diagnostics.append(f"✓ Console API returned {total_ris} RIs via session cookies")
                    
                    for ri in ri_instances:
                        spec = ri.get('specCode', ri.get('flavorName', ri.get('specification', 'Unknown')))
                        bought_ris.append({
                            'id': ri.get('reserveInstanceId', 'CONSOLE_RI'),
                            'name': f"Floating RI ({ri.get('reserveInstanceId', 'Active')})",
                            'specification': spec,
                            'billing_mode': 'Floating Reserved',
                            'charging_mode': '1',
                            'tags': {},
                            'created_at': ri.get('validTime', ''),
                            'status': 'Active'
                        })
                    
                    diagnostics.append(f"Parsed {len(bought_ris)} Active RIs from Console API")
                    return bought_ris, diagnostics
                    
                except json.JSONDecodeError:
                    diagnostics.append(f"✗ Console API returned non-JSON response (likely expired session)")
                    return bought_ris, diagnostics
                    
            else:
                diagnostics.append(f"✗ Console API HTTP {resp.status_code}: {resp.text[:200]}")
                return bought_ris, diagnostics
                
        except Exception as e:
            diagnostics.append(f"✗ Console API cookie method failed: {str(e)}")
            return bought_ris, diagnostics
    
    def get_active_ris(self) -> tuple:
        """
        Main method: Try multiple approaches to get RIs
        1. First try console API with cookies (if available)
        2. Fall back to other methods
        """
        diagnostics = []
        bought_ris = []
        
        # Try cookie-based method first (most reliable if cookies are valid)
        if self.console_cookies:
            diagnostics.append("Attempting cookie-based Console API access...")
            cookie_ris, cookie_diag = self.get_active_ris_via_cookies()
            diagnostics.extend(cookie_diag)
            
            if cookie_ris:
                bought_ris = cookie_ris
                diagnostics.append("✓ Successfully retrieved RIs via console cookies")
                return bought_ris, diagnostics
            else:
                diagnostics.append("✗ Cookie-based method failed, trying other methods...")
        
        # Fall back to existing methods (V4 signature, etc.)
        # ... existing code here ...
        
        diagnostics.append("All methods failed to retrieve RIs")
        return bought_ris, diagnostics

# Test function
def test_with_cookies():
    """Test the cookie-based approach"""
    print("Testing Huawei BSS Scanner with cookies...")
    
    # Example cookies (replace with fresh ones from browser)
    cookies = {
        "cbc-sid": "YOUR_FRESH_CBC_SID",
        "SessionID": "YOUR_FRESH_SESSION_ID",
        "J_SESSION_ID": "YOUR_FRESH_J_SESSION_ID",
        "csrf": "YOUR_FRESH_CSRF_TOKEN",
        "agencyID": "YOUR_AGENCY_ID",
        "cftk": "YOUR_CFTK_TOKEN",
    }
    
    headers = {
        "agencyid": "YOUR_AGENCY_ID",
        "cftk": "YOUR_CFTK_TOKEN",
    }
    
    scanner = HuaweiBSSScanner(
        raw_ak="dummy_ak",
        raw_sk="dummy_sk",
        region="la-north-2",
        console_cookies=cookies,
        console_headers=headers
    )
    
    ris, diag = scanner.get_active_ris_via_cookies()
    
    print("\nDiagnostics:")
    for d in diag:
        print(f"  {d}")
    
    print(f"\nFound {len(ris)} RIs")
    if ris:
        print(f"Sample RI: {json.dumps(ris[0], indent=2)}")

if __name__ == "__main__":
    test_with_cookies()