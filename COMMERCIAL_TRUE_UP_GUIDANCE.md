# Commercial True-Up: Complete Guidance

## 🎯 **What is Commercial True-Up?**

The **Commercial True-Up** is the **financial reconciliation layer** that sits on top of your technical deployment. It answers the critical question:

> **"What was quoted vs. What is actually being paid for?"**

## 🔍 **The Problem It Solves**

In cloud migrations, there's often a disconnect between:
1. **Quoted Architecture** (what the customer agreed to pay for)
2. **Deployed Resources** (what's actually running in Huawei Cloud)
3. **Purchased RIs/Commitments** (what Procurement actually bought)

Without this reconciliation, you risk:
- **Uncovered Pay-Per-Use (PPU) costs** exploding
- **Missing Reserved Instances (RIs)** causing budget overruns
- **Unpurchased Support Plans** leaving the customer without SLAs
- **Financial liability** for the delivery team

## 📊 **Three-Way Comparison Matrix**

The Commercial True-Up should compare:

### **1. QUOTED (Commercial Intent)**
- From Excel parser: `commercial_intent.deployable_assets[]`
- **ECS/RDS/EIP specifications** with billing mode
- **Support Plans** (Enterprise/Business/Developer)
- **Security Services** (HSS, WAF, etc.)
- **Annual/Monthly commitments** vs. Pay-per-use

### **2. DEPLOYED (Live Environment)**
- From NOC scan: `/api/cloud/inventory`
- **Actual running instances** in Huawei Cloud
- **Current billing mode** (PPU vs. RI)
- **Resource specifications** (vCPU, RAM, storage)

### **3. PURCHASED (BSS Orders)**
- From Huawei BSS API: Active subscriptions/orders
- **Confirmed RIs** with term/quantity
- **Support Plan contracts**
- **Security service subscriptions**

## 🚨 **Current Implementation Gaps**

### **Missing Data Points:**
1. **No live environment comparison** - Only compares quoted vs. purchased
2. **No specification matching** - Only checks if "SKU exists" in BSS
3. **No quantity validation** - Doesn't check if 10x ECS.s3.large.2 were quoted but only 5x were purchased
4. **No term validation** - Doesn't check 1-year vs. 3-year RI commitments

### **Current UI Limitations:**
- Shows only "Covered" vs. "Action Required (PO)"
- Missing actual specifications from quotation
- Missing live environment state
- Missing BSS order details

## 🛠️ **Required Enhancements**

### **1. Enhanced Data Model**
```javascript
// Current structure (needs expansion)
{
  "deployable_assets": [
    {
      "name": "AppServer-01",
      "type": "ECS",
      "billing_mode": "Yearly",  // Quoted
      "status": "COVERED"        // Simple flag
    }
  ]
}

// Enhanced structure
{
  "deployable_assets": [
    {
      "name": "AppServer-01",
      "type": "ECS",
      "quoted_specs": {
        "flavor": "s6.large.2",
        "vCPU": 2,
        "RAM": 4,
        "billing_mode": "Yearly",
        "quantity": 10,
        "term": "1-year"
      },
      "live_specs": {
        "flavor": "s6.large.2",
        "vCPU": 2,
        "RAM": 4,
        "billing_mode": "Pay-per-use",  // Running on PPU!
        "quantity": 10
      },
      "purchased_specs": {
        "order_id": "ORD-123456",
        "billing_mode": "Yearly",
        "quantity": 5,                 // Only 5 purchased!
        "term": "1-year",
        "coverage": "50%"
      },
      "status": "PARTIAL_COVERAGE",    // More granular
      "risk_level": "HIGH",
      "monthly_gap_cost": "$1,200"     // Financial impact
    }
  ]
}
```

### **2. Enhanced BSS Scanner**
```python
def reconcile_intent_matrix(self, commercial_intent: dict, live_inventory: dict) -> dict:
    """
    Three-way reconciliation:
    1. Quoted (commercial_intent) 
    2. Deployed (live_inventory from NOC scan)
    3. Purchased (BSS orders)
    """
    
    # Get live inventory for comparison
    live_resources = self.get_live_resources(customer_id)
    
    # Get BSS orders
    bss_orders = self.get_active_commercial_orders()
    
    # Three-way matching
    for quoted_asset in commercial_intent['deployable_assets']:
        # Find matching live resource
        live_match = self.find_matching_live_resource(quoted_asset, live_resources)
        
        # Find matching BSS order
        bss_match = self.find_matching_bss_order(quoted_asset, bss_orders)
        
        # Calculate coverage and gaps
        coverage = self.calculate_coverage(quoted_asset, live_match, bss_match)
        
        # Add financial impact
        coverage['monthly_gap_cost'] = self.calculate_cost_gap(quoted_asset, bss_match)
        coverage['risk_level'] = self.assess_risk(coverage)
```

### **3. Enhanced UI Display**

```jsx
// Commercial True-Up View should show:
<CommercialTrueUpView>
  {/* 1. Summary Dashboard */}
  <FinancialSummary>
    - Total Quoted: $50,000/month
    - Currently Covered: $30,000/month  
    - Gap: $20,000/month
    - At Risk: 8 resources
  </FinancialSummary>
  
  {/* 2. Detailed Comparison Table */}
  <ComparisonTable columns={[
    "Resource",
    "Quoted Specs",
    "Live State", 
    "Purchased Coverage",
    "Gap",
    "Monthly Impact",
    "Risk"
  ]}>
    
  {/* 3. Shopping List Generator */}
  <ShoppingList>
    - ECS.s6.large.2 x5 (1-year RI) - $4,500/month
    - RDS.MySQL.4xlarge x2 (3-year RI) - $3,200/month
    - Enterprise Support Plan x1 - $1,500/month
    TOTAL: $9,200/month immediate PO required
  </ShoppingList>
  
  {/* 4. Handover Button */}
  <HandoverButton 
    disabled={totalRisk === "CRITICAL"}
    onClick={markTechnicallyComplete}
  />
</CommercialTrueUpView>
```

## 🔄 **Integration Points**

### **1. Excel Parser Enhancement**
```python
# services/excel_ingestor.py
def process_huawei_quotation(df):
    # Extract detailed specs, not just billing mode
    commercial_intent = {
        "deployable_assets": [{
            "name": row['Resource Name'],
            "type": row['Resource Type'],
            "quoted_specs": {
                "flavor": row['Flavor/Size'],
                "vCPU": extract_vcpu(row['Flavor/Size']),
                "RAM": extract_ram(row['Flavor/Size']),
                "storage": row['Storage GB'],
                "billing_mode": row['Billing Mode'],
                "term": extract_term(row['Billing Mode']),
                "quantity": row['Quantity'],
                "unit_price": row['Unit Price'],
                "total_price": row['Purchase Amount']
            }
        }]
    }
```

### **2. NOC Scan Integration**
```python
# routes/cloud_ops.py
@cloud_ops_bp.route('/api/finops/reconcile', methods=['POST'])
def reconcile_commercial_intent():
    # Get commercial intent from blueprint
    commercial_intent = blueprint_data.get('commercial_intent')
    
    # Get live inventory
    live_inventory = get_live_inventory(customer_id)
    
    # Get BSS orders
    bss_scanner = HuaweiBSSScanner(ak, sk)
    bss_orders = bss_scanner.get_active_commercial_orders()
    
    # Three-way reconciliation
    matrix = three_way_reconcile(
        quoted=commercial_intent,
        live=live_inventory,
        purchased=bss_orders
    )
    
    return jsonify({"success": True, "matrix": matrix})
```

### **3. BSS API Enhancement**
```python
# services/huawei_bss_scanner.py
def get_detailed_orders(self):
    """Get detailed order information with SKU mapping"""
    orders = self.get_active_commercial_orders()
    
    # Map Huawei Cloud SKUs to resource types
    sku_mapping = {
        'ecs': 'ECS',
        'rds': 'RDS', 
        'evs': 'EVS',
        'vpc': 'VPC',
        'eip': 'EIP',
        'hss': 'HSS',
        'waf': 'WAF'
    }
    
    detailed_orders = []
    for order in orders.get('order_infos', []):
        detailed_orders.append({
            'order_id': order['order_id'],
            'product_name': order['product_name'],
            'resource_type': self.map_sku_to_type(order['sku']),
            'quantity': order['quantity'],
            'term': order['period_type'],  # month/year
            'start_time': order['start_time'],
            'end_time': order['end_time'],
            'amount': order['amount']
        })
    
    return detailed_orders
```

## 🎯 **Immediate Actions Required**

### **Phase 1: Fix Current Implementation**
1. **Connect NOC scan data** to Commercial True-Up
2. **Enhance BSS scanner** to extract detailed order info
3. **Update UI** to show three-way comparison

### **Phase 2: Add Financial Impact**
1. **Calculate monthly gap costs** based on PPU vs. RI pricing
2. **Add risk scoring** (LOW/MEDIUM/HIGH/CRITICAL)
3. **Generate shopping list** with exact PO requirements

### **Phase 3: Automation**
1. **Auto-generate PO request** documents
2. **Email alerts** to Procurement team
3. **SLA tracking** for commercial handover

## 📈 **Business Value**

1. **Cost Control** - Prevent unbudgeted PPU costs
2. **Risk Mitigation** - Identify coverage gaps before they become problems
3. **Accountability** - Clear handoff from Delivery to Commercial
4. **Audit Trail** - Document what was quoted vs. purchased
5. **Customer Trust** - Demonstrate financial diligence

## 🚀 **Next Steps**

1. **Test with CODELPA customer** (has valid credentials)
2. **Verify BSS API connectivity** (region: `cn-north-1`)
3. **Enhance data collection** from Excel quotations
4. **Update UI** to show the complete picture
5. **Add export functionality** for Procurement team

The Commercial True-Up is your **financial airbag** - it prevents budget overruns by ensuring what was deployed matches what was purchased!