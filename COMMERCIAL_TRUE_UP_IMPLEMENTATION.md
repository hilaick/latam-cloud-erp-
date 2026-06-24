# Commercial True-Up: Implementation Plan

## 🎯 **Current State Analysis**

### **What We Have:**
1. **Excel Parser** captures:
   - `billing_mode` (Yearly/Monthly/Pay-per-use)
   - `specification` (flavor/size)
   - Basic categorization (compute/database/network/storage/security)

2. **BSS Scanner** queries Huawei Cloud Billing API
   - Gets active orders/subscriptions
   - Simple SKU matching (naive string search)

3. **UI Shows:**
   - Simple "Covered" vs "Action Required (PO)" status
   - Basic counts of covered/missing resources

### **What's Missing:**
1. **Quantity tracking** - How many instances of each type
2. **Specification details** - vCPU, RAM, storage size
3. **Financial data** - Unit price, total price, term
4. **Live environment comparison** - What's actually deployed vs quoted
5. **Gap analysis** - Exact PO requirements with pricing

## 🚀 **Phase 1: Enhanced Excel Parser (Immediate)**

### **Update `_extract_billing_mode` to capture more data:**
```python
def _extract_commercial_details(row: pd.Series) -> dict:
    """Extracts comprehensive commercial intent from Excel row."""
    details = {
        "billing_mode": "Pay-per-use",
        "term": None,  # 1-year, 3-year, etc.
        "quantity": 1,
        "unit_price": 0.0,
        "total_price": 0.0,
        "spec_details": {}
    }
    
    # Extract billing mode and term
    for col in ['billing mode', 'pricing mode', 'term', 'charge mode', 'billing']:
        if col in row and pd.notna(row[col]):
            val = str(row[col]).strip().lower()
            if 'year' in val or 'annual' in val:
                details["billing_mode"] = "Yearly"
                details["term"] = "1-year" if '1' in val else "3-year" if '3' in val else "yearly"
            elif 'month' in val:
                details["billing_mode"] = "Monthly"
                details["term"] = "monthly"
    
    # Extract quantity
    for col in ['quantity', 'qty', 'count', 'instances']:
        if col in row and pd.notna(row[col]):
            try:
                details["quantity"] = int(float(str(row[col])))
            except:
                pass
    
    # Extract pricing
    for col in ['unit price', 'price per unit', 'unit cost']:
        if col in row and pd.notna(row[col]):
            try:
                details["unit_price"] = float(str(row[col]).replace('$', '').replace(',', '').strip())
            except:
                pass
    
    for col in ['total price', 'amount', 'purchase amount', 'total cost']:
        if col in row and pd.notna(row[col]):
            try:
                details["total_price"] = float(str(row[col]).replace('$', '').replace(',', '').strip())
            except:
                pass
    
    return details
```

### **Update asset record creation:**
```python
# Replace lines 252-263 in excel_ingestor.py
commercial_details = _extract_commercial_details(row)

asset_record = {
    "id": f"{cat}_{index}",
    "type": svc_cat_raw,
    "name": svc_name_raw,
    "billing_mode": commercial_details["billing_mode"],
    "term": commercial_details["term"],
    "quantity": commercial_details["quantity"],
    "unit_price": commercial_details["unit_price"],
    "total_price": commercial_details["total_price"],
    "specification": svc_specs_raw[:100],
    "spec_details": commercial_details["spec_details"]
}
```

## 🚀 **Phase 2: Enhanced BSS Scanner**

