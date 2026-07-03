import os
import boto3
from models import Customer
from services.credential_manager import get_credential_manager

class HyperscalerDiscoveryEngine:
    def __init__(self, customer_id):
        self.customer = Customer.query.get(customer_id)
        if not self.customer:
            raise ValueError("Customer Vault not found.")

    def run_aws_agentless_discovery(self, region='us-east-1'):
        if not self.customer.aws_ak or not self.customer.aws_sk:
            raise ValueError("AWS Credentials are missing in the Secure Vault.")

        session = boto3.Session(aws_access_key_id=self.customer.aws_ak, aws_secret_access_key=self.customer.aws_sk, region_name=region)
        inventory = {"compute": [], "databases": [], "network": [], "storage": [], "security": [], "raw_inventory": []}

        try:
            ec2 = session.client('ec2')
            
            # Compute
            for res in ec2.describe_instances().get('Reservations', []):
                for inst in res.get('Instances', []):
                    if inst.get('State', {}).get('Name') == 'running':
                        item = {"name": inst.get('InstanceId'), "type": inst.get('InstanceType'), "category": "compute", "region": region, "source": "AWS"}
                        inventory["compute"].append(item)
                        inventory["raw_inventory"].append(item)

            # Billable Network Edges (NAT & VPN)
            for nat in ec2.describe_nat_gateways().get('NatGateways', []):
                if nat.get('State') == 'available':
                    item = {"name": nat.get('NatGatewayId'), "type": "NAT Gateway", "category": "network", "region": region, "source": "AWS"}
                    inventory["network"].append(item)
                    inventory["raw_inventory"].append(item)
                    
            for vpn in ec2.describe_vpn_gateways().get('VpnGateways', []):
                if vpn.get('State') == 'available':
                    item = {"name": vpn.get('VpnGatewayId'), "type": "VPN Gateway", "category": "network", "region": region, "source": "AWS"}
                    inventory["network"].append(item)
                    inventory["raw_inventory"].append(item)

            # Databases
            for db in session.client('rds').describe_db_instances().get('DBInstances', []):
                item = {"name": db.get('DBInstanceIdentifier'), "type": db.get('Engine'), "category": "database", "region": region, "source": "AWS"}
                inventory["databases"].append(item)
                inventory["raw_inventory"].append(item)

            return {"success": True, "inventory": inventory}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def run_azure_agentless_discovery(self, subscription_id=None):
        if not self.customer.azure_tenant_id or not self.customer.azure_client_id or not self.customer.azure_client_secret:
            return {"success": False, "error": "Azure Credentials are missing in the Secure Vault."}

        try:
            from azure.identity import ClientSecretCredential
            from azure.mgmt.resource import ResourceManagementClient
        except ImportError:
            return {"success": False, "error": "Azure SDKs missing. Run: pip install azure-identity azure-mgmt-resource"}

        if not subscription_id or subscription_id == '00000000-0000-0000-0000-000000000000':
            return {"success": False, "error": "Azure requires a specific Subscription ID."}

        try:
            # Decrypt the Azure client secret
            import json
            master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
            cm = get_credential_manager(master_password)
            
            # The secret is stored as encrypted JSON
            try:
                encrypted_data = json.loads(self.customer.azure_client_secret)
                decrypted_secret = cm.decrypt_credentials(encrypted_data)[0]  # [0] is AK, [1] is SK placeholder
            except Exception as e:
                return {"success": False, "error": f"Failed to decrypt Azure credentials: {str(e)}"}
            
            credential = ClientSecretCredential(tenant_id=self.customer.azure_tenant_id, client_id=self.customer.azure_client_id, client_secret=decrypted_secret)
            resource_client = ResourceManagementClient(credential, subscription_id)
            inventory = {"compute": [], "databases": [], "network": [], "storage": [], "security": [], "raw_inventory": []}

            for resource in resource_client.resources.list():
                rtype = str(resource.type).lower()
                item = {"name": resource.name, "type": resource.type, "category": "unknown", "region": resource.location, "source": "Azure"}

                if 'microsoft.compute/virtualmachines' in rtype:
                    item['category'] = 'compute'
                    inventory["compute"].append(item)
                elif 'microsoft.sql/servers' in rtype or 'microsoft.dbfor' in rtype:
                    item['category'] = 'database'
                    inventory["databases"].append(item)
                # 🚨 FIX: Deep Network scan including Gateways
                elif any(k in rtype for k in ['microsoft.network/virtualnetworks', 'microsoft.network/natgateways', 'microsoft.network/virtualnetworkgateways', 'microsoft.network/localnetworkgateways']):
                    item['category'] = 'network'
                    inventory["network"].append(item)
                elif 'microsoft.storage/storageaccounts' in rtype:
                    item['category'] = 'storage'
                    inventory["storage"].append(item)
                else:
                    continue 

                inventory["raw_inventory"].append(item)

            return {"success": True, "inventory": inventory}

        except Exception as e:
            return {"success": False, "error": f"Azure API Error: {str(e)}"}
