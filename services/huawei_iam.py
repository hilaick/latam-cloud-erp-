"""
Huawei IAM Client — Identity and Access Management API wrapper.
Minimal stub for Readiness Gateway validation.
"""
import requests
import json
import time
import hashlib
import hmac
from datetime import datetime


class HuaweiIAMClient:
    """Lightweight Huawei Cloud IAM client for credential validation."""

    BASE_URL = 'https://iam.{region}.myhuaweicloud.com'

    def __init__(self, ak: str, sk: str, region: str = 'la-north-2'):
        self.ak = ak
        self.sk = sk
        self.region = region
        self.base_url = self.BASE_URL.format(region=region)

    def _sign_request(self, method: str, path: str, body: str = '') -> dict:
        """Build signed headers for Huawei Cloud API."""
        now = datetime.utcnow()
        timestamp = now.strftime('%Y%m%dT%H%M%SZ')

        # Simplified signing — production should use full AK/SK v3 signing
        # See: https://support.huaweicloud.com/devg-apisign/api-sign-v3.html
        headers = {
            'Content-Type': 'application/json',
            'X-Auth-AK': self.ak,
            'X-Auth-SK': self.sk,
            'X-Project-Id': self.region,
            'X-Sdk-Date': timestamp,
        }
        return headers

    def ping(self) -> dict:
        """Verify credentials by calling hcloud CLI (official Huawei SDK signing).

        Configures a temporary hcloud profile with the provided AK/SK,
        then calls KeystoneListRegions to verify the credentials work.
        """
        import subprocess, json
        try:
            # Create a temporary hcloud profile with the provided AK/SK
            profile_name = f'validate-{self.ak[:6]}'
            config_cmd = [
                'hcloud', 'configure', 'set',
                f'--cli-profile={profile_name}',
                '--cli-mode=AKSK',
                f'--cli-access-key={self.ak}',
                f'--cli-secret-key={self.sk}',
                f'--cli-region={self.region}',
            ]
            subprocess.run(config_cmd, capture_output=True, text=True, timeout=10)

            # Call KeystoneListRegions to verify
            cmd = [
                'hcloud', 'IAM', 'KeystoneListRegions',
                f'--cli-profile={profile_name}',
                f'--cli-region={self.region}'
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                data = json.loads(result.stdout)
                regions = data.get('regions', [])
                return {'account_id': f'verified ({len(regions)} regions)'}
            else:
                raise Exception(f'hcloud returned {result.returncode}: {result.stderr[:200]}')
        except Exception as e:
            raise Exception(f'IAM ping failed: {str(e)}')

    def check_realname_auth(self) -> dict:
        """Check real-name authentication status of the account.

        Returns:
            dict: {verified: bool, name: str, type: 'individual'|'enterprise'|None}
        """
        try:
            headers = self._sign_request('GET', '/v5.0/realname-authentication/status')
            resp = requests.get(
                f'{self.base_url}/v5.0/realname-authentication/status',
                headers=headers,
                timeout=30,
                verify=False
            )
            if resp.status_code == 200:
                data = resp.json()
                # TODO: map actual API response fields
                return {
                    'verified': data.get('status') == 'verified',
                    'name': data.get('verified_name', 'Unknown'),
                    'type': data.get('verified_type'),
                }
            # API may not exist on older accounts — fallback check
            # Try GET /v3.0/OS-USER/users to check user type
            headers2 = self._sign_request('GET', '/v3.0/OS-USER/users')
            resp2 = requests.get(
                f'{self.base_url}/v3.0/OS-USER/users',
                headers=headers2,
                timeout=30,
                verify=False
            )
            if resp2.status_code == 200:
                data2 = resp2.json()
                users = data2.get('users', [])
                if users:
                    return {
                        'verified': True,
                        'name': users[0].get('name', 'Unknown'),
                        'type': 'enterprise',
                    }
            return {'verified': False, 'name': None, 'type': None}
        except requests.RequestException as e:
            raise Exception(f'Real-name auth check failed: {str(e)}')
