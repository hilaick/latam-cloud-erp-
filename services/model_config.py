"""
ERP Migration Factory — Model Configuration Store
Manages AI provider API keys, model preferences, and loadbalancer rules
for the Agentic Orchestration Engine.

Stores encrypted credentials in the Flask app instance folder.
Never logs or exposes raw API keys in responses.
"""
import json
import os
import base64
import hashlib
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, List
from datetime import datetime
from cryptography.fernet import Fernet

# ---------------------------------------------------------------------------
# Provider registry — known AI providers the ERP orchestrator can use
# ---------------------------------------------------------------------------
PROVIDER_REGISTRY = {
    "deepseek": {
        "name": "DeepSeek",
        "models": ["deepseek-v4-pro", "deepseek-v3", "deepseek-coder"],
        "auth_type": "api_key",
        "env_var": "DEEPSEEK_API_KEY",
        "endpoint": "https://api.deepseek.com/v1",
    },
    "zai": {
        "name": "GLM / Z.AI",
        "models": ["glm-5.2", "glm-4.5", "glm-4-flash"],
        "auth_type": "api_key",
        "env_var": "GLM_API_KEY",
        "endpoint": "https://open.bigmodel.cn/api/paas/v4",
    },
    "kimi": {
        "name": "Kimi / Moonshot",
        "models": ["kimi-coding", "moonshot-v1-8k", "moonshot-v1-32k"],
        "auth_type": "api_key",
        "env_var": "KIMI_API_KEY",
        "endpoint": "https://api.moonshot.cn/v1",
    },
    "openai": {
        "name": "OpenAI",
        "models": ["gpt-4o", "gpt-4o-mini"],
        "auth_type": "api_key",
        "env_var": "OPENAI_API_KEY",
        "endpoint": "https://api.openai.com/v1",
    },
}

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ProviderConfig:
    """One AI provider's credentials and preferences."""
    provider: str
    enabled: bool = True
    api_key_set: bool = False        # True if key exists (never expose value)
    api_key_masked: str = ""         # e.g. "sk-****a1b2"
    preferred_model: str = ""
    weight: int = 1                  # Loadbalancer weight (higher = more traffic)
    max_concurrency: int = 3
    timeout_seconds: int = 30
    retry_count: int = 2

@dataclass
class LoadbalancerConfig:
    """Rules for distributing work across providers."""
    strategy: str = "priority"       # priority | round_robin | weighted | failover
    fallback_order: List[str] = field(default_factory=list)  # ["deepseek", "zai", "kimi"]
    health_check_interval: int = 60  # seconds
    circuit_breaker_threshold: int = 5  # consecutive failures before disabling

@dataclass
class ModelConfig:
    """Complete model configuration for the ERP orchestrator."""
    providers: Dict[str, ProviderConfig] = field(default_factory=dict)
    loadbalancer: LoadbalancerConfig = field(default_factory=LoadbalancerConfig)
    primary_model: str = ""          # e.g. "deepseek-v4-pro"
    primary_provider: str = ""       # e.g. "deepseek"
    delegation_model: str = ""       # model for sub-agent tasks
    delegation_provider: str = ""
    last_updated: str = ""
    version: int = 1

# ---------------------------------------------------------------------------
# Config Store
# ---------------------------------------------------------------------------

