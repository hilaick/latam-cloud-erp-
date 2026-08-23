import React, { useState, useEffect } from 'react';

export default function McpServerView() {
    const [servers, setServers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [expandedServer, setExpandedServer] = useState(null);
    const [tools, setTools] = useState({});
    const [basePath, setBasePath] = useState('');

    const API_BASE = window.location.origin === 'http://localhost:5173' ? 'http://localhost:9119' : '';

    useEffect(() => {
        fetchServers();
    }, []);

    const fetchServers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/mcp/servers`);
            const data = await res.json();
            if (data.success) {
                setServers(data.servers || []);
                setBasePath(data.base_path || '');
            }
        } catch (e) {
            console.error('Failed to fetch MCP servers:', e);
        }
        setLoading(false);
    };

    const handleSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch(`${API_BASE}/api/mcp/sync`, { method: 'POST' });
            const data = await res.json();
            setSyncResult(data);
            if (data.success) {
                fetchServers();
            }
        } catch (e) {
            setSyncResult({ success: false, error: e.message });
        }
        setSyncing(false);
    };

    const loadTools = async (name) => {
        if (tools[name]) {
            setExpandedServer(expandedServer === name ? null : name);
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/api/mcp/servers/${name}/tools`);
            const data = await res.json();
            if (data.success) {
                setTools(prev => ({ ...prev, [name]: data.tools }));
            }
        } catch (e) {
            console.error('Failed to fetch tools:', e);
        }
        setExpandedServer(expandedServer === name ? null : name);
    };

    const categoryColors = {
        'huaweicloud_services_server': 'border-blue-300 bg-blue-50/50',
        'huaweicloud_dws_mcp_inner': 'border-emerald-300 bg-emerald-50/50',
        'huaweicloud_marketplace_server': 'border-purple-300 bg-purple-50/50',
        'common_servers': 'border-amber-300 bg-amber-50/50',
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
                        {syncing ? 'Syncing...' : 'Sync from GitHub'}
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
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-3xl font-black text-blue-600">{servers.length}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Total Servers</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-3xl font-black text-emerald-600">{servers.filter(s => s.running).length}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Running</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-3xl font-black text-amber-600">{servers.reduce((sum, s) => sum + (s.python_files || 0), 0)}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Python Modules</div>
                </div>
            </div>

            {/* Server List */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">
                    <i className="fas fa-spinner fa-spin text-2xl"></i>
                    <div className="text-xs mt-2">Loading MCP servers...</div>
                </div>
            ) : (
                <div className="space-y-3">
                    {servers.map(server => (
                        <div key={server.name} className={`rounded-2xl border-2 overflow-hidden ${categoryColors[server.name] || 'border-slate-200 bg-white'}`}>
                            <div
                                className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/40 transition-colors"
                                onClick={() => loadTools(server.name)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${server.running ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                        <i className={`fas ${server.running ? 'fa-play' : 'fa-pause'} text-sm`}></i>
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-slate-800">{server.name}</div>
                                        <div className="text-[10px] text-slate-500 flex gap-3 mt-0.5">
                                            <span><i className="fas fa-file-code mr-1"></i>{server.python_files} modules</span>
                                            <span><i className="fas fa-circle text-[6px] mr-1"></i>{server.running ? 'RUNNING' : 'STOPPED'}</span>
                                            {server.has_entry_point && <span className="text-emerald-600"><i className="fas fa-check mr-1"></i>Entry point</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {expandedServer === server.name ? (
                                        <i className="fas fa-chevron-up text-slate-400 text-xs"></i>
                                    ) : (
                                        <i className="fas fa-chevron-down text-slate-400 text-xs"></i>
                                    )}
                                </div>
                            </div>

                            {expandedServer === server.name && tools[server.name] && (
                                <div className="border-t border-slate-200 bg-white/60 p-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                        Available Tools ({tools[server.name].length})
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                        {tools[server.name].map((tool, i) => (
                                            <div key={i} className="text-[10px] font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 truncate">
                                                <i className="fas fa-cube text-blue-400 mr-1"></i>{tool}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
