"""
Huawei EPS Client — Enterprise Project Service API wrapper.
Minimal stub for Readiness Gateway provisioning and validation.
"""
import requests


class HuaweiEPSClient:
    """Lightweight Huawei Cloud EPS client."""

    BASE_URL = 'https://eps.{region}.myhuaweicloud.com'

    def __init__(self, ak: str, sk: str, region: str = 'la-north-2'):
        self.ak = ak
        self.sk = sk
        self.region = region
        self.base_url = self.BASE_URL.format(region=region)

    def _headers(self) -> dict:
        """Minimal headers — full signing handled by token exchange in production."""
        return {
            'Content-Type': 'application/json',
            'X-Auth-AK': self.ak,
            'X-Auth-SK': self.sk,
        }

    def list_eps(self) -> list:
        """List enterprise projects for the account."""
        try:
            resp = requests.get(
                f'{self.base_url}/v1.0/enterprise-projects',
                headers=self._headers(),
                timeout=30,
                verify=False
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get('enterprise_projects', [])
            raise Exception(f'EPS list returned {resp.status_code}: {resp.text}')
        except requests.RequestException as e:
            raise Exception(f'EPS list failed: {str(e)}')

    def create_enterprise_project(self, name: str, description: str = '') -> dict:
        """Create a new enterprise project."""
        try:
            body = {
                'name': name,
                'description': description,
            }
            resp = requests.post(
                f'{self.base_url}/v1.0/enterprise-projects',
                headers=self._headers(),
                json=body,
                timeout=30,
                verify=False
            )
            if resp.status_code == 201 or resp.status_code == 200:
                data = resp.json()
                return data.get('enterprise_project', data)
            raise Exception(f'EPS create returned {resp.status_code}: {resp.text}')
        except requests.RequestException as e:
            raise Exception(f'EPS create failed: {str(e)}')

    def list_resources(self, eps_id: str) -> list:
        """List resources within an enterprise project."""
        try:
            resp = requests.get(
                f'{self.base_url}/v1.0/enterprise-projects/{eps_id}/resources',
                headers=self._headers(),
                timeout=30,
                verify=False
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get('resources', [])
            raise Exception(f'EPS resources returned {resp.status_code}: {resp.text}')
        except requests.RequestException as e:
            raise Exception(f'EPS resource list failed: {str(e)}')
