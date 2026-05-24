import React, { useState } from 'react';
import ExcelUploader from '../views/ExcelUploader';
import WBSImportView from './WBSImportView'; // NEW: Moved from Planning!

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
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
                )}
                {subTab === 'wbs' && <WBSImportView activeProject={project} onUpdateProject={onUpdateProject} />}
            </div>
            {showUploader && <ExcelUploader defaultCustomer={project.name.split('-')[0].trim()} onUpdateData={(data) => { onUpdateProject(project.id, 'blueprintData', data); setShowUploader(false); toggleArtefact('sow'); }} onClose={() => setShowUploader(false)} />}
        </div>
    );
}
