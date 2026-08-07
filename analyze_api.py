#!/usr/bin/env python3
"""Analyze the Huawei Cloud Pricing Calculator API response structure"""
import json

with open('/tmp/share_api_response.json') as f:
    data = json.load(f)

print(f"retCode: {data['retCode']}")
print(f"billingMode: {data['data']['billingMode']}")
cart = data['data']['cartListData']
print(f"\nCart items: {len(cart)}")
print("="*60)

grand_total = 0
all_items = []

for i, cart_item in enumerate(cart):
    sp = cart_item.get('selectedProduct', {})
    desc = sp.get('description', 'no description')
    sc = sp.get('serviceCode', 'no code')
    region = sp.get('region', '?')
    charge_mode = sp.get('chargeMode', '?')
    infos = sp.get('productAllInfos', [])
    
    cart_total = 0
    for info in infos:
        ir = info.get('inquiryResult', {})
        amount = ir.get('amount', 0) or 0
        cart_total += amount
    
    grand_total += cart_total
    
    print(f"\n[{i}] {desc}")
    print(f"    Service: {sc}, Region: {region}, Mode: {charge_mode}")
    print(f"    Line items: {len(infos)}, Cart total: ${cart_total:.2f}")
    
    for j, info in enumerate(infos):
        ir = info.get('inquiryResult', {})
        qty = info.get('productNum', 1)
        price_per = info.get('amount', '?')
        total = ir.get('amount', '?') or 0
        
        item = {
            'name': desc,
            'type': sc,
            'region': region,
            'charge_mode': charge_mode,
            'spec_code': info.get('resourceSpecCode', ''),
            'resource_type': info.get('resourceType', ''),
            'spec_desc': info.get('productSpecSysDesc', ''),
            'quantity': qty,
            'unit_price': price_per,
            'total_price': total,
            'sku_info': info.get('_skuInfo', []),
        }
        all_items.append(item)
        
        print(f"    [{j}] {info.get('resourceSpecCode', '?'):30s} x{qty:3d} | ${str(price_per):>10s} → ${total:>10.2f}")
        if info.get('productSpecSysDesc'):
            print(f"         Specs: {info['productSpecSysDesc'][:100]}")

print(f"\n{'='*60}")
print(f"GRAND TOTAL: ${grand_total:.2f} across {len(cart)} products, {len(all_items)} line items")

# Save parsed items
with open('/tmp/parsed_items.json', 'w') as f:
    json.dump(all_items, f, indent=2, ensure_ascii=False)
print(f"\nParsed {len(all_items)} items saved to /tmp/parsed_items.json")
