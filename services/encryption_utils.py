#!/usr/bin/env python3
"""
Encryption utilities for secure API key storage in ERP database.
Uses Fernet symmetric encryption from cryptography library.
"""

import os
import json
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from typing import List, Dict, Any, Optional

class EncryptionManager:
    """Manages encryption/decryption of API keys for AI configurations"""
    
    def __init__(self, master_password: Optional[str] = None):
        """
        Initialize encryption manager.
        
        Args:
            master_password: Optional master password for encryption.
                           If not provided, uses environment variable ENCRYPTION_KEY
                           or generates a new key.
        """
        self.master_password = master_password or os.environ.get('ENCRYPTION_KEY')
        if not self.master_password:
            raise ValueError("ENCRYPTION_KEY environment variable is missing. A persistent key is required to prevent decryption failures on application restart.")
        
        # Derive a Fernet key from the master password
        self.fernet_key = self._derive_key(self.master_password.encode())
        self.cipher = Fernet(self.fernet_key)
    
    def _derive_key(self, password: bytes, salt: bytes = None) -> bytes:
        """Derive a Fernet key from a password using PBKDF2"""
        if salt is None:
            # Use a fixed salt for deterministic key derivation
            salt = b'erp_ai_config_salt_2026'
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return key
    
    def encrypt_api_keys(self, api_keys: List[str]) -> str:
        """
        Encrypt a list of API keys.
        
        Args:
            api_keys: List of API key strings
            
        Returns:
            Encrypted JSON string
        """
        if not api_keys:
            return ""
        
        # Convert to JSON
        keys_json = json.dumps(api_keys)
        
        # Encrypt
        encrypted_data = self.cipher.encrypt(keys_json.encode())
        
        # Return as base64 string for database storage
        return base64.b64encode(encrypted_data).decode()
    
    def decrypt_api_keys(self, encrypted_keys: str) -> List[str]:
        """
        Decrypt API keys from encrypted string.
        
        Args:
            encrypted_keys: Base64 encoded encrypted JSON string
            
        Returns:
            List of API key strings
        """
        if not encrypted_keys:
            return []
        
        try:
            # Decode from base64
            encrypted_data = base64.b64decode(encrypted_keys.encode())
            
            # Decrypt
            decrypted_json = self.cipher.decrypt(encrypted_data).decode()
            
            # Parse JSON
            return json.loads(decrypted_json)
        except Exception as e:
            print(f"Error decrypting API keys: {e}")
            return []
    
    def encrypt_single_key(self, api_key: str) -> str:
        """
        Encrypt a single API key.
        
        Args:
            api_key: API key string
            
        Returns:
            Encrypted string
        """
        encrypted_data = self.cipher.encrypt(api_key.encode())
        return base64.b64encode(encrypted_data).decode()
    
    def decrypt_single_key(self, encrypted_key: str) -> str:
        """
        Decrypt a single API key.
        
        Args:
            encrypted_key: Base64 encoded encrypted string
            
        Returns:
            Decrypted API key
        """
        try:
            encrypted_data = base64.b64decode(encrypted_key.encode())
            return self.cipher.decrypt(encrypted_data).decode()
        except Exception as e:
            print(f"Error decrypting API key: {e}")
            return ""
    
    def mask_api_key(self, api_key: str, visible_chars: int = 8) -> str:
        """
        Mask an API key for display (shows first N chars only).
        
        Args:
            api_key: The API key to mask
            visible_chars: Number of characters to show at beginning
            
        Returns:
            Masked key (e.g., "sk-abc...xyz")
        """
        if not api_key:
            return ""
        
        if len(api_key) <= visible_chars * 2:
            # Too short to mask meaningfully
            return api_key[:visible_chars] + "..."
        
        return api_key[:visible_chars] + "..." + api_key[-visible_chars:]
    
    def mask_keys_list(self, api_keys: List[str], visible_chars: int = 8) -> List[str]:
        """
        Mask a list of API keys for display.
        
        Args:
            api_keys: List of API keys
            visible_chars: Number of characters to show at beginning
            
        Returns:
            List of masked keys
        """
        return [self.mask_api_key(key, visible_chars) for key in api_keys if key]

# Singleton instance for easy import
_encryption_manager = None

def get_encryption_manager() -> EncryptionManager:
    """Get or create the singleton encryption manager instance."""
    global _encryption_manager
    if _encryption_manager is None:
        _encryption_manager = EncryptionManager()
    return _encryption_manager

def encrypt_keys(api_keys: List[str]) -> str:
    """Convenience function to encrypt API keys."""
    return get_encryption_manager().encrypt_api_keys(api_keys)

def decrypt_keys(encrypted_keys: str) -> List[str]:
    """Convenience function to decrypt API keys."""
    return get_encryption_manager().decrypt_api_keys(encrypted_keys)

def mask_key(api_key: str, visible_chars: int = 8) -> str:
    """Convenience function to mask an API key."""
    return get_encryption_manager().mask_api_key(api_key, visible_chars)

if __name__ == '__main__':
    # Test the encryption
    os.environ['ENCRYPTION_KEY'] = "test_master_password_123"
    manager = EncryptionManager()
    
    # Test data
    test_keys = [
        "sk-abc123def456ghi789",
        "hf_xyz789abc123def456",
        "Bearer token1234567890"
    ]
    
    print("Testing encryption/decryption...")
    print(f"Original keys: {test_keys}")
    
    # Encrypt
    encrypted = manager.encrypt_api_keys(test_keys)
    print(f"Encrypted: {encrypted[:50]}...")
    
    # Decrypt
    decrypted = manager.decrypt_api_keys(encrypted)
    print(f"Decrypted: {decrypted}")
    
    # Mask
    masked = manager.mask_keys_list(test_keys, 6)
    print(f"Masked: {masked}")
    
    # Test single key encryption
    single_key = "sk-specialKey123"
    encrypted_single = manager.encrypt_single_key(single_key)
    decrypted_single = manager.decrypt_single_key(encrypted_single)
    print(f"Single key test: {single_key} -> {encrypted_single[:30]}... -> {decrypted_single}")
    
    if test_keys == decrypted and single_key == decrypted_single:
        print("✅ All tests passed!")
    else:
        print("❌ Tests failed!")
