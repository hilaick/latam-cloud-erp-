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
            logger.error(f"BSS API Connectivity Error: {e}")
            return None

    def reconcile_intent_matrix(self, commercial_intent: dict) -> dict:
        """
        Cross-references the Blueprint's Commercial Intent against Live BSS Orders.
        If live BSS data is unavailable (due to IAM permissions), it intelligently 
        simulates the reconciliation matrix for the UI to prevent pipeline crashing.
        """
        bss_orders = self.get_active_commercial_orders()
        
        reconciliation_matrix = {
            "deployable_assets": [],
            "account_assets": [],
            "summary": { "covered": 0, "missing_ri": 0, "missing_account_services": 0 }
        }

        # Validate Deployable Assets (VMs, DBs, Vaults)
        for asset in commercial_intent.get('deployable_assets', []):
            intent_mode = str(asset.get('billing_mode', 'Pay-per-use')).lower()
            requires_po = 'year' in intent_mode or 'month' in intent_mode or 'pre-paid' in intent_mode
            
            is_covered = False
            if requires_po and bss_orders and 'order_infos' in bss_orders:
                # Naive matching: Check if the SKU exists in active BSS orders
                for order in bss_orders['order_infos']:
                    if asset.get('name', '').lower() in str(order).lower():
                        is_covered = True
                        break

            status = 'COVERED' if is_covered or not requires_po else 'MISSING_PO'
            
            reconciliation_matrix["deployable_assets"].append({
                **asset,
                "requires_po": requires_po,
                "status": status,
                "bss_verified": is_covered
            })
            
            if status == 'COVERED': reconciliation_matrix["summary"]["covered"] += 1
            elif status == 'MISSING_PO': reconciliation_matrix["summary"]["missing_ri"] += 1

        # Validate Account/Abstract Assets (Support Plans, Security Centers)
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
