import React, { useState } from 'react';

export default function ToolRecommendationView({ project, activeProject, onUpdateProject }) {
    // Handle both prop names: project or activeProject
    const currentProject = project || activeProject;
    
    // Show loading state if project data hasn't loaded yet
    if (!currentProject) {
        return (
            <div className="space-y-6">
                <div className="bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-700 text-white relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <h2 className="text-2xl font-black flex items-center gap-3"><i className="fas fa-tools text-blue-400"></i> Strategic Execution Tooling</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Map target resources to Huawei Cloud migration engines</p>
                        </div>
                        <button 
                            disabled={true}
                            className="mt-4 md:mt-0 px-6 py-3 bg-slate-600 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all opacity-50 cursor-not-allowed"
                        >
                            <i className="fas fa-spinner fa-spin mr-2"></i> Loading project data...
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState(currentProject?.toolRecommendations || null);
    const [executionMode, setExecutionMode] = useState(currentProject?.executionMode || 'manual');

    const handleGenerate = async () => {
        setLoading(true);
        try {
            // FIX: Uses correct endpoint and securely attaches standard JWT token
            const token = localStorage.getItem('erp_jwt_token');
            
            // Use blueprintData (from SOW/Quote) if available, otherwise fall back to mapperNodes for backward compatibility
            let targetArchitecture = [];
            if (currentProject?.blueprintData) {
                try {
                    // blueprintData contains the SOW/Quote topology
                    const blueprintData = typeof currentProject.blueprintData === 'string' 
                        ? JSON.parse(currentProject.blueprintData) 
                        : currentProject.blueprintData;
                    
                    // Extract resources from blueprintData.topology
                    const topology = blueprintData.topology || {};
                    const compute = topology.compute || [];
                    const databases = topology.databases || topology.database || [];
                    const network = topology.network || [];
                    const storage = topology.storage || [];
                    const security = topology.security || [];
                    
                    // Convert to target architecture format
                    targetArchitecture = [
                        ...compute.map(item => ({
                            type: 'ECS',
                            name: item.name || `Compute-${item.id || 'unknown'}`,
                            source: 'SOW',
                            os: item.os || 'Unknown',
                            ...item
                        })),
                        ...databases.map(item => ({
                            type: 'RDS',
                            name: item.name || `Database-${item.id || 'unknown'}`,
                            source: 'SOW',
                            db_engine: item.engine || item.type || 'Unknown',
                            ...item
                        })),
                        ...network.map(item => ({
                            type: 'VPC',
                            name: item.name || `Network-${item.id || 'unknown'}`,
                            source: 'SOW',
                            cidr: item.cidr || '10.0.0.0/16',
                            ...item
                        })),
                        ...storage.map(item => ({
                            type: 'OBS',
                            name: item.name || `Storage-${item.id || 'unknown'}`,
                            source: 'SOW',
                            storage_type: item.type || 'Object',
                            ...item
                        })),
                        ...security.map(item => ({
                            type: item.type || 'SG',
                            name: item.name || `Security-${item.id || 'unknown'}`,
                            source: 'SOW',
                            ...item
                        }))
                    ];
                } catch (e) {
                    console.error("Error parsing blueprintData:", e);
                    targetArchitecture = currentProject?.mapperNodes || [];
                }
            } else if (currentProject?.blueprint) {
                // Legacy support for blueprint field (deprecated)
                try {
                    const blueprint = typeof currentProject.blueprint === 'string' 
                        ? JSON.parse(currentProject.blueprint) 
                        : currentProject.blueprint;
                    targetArchitecture = blueprint.target_architecture || blueprint.resources || [];
                } catch (e) {
                    console.error("Error parsing blueprint:", e);
                    targetArchitecture = currentProject?.mapperNodes || [];
                }
            } else {
                targetArchitecture = currentProject?.mapperNodes || [];
            }
            
            const response = await fetch('/api/migration/recommendations', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    target_architecture: targetArchitecture
                })
            });
            const data = await response.json();
            if (data.success) {
                setRecommendations(data.data);
                if (onUpdateProject && currentProject?.id) {
                    onUpdateProject(currentProject.id, 'toolRecommendations', data.data);
                }
            } else {
                alert(`Error generating recommendations: ${data.error}`);
            }
        } catch (error) {
            console.error("Fetch failed:", error);
            alert("Failed to connect to recommendation engine. Please check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleModeSelect = (mode) => {
        setExecutionMode(mode);
        if (onUpdateProject && currentProject?.id) onUpdateProject(currentProject.id, 'executionMode', mode);
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-700 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                        <h2 className="text-2xl font-black flex items-center gap-3"><i className="fas fa-tools text-blue-400"></i> Strategic Execution Tooling</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Map target resources to Huawei Cloud migration engines</p>
                        
                        {/* Resource Count Display */}
                        <div className="mt-3 flex items-center gap-3">
                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 px-4 py-2 rounded-lg">
                                <div className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">Resources in Target Architecture</div>
                                <div className="text-lg font-black text-emerald-400">
                                    {currentProject?.mapperNodes?.length || 0}
                                </div>
                            </div>
                            <div className="text-xs text-slate-400">
                                {currentProject?.mapperNodes?.length > 0 ? "Using Saved Architecture" : 
                                 currentProject?.blueprintData ? "Using SOW/Quote Data (Not Saved)" : 
                                 currentProject?.blueprint ? "Using Blueprint Data (Not Saved)" : 
                                 "No Architecture Data"}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleGenerate}
                        disabled={loading || !(currentProject?.blueprintData || currentProject?.blueprint || currentProject?.mapperNodes?.length > 0)}
                        className="mt-4 md:mt-0 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50"
                        id="generate-recommendations-btn"
                        style={loading || !(currentProject?.blueprintData || currentProject?.blueprint || currentProject?.mapperNodes?.length > 0) ? {} : {backgroundColor: '#10b981'}}
                    >
                        {loading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Analyzing Matrix...</> : <><i className="fas fa-bolt mr-2"></i> Generate Recommendations {currentProject?.blueprintData ? "(SOW)" : currentProject?.blueprint ? "(Blueprint)" : currentProject?.mapperNodes?.length > 0 ? `(${currentProject.mapperNodes.length})` : ""}</>}
                    </button>
                </div>
            </div>

            {/* Strategic Tooling Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-4"><i className="fas fa-server text-lg"></i></div>
                    <h3 className="font-black text-slate-800 text-sm mb-1 uppercase tracking-widest">Compute Migration</h3>
                    <p className="text-xs text-slate-500 font-medium mb-3">SMS (Server Migration Service) for Block-Level Windows/Linux synchronization.</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4"><i className="fas fa-database text-lg"></i></div>
                    <h3 className="font-black text-slate-800 text-sm mb-1 uppercase tracking-widest">Database Migration</h3>
                    <p className="text-xs text-slate-500 font-medium mb-3">DRS & UGO for Zero-Downtime logical replication and schema conversion.</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-4"><i className="fas fa-hdd text-lg"></i></div>
                    <h3 className="font-black text-slate-800 text-sm mb-1 uppercase tracking-widest">Storage Migration</h3>
                    <p className="text-xs text-slate-500 font-medium mb-3">OMS (Object) and CDM (Data) for large scale parallel volume transport.</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 mb-4"><i className="fas fa-project-diagram text-lg"></i></div>
                    <h3 className="font-black text-slate-800 text-sm mb-1 uppercase tracking-widest">Cross-AZ DR / HA</h3>
                    <p className="text-xs text-slate-500 font-medium mb-3">CBR & SDRS for continuous replication and high availability architecture.</p>
                </div>
            </div>

            {recommendations && (
                <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl shadow-sm animate-slide-up">
                    <h3 className="font-black text-indigo-900 text-sm mb-4 uppercase tracking-widest"><i className="fas fa-clipboard-check mr-2"></i> Tooling Matrix Generated</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(recommendations.recommendations || []).map((rec, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex items-start gap-3">
                                <div className="mt-1"><i className="fas fa-check-circle text-indigo-500"></i></div>
                                <div>
                                    <div className="font-black text-slate-800 text-sm">{rec.resource_name}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Primary Tool: <span className="text-indigo-600">{rec.primary_tool.toUpperCase()}</span></div>
                                    <div className="text-xs text-slate-600 mt-2">{rec.primary_reason}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Execution Phase Strategy Setup Build-up */}
            <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest"><i className="fas fa-play-circle text-blue-500 mr-2"></i> Setup Phase 4 Execution Mode</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Select how workloads will be processed by the delivery team or orchestration engine.</p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div 
                        onClick={() => handleModeSelect('manual')}
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${executionMode === 'manual' ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.02]' : 'border-slate-200 hover:border-blue-300'}`}
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl mb-4"><i className="fas fa-hand-paper"></i></div>
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-2">Manual Pipeline</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Standard step-by-step Kanban execution. Teams manually update cards and trigger APIs per server.</p>
                    </div>

                    <div 
                        onClick={() => handleModeSelect('agentic')}
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${executionMode === 'agentic' ? 'border-purple-500 bg-purple-50 shadow-md scale-[1.02]' : 'border-slate-200 hover:border-purple-300'}`}
                    >
                        <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xl mb-4"><i className="fas fa-robot"></i></div>
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-2">Agentic Orchestration</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Hermes autonomous engine takes control of the entire wave, deploying agents and syncing tasks automatically.</p>
                    </div>

                    <div 
                        onClick={() => handleModeSelect('individual')}
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${executionMode === 'individual' ? 'border-emerald-500 bg-emerald-50 shadow-md scale-[1.02]' : 'border-slate-200 hover:border-emerald-300'}`}
                    >
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl mb-4"><i className="fas fa-tasks"></i></div>
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-2">Individual Tasks</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Isolate workloads into standalone ad-hoc tasks. Ideal for tiny batches or specific database true-ups.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
