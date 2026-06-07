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
        Bypasses MgC to instantly retrieve infrastructure counts.
        """
        if not self.customer.aws_ak or not self.customer.aws_sk:
            raise ValueError("AWS Multi-Cloud Credentials are missing in the Secure Vault.")

        # Initialize AWS SDK Client
        session = boto3.Session(
            aws_access_key_id=self.customer.aws_ak,
            aws_secret_access_key=self.customer.aws_sk,
            region_name=region
        )

        inventory = {
            "compute": 0,
            "databases": 0,
            "network": 0,
            "storage": 0,
            "security": 0,
            "raw_inventory": []
        }

        try:
            # 1. Discover EC2 Compute
            ec2 = session.client('ec2')
            instances = ec2.describe_instances()
            for reservation in instances.get('Reservations', []):
                for inst in reservation.get('Instances', []):
                    if inst.get('State', {}).get('Name') == 'running':
                        inventory["compute"] += 1
                        inventory["raw_inventory"].append({"name": inst.get('InstanceId'), "type": inst.get('InstanceType'), "category": "compute", "region": region})

            # 2. Discover RDS Databases
            rds = session.client('rds')
            dbs = rds.describe_db_instances()
            for db in dbs.get('DBInstances', []):
                inventory["databases"] += 1
                inventory["raw_inventory"].append({"name": db.get('DBInstanceIdentifier'), "type": db.get('Engine'), "category": "database", "region": region})

            # 3. Discover WAF & Security
            waf = session.client('wafv2')
            web_acls = waf.list_web_acls(Scope='REGIONAL')
            for acl in web_acls.get('WebACLs', []):
                inventory["security"] += 1
                inventory["raw_inventory"].append({"name": acl.get('Name'), "type": "WAF", "category": "security", "region": region})

            return {"success": True, "inventory": inventory}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def run_azure_agentless_discovery(self, subscription_id=None):
        """
        Agentless Control Plane Pull via Azure SDK.
        """
        if not self.customer.azure_tenant_id or not self.customer.azure_client_id or not self.customer.azure_client_secret:
            return {"success": False, "error": "Azure Credentials are missing in the Secure Vault."}

        try:
            from azure.identity import ClientSecretCredential
            from azure.mgmt.compute import ComputeManagementClient
            from azure.mgmt.network import NetworkManagementClient
        except ImportError:
            return {"success": False, "error": "Azure SDKs missing. Please run: pip install azure-identity azure-mgmt-compute azure-mgmt-network"}

        if not subscription_id or subscription_id == '00000000-0000-0000-0000-000000000000':
            return {"success": False, "error": "Azure requires a specific Subscription ID to discover resources. Please provide one."}

        try:
            credential = ClientSecretCredential(
                tenant_id=self.customer.azure_tenant_id,
                client_id=self.customer.azure_client_id,
                client_secret=self.customer.azure_client_secret
            )

            inventory = {"compute": 0, "databases": 0, "network": 0, "storage": 0, "security": 0, "raw_inventory": []}

            # 1. Discover Azure VMs
            compute_client = ComputeManagementClient(credential, subscription_id)
            for vm in compute_client.virtual_machines.list_all():
                inventory["compute"] += 1
                inventory["raw_inventory"].append({
                    "name": vm.name,
                    "type": vm.hardware_profile.vm_size if vm.hardware_profile else "Azure VM",
                    "category": "compute",
                    "region": vm.location
                })

            # 2. Discover Azure VNets
            network_client = NetworkManagementClient(credential, subscription_id)
            for vnet in network_client.virtual_networks.list_all():
                inventory["network"] += 1
                inventory["raw_inventory"].append({
                    "name": vnet.name,
                    "type": "VNet",
                    "category": "network",
                    "region": vnet.location
                })

            return {"success": True, "inventory": inventory}

        except Exception as e:
            return {"success": False, "error": f"Azure API Error: {str(e)}"}
