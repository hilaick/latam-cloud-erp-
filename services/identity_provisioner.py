import os
import json
import logging
import requests
from datetime import datetime
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdkcore.signer.signer import Signer
from huaweicloudsdkcore.signer.signer import SdkRequest

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
            
            # 2. Construct the STS Payload for token method
            payload = {
                "auth": {
                    "identity": {
                        "methods": ["token"],
                        "token": {
                            "duration-seconds": duration_seconds
                        }
                    },
                    "scope": {
                        "domain": {
                            "name": "myhuaweicloud.com"
                        }
                    }
                }
            }
            
            # 3. If an Enterprise Project ID is provided, add policy restriction
            if eps_id and str(eps_id).strip() != "":
                policy = {
                    "Version": "1.1",
                    "Statement": [
                        {
                            "Action": ["*"],
                            "Effect": "Allow",
                            "Condition": {
                                "StringEquals": {
                                    "hws:EnterpriseProject": [eps_id]
                                }
                            }
                        }
                    ]
                }
                payload["auth"]["policy"] = policy
            payload_json = json.dumps(payload)

            # 4. Cryptographically Sign the Request using the Master AK/SK
            credentials = BasicCredentials(ak=ak, sk=sk)
            signer = Signer(credentials)
            
            # Parse the URL to get host and resource_path
            from urllib.parse import urlparse
            parsed_url = urlparse(url)
            host = parsed_url.netloc
            resource_path = parsed_url.path
            
            request = SdkRequest(
                method="POST", 
                host=host,
                resource_path=resource_path,
                query_params=[],  # Empty list for no query parameters
                header_params={"Content-Type": "application/json"}, 
                body=payload_json
            )
            signer.sign(request)

            # 5. Execute the Call to Huawei
            logger.info(f"Making STS request to Huawei IAM with AK prefix: {ak[:10]}...")
            logger.info(f"Request URL: {url}")
            logger.info(f"Request Headers: {dict(request.header_params)}")
            logger.info(f"Request Body: {payload_json[:200]}...")
            
            response = requests.post(
                url,  # Use the original URL, not request.url
                headers=request.header_params,
                data=request.body,
                timeout=15
            )

            logger.info(f"Huawei STS Response Status: {response.status_code}")
            logger.info(f"Huawei STS Response Headers: {dict(response.headers)}")
            logger.info(f"Huawei STS Response Text: {response.text[:500]}")
            
            if response.status_code in [200, 201]:
                try:
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
                except Exception as e:
                    logger.error(f"Failed to parse JSON response: {e}")
                    return {
                        "success": False,
                        "error": f"Failed to parse Huawei API response: {str(e)}"
                    }
            else:
                logger.error(f"STS Request Failed: {response.status_code} - {response.text}")
                return {
                    "success": False, 
                    "error": f"Huawei API Error {response.status_code}: {response.text}"
                }

        except Exception as e:
            logger.error(f"Identity Provisioner Error: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}
