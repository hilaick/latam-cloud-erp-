"""
ERP Migration Factory — Loadbalancer Key Store
Manages the 6 Huawei ModelArts API keys used by HuaweiLoadBalancer.
Stores keys encrypted on disk. Integrates with ModelConfigStore infra.
"""
import json
import os
import base64
import hashlib
from typing import Optional, Dict, List
from cryptography.fernet import Fernet


class LoadbalancerKeyStore:
    """
    Encrypted storage for the 6 API keys used to rotate Huawei ModelArts requests.
    Keys can be seeded from environment (API_KEY_1..6) or set via API/UI.
    Never exposes raw keys — returns masked versions for public endpoints.
    """
    MAX_SLOTS = 6
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._fernet = None
        self._store_path = None
        self._raw_keys: Dict[int, str] = {}   # slot(1-6) → raw key
        self._labels: Dict[int, str] = {}     # slot → user label

    def init_app(self, app):
        instance_dir = app.instance_path
        os.makedirs(instance_dir, exist_ok=True)
        self._store_path = os.path.join(instance_dir, "lb_keys.enc.json")

        # Derive same encryption key as ModelConfigStore
        secret = app.config.get("SECRET_KEY", "erp-migration-factory")
        machine_id = os.environ.get("COMPUTERNAME", os.environ.get("HOSTNAME", "unknown"))
        key_material = f"{secret}:{machine_id}:lb-keys"
        key_bytes = hashlib.sha256(key_material.encode()).digest()
        self._fernet = Fernet(base64.urlsafe_b64encode(key_bytes))

        self._load()
        self._load_from_env()

    def _load(self):
        if not self._store_path or not os.path.exists(self._store_path):
            return
        try:
            with open(self._store_path, "r") as fh:
                data = json.load(fh)
            for slot_str, entry in data.get("slots", {}).items():
                slot = int(slot_str)
                enc = entry.get("_encrypted_key", "")
                if enc:
                    try:
                        self._raw_keys[slot] = self._fernet.decrypt(enc.encode()).decode()
                    except Exception:
                        pass
                self._labels[slot] = entry.get("label", "")
        except Exception as e:
            print(f"[LBKeyStore] Load error: {e}")

    def _load_from_env(self):
        for slot in range(1, self.MAX_SLOTS + 1):
            env_key = os.environ.get(f"API_KEY_{slot}", "")
            if env_key and slot not in self._raw_keys:
                self._raw_keys[slot] = env_key
            env_label = os.environ.get(f"API_KEY_{slot}_LABEL", "")
            if env_label:
                self._labels[slot] = env_label

    def save(self):
        if not self._store_path:
            return
        data = {"slots": {}}
        for slot in range(1, self.MAX_SLOTS + 1):
            entry = {"label": self._labels.get(slot, "")}
            if slot in self._raw_keys and self._raw_keys[slot]:
                entry["_encrypted_key"] = self._fernet.encrypt(
                    self._raw_keys[slot].encode()
                ).decode()
            data["slots"][str(slot)] = entry
        with open(self._store_path, "w") as fh:
            json.dump(data, fh, indent=2)

    def set_key(self, slot: int, key: str, label: str = ""):
        if not 1 <= slot <= self.MAX_SLOTS:
            raise ValueError(f"Slot must be 1-{self.MAX_SLOTS}")
        self._raw_keys[slot] = key
        if label:
            self._labels[slot] = label
        self.save()

    def delete_key(self, slot: int):
        self._raw_keys.pop(slot, None)
        self.save()

    def get_key(self, slot: int) -> Optional[str]:
        return self._raw_keys.get(slot)

    def get_all_keys(self) -> List[str]:
        """Return all raw keys (for HuaweiLoadBalancer init)."""
        keys = []
        for slot in range(1, self.MAX_SLOTS + 1):
            k = self._raw_keys.get(slot, "")
            if k:
                keys.append(k)
        return keys

    def get_public_slots(self) -> List[dict]:
        """Return masked view for API/UI."""
        slots = []
        for slot in range(1, self.MAX_SLOTS + 1):
            raw = self._raw_keys.get(slot, "")
            slots.append({
                "slot": slot,
                "label": self._labels.get(slot, ""),
                "api_key_set": bool(raw),
                "api_key_masked": self._mask_key(raw) if raw else "",
            })
        return slots

    @staticmethod
    def _mask_key(key: str) -> str:
        if not key or len(key) < 8:
            return "****" if key else ""
        return key[:6] + "****" + key[-4:]

    def sync_to_loadbalancer(self, lb):
        """Push stored keys into a HuaweiLoadBalancer instance."""
        keys = self.get_all_keys()
        if keys:
            lb.keys = keys
            lb.key_usage = {k: 0 for k in keys}
            lb.key_errors = {k: 0 for k in keys}
