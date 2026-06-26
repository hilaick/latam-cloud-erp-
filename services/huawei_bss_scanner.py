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
    def __init__(self, raw_ak: str, raw_sk: str, region: str = 'cn-north-1'):
        self.raw_ak = raw_ak
        self.raw_sk = raw_sk
        self.region = region

    def get_active_ris(self) -> list:
        """
        Fetches Reserved Instances using Huawei Cloud CLI hcloud command.
        Uses: hcloud ECS NovaListServers --cli-region={region} --charge_mode=\"10\"
        """
        bought_ris = []
        
        try:
            logger.info(f"FinOps Broker: Getting Reserved Instances via hcloud CLI for region {self.region}")
            
            # Use hcloud CLI to list servers with charge_mode=10 (Reserved Instances)
            import subprocess
            import json
            import os
            
            # Build the hcloud command
            cmd = [
                'hcloud', 'ECS', 'NovaListServers',
                f'--cli-region={self.region}',
                '--charge_mode=10',  # 10 = Reserved Instances
                '--limit=100'
            ]
            
            # Add project_id if available from environment or config
            project_id = os.environ.get('HUAWEI_PROJECT_ID')
            if project_id:
                cmd.append(f'--project_id={project_id}')
            
            logger.info(f"Running command: {' '.join(cmd)}")
            
            # Execute the command
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                logger.error(f"hcloud CLI failed: {result.stderr}")
                # Fall back to trying the API directly
                return self._get_ris_via_api()
            
            # Parse the JSON output
            try:
                data = json.loads(result.stdout)
                servers = data.get('servers', []) if isinstance(data, dict) else []
                
                # Group by flavor to count RIs
                ri_by_flavor = {}
                for server in servers:
                    flavor = server.get('flavor', {}).get('id', 'Unknown')
                    if flavor not in ri_by_flavor:
                        ri_by_flavor[flavor] = {
                            'specification': flavor,
                            'quantity': 0,
                            'server_names': [],
                            'server_ids': []
                        }
                    ri_by_flavor[flavor]['quantity'] += 1
                    ri_by_flavor[flavor]['server_names'].append(server.get('name', server.get('id', 'Unknown')))
                    ri_by_flavor[flavor]['server_ids'].append(server.get('id', ''))
                
                # Convert to bought_ris format
                for flavor, data in ri_by_flavor.items():
                    bought_ris.append({
                        'id': f"RI-{flavor}",
                        'name': f"Reserved Instance - {flavor}",
                        'specification': flavor,
                        'quantity': data['quantity'],
                        'billing_mode': 'Reserved',
                        'charging_mode': '10',  # 10 = Reserved Instance
                        'status': 'active',
                        'order_type': 'inventory',
                        'server_names': data['server_names'],
                        'server_ids': data['server_ids']
                    })
                
                logger.info(f"FinOps Broker: Found {len(bought_ris)} Reserved Instance flavors via hcloud CLI (total {sum(r['quantity'] for r in bought_ris)} instances).")
                return bought_ris
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse hcloud output: {e}")
                logger.error(f"hcloud stdout: {result.stdout[:200]}")
                logger.error(f"hcloud stderr: {result.stderr}")
                return self._get_ris_via_api()
                
        except Exception as e:
            logger.error(f"FinOps Broker Failed to get RIs via hcloud: {e}")
            # Fall back to API method
            return self._get_ris_via_api()
    
    def _get_ris_via_api(self) -> list:
        """
        Fallback method using Huawei Cloud SDK (original BSS API approach)
        """
        try:
            logger.info("FinOps Broker: Falling back to BSS API for Reserved Instances")
            from huaweicloudsdkbss.v2.region.bss_region import BssRegion
            from huaweicloudsdkcore.auth.credentials import GlobalCredentials
            from huaweicloudsdkbss.v2 import BssClient, ListCustomerOrdersRequest
            
            credentials = GlobalCredentials(self.raw_ak, self.raw_sk)
            client = BssClient.new_builder() \
                .with_credentials(credentials) \
                .with_region(BssRegion.value_of("cn-north-1")) \
                .build()
            
            # Status 3 = Paid/Completed/Active Order
            request = ListCustomerOrdersRequest(status=3) 
            response = client.list_customer_orders(request)
            
            bought_ris = []
            
            if hasattr(response, 'order_infos') and response.order_infos:
                for order in response.order_infos:
                    order_dict = order.to_dict() if hasattr(order, 'to_dict') else order.__dict__
                    details = str(order_dict).lower()
                    
                    # Identify RI / Reserved packages
                    if 'reserved' in details or 'ri ' in details or 'year' in details or 'month' in details:
                        spec = 'Unknown'
                        resource_spec = order_dict.get('resource_spec_code', '')
                        if resource_spec:
                            spec = resource_spec
                        
                        for flavor_pattern in ['s6.large.2', 'c7.xlarge.2', 's6.xlarge.2', 'c6.large.2', 
                                              'c6.xlarge.2', 's6.medium.2', 'c7.large.2', 'c7.2xlarge.2', 
                                              's6.2xlarge.2', 'x0.8u.16g', 'x0.4u.6g', 'x0.4u.8g',
                                              'ac8.xlarge.4', 'x0.4u.12g', 'x0.6u.18g', 'x0.8u.8g',
                                              'x0.4u.10g', 'x0.2u.8g', 'x0.8u.32g', 'x0.2u.6g']:
                            if flavor_pattern in details or flavor_pattern in str(order_dict):
                                spec = flavor_pattern
                                break
                        
                        quantity = order_dict.get('quantity', 1)
                        if isinstance(quantity, (int, float)):
                            quantity = int(quantity)
                        else:
                            quantity = 1
                        
                        bought_ris.append({
                            'id': order_dict.get('order_id', 'BSS_RI_ORDER'),
                            'name': f"Floating RI (Order {order_dict.get('order_id', '')})",
                            'specification': spec,
                            'quantity': quantity,
                            'billing_mode': 'Floating Reserved',
                            'charging_mode': '1',
                            'tags': {},
                            'created_at': order_dict.get('create_time', ''),
                            'order_type': 'inventory'
                        })
            
            logger.info(f"FinOps Broker: Found {len(bought_ris)} Floating RIs via BSS API.")
            return bought_ris
            
        except Exception as e:
            logger.error(f"FinOps Broker Failed (Check IAM 'BSS ReadOnlyAccess' permissions): {e}")
            return []
