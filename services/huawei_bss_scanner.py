import logging
import requests
from huaweicloudsdkcore.signer.signer import Signer
from huaweicloudsdkcore.http.http_request import HttpRequest

logger = logging.getLogger(__name__)

class HuaweiBSSScanner:
    def __init__(self, raw_ak: str, raw_sk: str, region: str = 'la-north-2'):
        self.raw_ak = raw_ak
        self.raw_sk = raw_sk
        self.region = region

    def get_active_ris(self) -> tuple:
        """
        Returns: (bought_ris: list, diagnostics: list)
        """
        diagnostics = []
        bought_ris = []
        
        try:
            logger.info(f"FinOps Broker: Authenticating via V4 Signer for RI List in {self.region}")
            signer = Signer(ak=self.raw_ak, sk=self.raw_sk)
            
            endpoints = [
                f"https://bss.{self.region}.myhuaweicloud.com/v2/bills/customer-reserved-instances",
                "https://bss.ap-southeast-1.myhuaweicloud.com/v2/bills/customer-reserved-instances",
                "https://bss.la-south-2.myhuaweicloud.com/v2/bills/customer-reserved-instances"
            ]

            for url in endpoints:
                try:
                    diagnostics.append(f"Attempting to fetch RIs from: {url}")
                    
                    # 🚨 FIX: Use Huawei's native HttpRequest object for the Signer
                    r = HttpRequest("GET", url)
                    r.headers = {"Content-Type": "application/json"}
                    
                    # Sign the request (injects X-Sdk-Date and Authorization headers)
                    signer.sign(r)
                    
                    # Execute the signed request using the standard requests library
                    resp = requests.get(r.url, headers=r.headers, timeout=15)
                    
                    if resp.status_code == 200:
                        data = resp.json()
                        ri_list = data.get('customer_reserved_instances', [])
                        
                        diagnostics.append(f"SUCCESS: 200 OK from {url}. Found {len(ri_list)} total RI records in payload.")
                        
                        for ri in ri_list:
                            # Status 1 = Valid/Active in Huawei BSS
                            if str(ri.get('status')) == '1':
                                bought_ris.append({
                                    'id': ri.get('reserved_instance_id', 'BSS_RI'),
                                    'name': f"Floating RI ({ri.get('enterprise_project_name', 'Default')})",
                                    'specification': ri.get('spec_code', 'Unknown'),
                                    'billing_mode': 'Floating Reserved',
                                    'charging_mode': '1',
                                    'tags': {},
                                    'created_at': ri.get('effective_time', ''),
                                    'status': 'Active'
                                })
                        
                        diagnostics.append(f"Parsed {len(bought_ris)} Active Status=1 RIs.")
                        return bought_ris, diagnostics
                    else:
                        error_msg = f"FAILED: HTTP {resp.status_code} from {url} - {resp.text}"
                        logger.warning(error_msg)
                        diagnostics.append(error_msg)
                        
                except Exception as endpoint_e:
                    error_msg = f"CRASH on {url}: {str(endpoint_e)}"
                    logger.warning(error_msg)
                    diagnostics.append(error_msg)
            
            return bought_ris, diagnostics
            
        except Exception as e:
            error_msg = f"FinOps Broker Fatal Crash: {str(e)}"
            logger.error(error_msg, exc_info=True)
            diagnostics.append(error_msg)
            return [], diagnostics
