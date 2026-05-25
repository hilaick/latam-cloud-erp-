import React, { useState } from 'react';
import ExcelUploader from '../views/ExcelUploader';
import WBSImportView from './WBSImportView';

export default function StepARB({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('intake');
    const [showUploader, setShowUploader] = useState(false);
    
    const blueprintData = project.blueprintData;
    const hasWbs = project.migrationPlan && project.migrationPlan.length > 0;
    
    const [artefacts, setArtefacts] = useState(project.artefacts || { hld: false, targetArch: false, sow: !!blueprintData });

    const toggleArtefact = (key) => {
        const updated = { ...artefacts, [key]: !artefacts[key] };
        setArtefacts(updated);
        onUpdateProject(project.id, 'artefacts', updated);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="px-8 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-2xl">
                <div className="flex flex-wrap gap-2">
                    <button onClick={()=>setSubTab('intake')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='intake'?'bg-purple-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-door-open mr-2"></i> 1. ARB Intake & SOW</button>
                    <button onClick={()=>setSubTab('wbs')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='wbs'?'bg-blue-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-sitemap mr-2"></i> 2. High-Level WBS (Sales)</button>
                </div>
                {isCurrent && <button onClick={onPromote} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95">Approve Gate <i className="fas fa-arrow-right ml-2"></i></button>}
            </div>

            <div className="p-8 bg-slate-100/50 rounded-b-2xl border-x border-b border-slate-200">
                {subTab === 'intake' && (
                    <div className="space-y-6 animate-fade-in">
                        
                        {/* 🚨 NEW: PRE-SALES HANDOVER DOSSIER */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                <h4 className="font-black text-lg text-slate-800"><i className="fas fa-briefcase text-blue-500 mr-2"></i> Pre-Sales Handover Context</h4>
                                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-200">Sales → Delivery</span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black mb-1">Customer Account</div><div className="font-bold text-sm text-slate-800">{project.customerName || project.name.split('-')[0] || 'TBD'}</div></div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black mb-1">Target MRR</div><div className="font-black text-sm text-emerald-600">${project.mrr || 0} /mo</div></div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black mb-1">Sales Architect</div><div className="font-bold text-sm text-blue-600">{project.sa || 'TBD'}</div></div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black mb-1">Complexity Level</div><div className="font-bold text-sm text-purple-600">{project.complexityLevel || 'Medium'}</div></div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h5 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-2">Technical Sizing Context</h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><span className="block text-[10px] uppercase font-bold text-slate-500">Source Environment</span><span className="font-bold text-sm text-slate-800">{project.sourceEnvironment || 'Unknown'}</span></div>
                                        <div><span className="block text-[10px] uppercase font-bold text-slate-500">Migration Type</span><span className="font-bold text-sm text-slate-800">{project.migrationType || 'Lift & Shift'}</span></div>
                                        <div><span className="block text-[10px] uppercase font-bold text-slate-500">Est. Workloads</span><span className="font-bold text-sm text-slate-800">{project.estimatedWorkloads || '0'} VMs</span></div>
                                        <div><span className="block text-[10px] uppercase font-bold text-slate-500">Est. Labor</span><span className="font-bold text-sm text-slate-800">{project.estimatedMigrationHours || '0'} Hours</span></div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h5 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-2">Business Scope & Blockers</h5>
                                    <div><span className="block text-[10px] uppercase font-bold text-slate-500">Discovery Scope / Notes</span><p className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1">{project.discoveryNotes || 'No notes provided by SA.'}</p></div>
                                    {project.blocker && <div><span className="block text-[10px] uppercase font-bold text-rose-500">Technical/Business Blockers</span><p className="text-sm font-medium text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200 mt-1">{project.blocker}</p></div>}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-widest text-slate-500 mb-6 border-b border-slate-100 pb-4">Mandatory Gate Artefacts</h4>
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-4 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                            <input type="checkbox" checked={artefacts.hld} onChange={() => toggleArtefact('hld')} className="w-5 h-5 accent-purple-600" />
                                            <div><div className="font-bold text-slate-800 text-sm">Present State HLD (As-Is)</div><div className="text-[10px] text-slate-500">Collect present environment state</div></div>
                                        </label>
                                        <label className="flex items-center gap-4 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                            <input type="checkbox" checked={artefacts.targetArch} onChange={() => toggleArtefact('targetArch')} className="w-5 h-5 accent-purple-600" />
                                            <div><div className="font-bold text-slate-800 text-sm">Target Architecture (To-Be)</div><div className="text-[10px] text-slate-500">Design cloud architecture strategy</div></div>
                                        </label>
                                        <label className="flex items-center gap-4 p-3 border border-slate-200 rounded-xl cursor-pointer bg-slate-50">
                                            <input type="checkbox" checked={hasWbs} readOnly className="w-5 h-5 accent-purple-600" />
                                            <div><div className="font-bold text-slate-800 text-sm">SA High-Level WBS Uploaded</div><div className="text-[10px] text-slate-500">Checked via WBS Tab</div></div>
                                        </label>
                                    </div>
                                </div>
                                <button onClick={() => setShowUploader(true)} className="mt-8 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-colors uppercase tracking-widest"><i className="fas fa-file-excel mr-2"></i> Upload Sales Quotation</button>
                            </div>

                            {blueprintData ? (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                                    <h4 className="font-black text-lg text-slate-800 mb-4 text-center border-b pb-4">Extracted Target Blueprint</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black">Customer</div><div className="font-bold text-sm truncate">{blueprintData.customer}</div></div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black">Total Servers</div><div className="font-bold text-sm text-blue-600">{blueprintData.topology?.compute?.length || 0}</div></div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black">Total Databases</div><div className="font-bold text-sm text-emerald-600">{blueprintData.topology?.database?.length || 0}</div></div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black">Est. Cloud Spend</div><div className="font-bold text-sm text-purple-600">${blueprintData.metadata?.estimated_monthly_cost || 0} /mo</div></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center flex flex-col justify-center">
                                    <i className="fas fa-file-invoice text-4xl text-slate-300 mb-3"></i>
                                    <h4 className="font-black text-slate-500">No Quotation Uploaded</h4>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {subTab === 'wbs' && <WBSImportView activeProject={project} onUpdateProject={onUpdateProject} />}
            </div>
            {showUploader && <ExcelUploader defaultCustomer={project.customerName || project.name.split('-')[0].trim()} onUpdateData={(data) => { onUpdateProject(project.id, 'blueprintData', data); setShowUploader(false); toggleArtefact('sow'); }} onClose={() => setShowUploader(false)} />}
        </div>
    );
}
