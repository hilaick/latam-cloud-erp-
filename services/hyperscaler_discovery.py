import boto3
from models import Customer

class HyperscalerDiscoveryEngine:
    def __init__(self, customer_id):
        self.customer = Customer.query.get(customer_id)
        if not self.customer:
            raise ValueError("Customer Vault not found.")

    def run_aws_agentless_discovery(self, region='us-east-1'):
        """
        Agentless Control Plane Pull via AWS boto3 SDK.
        """
        if not self.customer.aws_ak or not self.customer.aws_sk:
            raise ValueError("AWS Multi-Cloud Credentials are missing in the Secure Vault.")

        session = boto3.Session(
            aws_access_key_id=self.customer.aws_ak,
            aws_secret_access_key=self.customer.aws_sk,
            region_name=region
        )

        inventory = {"compute": [], "databases": [], "network": [], "storage": [], "security": [], "raw_inventory": []}

        try:
            ec2 = session.client('ec2')
            instances = ec2.describe_instances()
            for reservation in instances.get('Reservations', []):
                for inst in reservation.get('Instances', []):
                    if inst.get('State', {}).get('Name') == 'running':
                        item = {"name": inst.get('InstanceId'), "type": inst.get('InstanceType'), "category": "compute", "region": region, "source": "AWS"}
                        inventory["compute"].append(item)
                        inventory["raw_inventory"].append(item)

            rds = session.client('rds')
            dbs = rds.describe_db_instances()
            for db in dbs.get('DBInstances', []):
                item = {"name": db.get('DBInstanceIdentifier'), "type": db.get('Engine'), "category": "database", "region": region, "source": "AWS"}
                inventory["databases"].append(item)
                inventory["raw_inventory"].append(item)

            waf = session.client('wafv2')
            web_acls = waf.list_web_acls(Scope='REGIONAL')
            for acl in web_acls.get('WebACLs', []):
                item = {"name": acl.get('Name'), "type": "WAF", "category": "security", "region": region, "source": "AWS"}
                inventory["security"].append(item)
                inventory["raw_inventory"].append(item)

            return {"success": True, "inventory": inventory}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def run_azure_agentless_discovery(self, subscription_id=None):
        """
        Agentless Control Plane Pull via Azure SDK.
        Uses Azure Resource Graph logic to map Compute, Storage, Network, and Databases.
        """
        if not self.customer.azure_tenant_id or not self.customer.azure_client_id or not self.customer.azure_client_secret:
            return {"success": False, "error": "Azure Credentials are missing in the Secure Vault."}

        try:
            from azure.identity import ClientSecretCredential
            from azure.mgmt.resource import ResourceManagementClient
        except ImportError:
            return {"success": False, "error": "Azure SDKs missing. Please run: pip install azure-identity azure-mgmt-resource"}

        if not subscription_id or subscription_id == '00000000-0000-0000-0000-000000000000':
            return {"success": False, "error": "Azure requires a specific Subscription ID to discover resources. Please provide one."}

        try:
            credential = ClientSecretCredential(
                tenant_id=self.customer.azure_tenant_id,
                client_id=self.customer.azure_client_id,
                client_secret=self.customer.azure_client_secret
            )

            # 🚨 FIX: Switched to ResourceManagementClient to pull EVERYTHING across the subscription
            resource_client = ResourceManagementClient(credential, subscription_id)
            inventory = {"compute": [], "databases": [], "network": [], "storage": [], "security": [], "raw_inventory": []}

            for resource in resource_client.resources.list():
                rtype = str(resource.type).lower()
                
                item = {
                    "name": resource.name,
                    "type": resource.type,
                    "category": "unknown",
                    "region": resource.location,
                    "source": "Azure"
                }

                if 'microsoft.compute/virtualmachines' in rtype:
                    item['category'] = 'compute'
                    inventory["compute"].append(item)
                elif 'microsoft.sql/servers' in rtype or 'microsoft.dbfor' in rtype:
                    item['category'] = 'database'
                    inventory["databases"].append(item)
                elif 'microsoft.network/virtualnetworks' in rtype or 'microsoft.network/networksecuritygroups' in rtype or 'microsoft.network/publicipaddresses' in rtype:
                    item['category'] = 'network'
                    inventory["network"].append(item)
                elif 'microsoft.storage/storageaccounts' in rtype:
                    item['category'] = 'storage'
                    inventory["storage"].append(item)
                else:
                    continue # Skip highly granular child items to avoid cluttering the UI

                inventory["raw_inventory"].append(item)

            return {"success": True, "inventory": inventory}

        except Exception as e:
            return {"success": False, "error": f"Azure API Error: {str(e)}"}
