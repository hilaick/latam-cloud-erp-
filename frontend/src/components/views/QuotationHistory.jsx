import React, { useState, useEffect } from 'react';

export default function QuotationHistory({ projectId, onRevert }) {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedVersion, setSelectedVersion] = useState(null);

    useEffect(() => {
        if (projectId) {
            loadVersions();
        }
    }, [projectId]);

    const loadVersions = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const response = await fetch(`/api/quotation/versions/${projectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setVersions(data.versions || []);
                } else {
                    setError(data.error || 'Failed to load versions');
                }
            } else {
                setError(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (err) {
            setError(`Network error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRevert = async (versionId) => {
        if (!window.confirm('Are you sure you want to revert to this quotation version? This will update the current blueprint.')) {
            return;
        }

        try {
            const token = localStorage.getItem('erp_jwt_token');
            const response = await fetch(`/api/quotation/revert/${versionId}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    alert('✅ Blueprint reverted successfully!');
                    if (onRevert) onRevert(data.blueprint);
                    loadVersions(); // Refresh list
                } else {
                    alert(`❌ Failed to revert: ${data.error}`);
                }
            } else {
                alert(`❌ HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (err) {
            alert(`❌ Network error: ${err.message}`);
        }
    };

    const handleViewVersion = async (versionId) => {
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const response = await fetch(`/api/quotation/version/${versionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSelectedVersion(data.version);
                } else {
                    alert(`Failed to load version: ${data.error}`);
                }
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString();
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                    <i className="fas fa-history text-blue-500"></i>
                    Quotation Version History
                </h3>
                <button 
                    onClick={loadVersions} 
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                    disabled={loading}
                >
                    <i className="fas fa-sync-alt mr-1"></i> Refresh
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-slate-500 mt-2">Loading quotation history...</p>
                </div>
            ) : error ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-rose-700">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span className="font-bold">Error: {error}</span>
                    </div>
                </div>
            ) : versions.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                    <i className="fas fa-file-excel text-4xl text-slate-300 mb-3"></i>
                    <p className="text-slate-500">No quotation versions found.</p>
                    <p className="text-sm text-slate-400 mt-1">Upload a quotation to create the first version.</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {versions.map((version) => (
                        <div 
                            key={version.id} 
                            className={`p-4 rounded-xl border flex flex-col gap-2 cursor-pointer hover:bg-slate-50 transition-colors ${
                                selectedVersion?.id === version.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
                            }`}
                            onClick={() => handleViewVersion(version.id)}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded uppercase">
                                            v{version.version_number}
                                        </span>
                                        <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                                            {version.quotation_filename}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        <i className="fas fa-user mr-1"></i>
                                        {version.uploaded_by} • {formatDate(version.uploaded_at)}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {version.cr_id && (
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">
                                            CR: {version.cr_id.substring(0, 8)}...
                                        </span>
                                    )}
                                    {version.has_file && (
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                                            <i className="fas fa-file mr-1"></i>File
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {version.change_summary && (
                                <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100 mt-1">
                                    <div className="font-bold text-[10px] uppercase text-slate-500 mb-1">Changes:</div>
                                    <div className="whitespace-pre-wrap">{version.change_summary}</div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-2">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewVersion(version.id);
                                    }}
                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors"
                                >
                                    <i className="fas fa-eye mr-1"></i> View
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRevert(version.id);
                                    }}
                                    className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-xs font-bold transition-colors"
                                >
                                    <i className="fas fa-undo mr-1"></i> Revert
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Version Details Modal */}
            {selectedVersion && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-black text-lg text-slate-800">
                                <i className="fas fa-file-excel text-emerald-600 mr-2"></i>
                                Quotation Version v{selectedVersion.version_number}
                            </h3>
                            <button 
                                onClick={() => setSelectedVersion(null)}
                                className="text-slate-400 hover:text-rose-500 text-xl"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">File</div>
                                    <div className="font-bold text-slate-800 truncate">{selectedVersion.quotation_filename}</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Uploaded By</div>
                                    <div className="font-bold text-slate-800">{selectedVersion.uploaded_by}</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Uploaded At</div>
                                    <div className="font-bold text-slate-800">{formatDate(selectedVersion.uploaded_at)}</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Linked CR</div>
                                    <div className="font-bold text-slate-800">
                                        {selectedVersion.cr_id ? (
                                            <span className="text-purple-600">{selectedVersion.cr_id}</span>
                                        ) : 'None'}
                                    </div>
                                </div>
                            </div>

                            {selectedVersion.change_summary && (
                                <div className="mb-6">
                                    <h4 className="font-black text-sm uppercase tracking-widest text-slate-500 mb-3 border-b pb-2">
                                        <i className="fas fa-exchange-alt mr-2"></i>
                                        Changes from Previous Version
                                    </h4>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap text-sm">
                                        {selectedVersion.change_summary}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="font-black text-sm uppercase tracking-widest text-slate-500 mb-3 border-b pb-2">
                                    <i className="fas fa-project-diagram mr-2"></i>
                                    Blueprint Snapshot
                                </h4>
                                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto">
                                    <pre>{JSON.stringify(selectedVersion.blueprint_data, null, 2)}</pre>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between">
                            <div className="text-xs text-slate-500">
                                Version ID: <code className="bg-slate-200 px-1 rounded">{selectedVersion.id}</code>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setSelectedVersion(null)}
                                    className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                                >
                                    Close
                                </button>
                                <button 
                                    onClick={() => handleRevert(selectedVersion.id)}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
                                >
                                    <i className="fas fa-undo mr-1"></i> Revert to This Version
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}