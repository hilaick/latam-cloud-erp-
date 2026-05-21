import React, { useState, useEffect, useMemo, useRef } from 'react';

export default function StepArchitecture({ project, onUpdateProject, onPromote, isCurrent }) {
    const [showTopology, setShowTopology] = useState(false);
    const [showAssessment, setShowAssessment] = useState(false);
    
    const topologyRef = useRef(null);
    const topologyInstance = useRef(null);
    
    const compute = project?.blueprintData?.topology?.compute || [];
    const database = project?.blueprintData?.topology?.database || [];
    const network = project?.blueprintData?.topology?.network || [];

    const totalVms = compute.length;
    const totalCpu = compute.reduce((sum, s) => sum + (parseInt(s.cpu) || 0), 0);
    const totalRam = compute.reduce((sum, s) => sum + (parseInt(s.ram) || 0), 0);
    const totalStorage = compute.reduce((sum, s) => sum + (parseInt(s.storage_gb) || 0), 0);

    const assessment = useMemo(() => {
        const compute = project?.blueprintData?.topology?.compute || [];
        const db = project?.blueprintData?.topology?.database || [];
        
        // Real Analysis: Anything without an OS or marked as native PaaS can be auto-deployed
        const nativeResources = compute.filter(s => !s.metadata?.os_type || s.metadata?.os_type === 'Unknown').length + db.length + 2; // +2 for VPC & Subnet
        const smsResources = compute.filter(s => s.metadata?.os_type && s.metadata?.os_type !== 'Unknown').length;
        
        const total = nativeResources + smsResources;
        const percentage = total > 0 ? Math.round((nativeResources / total) * 100) : 0;
        
        return {
            nativeResources,
            smsResources,
            total,
            percentage,
            canAutoDeploy: percentage >= 70,
            message: percentage >= 70 
                ? "High automation potential. Native PaaS resources can be deployed via API." 
                : "Limited automation. SMS migration required for most servers."
        };
    }, [project?.blueprintData]);

    useEffect(() => {
        if (showTopology && topologyRef.current && typeof L !== 'undefined') {
            if (!topologyInstance.current) {
                topologyInstance.current = L.map(topologyRef.current, { 
                    zoomControl: false, 
                    attributionControl: false 
                }).setView([0, 0], 2);
                
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
                    maxZoom: 19, 
                    attribution: '&copy; CartoDB' 
                }).addTo(topologyInstance.current);
                
                // Create markers for compute nodes
                compute.forEach((server, index) => {
                    const lat = -30 + Math.random() * 60;
                    const lng = -180 + Math.random() * 360;
                    
                    const marker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'custom-marker',
                            html: `<div class="w-8 h-8 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs">${index + 1}</div>`,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16]
                        })
                    }).addTo(topologyInstance.current);
                    
                    marker.bindPopup(`
                        <div class="p-2 w-48">
                            <h4 class="font-bold text-sm mb-1">${server.server_name || 'Unknown'}</h4>
                            <div class="text-xs space-y-1">
                                <div><span class="font-bold">Flavor:</span> ${server.flavor || 'N/A'}</div>
                                <div><span class="font-bold">CPU:</span> ${server.cpu || 'N/A'} cores</div>
                                <div><span class="font-bold">RAM:</span> ${server.ram || 'N/A'} GB</div>
                                <div><span class="font-bold">OS:</span> ${server.os_type || 'Unknown'}</div>
                            </div>
                        </div>
                    `);
                });
                
                setTimeout(() => { 
                    if (topologyInstance.current) topologyInstance.current.invalidateSize(); 
                }, 250);
            }
        }
        
        return () => {
            if (topologyInstance.current) {
                topologyInstance.current.remove();
                topologyInstance.current = null;
            }
        };
    }, [showTopology, compute]);

    const handleEnableAutomation = () => {
        onUpdateProject('apiConfig', {
            ...project.apiConfig,
            automationEnabled: true
        });
        alert("Live API Reconciliation enabled. Project will auto-sync with Huawei Cloud.");
    };

    return (
        <div className="p-8">
            <div className="mb-8 border-b border-slate-200 pb-4 flex justify-between items-end">
                <div>
                    <h3 className="font-black text-2xl text-slate-800">
                        <i className="fas fa-sitemap text-blue-600 mr-3"></i> 
                        Step 2: Architecture & Analysis
                    </h3>
                    <p className="text-sm text-slate-500 mt-2">
                        Review technical blueprint, map topology, and enable live API reconciliation.
                    </p>
                </div>
                {isCurrent && (
                    <button 
                        onClick={onPromote} 
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-transform active:scale-95"
                        title="Advance to Planning phase"
                    >
                        Approve Architecture & Advance <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                        <i className="fas fa-server text-blue-500"></i>
                        Resource Summary
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Virtual Machines</span>
                            <span className="text-xl font-black text-slate-800">{totalVms}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total CPU Cores</span>
                            <span className="text-xl font-black text-slate-800">{totalCpu}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total RAM (GB)</span>
                            <span className="text-xl font-black text-slate-800">{totalRam}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total Storage (GB)</span>
                            <span className="text-xl font-black text-slate-800">{totalStorage}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                        <i className="fas fa-robot text-indigo-500"></i>
                        API Orchestration Analysis
                    </h4>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-slate-700">Automation Potential</div>
                                <div className="text-xs text-slate-500">{assessment.message}</div>
                            </div>
                            <div className="text-2xl font-black text-indigo-600">{assessment.percentage}%</div>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${assessment.canAutoDeploy ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${assessment.percentage}%` }}
                            ></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                <div className="text-indigo-600 font-bold">Native API</div>
                                <div className="text-lg font-black text-slate-800">{assessment.nativeResources}</div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="text-slate-600 font-bold">SMS Required</div>
                                <div className="text-lg font-black text-slate-800">{assessment.smsResources}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                        <i className="fas fa-plug text-emerald-500"></i>
                        Live API Reconciliation
                    </h4>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-slate-700">Status</div>
                                <div className="text-xs text-slate-500">
                                    {project.apiConfig?.automationEnabled ? 'Active' : 'Disabled'}
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${project.apiConfig?.automationEnabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-800 border border-slate-200'}`}>
                                {project.apiConfig?.automationEnabled ? 'ON' : 'OFF'}
                            </div>
                        </div>
                        
                        {!project.apiConfig?.automationEnabled && (
                            <button 
                                onClick={handleEnableAutomation}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-bolt"></i>
                                Enable Live Sync
                            </button>
                        )}
                        
                        {project.apiConfig?.automationEnabled && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                <div className="flex items-center gap-3">
                                    <i className="fas fa-check-circle text-emerald-600 text-xl"></i>
                                    <div>
                                        <div className="font-bold text-emerald-800">API Reconciliation Active</div>
                                        <div className="text-xs text-emerald-700">
                                            Project will auto-sync with Huawei Cloud APIs
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <i className="fas fa-network-wired text-blue-500"></i>
                            Topology Visualization
                        </h4>
                        <button 
                            onClick={() => setShowTopology(!showTopology)}
                            className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold text-xs rounded-lg transition-colors"
                        >
                            {showTopology ? 'Hide Map' : 'Show Map'}
                        </button>
                    </div>
                    
                    {showTopology ? (
                        <div className="h-64 rounded-lg overflow-hidden border border-slate-300 relative">
                            <div ref={topologyRef} className="w-full h-full bg-slate-950"></div>
                        </div>
                    ) : (
                        <div className="h-64 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                                <i className="fas fa-map text-4xl text-slate-400 mb-3"></i>
                                <p className="text-sm text-slate-500">Click "Show Map" to visualize topology</p>
                            </div>
                        </div>
                    )}
                    
                    <div className="mt-4 text-xs text-slate-600">
                        {compute.length} compute nodes, {database.length} databases, {network.length} network resources
                    </div>
                </div>

                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <i className="fas fa-chart-bar text-purple-500"></i>
                            Technical Assessment
                        </h4>
                        <button 
                            onClick={() => setShowAssessment(!showAssessment)}
                            className="px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold text-xs rounded-lg transition-colors"
                        >
                            {showAssessment ? 'Hide Details' : 'Show Details'}
                        </button>
                    </div>
                    
                    {showAssessment && (
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="text-sm font-bold text-slate-700 mb-2">Migration Complexity</div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500" style={{ width: `${assessment.percentage}%` }}></div>
                                    </div>
                                    <div className="text-lg font-black text-purple-600">{assessment.percentage}%</div>
                                </div>
                                <div className="text-xs text-slate-500 mt-2">
                                    {assessment.canAutoDeploy 
                                        ? "High automation potential - Most resources can be deployed via API" 
                                        : "Medium complexity - SMS migration required for significant portion"}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">Native Resources</div>
                                    <div className="text-2xl font-black text-slate-800 mt-1">{assessment.nativeResources}</div>
                                    <div className="text-xs text-slate-600">PaaS, VPC, Subnet</div>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                    <div className="text-xs font-bold text-amber-600 uppercase tracking-widest">SMS Required</div>
                                    <div className="text-2xl font-black text-slate-800 mt-1">{assessment.smsResources}</div>
                                    <div className="text-xs text-slate-600">VM Migration</div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {!showAssessment && (
                        <div className="h-64 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                                <i className="fas fa-chart-pie text-4xl text-slate-400 mb-3"></i>
                                <p className="text-sm text-slate-500">Click "Show Details" for technical assessment</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}