### **Improve SKU matching:**
```python
def map_sku_to_resource_type(sku: str) -> dict:
    """Map Huawei Cloud SKU to resource type and specs."""
    sku_lower = sku.lower()
    
    mapping = {
        'ecs': {'type': 'ECS', 'category': 'compute'},
        'rds': {'type': 'RDS', 'category': 'database'},
        'gaussdb': {'type': 'GaussDB', 'category': 'database'},
        'evs': {'type': 'EVS', 'category': 'storage'},
        'obs': {'type': 'OBS', 'category': 'storage'},
        'eip': {'type': 'EIP', 'category': 'network'},
        'vpc': {'type': 'VPC', 'category': 'network'},
        'nat': {'type': 'NAT', 'category': 'network'},
        'hss': {'type': 'HSS', 'category': 'security'},
        'waf': {'type': 'WAF', 'category': 'security'},
        'cbr': {'type': 'CBR', 'category': 'storage'}
    }
    
    for key, value in mapping.items():
        if key in sku_lower:
            return value
    
    return {'type': 'Unknown', 'category': 'account'}

def reconcile_intent_matrix(self, commercial_intent: dict, live_inventory: dict = None) -> dict:
    """Three-way reconciliation with detailed matching."""
    bss_orders = self.get_detailed_orders()  # Enhanced version
    
    reconciliation_matrix = {
        "deployable_assets": [],
        "account_assets": [],
        "summary": {
            "covered": 0,
            "missing_ri": 0,
            "missing_account_services": 0,
            "total_quoted_cost": 0,
            "covered_cost": 0,
            "gap_cost": 0
        }
    }
    
    # Process deployable assets
    for asset in commercial_intent.get('deployable_assets', []):
        # Find matching BSS order
        bss_match = self.find_matching_bss_order(asset, bss_orders)
        
        # Find matching live resource (if available)
        live_match = None
        if live_inventory:
            live_match = self.find_matching_live_resource(asset, live_inventory)
        
        # Calculate coverage
        coverage = self.calculate_coverage(asset, bss_match, live_match)
        
        # Add to matrix
        reconciliation_matrix["deployable_assets"].append({
            **asset,
            **coverage,
            "bss_match": bss_match,
            "live_match": live_match
        })
        
        # Update summary
        reconciliation_matrix["summary"]["total_quoted_cost"] += asset.get("total_price", 0)
        if coverage["status"] == "COVERED":
            reconciliation_matrix["summary"]["covered"] += asset.get("quantity", 1)
            reconciliation_matrix["summary"]["covered_cost"] += asset.get("total_price", 0)
        else:
            reconciliation_matrix["summary"]["missing_ri"] += asset.get("quantity", 1)
            reconciliation_matrix["summary"]["gap_cost"] += asset.get("total_price", 0)
    
    return reconciliation_matrix
```

## 🚀 **Phase 3: Enhanced UI**

