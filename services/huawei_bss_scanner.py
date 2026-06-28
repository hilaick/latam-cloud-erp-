import logging
import requests
import json
from urllib.parse import urlparse, parse_qsl, quote

try:
    from huaweicloudsdkcore.signer.signer import Signer
except ImportError:
    Signer = None

logger = logging.getLogger(__name__)

class MockHttpRequest:
    """
    A duck-typed mock of Huawei's HttpRequest object. 
    This prevents 500 Internal Server Errors caused by missing/moved SDK modules,
    allowing us to cryptographically sign custom URLs manually.
    """
    def __init__(self, method, url, headers=None, body=""):
        self.method = method
        self.url = url
        self.headers = headers or {}
        self.body = body
        
        parsed = urlparse(url)
        self.scheme = parsed.scheme
        self.host = parsed.netloc
        self.uri = quote(parsed.path) if parsed.path else "/"
        self.query = {}
        if parsed.query:
            for k, v in parse_qsl(parsed.query):
                self.query[k] = v

class HuaweiBSSScanner:
    """
    FinOps Identity Broker: Implements Console API Hijack.
    Bypasses standard Open APIs and forges a V4-signed request directly to the 
    hidden console proxy (csborderadapterservice) to fetch the true RI list.
    """
    def __init__(self, raw_ak: str, raw_sk: str, region: str = 'la-north-2'):
        self.raw_ak = raw_ak
        self.raw_sk = raw_sk
        self.region = region

    def _get_safe_signer(self):
        """Safely instantiates the Huawei Signer regardless of SDK version kwargs"""
        if not Signer:
            return None
        try:
            return Signer(self.raw_ak, self.raw_sk) # Positional fallback
        except Exception:
            try:
                return Signer(key=self.raw_ak, secret=self.raw_sk) # Standard kwargs
            except Exception:
                s = Signer()
                s.Key = self.raw_ak
                s.Secret = self.raw_sk
                return s

    def get_project_id(self, signer) -> str:
        try:
            url = f"https://iam.myhuaweicloud.com/v3/projects?name={self.region}"
            req = MockHttpRequest("GET", url)
            req.headers = {"Content-Type": "application/json"}
            signer.sign(req)
            resp = requests.get(req.url, headers=req.headers, timeout=10)
            if resp.status_code == 200:
                projects = resp.json().get('projects', [])
                if projects: return projects[0].get('id')
        except Exception as e:
            logger.error(f"Error fetching project ID: {e}")
        return ""

    def get_active_ris(self) -> tuple:
        diagnostics = []
        bought_ris = []
        
        try:
            diagnostics.append("Initiating Console API Hijack (csborderadapterservice)...")
            signer = self._get_safe_signer()
            if not signer:
                diagnostics.append("FAILED: Huawei Signer module missing. Ensure huaweicloudsdkcore is installed.")
                return bought_ris, diagnostics

            # Step 1: Grab Tenant ID for payload
            tenant_id = self.get_project_id(signer)
            if tenant_id: diagnostics.append(f"Successfully resolved Tenant ID: {tenant_id}")
            else: diagnostics.append("WARNING: Could not resolve Tenant ID. Proceeding with blank tenantId.")

            # Step 2: Forge the exact Console URL intercepted from the Network tab
            console_url = f"https://{self.region}-console.huaweicloud.com/ecm/rest/cbc/rest/cbc/csborderadapterservice/v1/queryRiInstance"
            
            payload = {
                "tenantId": tenant_id or "",
                "regionId": self.region,
                "cloudServiceType": "hws.service.type.ec2",
                "resourceType": "hws.resource.type.vm",
                "sortName": "validTime",
                "sortOrder": "desc",
                "curPage": 1,
                "pageSize": 100
            }
            payload_json = json.dumps(payload)
            
            req = MockHttpRequest("POST", console_url, body=payload_json)
            req.headers = {
                "Content-Type": "application/json;charset=utf8",
                "Accept": "application/json, text/plain, */*"
            }
            
            # Step 3: Sign it mathematically and send
            signer.sign(req)
            diagnostics.append(f"Sending V4 Signed POST request to Console API Proxy...")
            
            resp = requests.post(req.url, headers=req.headers, data=payload_json, timeout=15)
            
            if resp.status_code == 200:
                data = resp.json()
                ri_instances = data.get('riInstances', [])
                diagnostics.append(f"SUCCESS: Console API returned HTTP 200 OK. Array contains {len(ri_instances)} records.")
                
                for ri in ri_instances:
                    spec = ri.get('specCode', ri.get('flavorName', ri.get('specification', 'Unknown')))
                    bought_ris.append({
                        'id': ri.get('reserveInstanceId', 'CONSOLE_RI'),
                        'name': f"Floating RI ({ri.get('reserveInstanceId', 'Active')})",
                        'specification': spec,
                        'billing_mode': 'Floating Reserved',
                        'charging_mode': '1',
                        'tags': {},
                        'created_at': ri.get('validTime', ''),
                        'status': 'Active'
                    })
                
                diagnostics.append(f"Parsed {len(bought_ris)} Active RIs from Console API payload.")
                return bought_ris, diagnostics
            else:
                error_msg = f"FAILED: Console API HTTP {resp.status_code} - {resp.text}"
                diagnostics.append(error_msg)
                logger.warning(error_msg)

                diagnostics.append("Falling back to standard Open API...")
                return self._fallback_open_api(signer, diagnostics)

        except Exception as e:
            error_msg = f"Console API Hijack Crashed: {str(e)}"
            diagnostics.append(error_msg)
            logger.error(error_msg, exc_info=True)
            return bought_ris, diagnostics

    def _fallback_open_api(self, signer, diagnostics):
        bought_ris = []
        endpoints = [
            f"https://bss.{self.region}.myhuaweicloud.com/v2/bills/customer-reserved-instances",
            "https://bss.ap-southeast-1.myhuaweicloud.com/v2/bills/customer-reserved-instances"
        ]
        
        for url in endpoints:
            try:
                diagnostics.append(f"Attempting Open API: {url}")
                req = MockHttpRequest("GET", url)
                req.headers = {"Content-Type": "application/json"}
                signer.sign(req)
                resp = requests.get(req.url, headers=req.headers, timeout=10)
                
                if resp.status_code == 200:
                    data = resp.json()
                    ri_list = data.get('customer_reserved_instances', [])
                    diagnostics.append(f"Fallback SUCCESS: Found {len(ri_list)} records.")
                    for ri in ri_list:
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
                    return bought_ris, diagnostics
            except Exception as e:
                diagnostics.append(f"Fallback attempt failed: {str(e)}")
        
        return bought_ris, diagnostics
