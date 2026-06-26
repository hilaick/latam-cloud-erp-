import logging
from huaweicloudsdkcore.auth.credentials import GlobalCredentials
from huaweicloudsdkcore.region.region import Region
from huaweicloudsdkbss.v2.bss_client import BssClient
from huaweicloudsdkbss.v2.model.list_customer_orders_request import ListCustomerOrdersRequest

logger = logging.getLogger(__name__)

class HuaweiBSSScanner:
    """
    FinOps Identity Broker: Integrates directly with Huawei's Billing System.
    Explicitly forces connection to the LOCAL region (e.g., la-north-2) to bypass 
    cross-region data residency locks and mirror the console RI view.
    """
    def __init__(self, raw_ak: str, raw_sk: str, region: str = 'la-north-2'):
        self.raw_ak = raw_ak
        self.raw_sk = raw_sk
        self.region = region

    def get_active_ris(self) -> list:
        try:
            logger.info(f"FinOps Broker: Authenticating BSS in local region ({self.region})")
            credentials = GlobalCredentials(self.raw_ak, self.raw_sk)
            
            # Force the exact local regional endpoint used by the browser console
            local_bss_region = Region(self.region, f"https://bss.{self.region}.myhuaweicloud.com")
            
            client = BssClient.new_builder() \
                .with_credentials(credentials) \
                .with_region(local_bss_region) \
                .build()
            
            # Status 3 = Paid/Completed/Active
            request = ListCustomerOrdersRequest(status=3) 
            response = client.list_customer_orders(request)
            
            bought_ris = []
            
            if hasattr(response, 'order_infos') and response.order_infos:
                for order in response.order_infos:
                    order_dict = order.to_dict() if hasattr(order, 'to_dict') else order.__dict__
                    details = str(order_dict).lower()
                    
                    if 'reserved' in details or 'ri ' in details or 'year' in details or 'month' in details:
                        # Extract the specification safely
                        spec = 'Unknown'
                        for s in ['s6.large.2', 'c7.xlarge.2', 's6.xlarge.2', 'c6.large.2', 'c6.xlarge.2', 's6.medium.2', 'c7.large.2', 'c7.2xlarge.2', 's6.2xlarge.2', 'x0.8u.16g', 'x0.4u.8g']:
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
            
            logger.info(f"FinOps Broker: Found {len(bought_ris)} Floating RIs in {self.region}.")
            return bought_ris
            
        except Exception as e:
            logger.error(f"FinOps Broker Failed (Check IAM 'BSS ReadOnlyAccess' in local region): {e}")
            return []
