import React, { useContext, useState } from 'react';
import { ERPContext } from '../../context/ERPContext';
import StepARB from './StepARB';
import StepArchitecture from './StepArchitecture';
import StepPlanning from './StepPlanning';
import StepExecution from './StepExecution';
import StepPostLive from './StepPostLive';

export default function ProjectWizard() {
    const { projects, activeProjectId, handleUpdateProject, customers } = useContext(ERPContext);
    const [editingProject, setEditingProject] = useState(null);
    
    const project = projects.find(p => String(p.id) === String(activeProjectId));

    if (!project) {
        return <div className="p-12 text-center text-slate-500 font-bold bg-white rounded-2xl border border-slate-200 mt-8 shadow-sm">Please select a project from the Pipeline or Radar.</div>;
    }

    const isPoC = project.project_type === 'poc';

    let stages = [
        { id: '1_arb', name: '1. ARB Intake', icon: 'fa-door-open' },
        { id: '2_architecture', name: '2. Architecture', icon: 'fa-project-diagram' },
        { id: '3_planning', name: '3. Planning', icon: 'fa-tasks' },
        { id: '4_execution', name: '4. Execution', icon: 'fa-rocket' },
        { id: '5_postlive', name: '5. Post-Live', icon: 'fa-award' }
    ];

    if (isPoC) {
        stages = stages.filter(s => s.id !== '5_postlive');
    }

    const handlePromote = () => {
        const currentIndex = stages.findIndex(s => s.id === project.lifecycleState);
        if (currentIndex >= 0 && currentIndex < stages.length - 1) {
            const nextState = stages[currentIndex + 1].id;
            handleUpdateProject(project.id, 'lifecycleState', nextState);
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
        } else if (currentIndex === stages.length - 1) {
            handleUpdateProject(project.id, 'lifecycleState', '6_completed');
            alert("Project Closed Successfully!");
        }
    };

    const renderStage = () => {
        switch(project.lifecycleState) {
            case '1_arb': return <StepARB project={project} onUpdateProject={handleUpdateProject} onPromote={handlePromote} isCurrent={true} />;
            case '2_architecture': return <StepArchitecture project={project} onUpdateProject={handleUpdateProject} onPromote={handlePromote} isCurrent={true} />;
            case '3_planning': return <StepPlanning project={project} onUpdateProject={handleUpdateProject} onPromote={handlePromote} isCurrent={true} />;
            case '4_execution': return <StepExecution project={project} onUpdateProject={handleUpdateProject} onPromote={handlePromote} isCurrent={true} />;
            case '5_postlive': return <StepPostLive project={project} onUpdateProject={handleUpdateProject} onPromote={handlePromote} isCurrent={true} />;
            default: return <StepARB project={project} onUpdateProject={handleUpdateProject} onPromote={handlePromote} isCurrent={true} />;
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in relative">
            
            {isPoC && (
                <div className="bg-amber-100 border border-amber-300 text-amber-800 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center shadow-sm animate-fade-in">
                    <i className="fas fa-bolt mr-3 text-amber-600 text-lg"></i> 
                    <div>
                        <div>Fast-Track PoC Lifecycle Active</div>
                        <div className="text-[10px] font-bold text-amber-700/70 lowercase tracking-normal mt-0.5">Post-Live governance constraints bypassed. Hard TTL enforced.</div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex justify-between items-center group">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center">
                        {project.name}
                        <button 
                            onClick={() => setEditingProject({...project})} 
                            className="ml-4 text-sm text-slate-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100" 
                            title="Edit Core Project Context"
                        >
                            <i className="fas fa-edit"></i>
                        </button>
                    </h2>
                    <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">SA: {project.sa || 'TBD'} | Country: {project.country || 'TBD'}</div>
                </div>
                <div className="font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-4 py-2 rounded-lg shadow-sm">${project.mrr || 0}</div>
            </div>

            <div className="flex gap-2 bg-slate-200 p-1.5 rounded-xl overflow-x-auto shadow-inner">
                {stages.map(stg => (
                    <button key={stg.id} onClick={() => handleUpdateProject(project.id, 'lifecycleState', stg.id)} className={`flex-1 min-w-[150px] py-3 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all ${project.lifecycleState === stg.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-300'}`}>
                        <i className={`fas ${stg.icon} mr-2`}></i> {stg.name}
                    </button>
                ))}
            </div>

            {renderStage()}

            {editingProject && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 flex flex-col border border-slate-700 animate-slide-up">
                        <div className="bg-slate-900 px-8 py-5 rounded-t-2xl flex justify-between items-center text-white shrink-0">
                            <h3 className="font-black text-xl text-blue-400"><i className="fas fa-clipboard-list mr-3"></i> Pre-Sales Context / Core Settings</h3>
                            <button onClick={()=>setEditingProject(null)} className="text-slate-400 hover:text-white"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-8 overflow-y-auto bg-slate-50 space-y-8 flex-1">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-black text-sm text-slate-800 uppercase mb-4 border-b pb-2"><i className="fas fa-info-circle text-blue-500 mr-2"></i> Project Foundation</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Customer Account / Vault Link</label>
                                        <select 
                                            value={editingProject.customerName || ''} 
                                            onChange={e => {
                                                const selectedName = e.target.value;
                                                const matched = (customers || []).find(c => c.name === selectedName);
                                                setEditingProject({ ...editingProject, customerName: selectedName, customerId: matched ? matched.id : null });
                                            }} 
                                            className="w-full p-2 border border-slate-300 rounded bg-white focus:border-blue-500 outline-none text-sm font-bold cursor-pointer"
                                        >
                                            <option value="">-- Select Customer Profile --</option>
                                            {(customers || []).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Project Name</label><input type="text" value={editingProject.name || ''} onChange={e=>setEditingProject({...editingProject, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sales Architect</label><input type="text" value={editingProject.sa || ''} onChange={e=>setEditingProject({...editingProject, sa: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Delivery Partner</label><input type="text" value={editingProject.partner || ''} onChange={e=>setEditingProject({...editingProject, partner: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Country</label><input type="text" value={editingProject.country || ''} onChange={e=>setEditingProject({...editingProject, country: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Project Health</label><select value={editingProject.health || 'Green'} onChange={e=>setEditingProject({...editingProject, health: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold bg-white"><option>Green</option><option>Yellow</option><option>Red</option></select></div>
                                </div>
                            </div>

                            {/* 🚨 NEW: Execution & Governance Boundaries */}
                            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600 rounded-bl-full opacity-5 -mr-10 -mt-10"></div>
                                <h4 className="font-black text-sm text-indigo-900 uppercase mb-4 border-b border-indigo-200 pb-2 relative z-10"><i className="fas fa-shield-alt text-indigo-500 mr-2"></i> Execution & Governance Boundaries</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1">Source Authentication Level (Agent Strategy)</label>
                                        <select value={editingProject.authLevel || 'Read-Only (Customer Managed)'} onChange={e=>setEditingProject({...editingProject, authLevel: e.target.value})} className="w-full p-3 border border-indigo-300 rounded-lg text-sm font-bold outline-none focus:border-indigo-600 bg-white cursor-pointer shadow-sm">
                                            <option value="Cloud Admin API">Cloud Admin API (Automated Agentless Push)</option>
                                            <option value="Active Directory Domain Admin">Active Directory Domain Admin (Automated GPO/WinRM Push)</option>
                                            <option value="Local OS Admin">Local OS Admin / Root (Automated SSH Injection)</option>
                                            <option value="Read-Only (Customer Managed)">Read-Only / No OS Access (Customer Managed Runbooks)</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-1.5">
                                        <label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1"><i className="fas fa-box text-amber-500 mr-1"></i> Sandbox EPS (Day-1 Validation)</label>
                                        <input type="text" value={editingProject.sandboxEps || ''} onChange={e=>setEditingProject({...editingProject, sandboxEps: e.target.value})} placeholder="EPS-Staging-ID" className="w-full p-3 border border-amber-300 rounded-lg text-sm font-mono outline-none focus:border-amber-600 bg-amber-50" />
                                    </div>
                                    <div className="md:col-span-1.5">
                                        <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1"><i className="fas fa-rocket text-emerald-500 mr-1"></i> Production EPS (Day-2 Cutover)</label>
                                        <input type="text" value={editingProject.prodEps || ''} onChange={e=>setEditingProject({...editingProject, prodEps: e.target.value})} placeholder="EPS-Production-ID" className="w-full p-3 border border-emerald-300 rounded-lg text-sm font-mono outline-none focus:border-emerald-600 bg-emerald-50" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-black text-sm text-slate-800 uppercase mb-4 border-b pb-2"><i className="fas fa-search-dollar text-emerald-500 mr-2"></i> Commercials & Timelines</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5">
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kickoff / Start Date</label><input type="date" value={editingProject.kickoff || ''} onChange={e=>setEditingProject({...editingProject, kickoff: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none text-sm font-bold font-mono" /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Go-Live Date</label><input type="date" value={editingProject.date || ''} onChange={e=>setEditingProject({...editingProject, date: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none text-sm font-bold font-mono" /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Complexity</label><select value={editingProject.complexity || 'Medium'} onChange={e=>setEditingProject({...editingProject, complexity: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold bg-white"><option>Low</option><option>Medium</option><option>High</option><option>Ultra-High</option></select></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target MRR (USD)</label><input type="number" value={editingProject.mrr || ''} onChange={e=>setEditingProject({...editingProject, mrr: Number(e.target.value)})} className="w-full p-2 border border-emerald-300 rounded bg-emerald-50 text-emerald-900 focus:border-emerald-500 outline-none text-sm font-black" /></div>
                                </div>
                                <div className="space-y-4">
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Scope / Discovery Notes</label><textarea rows="3" value={editingProject.scope || editingProject.discoveryNotes || ''} onChange={e=>setEditingProject({...editingProject, scope: e.target.value, discoveryNotes: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 outline-none text-sm font-medium leading-relaxed"></textarea></div>
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-200 bg-white rounded-b-2xl flex justify-end gap-3 shrink-0">
                            <button onClick={()=>setEditingProject(null)} className="px-6 py-2.5 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                            <button onClick={()=>{ handleUpdateProject(editingProject.id, editingProject); setEditingProject(null); }} className="px-8 py-2.5 text-xs font-black text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"><i className="fas fa-save mr-2"></i> Save Context</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