class ModelConfigStore:
    """
    Persists model configuration + encrypted API keys on disk.
    Singleton — one instance per Flask process.
    """
    _instance = None

    def __new__(cls, app=None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, app=None):
        if self._initialized:
            return
        self._initialized = True
        self._app = app
        self._config_path = None
        self._fernet = None
        self._config: ModelConfig = ModelConfig()
        self._raw_keys: Dict[str, str] = {}  # provider → raw key (in-memory only)

        if app:
            self.init_app(app)

    def init_app(self, app):
        """Bind to Flask app — called from app factory."""
        self._app = app
        instance_dir = app.instance_path
        os.makedirs(instance_dir, exist_ok=True)
        self._config_path = os.path.join(instance_dir, "model_config.enc.json")

        # Derive encryption key from app secret + machine fingerprint
        secret = app.config.get("SECRET_KEY", "erp-migration-factory")
        machine_id = os.environ.get("COMPUTERNAME", os.environ.get("HOSTNAME", "unknown"))
        key_material = f"{secret}:{machine_id}:erp-orchestrator"
        # SHA256 → 32 bytes → base64 url-safe = 44 chars (valid Fernet key)
        key_bytes = hashlib.sha256(key_material.encode()).digest()
        self._fernet = Fernet(base64.urlsafe_b64encode(key_bytes))

        self._load()
        self._load_keys_from_env()

    def _load_keys_from_env(self):
        """Pull API keys from environment variables as fallback."""
        for provider_id, info in PROVIDER_REGISTRY.items():
            env_val = os.environ.get(info["env_var"], "")
            if env_val and provider_id not in self._raw_keys:
                self._raw_keys[provider_id] = env_val
                if provider_id not in self._config.providers:
                    self._config.providers[provider_id] = ProviderConfig(
                        provider=provider_id,
                        api_key_set=True,
                        api_key_masked=self._mask_key(env_val),
                        preferred_model=info["models"][0],
                    )
                else:
                    self._config.providers[provider_id].api_key_set = True
                    self._config.providers[provider_id].api_key_masked = self._mask_key(env_val)

    def _load(self):
        """Load config from disk, decrypt keys."""
        if not self._config_path or not os.path.exists(self._config_path):
            self._init_defaults()
            return
        try:
            with open(self._config_path, "r") as fh:
                raw = json.load(fh)
            # Decrypt keys
            for provider_id, pdata in raw.get("providers", {}).items():
                if pdata.get("_encrypted_key"):
                    try:
                        decrypted = self._fernet.decrypt(pdata["_encrypted_key"].encode()).decode()
                        self._raw_keys[provider_id] = decrypted
                        pdata["api_key_set"] = True
                        pdata["api_key_masked"] = self._mask_key(decrypted)
                    except Exception:
                        pdata["api_key_set"] = False
                        pdata["api_key_masked"] = ""
                    del pdata["_encrypted_key"]

            self._config = ModelConfig(
                providers={
                    pid: ProviderConfig(**pdata)
                    for pid, pdata in raw.get("providers", {}).items()
                },
                loadbalancer=LoadbalancerConfig(**raw.get("loadbalancer", {})),
                primary_model=raw.get("primary_model", ""),
                primary_provider=raw.get("primary_provider", ""),
                delegation_model=raw.get("delegation_model", ""),
                delegation_provider=raw.get("delegation_provider", ""),
                last_updated=raw.get("last_updated", ""),
                version=raw.get("version", 1),
            )
        except Exception as e:
            print(f"[ModelConfigStore] Load error: {e}, using defaults")
            self._init_defaults()

    def _init_defaults(self):
        """Seed with defaults for all registered providers."""
        for pid, info in PROVIDER_REGISTRY.items():
            self._config.providers[pid] = ProviderConfig(
                provider=pid,
                preferred_model=info["models"][0],
            )
        self._config.loadbalancer.fallback_order = ["deepseek", "zai", "kimi"]
        self._config.primary_model = "deepseek-v4-pro"
        self._config.primary_provider = "deepseek"

    def save(self):
        """Persist config to disk (keys encrypted)."""
        if not self._config_path:
            return
        data = {
            "providers": {},
            "loadbalancer": asdict(self._config.loadbalancer),
            "primary_model": self._config.primary_model,
            "primary_provider": self._config.primary_provider,
            "delegation_model": self._config.delegation_model,
            "delegation_provider": self._config.delegation_provider,
            "last_updated": datetime.utcnow().isoformat(),
            "version": self._config.version + 1,
        }
        for pid, pcfg in self._config.providers.items():
            pdata = asdict(pcfg)
            # Never persist raw key — encrypt it
            if pid in self._raw_keys and self._raw_keys[pid]:
                pdata["_encrypted_key"] = self._fernet.encrypt(
                    self._raw_keys[pid].encode()
                ).decode()
            pdata.pop("api_key_set", None)
            pdata.pop("api_key_masked", None)
            data["providers"][pid] = pdata

        with open(self._config_path, "w") as fh:
            json.dump(data, fh, indent=2)

    def set_api_key(self, provider: str, key: str):
        """Store API key for a provider."""
        if provider not in PROVIDER_REGISTRY:
            raise ValueError(f"Unknown provider: {provider}")
        self._raw_keys[provider] = key
        if provider not in self._config.providers:
            self._config.providers[provider] = ProviderConfig(
                provider=provider,
                preferred_model=PROVIDER_REGISTRY[provider]["models"][0],
            )
        self._config.providers[provider].api_key_set = True
        self._config.providers[provider].api_key_masked = self._mask_key(key)
        self.save()

    def get_api_key(self, provider: str) -> Optional[str]:
        """Get raw API key (for internal use — never exposed via API)."""
        return self._raw_keys.get(provider)

    def set_primary_model(self, model: str, provider: str):
        self._config.primary_model = model
        self._config.primary_provider = provider
        self.save()

    def set_delegation_model(self, model: str, provider: str):
        self._config.delegation_model = model
        self._config.delegation_provider = provider
        self.save()

    def set_fallback_order(self, order: List[str]):
        self._config.loadbalancer.fallback_order = order
        self.save()

    def set_provider_config(self, provider: str, **kwargs):
        if provider not in self._config.providers:
            raise ValueError(f"Unknown provider: {provider}")
        pcfg = self._config.providers[provider]
        for key, val in kwargs.items():
            if hasattr(pcfg, key):
                setattr(pcfg, key, val)
        self.save()

    def get_public_config(self) -> dict:
        """Return config safe for API exposure (keys masked)."""
        providers = {}
        for pid, pcfg in self._config.providers.items():
            pdata = asdict(pcfg)
            pdata["api_key_set"] = pcfg.api_key_set
            pdata["api_key_masked"] = pcfg.api_key_masked
            pdata["available_models"] = PROVIDER_REGISTRY.get(pid, {}).get("models", [])
            pdata["provider_name"] = PROVIDER_REGISTRY.get(pid, {}).get("name", pid)
            providers[pid] = pdata

        return {
            "providers": providers,
            "loadbalancer": asdict(self._config.loadbalancer),
            "primary_model": self._config.primary_model,
            "primary_provider": self._config.primary_provider,
            "delegation_model": self._config.delegation_model,
            "delegation_provider": self._config.delegation_provider,
            "last_updated": self._config.last_updated,
            "version": self._config.version,
        }

    @staticmethod
    def _mask_key(key: str) -> str:
        if not key or len(key) < 8:
            return "****" if key else ""
        return key[:4] + "****" + key[-4:]

    def has_any_key(self) -> bool:
        """Check if at least one provider has a key configured."""
        return any(self._raw_keys.get(p) for p in PROVIDER_REGISTRY)

    def get_ready_providers(self) -> List[str]:
        """List providers that have API keys and are enabled."""
        return [
            pid for pid, pcfg in self._config.providers.items()
            if pcfg.enabled and pid in self._raw_keys and self._raw_keys[pid]
        ]
