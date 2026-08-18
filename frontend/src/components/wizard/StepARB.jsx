import React, { useState } from 'react';
import ExcelUploader from '../views/ExcelUploader';
import QuotationHistory from '../views/QuotationHistory';
import WBSImportView from './WBSImportView';

export default function StepARB({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('intake');
    const [showUploader, setShowUploader] = useState(false);
    
    const blueprintData = project.blueprintData || (project.mapperNodes && project.mapperNodes.length > 0 ? { topology: { compute: project.mapperNodes.filter(n => n.type === 'ECS'), databases: project.mapperNodes.filter(n => n.type === 'RDS'), network: project.mapperNodes.filter(n => n.type === 'VPC'), storage: project.mapperNodes.filter(n => n.type === 'EVS') } } : null);
    
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
                {isCurrent && (
                    blueprintData 
                        ? <button onClick={onPromote} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95">Approve Gate <i className="fas fa-arrow-right ml-2"></i></button>
                        : <button disabled className="px-6 py-2.5 bg-slate-300 text-slate-500 font-black uppercase tracking-widest text-xs rounded-xl cursor-not-allowed shadow-md"><i className="fas fa-lock mr-2"></i>Upload Quotation BoM First</button>
                )}
            </div>

            <div className="p-8 bg-slate-100/50 rounded-b-2xl border-x border-b border-slate-200">
                {subTab === 'intake' && (
                    <div className="space-y-6 animate-fade-in">
                        
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                <h4 className="font-black text-xl text-slate-800"><i className="fas fa-briefcase text-blue-500 mr-2"></i> Pre-Sales Handover Context</h4>
                                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-200">Sales → Delivery</span>
                            </div>
                            
                            <div className="mb-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Customer Account</div><div className="font-black text-sm text-slate-800">{project.customerName || (project.name ? project.name.split('-')[0] : 'TBD') || 'TBD'}</div></div>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Target Country</div><div className="font-bold text-sm text-slate-800">{project.country || 'TBD'}</div></div>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Sales Architect</div><div className="font-bold text-sm text-blue-600">{project.sa || 'TBD'}</div></div>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Delivery Partner</div><div className="font-bold text-sm text-slate-800">{project.partner || 'TBD'}</div></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h5 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-2 mb-3">Discovery & Financials</h5>
                                    <div className="flex gap-4 mb-3">
                                        <div className="bg-emerald-50 p-3 flex-1 rounded-lg border border-emerald-200"><div className="text-[10px] text-emerald-600 uppercase font-black mb-1">Target MRR</div><div className="font-black text-lg text-emerald-700">${project.mrr || 0}</div></div>
                                        <div className="bg-slate-50 p-3 flex-1 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Close Date</div><div className="font-bold text-sm text-slate-800">{project.expectedCloseDate || 'TBD'}</div></div>
                                    </div>
                                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Discovery Scope / Requirements</div>
                                    <div className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[60px] whitespace-pre-wrap">{project.discoveryNotes || 'No notes provided by SA.'}</div>
                                </div>

                                <div>
                                    <h5 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-2 mb-3">Technical Sizing & Risks</h5>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="bg-slate-50 p-2 rounded border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold">Source Env</div><div className="font-bold text-xs text-slate-800">{project.sourceEnvironment || 'Unknown'}</div></div>
                                        <div className="bg-slate-50 p-2 rounded border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold">Workloads</div><div className="font-bold text-xs text-slate-800">{project.estimatedWorkloads || '0'} VMs</div></div>
                                        <div className="bg-slate-50 p-2 rounded border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold">Est. Labor</div><div className="font-bold text-xs text-slate-800">{project.estimatedMigrationHours || '0'} hrs</div></div>
                                        <div className="bg-purple-50 p-2 rounded border border-purple-200"><div className="text-[10px] text-purple-600 uppercase font-bold">Complexity</div><div className="font-bold text-xs text-purple-800">{project.complexityLevel || 'Medium'}</div></div>
                                    </div>
                                    {project.blocker ? (
                                        <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg"><div className="text-[10px] uppercase font-black text-rose-600 mb-1"><i className="fas fa-exclamation-triangle"></i> Blockers</div><p className="text-xs font-bold text-rose-800">{project.blocker}</p></div>
                                    ) : (
                                        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg"><div className="text-xs font-bold text-emerald-800"><i className="fas fa-check-circle"></i> No blockers reported.</div></div>
                                    )}
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
                                    </div>
                                </div>
                                <button onClick={() => setShowUploader(true)} className="mt-8 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-colors uppercase tracking-widest"><i className="fas fa-file-excel mr-2"></i> Upload SA Quotation BoM</button>
                            </div>

                            {blueprintData ? (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-black text-lg text-slate-800">Active SOW Blueprint Snapshot</h4>
                                        <button
                                            onClick={() => {
                                                onUpdateProject(project.id, 'blueprintData', null);
                                                const updated = { ...artefacts, sow: false };
                                                setArtefacts(updated);
                                                onUpdateProject(project.id, 'artefacts', updated);
                                            }}
                                            className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm"
                                            title="Clear the SOW blueprint data"
                                        >
                                            <i className="fas fa-trash-alt mr-1"></i> Clear SOW
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center mb-6 border-b pb-4">Parsed Quotation Data feeding Topology & Physics</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black">Customer</div><div className="font-bold text-sm truncate">{blueprintData.customer || project.customerName}</div></div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black">Total Compute (VMs)</div><div className="font-bold text-sm text-blue-600">{blueprintData.topology?.compute?.length || 0}</div></div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black">Total PaaS Databases</div><div className="font-bold text-sm text-rose-600">{(blueprintData.topology?.databases?.length || blueprintData.topology?.database?.length || 0)}</div></div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black">Storage, Net & Security</div><div className="font-bold text-sm text-amber-600">{(blueprintData.topology?.storage?.length || 0) + (blueprintData.topology?.network?.length || 0) + (blueprintData.topology?.security?.length || 0)} resources</div></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center flex flex-col justify-center">
                                    <i className="fas fa-file-invoice text-4xl text-slate-300 mb-3"></i>
                                    <h4 className="font-black text-slate-500">No Target Blueprint Uploaded</h4>
                                </div>
                            )}
                        </div>

                        {/* Quotation Version History */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                            <h4 className="font-black text-lg text-slate-800 mb-6 border-b pb-4 flex items-center gap-2">
                                <i className="fas fa-history text-blue-500"></i>
                                Quotation Version History
                            </h4>
                            <QuotationHistory 
                                projectId={project.id}
                                onRevert={(blueprint) => {
                                    onUpdateProject(project.id, 'blueprintData', blueprint);
                                    alert('Blueprint reverted to selected quotation version! Ensure you resync the Topology Mapper.');
                                }}
                            />
                        </div>
                    </div>
                )}
                {subTab === 'wbs' && <WBSImportView activeProject={project} onUpdateProject={onUpdateProject} />}
            </div>
            {showUploader && <ExcelUploader 
                defaultCustomer={project.customerName || (project.name ? project.name.split('-')[0].trim() : '')} 
                projectId={project.id}
                onUpdateData={(data) => { 
                    onUpdateProject(project.id, 'blueprintData', data); 
                    setShowUploader(false); 
                    toggleArtefact('sow'); 
                }} 
                onClose={() => setShowUploader(false)} 
            />}
        </div>
    );
}
