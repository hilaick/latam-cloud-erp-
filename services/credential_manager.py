"""
Secure credential management for Huawei Cloud accounts
Uses AES-256-GCM encryption with per-user keys
"""
import base64
import os
import json
from datetime import datetime
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.exceptions import InvalidTag
import logging

logger = logging.getLogger(__name__)

class CredentialManager:
    """Secure encryption/decryption of Huawei Cloud credentials"""
    
    def __init__(self, master_password: str):
        """
        Initialize with master password (derived from user session)
        In production, this would come from user authentication
        """
        self.master_password = master_password
    
    def derive_key(self, salt: bytes) -> bytes:
        """Derive encryption key from master password"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,  # 256-bit key for AES-256
            salt=salt,
            iterations=100000
        )
        return kdf.derive(self.master_password.encode())
    
    def encrypt_credentials(self, ak: str, sk: str) -> dict:
        """Encrypt AK/SK credentials"""
        try:
            # Generate random salt and nonce
            salt = os.urandom(16)
            nonce = os.urandom(12)  # 96-bit nonce for GCM
            
            # Derive key from master password
            key = self.derive_key(salt)
            
            # Initialize AES-GCM
            aesgcm = AESGCM(key)
            
            # Encrypt credentials
            encrypted_ak = aesgcm.encrypt(nonce, ak.encode(), None)
            encrypted_sk = aesgcm.encrypt(nonce, sk.encode(), None)
            
            return {
                'encrypted_ak': base64.b64encode(encrypted_ak).decode(),
                'encrypted_sk': base64.b64encode(encrypted_sk).decode(),
                'salt': base64.b64encode(salt).decode(),
                'nonce': base64.b64encode(nonce).decode(),
                'algorithm': 'AES-256-GCM',
                'key_derivation': 'PBKDF2-SHA256-100000'
            }
        except Exception as e:
            logger.error(f"Failed to encrypt credentials: {str(e)}")
            raise
    
    def decrypt_credentials(self, encrypted_data: dict) -> tuple[str, str]:
        """Decrypt AK/SK credentials"""
        try:
            # Decode base64 fields
            salt = base64.b64decode(encrypted_data['salt'])
            nonce = base64.b64decode(encrypted_data['nonce'])
            encrypted_ak = base64.b64decode(encrypted_data['encrypted_ak'])
            encrypted_sk = base64.b64decode(encrypted_data['encrypted_sk'])
            
            # Derive key from master password
            key = self.derive_key(salt)
            
            # Initialize AES-GCM
            aesgcm = AESGCM(key)
            
            # Decrypt credentials
            ak = aesgcm.decrypt(nonce, encrypted_ak, None).decode()
            sk = aesgcm.decrypt(nonce, encrypted_sk, None).decode()
            
            return ak, sk
        except InvalidTag:
            logger.error("Invalid authentication tag - possible tampering or wrong password")
            raise ValueError("Decryption failed - invalid credentials or tampered data")
        except Exception as e:
            logger.error(f"Failed to decrypt credentials: {str(e)}")
            raise
    
    def validate_credentials(self, ak: str, sk: str) -> bool:
        """Validate Huawei Cloud credentials by making a test API call"""
        try:
            from huaweicloudsdkcore.auth.credentials import BasicCredentials
            from huaweicloudsdkcore.exceptions import exceptions
            
            # Test with Singapore SMS endpoint (smallest footprint)
            credentials = BasicCredentials(ak, sk)
            
            # Try to create a client - will fail fast if credentials are invalid
            from huaweicloudsdksms.v3.region.sms_region import SmsRegion
            from huaweicloudsdksms.v3 import SmsClient
            
            client = SmsClient.new_builder() \
                .with_credentials(credentials) \
                .with_region(SmsRegion.value_of('ap-southeast-3')) \
                .build()
            
            # Make a simple API call to validate
            from huaweicloudsdksms.v3 import ListServersRequest
            request = ListServersRequest()
            request.limit = 1  # Minimal request
            
            # This will raise an exception if credentials are invalid
            response = client.list_servers(request)
            return True
            
        except exceptions.ClientRequestException as e:
            if e.status_code == 401:
                logger.warning(f"Invalid Huawei Cloud credentials: {e.error_msg}")
                return False
            # Other API errors might mean credentials are valid but something else failed
            logger.info(f"Credentials valid but API error: {e.error_msg}")
            return True
        except Exception as e:
            logger.error(f"Error validating credentials: {str(e)}")
            return False

# Singleton instance (would be initialized with user session)
_credential_manager = None

def get_credential_manager(master_password: str = None):
    """Get or create credential manager instance"""
    global _credential_manager
    if _credential_manager is None and master_password:
        _credential_manager = CredentialManager(master_password)
    return _credential_manager