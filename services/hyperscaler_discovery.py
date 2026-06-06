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
                        inventory["raw_inventory"].append({"name": inst.get('InstanceId'), "type": inst.get('InstanceType'), "category": "compute"})

            # 2. Discover RDS Databases
            rds = session.client('rds')
            dbs = rds.describe_db_instances()
            for db in dbs.get('DBInstances', []):
                inventory["databases"] += 1
                inventory["raw_inventory"].append({"name": db.get('DBInstanceIdentifier'), "type": db.get('Engine'), "category": "database"})

            # 3. Discover WAF & Security
            waf = session.client('wafv2')
            web_acls = waf.list_web_acls(Scope='REGIONAL')
            for acl in web_acls.get('WebACLs', []):
                inventory["security"] += 1
                inventory["raw_inventory"].append({"name": acl.get('Name'), "type": "WAF", "category": "security"})

            return {"success": True, "inventory": inventory}

        except Exception as e:
            return {"success": False, "error": str(e)}
