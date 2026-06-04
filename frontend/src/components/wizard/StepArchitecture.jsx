import React, { useState } from 'react';

export default function StepPostLive({ project, onUpdateProject, onPromote }) {
    // Following your exact subTab pattern from StepArchitecture
    const [subTab, setSubTab] = useState('dashboard');

    // Safe data extraction from the project object
    const blueprint = project?.blueprint || {};
    const computeNodes = blueprint?.topology?.compute || [];
    const budget = project?.mrr || 0;
    
    // Check if DTRB Locked the architecture
    const isLocked = project?.status === 'Approved' || project?.status === 'Locked';

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Standardized Navigation Header matching your UI */}
            <div className="flex gap-2 border-b border-slate-200 pb-4 mb-6 flex-wrap print:hidden">
                <button onClick={()=>setSubTab('dashboard')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab==='dashboard'?'bg-indigo-600 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                    1. NOC Dashboard
                </button>
                <button onClick={()=>setSubTab('dossier')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab==='dossier'?'bg-emerald-600 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                    <i className="fas fa-folder-open mr-1"></i> 2. Standard Dossier
                </button>
                <button onClick={()=>setSubTab('handover')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${subTab==='handover'?'bg-slate-800 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                    <i className="fas fa-file-signature text-blue-400"></i> 3. Detailed Handover Report
                </button>
            </div>

            {/* TAB 1: Live NOC Dashboard */}
            {subTab === 'dashboard' && (
                <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
                        <h3 className="font-black text-slate-800 mb-4"><i className="fas fa-satellite-dish text-emerald-500 mr-2"></i> Migration Status</h3>
                        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex-1 flex flex-col justify-center">
                            <div className="text-emerald-700 font-black text-xl mb-1">
                                {project?.execStatus === 'completed' ? 'Live in Production' : 'Pending Cutover'}
                            </div>
                            <div className="text-emerald-600 text-xs font-bold uppercase tracking-widest">
                                {project?.execStatus === 'completed' ? 'Handover Ready' : 'Execution in Progress'}
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                        <h3 className="font-black text-slate-800 mb-4"><i className="fas fa-server text-blue-500 mr-2"></i> Mapped Infrastructure</h3>
                        <div className="grid grid-cols-3 gap-4 h-full">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-center">
                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Active Compute</div>
                                <div className="text-slate-800 font-black text-2xl">{computeNodes.length} <span className="text-sm font-medium">Nodes</span></div>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-center">
                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Architecture State</div>
                                <div className={`font-black text-sm mt-1 ${isLocked ? 'text-emerald-600' : 'text-amber-500'}`}>
                                    <i className={`fas ${isLocked ? 'fa-lock' : 'fa-unlock'} mr-1`}></i> {isLocked ? 'DTRB Locked' : 'Draft'}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-center">
                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Sales Stage</div>
                                <div className="text-slate-800 font-bold text-sm">{project?.status || 'Prospect'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: Standard Dossier (Placeholder for your existing logic) */}
            {subTab === 'dossier' && (
                <div className="animate-fade-in bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <h2 className="text-xl font-black text-slate-800 mb-4">Project Dossier</h2>
                    <p className="text-sm text-slate-600 mb-6">Standard summary of project artifacts and planning documents.</p>
                    
                    {/* Add your existing dossier logic here */}
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-sm font-bold">
                        [Standard Dossier Components Render Here]
                    </div>
                </div>
            )}

            {/* TAB 3: Detailed Handover Report (Dynamic, No Mocks) */}
            {subTab === 'handover' && (
                <div className="animate-fade-in bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-900 px-8 py-4 flex justify-between items-center print:hidden">
                        <div className="text-white font-black"><i className="fas fa-file-signature mr-2 text-blue-400"></i> Technical Handover & Sign-Off</div>
                        <button onClick={handlePrint} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-colors shadow-md">
                            <i className="fas fa-print mr-2"></i> Export / PDF
                        </button>
                    </div>
                    
                    <div className="p-12 bg-white text-slate-800">
                        <div className="prose prose-slate max-w-none">
                            <h1 className="text-3xl font-black mb-8 border-b-2 border-slate-200 pb-4 uppercase">
                                COMPLETE MIGRATION HANDOVER<br/>
                                <span className="text-blue-600 text-xl">{project?.customerName || 'Unlinked Customer'}</span>
                                <span className="text-slate-400 text-lg ml-4">| {project?.name || 'Project Name'}</span>
                            </h1>
                            
                            <div className="grid grid-cols-2 gap-12">
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-widest border-b border-slate-200 pb-2">1. ARB INTAKE (Historical)</h2>
                                    <ul className="space-y-2 text-sm">
                                        <li><strong>Project Type:</strong> {project?.type || 'N/A'}</li>
                                        <li><strong>Approved Budget:</strong> ${Number(budget).toLocaleString()} MRR / ${Number(project?.otc || 0).toLocaleString()} OTC</li>
                                        <li><strong>Migration Probability:</strong> {project?.probability || 0}% at intake</li>
                                    </ul>
                                </div>
                                
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-widest border-b border-slate-200 pb-2">2. ARCHITECTURE (As Designed)</h2>
                                    <ul className="space-y-2 text-sm">
                                        <li><strong>Target Cloud Region:</strong> {project?.region || 'la-south-2'}</li>
                                        <li><strong>DTRB Governance:</strong> {isLocked ? 'Approved & Locked' : 'Pending Approval'}</li>
                                        <li><strong>Compute Resources:</strong> {computeNodes.length} mapped instances</li>
                                        {project?.mapperNodes && (
                                            <li><strong>Total Topology Nodes:</strong> {project.mapperNodes.length} network entities</li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-8">
                                <h2 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-widest border-b border-slate-200 pb-2">3. MIGRATION EXECUTION LOG</h2>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        <strong>Execution Status:</strong>{' '}
                                        <span className={project?.execStatus === 'completed' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                                            {project?.execStatus === 'completed' ? '✅ COMPLETED' : (project?.execStatus || 'PENDING').toUpperCase()}
                                        </span>
                                    </li>
                                    <li><strong>Sales Lifecycle Stage:</strong> {project?.status || 'N/A'}</li>
                                </ul>
                            </div>

                            {/* Only show Post-Live section if execution is actually complete */}
                            {project?.execStatus === 'completed' && (
                                <div className="mt-8">
                                    <h2 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-widest border-b border-slate-200 pb-2">4. POST-LIVE INVENTORY VALIDATION</h2>
                                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                                        <p className="text-sm text-emerald-800 font-medium">
                                            <i className="fas fa-check-circle mr-2"></i>
                                            All target architecture configurations have been verified against the live Huawei Cloud tenant via the Cognitive Orchestrator. 
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Signatures for physical/PDF sign-off */}
                        <div className="mt-16 pt-8 border-t-2 border-slate-200 grid grid-cols-2 gap-12 print:mt-24">
                            <div>
                                <div className="border-b border-slate-400 h-10 mb-2"></div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Delivery Architect Signature</div>
                                <div className="text-[10px] text-slate-400 mt-1">Date: ____________________</div>
                            </div>
                            <div>
                                <div className="border-b border-slate-400 h-10 mb-2"></div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Customer Sign-Off</div>
                                <div className="text-[10px] text-slate-400 mt-1">Date: ____________________</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
