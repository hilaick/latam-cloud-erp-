import React, { useState, useEffect } from 'react';

/**
 * KnowledgeTreePanel — Hierarchical skill tree with metrics.
 * Shows all 3 sources (Skills, External, History) in a navigable tree.
 * Metrics: total skills, used in simulations, fed to agentic engine.
 * Lives in IAM → Hermes AI Configuration.
 */
export default function KnowledgeTreePanel() {
    const [tree, setTree] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState(null);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [metrics, setMetrics] = useState({ total: 0, used: 0, fed: 0, bySource: {} });

    useEffect(() => { loadKnowledge(); }, []);

    const loadKnowledge = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('hermes_access_token');
            const res = await fetch('/api/knowledge/tree', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setTree(data.tree || []);
                setMetrics(data.metrics || { total: 0, used: 0, fed: 0, bySource: {} });
            } else {
                setError(data.error || 'Failed to load knowledge tree');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const forceSync = async () => {
        setSyncing(true);
        setSyncMessage(null);
        setError(null);
        try {
            const token = sessionStorage.getItem('hermes_access_token');
            const res = await fetch('/api/knowledge/sync', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSyncMessage(`${data.message} (last sync: ${data.last_sync})`);
                // Reload tree after sync
                await loadKnowledge();
            } else {
                setError(data.error || 'Sync failed');
            }
        } catch (err) {
            setError('Sync error: ' + err.message);
        } finally {
            setSyncing(false);
        }
    };

    const toggleNode = (nodeId) => {
        const next = new Set(expandedNodes);
        if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
        setExpandedNodes(next);
    };

    const expandAll = () => {
        const allIds = new Set();
        const walk = (nodes) => {
            nodes.forEach(n => {
                if (n.children?.length) allIds.add(n.id);
                if (n.children) walk(n.children);
            });
        };
        if (tree) walk(tree);
        setExpandedNodes(allIds);
    };

    const collapseAll = () => setExpandedNodes(new Set());

    // ── Render helpers ──
    const sourceIcon = (source) => {
        const icons = {
            skill: 'fa-crown text-amber-500',
            external: 'fa-code-branch text-blue-500',
            history: 'fa-clock-rotate-left text-emerald-500',
        };
        return icons[source] || 'fa-circle text-slate-400';
    };

    const sourceBadge = (source) => {
        const styles = {
            skill: 'bg-amber-100 text-amber-700 border-amber-200',
            external: 'bg-blue-100 text-blue-700 border-blue-200',
            history: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        };
        return (
            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${styles[source] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {source}
            </span>
        );
    };

    const renderNode = (node, depth = 0) => {
        const hasChildren = node.children?.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        const indent = depth * 16;

        return (
            <div key={node.id}>
                <div
                    className="flex items-center gap-2 py-1.5 px-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
                    style={{ paddingLeft: 12 + indent }}
                    onClick={() => hasChildren && toggleNode(node.id)}
                >
                    {/* Expand/collapse arrow */}
                    <span className="w-4 text-center shrink-0">
                        {hasChildren ? (
                            <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-[10px] text-slate-400 transition-transform`}></i>
                        ) : (
                            <span className="text-[10px] text-slate-300">•</span>
                        )}
                    </span>

                    {/* Icon */}
                    <i className={`fas ${sourceIcon(node.source)} text-xs shrink-0`}></i>

                    {/* Name */}
                    <span className="text-xs font-bold text-slate-700 truncate flex-1">
                        {node.name}
                    </span>

                    {/* Source badge */}
                    {sourceBadge(node.source)}

                    {/* Metrics pills */}
                    {node.usedCount > 0 && (
                        <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-200" title="Used in simulations">
                            <i className="fas fa-play mr-0.5"></i>{node.usedCount}
                        </span>
                    )}
                    {node.children?.length > 0 && (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">
                            {node.children.length}
                        </span>
                    )}
                </div>

                {/* Children (if expanded) */}
                {hasChildren && isExpanded && (
                    <div>
                        {node.children.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    // ── Loading state ──
    if (loading) {
        return (
            <div className="flex items-center gap-3 text-slate-400 text-xs py-4">
                <i className="fas fa-spinner fa-spin"></i>
                <span className="font-bold">Loading knowledge tree...</span>
            </div>
        );
    }

    // ── Error state ──
    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-xs">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                <span className="font-bold">{error}</span>
                <button onClick={loadKnowledge} className="ml-3 underline hover:text-rose-900 font-bold">Retry</button>
            </div>
        );
    }

    // ── Empty state ──
    if (!tree || tree.length === 0) {
        return (
            <div className="text-center py-6 text-slate-400">
                <i className="fas fa-inbox text-2xl mb-2 block"></i>
                <p className="text-xs font-bold">No skills loaded.</p>
                <p className="text-[10px] mt-1">Run an agentic simulation to populate the knowledge base.</p>
            </div>
        );
    }

    // ── Full tree ──
    return (
        <div>
            {/* Metrics Summary Bar */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                    <div className="text-2xl font-black text-slate-800">{metrics.total}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Skills</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-200">
                    <div className="text-2xl font-black text-purple-700">{metrics.used}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-purple-500">Used (Simulations)</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
                    <div className="text-2xl font-black text-blue-700">{metrics.fed}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-blue-500">Fed to Engine</div>
                </div>
            </div>

            {/* Source breakdown */}
            <div className="flex gap-3 mb-3 text-[10px] font-bold">
                {Object.entries(metrics.bySource || {}).map(([src, count]) => (
                    <span key={src} className="flex items-center gap-1">
                        <i className={`fas ${sourceIcon(src)} text-xs`}></i>
                        <span className="text-slate-500 capitalize">{src}:</span>
                        <span className="text-slate-800">{count}</span>
                    </span>
                ))}
            </div>

            {/* Controls */}
            <div className="flex gap-2 mb-3 items-center">
                <button
                    onClick={expandAll}
                    className="text-[9px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors"
                >
                    <i className="fas fa-expand mr-1"></i>Expand All
                </button>
                <button
                    onClick={collapseAll}
                    className="text-[9px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors"
                >
                    <i className="fas fa-compress mr-1"></i>Collapse All
                </button>
                <button
                    onClick={forceSync}
                    disabled={syncing}
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-colors ml-auto ${
                        syncing 
                            ? 'bg-blue-100 text-blue-600 cursor-wait' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                    title="Force sync external knowledge from GitHub"
                >
                    <i className={`fas ${syncing ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'} mr-1`}></i>
                    {syncing ? 'Syncing...' : 'Sync External'}
                </button>
            </div>
            
            {/* Sync message */}
            {syncMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3 text-xs text-green-700">
                    <i className="fas fa-check-circle mr-1"></i>
                    {syncMessage}
                </div>
            )}

            {/* Tree */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl bg-white p-2">
                {tree.map(node => renderNode(node, 0))}
            </div>

            {/* Legend */}
            <div className="flex gap-3 mt-3 text-[9px] font-bold text-slate-400">
                <span><i className="fas fa-crown text-amber-500 mr-1"></i>Skill (highest priority)</span>
                <span><i className="fas fa-code-branch text-blue-500 mr-1"></i>External</span>
                <span><i className="fas fa-clock-rotate-left text-emerald-500 mr-1"></i>History (lowest)</span>
            </div>
        </div>
    );
}
