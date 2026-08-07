#!/usr/bin/env python3
"""Scraper v3: Intercept network requests to find the actual API endpoint"""
import json, time, re, asyncio
from playwright.sync_api import sync_playwright

SHARE_ID = "3fe7d1708f8711f1ba4403387fa007c1"
SHARE_URL = f"https://www.huaweicloud.com/intl/en-us/pricing/calculator.html?shareListId={SHARE_ID}&currentCurrency=USD"

def scrape_v3():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()
        
        # CAPTURE ALL NETWORK REQUESTS
        network_requests = []
        api_calls = []
        
        def capture_request(request):
            url = request.url
            network_requests.append({
                'url': url,
                'method': request.method,
                'headers': dict(request.headers),
                'timestamp': time.time()
            })
            # Filter for likely API calls
            if 'api' in url or 'calculator' in url.lower() or 'share' in url.lower() or 'rest' in url.lower() or 'bss' in url.lower():
                api_calls.append({
                    'url': url,
                    'method': request.method,
                    'post_data': request.post_data,
                    'headers': dict(request.headers),
                })
        
        def capture_response(response):
            url = response.url
            if 'api' in url or 'calculator' in url.lower() or 'share' in url.lower():
                try:
                    body = response.text()
                    for api_call in api_calls:
                        if api_call['url'] == url:
                            api_call['response_status'] = response.status
                            api_call['response_body'] = body[:5000]
                            api_call['response_headers'] = dict(response.headers)
                            break
                except:
                    pass
        
        page.on('request', capture_request)
        page.on('response', capture_response)
        
        print("1. Navigating to share URL (networkidle)...")
        page.goto(SHARE_URL, wait_until='networkidle', timeout=90000)
        print(f"   Page loaded, {len(network_requests)} total requests")
        
        # Wait for additional async requests
        print("2. Waiting for async data loading...")
        time.sleep(10)
        
        # Scroll to trigger any lazy rendering
        page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        time.sleep(3)
        page.evaluate('window.scrollTo(0, 0)')
        time.sleep(3)
        
        # Check the final state
        tables = page.query_selector_all('table')
        print(f"   Final tables: {len(tables)}")
        
        body_text = page.inner_text('body')
        print(f"   Body text: {len(body_text)} chars")
        
        # Show what API calls were captured
        print(f"\n3. API calls captured: {len(api_calls)}")
        for i, call in enumerate(api_calls):
            print(f"\n   API #{i}: {call['method']} {call['url'][:150]}")
            if call.get('response_status'):
                print(f"   Status: {call['response_status']}")
                body = call.get('response_body', '')
                if body:
                    print(f"   Body preview: {body[:500]}")
            if call.get('post_data'):
                print(f"   Post data: {call['post_data'][:300]}")
        
        # Save results
        result = {
            'share_id': SHARE_ID,
            'total_requests': len(network_requests),
            'api_calls': api_calls,
            'tables_found': len(tables),
            'body_text_length': len(body_text),
            'body_text_sample': body_text[:2000],
        }
        
        # Check for any tables with data
        all_items = []
        for table in tables:
            rows = table.query_selector_all('tr')
            for row in rows:
                cells = row.query_selector_all('td, th')
                cell_texts = [c.inner_text().strip() for c in cells]
                if cell_texts:
                    all_items.append(cell_texts)
        result['table_items'] = all_items
        
        screenshot_path = '/tmp/calculator_v3.png'
        page.screenshot(path=screenshot_path, full_page=True)
        result['screenshot'] = screenshot_path
        
        browser.close()
        return result

if __name__ == '__main__':
    result = scrape_v3()
    print("\n" + "="*60)
    print("NETWORK ANALYSIS COMPLETE")
    print("="*60)
    
    # Print API calls summary
    if result['api_calls']:
        print(f"\n🚀 Found {len(result['api_calls'])} API calls!")
        for i, call in enumerate(result['api_calls']):
            if call.get('response_status') == 200 and call.get('response_body'):
                print(f"\n✅ API #{i}: {call['method']} {call['url']}")
                print(f"   Response body: {call['response_body'][:1000]}")
    else:
        print("\n❌ No API calls captured!")
    
    print(f"\nTables: {result['tables_found']}, Items: {len(result.get('table_items', []))}")
    
    with open('/tmp/network_analysis.json', 'w') as f:
        json.dump(result, f, indent=2, ensure_ascii=False, default=str)
    print("Saved to /tmp/network_analysis.json")
