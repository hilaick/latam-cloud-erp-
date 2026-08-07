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
    const [filterCategory, setFilterCategory] = useState(null); // compute, database, storage, dr, null for all

    const handleGenerate = async () => {
        setLoading(true);
        try {
            // FIX: Uses correct endpoint and securely attaches standard JWT token
            const token = sessionStorage.getItem('hermes_access_token');
            
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

                        {/* Strategic Tooling Modules with Filtering */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div 
                    onClick={() => setFilterCategory(filterCategory === 'compute' ? null : 'compute')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${filterCategory === 'compute' ? 'border-indigo-500 bg-indigo-50 shadow-md scale-[1.02]' : 'border-slate-200 hover:border-indigo-300'}`}
                >
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-4"><i className="fas fa-server text-lg"></i></div>
                    <h3 className="font-black text-slate-800 text-sm mb-1 uppercase tracking-widest">Compute Migration</h3>
                    <p className="text-xs text-slate-500 font-medium mb-2">SMS (Server Migration Service) for Block-Level Windows/Linux synchronization.</p>
                    <div className="text-xs font-black text-indigo-600">
                        {recommendations?.recommendations?.filter(r => 
                            ['ECS', 'BMS', 'VM', 'CCE', 'SERVER'].some(t => r.resource_type?.toUpperCase().includes(t))
                        ).length || 0} resources
                    </div>
                </div>
                <div 
                    onClick={() => setFilterCategory(filterCategory === 'database' ? null : 'database')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${filterCategory === 'database' ? 'border-emerald-500 bg-emerald-50 shadow-md scale-[1.02]' : 'border-slate-200 hover:border-emerald-300'}`}
                >
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4"><i className="fas fa-database text-lg"></i></div>
                    <h3 className="font-black text-slate-800 text-sm mb-1 uppercase tracking-widest">Database Migration</h3>
                    <p className="text-xs text-slate-500 font-medium mb-2">DRS & UGO for Zero-Downtime logical replication and schema conversion.</p>
                    <div className="text-xs font-black text-emerald-600">
                        {recommendations?.recommendations?.filter(r => 
                            ['RDS', 'GAUSSDB', 'DB', 'DATABASE', 'DCS'].some(t => r.resource_type?.toUpperCase().includes(t))
                        ).length || 0} resources
                    </div>
                </div>
                <div 
                    onClick={() => setFilterCategory(filterCategory === 'storage' ? null : 'storage')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${filterCategory === 'storage' ? 'border-amber-500 bg-amber-50 shadow-md scale-[1.02]' : 'border-slate-200 hover:border-amber-300'}`}
                >
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-4"><i className="fas fa-hdd text-lg"></i></div>
                    <h3 className="font-black text-slate-800 text-sm mb-1 uppercase tracking-widest">Storage Migration</h3>
                    <p className="text-xs text-slate-500 font-medium mb-2">OMS (Object) and CDM (Data) for large scale parallel volume transport.</p>
                    <div className="text-xs font-black text-amber-600">
                        {recommendations?.recommendations?.filter(r => 
                            ['OBS', 'SFS', 'EVS', 'CBR', 'STORAGE'].some(t => r.resource_type?.toUpperCase().includes(t))
                        ).length || 0} resources
                    </div>
                </div>
                <div 
                    onClick={() => setFilterCategory(filterCategory === 'dr' ? null : 'dr')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${filterCategory === 'dr' ? 'border-rose-500 bg-rose-50 shadow-md scale-[1.02]' : 'border-slate-200 hover:border-rose-300'}`}
                >
                    <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 mb-4"><i className="fas fa-project-diagram text-lg"></i></div>
                    <h3 className="font-black text-slate-800 text-sm mb-1 uppercase tracking-widest">Cross-AZ DR / HA</h3>
                    <p className="text-xs text-slate-500 font-medium mb-2">CBR & SDRS for continuous replication and high availability architecture.</p>
                    <div className="text-xs font-black text-rose-600">
                        {recommendations?.recommendations?.filter(r => 
                            ['CBR', 'SDRS', 'DR', 'HA'].some(t => r.resource_type?.toUpperCase().includes(t))
                        ).length || 0} resources
                    </div>
                </div>
            </div>             {recommendations && (
                <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl shadow-sm animate-slide-up">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-indigo-900 text-sm uppercase tracking-widest"><i className="fas fa-clipboard-check mr-2"></i> Tooling Matrix Generated</h3>
                        {filterCategory && (
                            <button 
                                onClick={() => setFilterCategory(null)}
                                className="text-xs font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-1"
                            >
                                <i className="fas fa-times"></i> Clear Filter
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(recommendations.recommendations || [])
                            .filter(rec => {
                                if (!filterCategory) return true;
                                const type = rec.resource_type?.toUpperCase() || '';
                                if (filterCategory === 'compute') {
                                    return ['ECS', 'BMS', 'VM', 'CCE', 'SERVER'].some(t => type.includes(t));
                                }
                                if (filterCategory === 'database') {
                                    return ['RDS', 'GAUSSDB', 'DB', 'DATABASE', 'DCS'].some(t => type.includes(t));
                                }
                                if (filterCategory === 'storage') {
                                    return ['OBS', 'SFS', 'EVS', 'CBR', 'STORAGE'].some(t => type.includes(t));
                                }
                                if (filterCategory === 'dr') {
                                    return ['CBR', 'SDRS', 'DR', 'HA'].some(t => type.includes(t));
                                }
                                return true;
                            })
                            .map((rec, idx) => {
                                const type = rec.resource_type?.toUpperCase() || '';
                                let category = 'other';
                                let categoryColor = 'gray';
                                let categoryText = 'Other';
                                
                                if (['ECS', 'BMS', 'VM', 'CCE', 'SERVER'].some(t => type.includes(t))) {
                                    category = 'compute';
                                    categoryColor = 'indigo';
                                    categoryText = 'Compute';
                                } else if (['RDS', 'GAUSSDB', 'DB', 'DATABASE', 'DCS'].some(t => type.includes(t))) {
                                    category = 'database';
                                    categoryColor = 'emerald';
                                    categoryText = 'Database';
                                } else if (['OBS', 'SFS', 'EVS', 'CBR', 'STORAGE'].some(t => type.includes(t))) {
                                    category = 'storage';
                                    categoryColor = 'amber';
                                    categoryText = 'Storage';
                                } else if (['CBR', 'SDRS', 'DR', 'HA'].some(t => type.includes(t))) {
                                    category = 'dr';
                                    categoryColor = 'rose';
                                    categoryText = 'DR/HA';
                                }
                                
                                return (
                                    <div key={idx} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex items-start gap-3">
                                        <div className={`mt-1 text-${categoryColor}-500`}>
                                            <i className="fas fa-check-circle"></i>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div className="font-black text-slate-800 text-sm">{rec.resource_name}</div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-${categoryColor}-100 text-${categoryColor}-700`}>
                                                    {categoryText}
                                                </span>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                                Primary Tool: <span className="text-indigo-600">{rec.primary_tool?.toUpperCase() || 'N/A'}</span>
                                            </div>
                                            <div className="text-xs text-slate-600 mt-2">{rec.primary_reason}</div>
                                            {rec.fallback_tool && (
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                                                    Fallback: <span className="text-slate-600">{rec.fallback_tool.toUpperCase()}</span>
                                                    <span className="text-slate-500 ml-2">{rec.fallback_reason}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                    
                    {filterCategory && (
                        <div className="mt-4 text-xs text-slate-500 text-center">
                            Showing {recommendations.recommendations?.filter(rec => {
                                const type = rec.resource_type?.toUpperCase() || '';
                                if (filterCategory === 'compute') {
                                    return ['ECS', 'BMS', 'VM', 'CCE', 'SERVER'].some(t => type.includes(t));
                                }
                                if (filterCategory === 'database') {
                                    return ['RDS', 'GAUSSDB', 'DB', 'DATABASE', 'DCS'].some(t => type.includes(t));
                                }
                                if (filterCategory === 'storage') {
                                    return ['OBS', 'SFS', 'EVS', 'CBR', 'STORAGE'].some(t => type.includes(t));
                                }
                                if (filterCategory === 'dr') {
                                    return ['CBR', 'SDRS', 'DR', 'HA'].some(t => type.includes(t));
                                }
                                return false;
                            }).length || 0} of {recommendations.recommendations?.length || 0} resources
                        </div>
                    )}
                </div>
            )} {/* End of Execution Phase Strategy Setup Build-up */}
        </div>
    );
}
