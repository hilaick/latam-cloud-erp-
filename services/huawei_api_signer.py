"""
Huawei Cloud API v3.0 signature signer (HMAC-SHA256).
Minimal, zero-dependency — only stdlib.
"""
import hashlib, hmac, datetime, json, logging

logger = logging.getLogger(__name__)

def _sha256_hex(s: str | bytes) -> str:
    if isinstance(s, str):
        s = s.encode('utf-8')
    return hashlib.sha256(s).hexdigest()

def _hmac_sha256_hex(key: bytes, s: str | bytes) -> str:
    if isinstance(s, str):
        s = s.encode('utf-8')
    return hmac.new(key, s, hashlib.sha256).hexdigest()

def _hmac_sha256_bytes(key: bytes, s: str | bytes) -> bytes:
    if isinstance(s, str):
        s = s.encode('utf-8')
    return hmac.new(key, s, hashlib.sha256).digest()

def sign_and_request(method: str, url: str, ak: str, sk: str,
                     body: str = '', headers: dict | None = None,
                     timeout: int = 15) -> dict:
    """
    Sign and execute a Huawei Cloud API v3 request with AK/SK.
    Returns parsed JSON response dict.
    Raises RuntimeError on HTTP error or connection failure.
    """
    import urllib.request, urllib.error, ssl

    # 1. Canonical request
    parsed = urllib.request.urlparse(url)
    host = parsed.hostname or ''
    path = parsed.path or '/'
    # Huawei requires trailing slash on URI paths (per SDK signer _process_canonical_uri)
    if not path.endswith('/'):
        path = path + '/'
    query = parsed.query

    content_type = 'application/json; charset=utf-8'
    payload_hash = _sha256_hex(body)

    method_upper = method.upper()
    now = datetime.datetime.utcnow()
    timestamp = now.strftime('%Y%m%dT%H%M%SZ')

    canonical_headers = f'host:{host}\nx-sdk-date:{timestamp}\n'
    signed_headers = 'host;x-sdk-date'
    canonical_request = f'{method_upper}\n{path}\n{query}\n{canonical_headers}\n{signed_headers}\n{payload_hash}'
    canonical_hash = _sha256_hex(canonical_request)

    # 2. String to sign (matches huaweicloudsdkcore Signer._process_string_to_sign)
    # Format: SDK-HMAC-SHA256\n{timestamp}\n{sha256(canonical_request)}
    algorithm = 'SDK-HMAC-SHA256'
    string_to_sign = f'{algorithm}\n{timestamp}\n{canonical_hash}'

    # 3. Signature — HMAC string_to_sign directly with SK (matches SDK _sign_string_to_sign)
    signature = _hmac_sha256_hex(sk.encode('utf-8'), string_to_sign)

    # 4. Authorization header (matches SDK _process_auth_header_value)
    # Format: SDK-HMAC-SHA256 Access={ak}, SignedHeaders={...}, Signature={...}
    authorization = (
        f'{algorithm} Access={ak}, '
        f'SignedHeaders={signed_headers}, '
        f'Signature={signature}'
    )

    # 5. Request
    req_headers = {
        'Host': host,
        'X-Sdk-Date': timestamp,
        'Authorization': authorization,
        'Content-Type': content_type,
    }
    if headers:
        req_headers.update(headers)

    data = body.encode('utf-8') if body else None
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method_upper)

    try:
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            raw = resp.read().decode('utf-8')
            if not raw:
                return {}
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read().decode('utf-8'))
        except Exception:
            detail = {'error': str(e)}
        raise RuntimeError(f'Huawei API {method_upper} {url} returned {e.code}: {json.dumps(detail)}')
    except Exception as e:
        raise RuntimeError(f'Huawei API request failed: {e}')


def validate_iam_key(ak: str, sk: str, timeout: int = 15) -> dict:
    """
    Validate an IAM AK/SK pair by calling IAM GetLoginProfile or
    GET /v3.0/OS-CREDENTIAL/credentials/{access_key}.

    Returns {'valid': True, 'login_id': '...'} or {'valid': False, 'error': '...'}.
    """
    # Try to call IAM credentials API to verify the key exists and is active
    url = f'https://iam.{ak.split(".")[0].upper() if "." in ak else "la-north-2"}.myhuaweicloud.com/v3.0/OS-CREDENTIAL/credentials/{ak}'
    try:
        resp = sign_and_request('GET', url, ak, sk, timeout=timeout)
        credential = resp.get('credential', {})
        status = credential.get('status', '')
        login_id = credential.get('user_id', credential.get('description', 'unknown'))
        if status.lower() == 'active':
            return {'valid': True, 'login_id': login_id}
        else:
            return {'valid': False, 'error': f'Credential status: {status}'}
    except RuntimeError as e:
        msg = str(e)
        if '404' in msg or 'not found' in msg.lower():
            return {'valid': False, 'error': 'Access key not found or invalid in IAM'}
        # Try fallback — call STS get-caller-identity style endpoint
        try:
            url2 = f'https://iam.myhuaweicloud.com/v3/auth/projects'
            resp = sign_and_request('GET', url2, ak, sk, timeout=timeout)
            # If we get here, the credential works at least partially
            return {'valid': True, 'login_id': 'verified'}
        except RuntimeError:
            return {'valid': False, 'error': str(e)}
    except Exception as e:
        return {'valid': False, 'error': str(e)}
