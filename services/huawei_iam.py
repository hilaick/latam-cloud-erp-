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

        Uses the hcloud CLI with per-customer --cli-access-key/--cli-secret-key
        flags. NOTE: hcloud CLI IGNORES HW_ACCESS_KEY/HW_SECRET_KEY env vars —
        the flags are the only reliable per-account binding.

        Verified live 2026-09-14: BSS `account-mgr/info` returns APIGW.0101 on
        bss-intl / bss / no-domain variants for LATAM accounts (same 404 the
        FinOps service already documented). The RELIABLE real-name proof is
        Enterprise Project listing: Huawei Cloud requires real-name authentication
        to create/use EPS. An account that lists enterprise projects (or created
        any EP) is real-name verified. We combine:
          1. IAM KeystoneListRegions          → credential liveness (was already the
                                               working ping() pattern)
          2. EPS ListEnterpriseProject        → real-name proof + returns the actual
                                               EPs for the gateway's EP selection step
                                               (EPS is a global service: --cli-region
                                               MUST be cn-north-4 / ru-moscow-1 /
                                               my-kualalumpur-1 — la-north-2 is
                                               rejected with [USE_ERROR])

        Returns:
            dict: {verified: bool, name: str, type: str|None, eps: [..], error: str|None}
        """
        import subprocess as sp
        import json as _json
        try:
            auth_flags = ['--cli-access-key=' + str(self.ak).strip(),
                          '--cli-secret-key=' + str(self.sk or '').strip()]

            # 1) IAM liveness
            r = sp.run(['hcloud', 'IAM', 'KeystoneListRegions', '--cli-region=' + self.region] + auth_flags,
                       capture_output=True, text=True, timeout=40)
            combined = (r.stdout or '') + (r.stderr or '')
            if r.returncode != 0 or '[USE_ERROR]' in combined or '[CLI_ERROR]' in combined or 'Unauthorized' in combined:
                raise Exception(f"IAM liveness failed: {combined[:200]}")

            # 2) EPS listing = real-name proof + EP inventory for selection.
            #    EPS global endpoint region (supported set from CLI error message).
            eps_region = 'cn-north-4'
            r2 = sp.run(['hcloud', 'EPS', 'ListEnterpriseProject', '--cli-region=' + eps_region] + auth_flags,
                        capture_output=True, text=True, timeout=40)
            combined2 = (r2.stdout or '') + (r2.stderr or '')
            eps = []
            if r2.returncode == 0 and '[USE_ERROR]' not in combined2 and 'Unauthorized' not in combined2:
                try:
                    idx = r2.stdout.find('{')
                    parsed = _json.JSONDecoder().raw_decode(r2.stdout[idx:])[0] if idx >= 0 else {}
                    eps = [{'id': e.get('id'), 'name': e.get('name'), 'type': e.get('type'), 'status': e.get('status')}
                           for e in (parsed.get('enterprise_projects') or [])]
                    # "default" (id=0) is auto-created; it proves real-name and is selectable.
                    # Accounts with NON-default EPs have more separation options.
                except Exception:
                    eps = []
                # Account that can list EPS is real-name verified (Huawei policy).
                # "default" EP (id=0) is auto-created; non-default EPs prove usage.
                has_custom_ep = any(e.get('id') for e in eps)
                return {
                    'verified': True,
                    'name': f"account ({len(eps)} enterprise project(s))",
                    'type': 'enterprise' if has_custom_ep else 'individual',
                    'eps': eps,
                    'raw': {'eps_count': len(eps), 'region_used_for_eps': eps_region},
                }
            else:
                # EPS rejected (no real-name / no EPS permission) — but IAM works.
                return {'verified': False, 'name': None, 'type': None, 'eps': [],
                        'error': f"EPS listing failed (real-name unverified or no EPS permission): {combined2[:150]}"}
        except Exception as e:
            # Honest failure — never claim verified without proof
            return {'verified': False, 'name': None, 'type': None, 'eps': [], 'error': str(e)[:200]}