### **Update CommercialTrueUpView to show:**
```jsx
function CommercialTrueUpView({ activeProject, onUpdateProject }) {
    const [matrix, setMatrix] = useState(null);
    const [liveInventory, setLiveInventory] = useState(null);
    
    const handleRunTrueUp = async () => {
        // 1. Get commercial intent from project
        // 2. Get live inventory via NOC scan
        // 3. Get BSS orders
        // 4. Perform three-way reconciliation
    };
    
    return (
        <div className="max-w-[1600px] mx-auto space-y-6">
            {/* Financial Summary */}
            {matrix && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border">
                        <div className="text-2xl font-black text-slate-800">
                            ${matrix.summary.total_quoted_cost.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">Total Quoted</div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                        <div className="text-2xl font-black text-emerald-700">
                            ${matrix.summary.covered_cost.toLocaleString()}
                        </div>
                        <div className="text-xs text-emerald-600">Covered by RIs</div>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                        <div className="text-2xl font-black text-rose-700">
                            ${matrix.summary.gap_cost.toLocaleString()}
                        </div>
                        <div className="text-xs text-rose-600">PPU Gap</div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                        <div className="text-2xl font-black text-amber-700">
                            {matrix.summary.missing_ri}
                        </div>
                        <div className="text-xs text-amber-600">Resources at Risk</div>
                    </div>
                </div>
            )}
            
            {/* Detailed Comparison Table */}
            {matrix && (
                <table className="w-full">
                    <thead>
                        <tr>
                            <th>Resource</th>
                            <th>Quoted</th>
                            <th>Live</th>
                            <th>Purchased</th>
                            <th>Status</th>
                            <th>Monthly Gap</th>
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.deployable_assets.map((asset, i) => (
                            <tr key={i}>
                                <td>{asset.name} ({asset.type})</td>
                                <td>
                                    {asset.quantity}x {asset.specification}<br/>
                                    {asset.billing_mode} @ ${asset.unit_price}/month
                                </td>
                                <td>
                                    {asset.live_match ? 
                                        `${asset.live_match.quantity}x ${asset.live_match.flavor}` :
                                        "Not deployed"}
                                </td>
                                <td>
                                    {asset.bss_match ? 
                                        `${asset.bss_match.quantity}x (${asset.bss_match.term})` :
                                        "No PO"}
                                </td>
                                <td>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        asset.status === 'COVERED' ? 'bg-emerald-100 text-emerald-700' :
                                        asset.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                                        'bg-rose-100 text-rose-700'
                                    }`}>
                                        {asset.status}
                                    </span>
                                </td>
                                <td className="font-bold">
                                    ${asset.monthly_gap_cost || 0}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            
            {/* Shopping List Generator */}
            {matrix && matrix.summary.gap_cost > 0 && (
                <div className="bg-slate-50 p-6 rounded-xl border">
                    <h4 className="font-bold mb-4">📋 Procurement Shopping List</h4>
                    <div className="space-y-2">
                        {matrix.deployable_assets
                            .filter(a => a.status !== 'COVERED')
                            .map((asset, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div>
                                        <span className="font-bold">{asset.quantity}x {asset.name}</span>
                                        <span className="text-sm text-slate-600 ml-2">
                                            ({asset.type} - {asset.specification})
                                        </span>
                                    </div>
                                    <div className="font-bold">
                                        ${asset.monthly_gap_cost}/month
                                    </div>
                                </div>
                            ))}
                        <div className="border-t pt-2 font-bold text-lg">
                            Total Required: ${matrix.summary.gap_cost}/month
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
```

## 🚀 **Phase 4: Integration with NOC Scan**

### **Update the reconciliation endpoint:**
```python
@cloud_ops_bp.route('/api/finops/reconcile', methods=['POST'])
def reconcile_commercial_intent():
    try:
        # Get project data
        project_data = json.loads(project_record.data)
        commercial_intent = project_data.get('commercial_intent', {})
        
        # Get live inventory
        live_inventory = get_live_inventory_for_customer(customer_id)
        
        # Get BSS orders
        scanner = HuaweiBSSScanner(ak, sk)
        reconciliation_matrix = scanner.reconcile_intent_matrix(
            commercial_intent, 
            live_inventory
        )
        
        return jsonify({
            "success": True, 
            "matrix": reconciliation_matrix,
            "live_inventory": live_inventory  # Include for debugging
        })
```

## 📋 **Immediate Action Items**

### **Priority 1 (Today):**
1. **Enhance Excel parser** to capture quantity and pricing
2. **Update BSS scanner** for better SKU matching
3. **Add live inventory** to reconciliation

### **Priority 2 (This Week):**
1. **Update UI** to show three-way comparison
2. **Add financial impact** calculations
3. **Generate shopping list** with exact PO requirements

### **Priority 3 (Next Week):**
1. **Add export functionality** (PDF/Excel)
2. **Email notifications** to Procurement
3. **SLA tracking** for commercial handover

## 🎯 **Expected Outcome**

After implementation, the Commercial True-Up will show:

```
Resource: AppServer-01 (ECS)
────────────────────────────────────
Quoted:       10x s6.large.2 @ $200/month (Yearly)
Live:         10x s6.large.2 @ $250/month (PPU) ⚠️
Purchased:    5x s6.large.2 @ $180/month (1-year RI)
────────────────────────────────────
Status:       PARTIAL COVERAGE (50%)
Monthly Gap:  $1,000 (5 instances @ $200 PPU)
Risk:         MEDIUM
```

This gives Procurement **exact PO requirements** and shows Delivery **financial exposure** for uncovered resources.