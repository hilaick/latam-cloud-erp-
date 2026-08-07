#!/usr/bin/env python3
"""Scrape Huawei Cloud Pricing Calculator share page using Playwright"""
import json, sys, re, time
from playwright.sync_api import sync_playwright

SHARE_URL = "https://www.huaweicloud.com/intl/en-us/pricing/calculator.html?shareListId=3fe7d1708f8711f1ba4403387fa007c1&currentCurrency=USD"

def scrape():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        page = browser.new_page()
        
        print("Navigating to share URL...")
        page.goto(SHARE_URL, wait_until='networkidle', timeout=60000)
        
        # Wait for the pricing table to render
        print("Waiting for pricing table...")
        try:
            page.wait_for_selector('.calculator-table, .product-list, table.pricing, [class*="product"]', timeout=30000)
            print("Table found!")
        except:
            print("Timeout waiting for specific selectors — saving page state anyway")
        
        # Wait a bit more for dynamic content
        time.sleep(5)
        
        # Get page HTML
        html = page.content()
        print(f"Page HTML: {len(html)} bytes")
        
        # Extract text content
        body_text = page.inner_text('body')
        print(f"Body text: {len(body_text)} chars")
        
        # Try to find pricing data in the DOM
        # Method 1: Look for table rows with pricing
        result = {
            'source_url': SHARE_URL,
            'extracted_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'method': 'playwright_dom_scrape',
        }
        
        # Try multiple selector strategies
        # Strategy A: Find all table rows
        tables = page.query_selector_all('table')
        print(f"Found {len(tables)} tables")
        
        items = []
        for i, table in enumerate(tables):
            rows = table.query_selector_all('tr')
            for row in rows:
                cells = row.query_selector_all('td, th')
                cell_texts = [c.inner_text().strip() for c in cells]
                if cell_texts:
                    items.append({'table': i, 'cells': cell_texts})
        
        result['table_items'] = items[:50]  # First 50 rows
        
        # Strategy B: Look for product cards
        cards = page.query_selector_all('[class*="product"], [class*="item"], [class*="card"]')
        print(f"Found {len(cards)} product cards/items")
        
        card_data = []
        for card in cards[:50]:
            text = card.inner_text().strip()
            if text and len(text) > 10:
                card_data.append(text[:200])
        result['product_cards'] = card_data
        
        # Strategy C: Extract all visible text segments
        # Look for currency amounts
        prices = re.findall(r'\$\s*[\d,]+\.?\d*', body_text)
        result['prices_found'] = prices[:50]
        
        # Strategy D: Try to get the React/Vue/Svelte component state
        # Check if there's a global state object
        try:
            state = page.evaluate('''() => {
                // Try to find any global state
                const keys = Object.keys(window).filter(k => 
                    k.includes('store') || k.includes('state') || k.includes('data') || 
                    k.includes('calc') || k.includes('share') || k.includes('product')
                );
                const result = {};
                for (const k of keys.slice(0, 20)) {
                    try {
                        result[k] = JSON.stringify(window[k]).slice(0, 200);
                    } catch(e) {}
                }
                return result;
            }''')
            result['window_state'] = state
        except Exception as e:
            result['window_state_error'] = str(e)
        
        # Strategy E: Network request interception
        # Check what API calls were made
        # (We can't retroactively get network requests, but we can check console)
        
        # Save raw HTML for analysis
        with open('/tmp/calculator_page.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("Saved HTML to /tmp/calculator_page.html")
        
        browser.close()
        return result

if __name__ == '__main__':
    result = scrape()
    print("\n=== SCRAPE RESULT ===")
    print(json.dumps(result, indent=2, ensure_ascii=False)[:5000])
    
    with open('/tmp/scrape_result.json', 'w') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print("\nSaved to /tmp/scrape_result.json")
