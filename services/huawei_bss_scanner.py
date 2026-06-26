import logging
import requests
from huaweicloudsdkcore.signer.signer import Signer

logger = logging.getLogger(__name__)

class HuaweiBSSScanner:
    """
    FinOps Identity Broker: Integrates directly with Huawei's Billing System via REST API.
    Bypasses the SDK's Order API and directly queries the active Reserved Instances pool 
    using V4 Request Signing to mirror the ECM Console exact behavior.
    """
    def __init__(self, raw_ak: str, raw_sk: str, region: str = 'la-north-2'):
        self.raw_ak = raw_ak
        self.raw_sk = raw_sk
        self.region = region

    def get_active_ris(self) -> list:
        try:
            logger.info(f"FinOps Broker: Authenticating via V4 Signer for RI List in {self.region}")
            signer = Signer(ak=self.raw_ak, sk=self.raw_sk)
            
            # 🚨 CORE FIX: Target the Active Resources list, NOT the Orders list.
            # We try the local regional proxy first (which ECM console uses), then fallback to Global Hubs.
            endpoints = [
                f"https://bss.{self.region}.myhuaweicloud.com/v2/bills/customer-reserved-instances",
                "https://bss.ap-southeast-1.myhuaweicloud.com/v2/bills/customer-reserved-instances",
                "https://bss.la-south-2.myhuaweicloud.com/v2/bills/customer-reserved-instances"
            ]

            bought_ris = []
            for url in endpoints:
                try:
                    req = requests.Request("GET", url)
                    req.headers["Content-Type"] = "application/json"
                    prepared = req.prepare()
                    
                    # Cryptographically sign the raw HTTP request with Huawei V4 Auth
                    signer.sign(prepared)
                    
                    resp = requests.Session().send(prepared, timeout=15)
                    if resp.status_code == 200:
                        data = resp.json()
                        ri_list = data.get('customer_reserved_instances', [])
                        
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
                        
                        logger.info(f"Successfully loaded {len(bought_ris)} Active RIs from {url}")
                        return bought_ris  # Exit immediately if we found the active list
                    else:
                        logger.warning(f"V4 API returned {resp.status_code} for {url}: {resp.text}")
                except Exception as e:
                    logger.warning(f"V4 API Call failed on {url}: {e}")
            
            return bought_ris
        except Exception as e:
            logger.error(f"FinOps Broker V4 Auth request crashed: {e}", exc_info=True)
            return []
