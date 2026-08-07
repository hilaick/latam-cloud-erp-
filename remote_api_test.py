#!/usr/bin/env python3
"""Fetch Huawei Cloud Pricing Calculator share data via API"""
import urllib.request, http.cookiejar, json, sys

share_id = "3fe7d1708f8711f1ba4403387fa007c1"
calc_url = "https://www.huaweicloud.com/intl/en-us/pricing/calculator.html"
api_host = "https://portal-intl.huaweicloud.com"

# Create session with cookies
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# Step 1: Visit calculator page to get any session cookies
print("1. Visiting calculator page...")
try:
    resp = opener.open(calc_url, timeout=20)
    print(f"   Status: {resp.status}, HTML: {len(resp.read())} bytes")
except Exception as e:
    print(f"   Error: {e}")

# Step 2: Try the billing endpoint we know works to confirm connectivity
print("\n2. Testing billing endpoint (should work)...")
billing_url = f"{api_host}/api/cbc/global/rest/BSS/billing/ratingservice/v2/inquiry/resource"
try:
    data = json.dumps({"subscriptionNum": 1}).encode()
    req = urllib.request.Request(billing_url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Accept', 'application/json')
    resp = opener.open(req, timeout=20)
    print(f"   Status: {resp.status}")
    print(f"   Body: {resp.read().decode()[:300]}")
except urllib.error.HTTPError as e:
    print(f"   HTTP {e.code}: {e.read().decode()[:300]}")
except Exception as e:
    print(f"   Error: {e}")

# Step 3: Try ALL possible share API paths
print("\n3. Trying share API endpoints...")
paths = [
    # Standard API pattern
    "/api/cbc/global/rest/cbc/portalcalculatornodeservice/v4/api/share/detail",
    # Without /global/
    "/api/cbc/rest/cbc/portalcalculatornodeservice/v4/api/share/detail",
    # Different prefix
    "/api/cbc/calculator/rest/cbc/portalcalculatornodeservice/v4/api/share/detail",
    # Try the CPQ endpoint mentioned in framework.js
    "/api/cbc/global/rest/cbc/portalcalculatornodeservice/v4/api/quoting_item",
    # Try with 'portalcalculator' service name
    "/api/cbc/global/rest/portalcalculatornodeservice/v4/api/share/detail",
    # Try product list endpoint
    "/api/cbc/global/rest/cbc/portalcalculatornodeservice/v4/api/export/productlist",
    # Try product info
    "/api/cbc/global/rest/cbc/portalcalculatornodeservice/v4/api/productInfo",
    # Try menu info (might have share data)
    "/api/cbc/global/rest/cbc/portalcalculatornodeservice/v4/api/menuInfo",
    # Try config
    "/api/cbc/global/rest/cbc/portalcalculatornodeservice/v4/api/config",
]

for path in paths:
    url = api_host + path
    data = json.dumps({"shareListId": share_id}).encode()
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Accept', 'application/json')
    req.add_header('Referer', calc_url)
    req.add_header('Origin', 'https://www.huaweicloud.com')
    
    try:
        resp = opener.open(req, timeout=20)
        body = resp.read().decode()
        if body.strip():
            print(f"\n✅ {path}")
            print(f"   Status: {resp.status}")
            print(f"   Headers: {dict(resp.headers)}")
            print(f"   Body: {body[:1000]}")
            # If this is real data, save it
            if resp.status == 200 and len(body) > 100:
                with open('/tmp/share_data.json', 'w') as f:
                    f.write(body)
                print(f"   Saved to /tmp/share_data.json")
        else:
            print(f"  ❌ {path} => empty body")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if 'Not Found' not in body and 'no Route' not in body:
            print(f"\n❓ {path}")
            print(f"   HTTP {e.code}: {body[:500]}")
    except Exception as e:
        print(f"  ❌ {path} => {str(e)[:100]}")

print("\n4. Trying to fetch page with share URL directly...")
share_page = f"{calc_url}?shareListId={share_id}&currentCurrency=USD"
try:
    resp = opener.open(share_page, timeout=20)
    html = resp.read().decode()
    # Search for any data embedded in the page
    import re
    # Look for JSON data in script tags
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
    for s in scripts:
        if 'shareListId' in s or 'productName' in s or 'price' in s.lower():
            print(f"   Found potential data script: {s[:500]}")
except Exception as e:
    print(f"   Error: {e}")

print("\n=== DONE ===")
