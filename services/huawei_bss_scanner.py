import logging
from huaweicloudsdkcore.auth.credentials import GlobalCredentials
from huaweicloudsdkbss.v2.region.bss_region import BssRegion
from huaweicloudsdkbss.v2.bss_client import BssClient
from huaweicloudsdkbss.v2.model.list_customer_orders_request import ListCustomerOrdersRequest

logger = logging.getLogger(__name__)

class HuaweiBSSScanner:
    """
    FinOps Identity Broker: Integrates directly with Huawei's Global Billing System.
    Bypasses EPS-scoped technical tokens and uses Master AK/SK to pull financial records.
    """
    def __init__(self, raw_ak: str, raw_sk: str):
        self.raw_ak = raw_ak
        self.raw_sk = raw_sk

    def get_active_ris(self) -> list:
        """
        Fetches Active 'Floating' Reserved Instances from the BSS Orders API.
        Hardcoded to ap-southeast-1 (Global Billing Hub).
        """
        try:
            logger.info("FinOps Broker: Authenticating with BSS Global Hub (ap-southeast-1)")
            credentials = GlobalCredentials(self.raw_ak, self.raw_sk)
            client = BssClient.new_builder() \
                .with_credentials(credentials) \
                .with_region(BssRegion.value_of("ap-southeast-1")) \
                .build()
            
            # Status 3 = Paid/Completed/Active Order
            request = ListCustomerOrdersRequest(status=3) 
            response = client.list_customer_orders(request)
            
            bought_ris = []
            
            if hasattr(response, 'order_infos') and response.order_infos:
                for order in response.order_infos:
                    # Normalize object response to dict for safe traversal
                    order_dict = order.to_dict() if hasattr(order, 'to_dict') else order.__dict__
                    details = str(order_dict).lower()
                    
                    # Identify RI / Reserved packages
                    if 'reserved' in details or 'ri ' in details or 'year' in details or 'month' in details:
                        # Fallback heuristic spec matcher
                        spec = 'Unknown'
                        for s in ['s6.large.2', 'c7.xlarge.2', 's6.xlarge.2', 'c6.large.2', 'c6.xlarge.2', 's6.medium.2', 'c7.large.2', 'c7.2xlarge.2', 's6.2xlarge.2']:
                            if s in details:
                                spec = s
                                break
                                
                        bought_ris.append({
                            'id': order_dict.get('order_id', 'BSS_RI_ORDER'),
                            'name': f"Floating RI (Order {order_dict.get('order_id', '')})",
                            'specification': spec,
                            'billing_mode': 'Floating Reserved',
                            'charging_mode': '1',
                            'tags': {},
                            'created_at': order_dict.get('create_time', '')
                        })
            
            logger.info(f"FinOps Broker: Found {len(bought_ris)} Floating RIs via BSS API.")
            return bought_ris
            
        except Exception as e:
            logger.error(f"FinOps Broker Failed (Check IAM 'BSS ReadOnlyAccess' permissions): {e}")
            return []
