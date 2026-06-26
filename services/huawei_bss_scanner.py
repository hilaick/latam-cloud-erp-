import logging
from huaweicloudsdkcore.auth.credentials import GlobalCredentials
from huaweicloudsdkcore.region.region import Region
from huaweicloudsdkbss.v2.bss_client import BssClient

# Dynamically import the OCE request objects to guarantee it doesn't crash on different SDK versions
try:
    from huaweicloudsdkbss.v2.model.list_customerself_resource_request import ListCustomerselfResourceRequest
    HAS_SELF_REQ = True
except ImportError:
    HAS_SELF_REQ = False

try:
    from huaweicloudsdkbss.v2.model.list_customer_resources_request import ListCustomerResourcesRequest
    HAS_CUST_REQ = True
except ImportError:
    HAS_CUST_REQ = False

logger = logging.getLogger(__name__)

class HuaweiBSSScanner:
    """
    FinOps Identity Broker: Integrates directly with Huawei's OCE (Customer Operation Capabilities) API.
    Uses the Yearly/Monthly resources endpoint to identify active Reserved Instances.
    """
    def __init__(self, raw_ak: str, raw_sk: str, region: str = 'la-north-2'):
        self.raw_ak = raw_ak
        self.raw_sk = raw_sk
        self.region = region

    def get_active_ris(self) -> tuple:
        diagnostics = []
        bought_ris = []
        
        try:
            logger.info("FinOps Broker: Authenticating via OCE (Customer Operation Capabilities) API")
            diagnostics.append("Authenticating via OCE (Customer Operation Capabilities) API...")
            
            # OCE/BSS APIs must hit the global hub
            credentials = GlobalCredentials(self.raw_ak, self.raw_sk)
            global_bss_region = Region("ap-southeast-1", "https://bss.ap-southeast-1.myhuaweicloud.com")
            
            client = BssClient.new_builder() \
                .with_credentials(credentials) \
                .with_region(global_bss_region) \
                .build()
                
            response = None
            
            # Using the official OCE API: GET /v2/resources/customer-resources
            if HAS_SELF_REQ and hasattr(client, 'list_customerself_resource'):
                req = ListCustomerselfResourceRequest()
                response = client.list_customerself_resource(req)
            elif HAS_CUST_REQ and hasattr(client, 'list_customer_resources'):
                req = ListCustomerResourcesRequest()
                response = client.list_customer_resources(req)
            else:
                error_msg = "FAILED: Your Huawei BSS SDK is missing the OCE Resource Request modules. Please run: pip install --upgrade huaweicloudsdkbss"
                logger.error(error_msg)
                diagnostics.append(error_msg)
                return bought_ris, diagnostics
                
            if response and hasattr(response, 'data') and response.data:
                resource_list = response.data
                diagnostics.append(f"SUCCESS: OCE API returned {len(resource_list)} active yearly/monthly resources.")
                
                for res in resource_list:
                    res_dict = res.to_dict() if hasattr(res, 'to_dict') else res.__dict__
                    details = str(res_dict).lower()
                    
                    # Isolate Reserved Instances from standard yearly/monthly VMs
                    is_ri = (
                        'reserved' in details or 
                        'ri ' in details or 
                        str(res_dict.get('resource_type_code')) == 'reserved_instance' or
                        str(res_dict.get('product_name', '')).lower().find('reserved') != -1
                    )
                    
                    if is_ri:
                        spec = str(res_dict.get('resource_spec_code', 'Unknown'))
                        bought_ris.append({
                            'id': res_dict.get('resource_id', 'OCE_RI'),
                            'name': f"Floating RI ({res_dict.get('product_name', 'Default')})",
                            'specification': spec,
                            'billing_mode': 'Floating Reserved',
                            'charging_mode': '1',
                            'tags': {},
                            'created_at': res_dict.get('effective_time', ''),
                            'status': 'Active'
                        })
                        
                diagnostics.append(f"Parsed {len(bought_ris)} Active RIs from OCE payload.")
            else:
                diagnostics.append("SUCCESS: OCE API responded, but 0 active prepaid resources were found for this account.")
                
            return bought_ris, diagnostics
            
        except Exception as e:
            error_msg = f"OCE API Fetch Failed (Check IAM 'BSS ReadOnlyAccess' permissions): {str(e)}"
            logger.error(error_msg, exc_info=True)
            diagnostics.append(error_msg)
            return bought_ris, diagnostics
