import React, { useState, useEffect } from 'react';

/* ── Sub-component: Provider card ── */
const ProviderCard = ({ providerId, provider, onChange, onSaveKey, saving }) => {
    const [showKeyInput, setShowKeyInput] = useState(false);
    const [keyValue, setKeyValue] = useState('');
    const [message, setMessage] = useState('');

    const handleSaveKey = async () => {
        if (!keyValue.trim()) return;
        try {
            const token = sessionStorage.getItem('hermes_access_token');
            const res = await fetch('/api/model-config/api-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ provider: providerId, key: keyValue.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setMessage('✅ Saved');
                setShowKeyInput(false);
                setKeyValue('');
                onChange(providerId, { api_key_set: true, api_key_masked: data.masked || '****' });
            } else {
                setMessage('❌ ' + data.error);
            }
        } catch (e) {
            setMessage('❌ Network error');
        }
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className={`border rounded-lg p-3 transition-all ${provider.enabled ? 'bg-white shadow-sm' : 'bg-slate-50 opacity-60'}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className={`w-3 h-3 rounded-full ${provider.api_key_set ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                <span className="text-sm font-bold text-slate-700">{provider.provider_name || providerId}</span>
                <span className="text-[9px] text-slate-400 ml-auto">{providerId}</span>
            </div>

            {/* Status line */}
            <div className="text-[10px] text-slate-500 mb-2">
                {provider.api_key_set ? (
                    <span className="text-emerald-600 font-semibold">🔑 {provider.api_key_masked}</span>
                ) : (
                    <span className="text-amber-600">⚠️ No API key configured</span>
                )}
            </div>

            {/* Key input */}
            {showKeyInput ? (
                <div className="flex gap-1 mt-1">
                    <input
                        type="password"
                        value={keyValue}
                        onChange={e => setKeyValue(e.target.value)}
                        placeholder={`Paste ${providerId} API key...`}
                        className="flex-1 text-[10px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-400"
                    />
                    <button onClick={handleSaveKey} className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Save
                    </button>
                    <button onClick={() => setShowKeyInput(false)} className="text-[10px] px-2 py-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300">
                        ✕
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setShowKeyInput(true)}
                    className="text-[9px] text-blue-500 hover:text-blue-700 font-semibold"
                >
                    {provider.api_key_set ? 'Change key...' : '+ Add API key'}
                </button>
            )}
            {message && <div className="text-[9px] mt-1 font-semibold text-slate-600">{message}</div>}
        </div>
    );
};

/* ── Main Panel ── */
export default function ModelConfigPanel({ onConfigLoaded }) {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const token = sessionStorage.getItem('hermes_access_token');

    const loadConfig = async () => {
        try {
            const res = await fetch('/api/model-config', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setConfig(data.config);
                if (onConfigLoaded) onConfigLoaded(data.config);
            } else {
                setError(data.error);
            }
        } catch (e) {
            setError('Failed to load config');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadConfig(); }, []);

    const updateConfig = (update) => {
        setConfig(prev => ({ ...prev, ...update }));
    };

    const handleProviderChange = (providerId, changes) => {
        setConfig(prev => ({
            ...prev,
            providers: {
                ...prev.providers,
                [providerId]: { ...prev.providers[providerId], ...changes }
            }
        }));
    };

    const saveSettings = async (endpoint, body) => {
        setSaving(true);
        setMessage('');
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            setMessage(data.success ? '✅ ' + data.message : '❌ ' + data.error);
        } catch (e) {
            setMessage('❌ Network error');
        }
        setSaving(false);
        setTimeout(() => setMessage(''), 4000);
    };

    if (loading) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
                <i className="fas fa-spinner fa-spin mr-2"></i> Loading model configuration...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm">
                <i className="fas fa-exclamation-triangle mr-2"></i> {error}
                <button onClick={loadConfig} className="ml-2 underline text-rose-600 font-semibold">Retry</button>
            </div>
        );
    }

    if (!config) return null;

    const providers = config.providers || {};
    const registry = config.providers_registry || {};

    return (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
            <h6 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <i className="fas fa-robot text-blue-600"></i>
                AI Model Configuration
                {config.version > 0 && (
                    <span className="text-[9px] font-normal text-slate-400 ml-auto">v{config.version}</span>
                )}
            </h6>

            {/* ── Primary / Delegation Models ── */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">🧠 Primary Model</div>
                    <select
                        value={`${config.primary_provider}:${config.primary_model}`}
                        onChange={e => {
                            const [provider, model] = e.target.value.split(':');
                            updateConfig({ primary_provider: provider, primary_model: model });
                            saveSettings('/api/model-config/primary', { provider, model });
                        }}
                        className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded bg-slate-50"
                    >
                        {Object.entries(registry).flatMap(([pid, info]) =>
                            info.models.map(m => (
                                <option key={`${pid}:${m}`} value={`${pid}:${m}`}>
                                    {info.name} — {m}
                                </option>
                            ))
                        )}
                    </select>
                    <div className="text-[9px] text-slate-400 mt-1">
                        Handles reasoning, planning, orchestration decisions
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">🤖 Delegation Model</div>
                    <select
                        value={`${config.delegation_provider || config.primary_provider}:${config.delegation_model || config.primary_model}`}
                        onChange={e => {
                            const [provider, model] = e.target.value.split(':');
                            updateConfig({ delegation_provider: provider, delegation_model: model });
                            saveSettings('/api/model-config/delegation', { provider, model });
                        }}
                        className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded bg-slate-50"
                    >
                        <option value="">Same as Primary</option>
                        {Object.entries(registry).flatMap(([pid, info]) =>
                            info.models.map(m => (
                                <option key={`${pid}:${m}`} value={`${pid}:${m}`}>
                                    {info.name} — {m}
                                </option>
                            ))
                        )}
                    </select>
                    <div className="text-[9px] text-slate-400 mt-1">
                        Used for isolated sub-agent tasks via delegate_task()
                    </div>
                </div>
            </div>

            {/* ── API Keys ── */}
            <div className="mb-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">🔑 API Keys</div>
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(providers).map(([pid, provider]) => (
                        <ProviderCard
                            key={pid}
                            providerId={pid}
                            provider={provider}
                            onChange={handleProviderChange}
                            onSaveKey={saveSettings}
                            saving={saving}
                        />
                    ))}
                </div>
            </div>

            {/* ── Fallback Order ── */}
            <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">⛓️ Fallback Chain</div>
                <div className="flex items-center gap-1 flex-wrap mb-2">
                    {(config.loadbalancer?.fallback_order || []).map((pid, i) => (
                        <span key={pid} className="flex items-center gap-1">
                            {i > 0 && <span className="text-slate-300 text-[10px]">→</span>}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                providers[pid]?.api_key_set ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                            }`}>
                                {registry[pid]?.name || pid}
                                {!providers[pid]?.api_key_set && ' (no key)'}
                            </span>
                        </span>
                    ))}
                    {(!config.loadbalancer?.fallback_order || config.loadbalancer.fallback_order.length === 0) && (
                        <span className="text-[10px] text-slate-400 italic">Not configured</span>
                    )}
                </div>
                <div className="flex gap-1 flex-wrap">
                    {Object.keys(registry).map(pid => (
                        <button
                            key={pid}
                            onClick={() => {
                                const current = config.loadbalancer?.fallback_order || [];
                                let next;
                                if (current.includes(pid)) {
                                    next = current.filter(p => p !== pid);
                                } else {
                                    next = [...current, pid];
                                }
                                updateConfig({ loadbalancer: { ...config.loadbalancer, fallback_order: next } });
                                saveSettings('/api/model-config/fallback', { order: next });
                            }}
                            className={`text-[9px] px-2 py-1 rounded border transition-all ${
                                (config.loadbalancer?.fallback_order || []).includes(pid)
                                    ? 'bg-blue-100 border-blue-300 text-blue-700 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                            {registry[pid]?.name || pid}
                        </button>
                    ))}
                </div>
                <div className="text-[9px] text-slate-400 mt-2 leading-relaxed">
                    If the primary provider fails (rate limit, timeout, error), 
                    Hermes automatically tries the next in chain.
                </div>
            </div>

            {/* ── Status message ── */}
            {message && (
                <div className={`mt-3 text-xs font-semibold px-3 py-1.5 rounded ${message.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {message}
                </div>
            )}

            {/* ── Loadbalancer strategy info ── */}
            <details className="mt-4 text-[10px]">
                <summary className="text-slate-400 cursor-pointer hover:text-slate-600 font-semibold">
                    ⚙️ Loadbalancer Strategy: {config.loadbalancer?.strategy || 'priority'}
                </summary>
                <div className="mt-2 bg-white border border-slate-200 rounded p-2 text-slate-500 leading-relaxed">
                    <p><strong>Priority:</strong> Always try providers in order. Only fallback on failure.</p>
                    <p className="mt-1"><strong>Weighted:</strong> Distribute traffic by weight (configurable per provider).</p>
                    <p className="mt-1"><strong>Round-robin:</strong> Rotate evenly across all enabled providers.</p>
                    <p className="mt-1"><strong>Circuit breaker:</strong> Disable a provider after {config.loadbalancer?.circuit_breaker_threshold || 5} consecutive failures for {config.loadbalancer?.health_check_interval || 60}s.</p>
                </div>
            </details>
        </div>
    );
}
