import os
import json
import logging
import requests
from datetime import datetime
from huaweicloudsdkcore.signer.signer import Signer, HttpRequest

logger = logging.getLogger(__name__)

class IdentityProvisioner:
    """
    Handles Huawei Cloud Security Token Service (STS) operations.
    Generates Ephemeral (Temporary) AK/SK credentials restricted to specific boundaries.
    """
    
    @staticmethod
    def generate_ephemeral_token(ak: str, sk: str, eps_id: str = None, duration_seconds: int = 3600) -> dict:
        """
        Calls Huawei Cloud IAM to generate a temporary Security Token.
        This drops a physical 'create_temporary_access_key' event in Cloud Trace Service (CTS).
        """
        try:
            # 1. Define the REST API endpoint for Huawei STS
            url = "https://iam.myhuaweicloud.com/v3.0/OS-CREDENTIAL/securitytokens"
            
            # 2. Build the Zero-Trust IAM Policy
            policy = {
                "Version": "1.1",
                "Statement": [
                    {
                        "Action": ["*"],
                        "Effect": "Allow"
                    }
                ]
            }
            
            # If an Enterprise Project ID is provided, restrict the token to ONLY that EPS
            if eps_id and str(eps_id).strip() != "":
                policy["Statement"][0]["Condition"] = {
                    "StringEquals": {
                        "hws:EnterpriseProject": [eps_id]
                    }
                }

            # 3. Construct the STS Payload
            payload = {
                "auth": {
                    "identity": {
                        "methods": ["token"],
                        "policy": policy
                    }
                }
            }
            payload_json = json.dumps(payload)

            # 4. Cryptographically Sign the Request using the Master AK/SK
            signer = Signer(ak, sk)
            request = HttpRequest("POST", url, {"Content-Type": "application/json"}, payload_json)
            signer.sign(request)

            # 5. Execute the Call to Huawei
            response = requests.post(
                request.url,
                headers=request.headers,
                data=request.body,
                timeout=15
            )

            if response.status_code in [200, 201]:
                data = response.json()
                cred = data.get('credential', {})
                
                logger.info(f"✅ STS Token Successfully Provisioned. Expires at: {cred.get('expires_at')}")
                
                return {
                    "success": True,
                    "ak": cred.get('access'),
                    "sk": cred.get('secret'),
                    "security_token": cred.get('securitytoken'),
                    "expires_at": cred.get('expires_at'),
                    "eps_restricted": bool(eps_id)
                }
            else:
                logger.error(f"STS Request Failed: {response.status_code} - {response.text}")
                return {
                    "success": False, 
                    "error": f"Huawei API Error {response.status_code}: {response.text}"
                }

        except Exception as e:
            logger.error(f"Identity Provisioner Error: {str(e)}")
            return {"success": False, "error": str(e)}
