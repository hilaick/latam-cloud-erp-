#!/usr/bin/env python3
"""
Credential Manager for Huawei Cloud accounts
Uses AES-256-GCM encryption with per-user keys
"""
import base64
import os
import json
from datetime import datetime
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
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
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            salt=salt,
            iterations=100000,
            length=32
        )
        return kdf.derive(self.master_password.encode())
    
    def encrypt(self, plaintext: str) -> dict:
        """Encrypt credential value"""
        salt = os.urandom(16)
        key = self.derive_key(salt)
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
        return {
            "salt": base64.b64encode(salt).decode(),
            "nonce": base64.b64encode(nonce).decode(),
            "ciphertext": base64.b64encode(ciphertext).decode(),
            "timestamp": datetime.utcnow().isoformat()
        }

    def decrypt(self, encrypted_data: dict) -> str:
        """Decrypt credential value"""
        salt = base64.b64decode(encrypted_data["salt"])
        nonce = base64.b64decode(encrypted_data["nonce"])
        ciphertext = base64.b64decode(encrypted_data["ciphertext"])
        key = self.derive_key(salt)
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, None).decode()
