#!/usr/bin/env python3
"""Scrape Huawei Cloud Pricing Calculator — full share data extraction"""
import json, time, re
from playwright.sync_api import sync_playwright

SHARE_ID = "3fe7d1708f8711f1ba4403387fa007c1"
SHARE_URL = f"https://www.huaweicloud.com/intl/en-us/pricing/calculator.html?shareListId={SHARE_ID}&currentCurrency=USD"

def scrape_full():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})
        page.set_default_timeout(60000)
        
        print("1. Navigating to share URL...")
        page.goto(SHARE_URL, wait_until='domcontentloaded', timeout=60000)
        
        # The SPA needs time to initialize and load the shared list data
        print("2. Waiting for SPA to initialize and load shared data...")
        
        # Wait for the main content area to be populated
        # The calculator loads its products into a dynamic list
        try:
            # Wait for any meaningful content to appear in the product list area
            page.wait_for_function('''() => {
                const body = document.body.innerText;
                return body.includes('USD') && body.length > 5000;
            }''', timeout=60000)
            print("   Content loaded (USD found in body)")
        except:
            print("   Timeout waiting for content — continuing anyway")
        
        # Extra wait for all JS rendering
        time.sleep(8)
        
        # Scroll down to trigger lazy loading
        page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        time.sleep(3)
        page.evaluate('window.scrollTo(0, 0)')
        time.sleep(2)
        
        html = page.content()
        body_text = page.inner_text('body')
        print(f"   HTML: {len(html)} bytes, Body text: {len(body_text)} chars")
        
        result = {
            'share_id': SHARE_ID,
            'source_url': SHARE_URL,
            'extracted_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'currency': 'USD',
        }
        
        # METHOD 1: Extract the main product table
        print("\n3. Extracting product data from tables...")
        all_items = []
        
        tables = page.query_selector_all('table')
        print(f"   Found {len(tables)} tables")
        
        for ti, table in enumerate(tables):
            rows = table.query_selector_all('tr')
            for row in rows:
                cells = row.query_selector_all('td, th')
                cell_data = []
                for cell in cells:
                    text = cell.inner_text().strip()
                    # Also check for data attributes
                    attrs = {}
                    try:
                        for attr in ['data-type', 'data-price', 'data-name', 'data-spec', 'data-id']:
                            val = cell.get_attribute(attr)
                            if val:
                                attrs[attr] = val
                    except:
                        pass
                    cell_data.append({'text': text, 'attrs': attrs} if attrs else text)
                
                if cell_data:
                    all_items.append({'table_idx': ti, 'cells': cell_data})
        
        result['table_data'] = all_items
        
        # METHOD 2: Extract from the Svelte component state
        print("\n4. Attempting to extract Svelte component state...")
        try:
            state_data = page.evaluate('''() => {
                const result = {};
                // Try to find Svelte stores or component data
                const allElements = document.querySelectorAll('*');
                for (const el of allElements) {
                    // Check for Svelte component data
                    if (el.__svelte_component) {
                        result['has_svelte_components'] = true;
                        break;
                    }
                }
                // Check for any global pricing data
                for (const key of Object.keys(window)) {
                    const val = window[key];
                    if (val && typeof val === 'object' && val.shareListId === '3fe7d1708f8711f1ba4403387fa007c1') {
                        result['found_share_data_at'] = key;
                        result['share_data'] = JSON.stringify(val).slice(0, 2000);
                    }
                    if (key.includes('store') && typeof val === 'object' && val !== null) {
                        try {
                            result[key] = JSON.stringify(val).slice(0, 500);
                        } catch(e) {}
                    }
                }
                return result;
            }''')
            result['svelte_state'] = state_data
        except Exception as e:
            result['svelte_error'] = str(e)
        
        # METHOD 3: Intercept network requests to find the API endpoint
        print("\n5. Looking for API endpoint in page source...")
        # The framework.js has API paths but the page HTML might have config
        scripts = page.query_selector_all('script')
        for script in scripts:
            text = script.inner_text()
            if 'api' in text.lower() and ('calculator' in text.lower() or 'share' in text.lower()):
                print(f"   Found API-related script: {text[:200]}")
        
        # METHOD 4: Build structured items from the table data
        print("\n6. Parsing table into structured items...")
        items = []
        current_item = None
        
        for entry in all_items:
            cells = entry['cells']
            if not cells:
                continue
            
            # Check if this is a header row
            first_text = str(cells[0]) if cells else ''
            if 'Item' in first_text or 'Type' in first_text:
                continue
            
            # Parse the cells: [Type, Specifications, Units, Price]
            if len(cells) >= 4:
                item_type = str(cells[0]).strip()
                specs = str(cells[1]).strip() if len(cells) > 1 else ''
                units = str(cells[2]).strip() if len(cells) > 2 else ''
                price_str = str(cells[3]).strip() if len(cells) > 3 else ''
                
                # Parse price
                price = None
                if 'USD' in price_str:
                    try:
                        price = float(price_str.replace('USD', '').strip())
                    except:
                        pass
                
                item = {
                    'type': item_type,
                    'specifications': specs,
                    'units': units,
                    'price_usd': price,
                    'price_raw': price_str,
                }
                items.append(item)
        
        result['parsed_items'] = items
        result['total_items'] = len(items)
        
        # Calculate total
        total = sum(i['price_usd'] for i in items if i['price_usd'] is not None)
        result['total_monthly_usd'] = round(total, 2)
        
        # Save full HTML
        with open('/tmp/calculator_full.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"\nSaved full HTML ({len(html)} bytes)")
        
        # Save screenshots for debugging
        page.screenshot(path='/tmp/calculator_screenshot.png', full_page=True)
        print("Saved screenshot")
        
        browser.close()
        return result

if __name__ == '__main__':
    result = scrape_full()
    print("\n" + "="*60)
    print("FINAL RESULT")
    print("="*60)
    print(f"Total items extracted: {result['total_items']}")
    print(f"Total monthly (USD): {result['total_monthly_usd']}")
    print(f"\nParsed items:")
    for item in result.get('parsed_items', []):
        print(f"  {item['type']}: {item['specifications'][:80]}... => {item['price_raw']}")
    
    # Save to file
    output_path = '/tmp/share_pricing_data.json'
    with open(output_path, 'w') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"\nFull result saved to {output_path}")
