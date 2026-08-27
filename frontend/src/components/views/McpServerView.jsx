import React, { useState, useEffect, useCallback } from 'react';

export default function McpServerView() {
    const [servers, setServers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [expandedServer, setExpandedServer] = useState(null);
    const [tools, setTools] = useState({});
    const [basePath, setBasePath] = useState('');
    const [inventory, setInventory] = useState(null);

    // Credential state
    const [creds, setCreds] = useState({ ak: '', sk_configured: false, sk_masked: '' });
    const [editCreds, setEditCreds] = useState(false);
    const [credForm, setCredForm] = useState({ ak: '', sk: '' });
    const [credSaving, setCredSaving] = useState(false);
    const [credMessage, setCredMessage] = useState(null);

    // Start/stop state
    const [actionLoading, setActionLoading] = useState({});

    const API_BASE = window.location.origin === 'http://localhost:5173' ? 'http://localhost:9119' : '';

    const fetchServers = useCallback(async () => {
        setLoading(true);
        try {
            const [serversRes, invRes, credsRes] = await Promise.all([
                fetch(`${API_BASE}/api/mcp/servers`),
                fetch(`${API_BASE}/api/mcp/inventory`),
                fetch(`${API_BASE}/api/mcp/credentials`),
            ]);
            const sd = await serversRes.json();
            if (sd.success) { setServers(sd.servers || []); setBasePath(sd.base_path || ''); }
            const id = await invRes.json();
            if (id.success) setInventory(id);
            const cd = await credsRes.json();
            if (cd.success) setCreds(cd);
        } catch (e) {
            console.error('Failed to fetch MCP data:', e);
        }
        setLoading(false);
    }, [API_BASE]);

    useEffect(() => { fetchServers(); }, [fetchServers]);

    const handleSync = async () => {
        setSyncing(true); setSyncResult(null);
        try {
            const res = await fetch(`${API_BASE}/api/mcp/sync`, { method: 'POST' });
            const data = await res.json();
            setSyncResult(data);
            if (data.success) fetchServers();
        } catch (e) {
            setSyncResult({ success: false, error: e.message });
        }
        setSyncing(false);
    };

    const loadTools = async (service) => {
        if (tools[service]) {
            setExpandedServer(expandedServer === service ? null : service);
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/api/mcp/servers/${service}/tools`);
            const data = await res.json();
            if (data.success) {
                setTools(prev => ({ ...prev, [service]: data.tools || [] }));
            }
        } catch (e) {
            console.error('Failed to fetch tools:', e);
        }
        setExpandedServer(expandedServer === service ? null : service);
    };

    const startServer = async (service) => {
        setActionLoading(prev => ({ ...prev, [service]: 'starting' }));
        try {
            const res = await fetch(`${API_BASE}/api/mcp/servers/${service}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (data.success) {
                setServers(prev => prev.map(s => s.service === service ? { ...s, running: true } : s));
            }
        } catch (e) {
            console.error('Failed to start server:', e);
        }
        setActionLoading(prev => ({ ...prev, [service]: null }));
    };

    const stopServer = async (service) => {
        setActionLoading(prev => ({ ...prev, [service]: 'stopping' }));
        try {
            const res = await fetch(`${API_BASE}/api/mcp/servers/${service}/stop`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setServers(prev => prev.map(s => s.service === service ? { ...s, running: false } : s));
            }
        } catch (e) {
            console.error('Failed to stop server:', e);
        }
        setActionLoading(prev => ({ ...prev, [service]: null }));
    };

    const saveCreds = async () => {
        setCredSaving(true); setCredMessage(null);
        try {
            const res = await fetch(`${API_BASE}/api/mcp/credentials`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credForm),
            });
            const data = await res.json();
            if (data.success) {
                setCreds({ ak: data.ak, sk_configured: data.sk_configured, sk_masked: '' });
                setEditCreds(false);
                setCredMessage({ type: 'success', text: 'MCP default credentials saved' });
            } else {
                setCredMessage({ type: 'error', text: data.error || 'Failed to save' });
            }
        } catch (e) {
            setCredMessage({ type: 'error', text: e.message });
        }
        setCredSaving(false);
    };

    const pillarColors = {
        compute: 'blue', database: 'emerald', storage: 'amber',
        network: 'purple', security: 'rose', monitoring: 'cyan', sms: 'indigo',
    };

    return (
        <div className="animate-fade-in max-w-[1400px] mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                            <i className="fas fa-plug text-blue-500"></i>
                            MCP Server Management
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Model Context Protocol servers for Huawei Cloud IaaS APIs
                        </p>
                        {basePath && (
                            <p className="text-[10px] text-slate-400 mt-1 font-mono">{basePath}</p>
                        )}
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-md transition-colors ${syncing ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        <i className={`fas ${syncing ? 'fa-spinner fa-spin' : 'fa-sync'} mr-2`}></i>
                        {syncing ? 'Syncing...' : 'Sync'}
                    </button>
                </div>

                {syncResult && (
                    <div className={`mt-4 p-4 rounded-xl border-2 ${syncResult.success ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-rose-300 bg-rose-50 text-rose-800'}`}>
                        <div className="text-xs font-black uppercase tracking-widest mb-2">
                            <i className={`fas ${syncResult.success ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i>
                            Sync {syncResult.success ? 'Successful' : 'Failed'}
                        </div>
                        {syncResult.latest_commits && (
                            <div className="text-[10px] font-mono mt-2 space-y-1">
                                {syncResult.latest_commits.map((commit, i) => (
                                    <div key={i} className="truncate">{commit}</div>
                                ))}
                            </div>
                        )}
                        {syncResult.error && (
                            <div className="text-[10px] mt-2">{syncResult.error}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-3xl font-black text-blue-600">{servers.length}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Total Servers</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-3xl font-black text-emerald-600">{servers.filter(s => s.running).length}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Running</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-3xl font-black text-amber-600">{inventory?.total_endpoints || servers.reduce((sum, s) => sum + (s.endpoints || 0), 0)}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">API Endpoints</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-3xl font-black text-purple-600">{servers.filter(s => s.available).length}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Specs Loaded</div>
                </div>
            </div>

            {/* Default Credentials Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <i className="fas fa-key text-amber-500"></i>
                            ERP Default Credentials
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-1">
                            Used as fallback for MCP server authentication when no customer credentials are provided.
                            Per-customer credentials (from CRM) take priority during execution.
                        </p>
                    </div>
                    {!editCreds && (
                        <button onClick={() => { setEditCreds(true); setCredForm({ ak: creds.ak || '', sk: '' }); }}
                            className="px-4 py-2 rounded-lg text-xs font-bold text-blue-600 border border-blue-300 hover:bg-blue-50 transition-colors">
                            <i className="fas fa-edit mr-1"></i> Configure
                        </button>
                    )}
                </div>

                {credMessage && (
                    <div className={`mb-3 p-3 rounded-lg text-xs font-bold ${credMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        <i className={`fas ${credMessage.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i>
                        {credMessage.text}
                    </div>
                )}

                {!editCreds ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Access Key (AK)</div>
                            <div className="text-sm font-mono text-slate-700 mt-1">{creds.ak ? creds.ak : <span className="text-slate-400 italic">Not configured</span>}</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Secret Key (SK)</div>
                            <div className="text-sm font-mono text-slate-700 mt-1">
                                {creds.sk_configured ? (
                                    <span className="text-emerald-600"><i className="fas fa-check-circle mr-1"></i>Configured {creds.sk_masked && `(${creds.sk_masked})`}</span>
                                ) : (
                                    <span className="text-slate-400 italic">Not configured</span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Access Key (AK)</label>
                                <input type="text" value={credForm.ak}
                                    onChange={e => setCredForm(prev => ({ ...prev, ak: e.target.value }))}
                                    placeholder="Enter Huawei Cloud AK"
                                    className="w-full mt-1 px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Secret Key (SK)</label>
                                <input type="password" value={credForm.sk}
                                    onChange={e => setCredForm(prev => ({ ...prev, sk: e.target.value }))}
                                    placeholder={creds.sk_configured ? '•••••••• (leave blank to keep current)' : 'Enter Huawei Cloud SK'}
                                    className="w-full mt-1 px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={saveCreds} disabled={credSaving}
                                className="px-4 py-2 rounded-lg text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:bg-slate-400">
                                {credSaving ? <><i className="fas fa-spinner fa-spin mr-1"></i>Saving...</> : <><i className="fas fa-save mr-1"></i>Save Credentials</>}
                            </button>
                            <button onClick={() => { setEditCreds(false); setCredMessage(null); }}
                                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Server List */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">
                    <i className="fas fa-spinner fa-spin text-2xl"></i>
                    <div className="text-xs mt-2">Loading MCP servers...</div>
                </div>
            ) : (
                <div className="space-y-3">
                    {servers.map(server => {
                        const pColor = pillarColors[server.pillar] || 'slate';
                        return (
                            <div key={server.service} className={`rounded-2xl border-2 overflow-hidden border-${pColor}-200 bg-white`}>
                                <div
                                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                                    onClick={() => loadTools(server.service)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${server.running ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                            <i className={`fas ${server.running ? 'fa-play' : 'fa-pause'} text-sm`}></i>
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-slate-800">{server.service}</div>
                                            <div className="text-[10px] text-slate-500 flex gap-3 mt-0.5">
                                                <span><i className="fas fa-route mr-1"></i>{server.pillar || 'general'}</span>
                                                <span><i className="fas fa-code-branch mr-1"></i>{server.endpoints || 0} endpoints</span>
                                                <span className={server.running ? 'text-emerald-600' : 'text-slate-400'}><i className="fas fa-circle text-[6px] mr-1"></i>{server.running ? 'RUNNING' : 'STOPPED'}</span>
                                                {server.available && <span className="text-blue-600"><i className="fas fa-check mr-1"></i>Spec loaded</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        {server.running ? (
                                            <button onClick={() => stopServer(server.service)}
                                                disabled={actionLoading[server.service]}
                                                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-rose-600 border border-rose-300 hover:bg-rose-50 transition-colors disabled:opacity-50">
                                                {actionLoading[server.service] === 'stopping' ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-stop mr-1"></i>Stop</>}
                                            </button>
                                        ) : (
                                            <button onClick={() => startServer(server.service)}
                                                disabled={actionLoading[server.service] || !server.has_run_py}
                                                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-emerald-600 border border-emerald-300 hover:bg-emerald-50 transition-colors disabled:opacity-50">
                                                {actionLoading[server.service] === 'starting' ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-play mr-1"></i>Start</>}
                                            </button>
                                        )}
                                        {expandedServer === server.service ? (
                                            <i className="fas fa-chevron-up text-slate-400 text-xs ml-2"></i>
                                        ) : (
                                            <i className="fas fa-chevron-down text-slate-400 text-xs ml-2"></i>
                                        )}
                                    </div>
                                </div>

                                {expandedServer === server.service && tools[server.service] && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                            MCP Tools ({tools[server.service].length})
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                            {tools[server.service].map((tool, i) => (
                                                <div key={i} className="text-[10px] font-mono text-slate-600 bg-white px-2 py-1.5 rounded border border-slate-100 truncate" title={tool.summary || tool.operation_id}>
                                                    <span className={`inline-block px-1 py-0.5 rounded text-[8px] font-bold mr-1 ${tool.method === 'GET' ? 'bg-blue-100 text-blue-700' : tool.method === 'POST' ? 'bg-emerald-100 text-emerald-700' : tool.method === 'PUT' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{tool.method}</span>
                                                    {tool.operation_id || tool.path}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
