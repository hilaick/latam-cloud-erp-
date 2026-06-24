import logging
from huaweicloudsdkcore.auth.credentials import GlobalCredentials
from huaweicloudsdkbss.v2.region.bss_region import BssRegion
from huaweicloudsdkbss.v2.bss_client import BssClient
from huaweicloudsdkbss.v2.model.list_customer_orders_request import ListCustomerOrdersRequest

logger = logging.getLogger(__name__)

class HuaweiBSSScanner:
    """
    Integrates with the Huawei Cloud Billing Support System (BSS) API.
    Used exclusively in Phase 5 to verify if Procurement/Partners have actually 
    placed the Purchase Orders (POs) for RIs, Vaults, and Support Plans.
    """
    def __init__(self, ak: str, sk: str):
        self.ak = ak
        self.sk = sk

    def get_active_commercial_orders(self):
        """Fetches active orders/subscriptions from the BSS API."""
        try:
            credentials = GlobalCredentials(self.ak, self.sk)
            client = BssClient.new_builder() \
                .with_credentials(credentials) \
                .with_region(BssRegion.value_of("ap-southeast-3")) \
                .build()
            
            # Status 3 = Paid/Active/Completed Order
            request = ListCustomerOrdersRequest(status=3) 
            response = client.list_customer_orders(request)
            return response.to_dict()
        except Exception as e:
            logger.warning(f"BSS API Connectivity Warning (Expected if IAM permissions missing): {e}")
            return None

    def reconcile_intent_matrix(self, commercial_intent: dict) -> dict:
        """
        Cross-references the Blueprint's Commercial Intent against Live BSS Orders.
        Aggregates identical SKUs/Flavors (e.g., 10x s6.large.2) to calculate 
        the exact missing quantity for Procurement.
        """
        bss_orders = self.get_active_commercial_orders()
        
        reconciliation_matrix = {
            "aggregated_deployable": [],
            "account_assets": [],
            "summary": { "covered": 0, "missing_ri": 0, "missing_account_services": 0 }
        }

        # 1. AGGREGATE DEPLOYABLE ASSETS BY FLAVOR / SPECIFICATION
        aggregation = {}
        for asset in commercial_intent.get('deployable_assets', []):
            intent_mode = str(asset.get('billing_mode', 'Pay-per-use')).lower()
            requires_po = 'year' in intent_mode or 'month' in intent_mode or 'pre-paid' in intent_mode
            spec = asset.get('specification', 'Standard')
            cat_type = asset.get('type', 'Unknown')
            
            # Create a unique key for grouping (e.g., "ECS_s6.large.2_Yearly")
            key = f"{cat_type}_{spec}_{intent_mode}"
            
            if key not in aggregation:
                aggregation[key] = {
                    "type": cat_type,
                    "specification": spec,
                    "billing_mode": asset.get('billing_mode', 'Pay-per-use'),
                    "requires_po": requires_po,
                    "required_qty": 0,
                    "owned_qty": 0
                }
            aggregation[key]["required_qty"] += 1

        # 2. RECONCILE AGGREGATED FLAVORS AGAINST BSS SUBSCRIPTIONS
        for key, data in aggregation.items():
            if data["requires_po"]:
                owned = 0
                # In production, this parses BSS 'order_infos' for matching Flavor IDs
                if bss_orders and 'order_infos' in bss_orders:
                    for order in bss_orders['order_infos']:
                        if data['specification'].lower() in str(order).lower():
                            owned += 1 # Or parse actual quantity from the order payload
                
                data["owned_qty"] = owned
                
                if data["owned_qty"] >= data["required_qty"]:
                    data["status"] = 'COVERED'
                    reconciliation_matrix["summary"]["covered"] += data["required_qty"]
                else:
                    data["status"] = 'MISSING_PO'
                    missing_count = data["required_qty"] - data["owned_qty"]
                    reconciliation_matrix["summary"]["missing_ri"] += missing_count
            else:
                data["status"] = 'COVERED' # PPU requires no upfront PO
                reconciliation_matrix["summary"]["covered"] += data["required_qty"]
                
            reconciliation_matrix["aggregated_deployable"].append(data)

        # 3. RECONCILE ACCOUNT ASSETS (Support Plans, Security Centers)
        for asset in commercial_intent.get('account_assets', []):
            intent_mode = str(asset.get('billing_mode', 'Pay-per-use')).lower()
            requires_po = 'year' in intent_mode or 'month' in intent_mode or 'pre-paid' in intent_mode
            
            is_covered = False
            if bss_orders and 'order_infos' in bss_orders:
                for order in bss_orders['order_infos']:
                    if asset.get('type', '').lower() in str(order).lower():
                        is_covered = True
                        break
                        
            status = 'COVERED' if is_covered or not requires_po else 'MISSING_PO'
            
            reconciliation_matrix["account_assets"].append({
                **asset,
                "requires_po": requires_po,
                "status": status,
                "bss_verified": is_covered
            })

            if status == 'MISSING_PO': reconciliation_matrix["summary"]["missing_account_services"] += 1

        return reconciliation_matrix
