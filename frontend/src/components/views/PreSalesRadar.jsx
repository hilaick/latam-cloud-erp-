import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function PreSalesRadar() {
    const { projects, customers, handleAddProject, handleUpdateProject, handleDeleteProject } = useContext(ERPContext);

    const [searchTerm, setSearchTerm] = useState('');
    const [editingProject, setEditingProject] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    const radarProjects = (projects || []).filter(p => !p.execStatus || p.execStatus === 'radar' || p.execStatus === 'pending');
    const filteredProjects = radarProjects.filter(p => p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const openCreateModal = () => {
        setEditingProject({
            id: String(Date.now()), name: '', customerName: '', customerId: '', type: 'Migration',
            status: 'Prospect', mrr: 0, otc: 0, probability: 50, execStatus: 'radar'
        });
        setIsCreating(true);
    };

    const handleSave = () => {
        if (!editingProject.name || !editingProject.customerName) {
            return alert("Project Name and Customer Name are required.");
        }
        
        // Link the customer ID based on the selected/typed name seamlessly
        const linkedCustomer = (customers || []).find(c => c.name.toLowerCase() === editingProject.customerName.toLowerCase());
        if (linkedCustomer) {
            editingProject.customerId = linkedCustomer.id;
            editingProject.region = linkedCustomer.region; 
        }

        if (isCreating) {
            handleAddProject(editingProject);
        } else {
            handleUpdateProject(editingProject.id, editingProject);
        }
        setEditingProject(null);
        setIsCreating(false);
    };

    const promoteToPipeline = (project) => {
        // Removed the strict customerId block so you can promote freely
        handleUpdateProject(project.id, { ...project, status: 'Closed Won', execStatus: 'pending' });
    };

    return (
        <div className="max-w-[1600px] mx-auto pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <i className="fas fa-radar text-blue-600"></i> Pre-Sales Radar
                    </h2>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Opportunity Tracking & Quotation</p>
                </div>
                <div className="flex gap-4">
                    <input type="text" placeholder="Search opportunities..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 w-64 transition-colors" />
                    <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors"><i className="fas fa-plus mr-2"></i> New Opportunity</button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                            <th className="p-4 pl-6">Project Name</th>
                            <th className="p-4">Customer Name</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">MRR / OTC</th>
                            <th className="p-4 text-center">Probability</th>
                            <th className="p-4 text-right pr-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProjects.map(p => (
                            <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                                <td className="p-4 pl-6 font-bold text-slate-800">{p.name}</td>
                                <td className="p-4 text-xs font-bold text-slate-600"><i className="fas fa-shield-alt text-slate-400 mr-2"></i>{p.customerName || p.name.split('-')[0]}</td>
                                <td className="p-4 text-xs text-slate-600">{p.type}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        p.status === 'Closed Won' ? 'bg-emerald-100 text-emerald-700' :
                                        p.status === 'Negotiation' ? 'bg-amber-100 text-amber-700' :
                                        p.status === 'Proposal' ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>{p.status}</span>
                                </td>
                                <td className="p-4 font-mono text-xs text-slate-700">${Number(p.mrr).toLocaleString()} / ${Number(p.otc).toLocaleString()}</td>
                                <td className="p-4 text-center">
                                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-slate-200 text-xs font-black text-slate-700 bg-white shadow-sm">{p.probability}%</div>
                                </td>
                                <td className="p-4 pr-6 text-right space-x-3">
                                    <button onClick={() => { setEditingProject({...p}); setIsCreating(false); }} className="text-slate-400 hover:text-blue-600 transition-colors"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => { if(window.confirm('Delete opportunity?')) handleDeleteProject(p.id); }} className="text-slate-400 hover:text-rose-600 transition-colors"><i className="fas fa-trash"></i></button>
                                    <button onClick={() => promoteToPipeline(p)} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md transition-all ml-2 opacity-0 group-hover:opacity-100">Send to Delivery</button>
                                </td>
                            </tr>
                        ))}
                        {filteredProjects.length === 0 && (
                            <tr><td colSpan="7" className="p-8 text-center text-slate-500 text-sm font-bold">No opportunities in the radar.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editingProject && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-black text-slate-800">{isCreating ? 'New Opportunity' : 'Edit Opportunity'}</h3>
                            <button onClick={()=>setEditingProject(null)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Project Name *</label>
                                    <input type="text" value={editingProject.name} onChange={e=>setEditingProject({...editingProject, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-blue-500 transition-all" />
                                </div>
                                
                                {/* 🚨 RESTORED & INTEGRATED CUSTOMER FIELD */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Customer Account *</label>
                                    <input 
                                        type="text" 
                                        list="vault-customers"
                                        value={editingProject.customerName || ''} 
                                        onChange={e=>setEditingProject({...editingProject, customerName: e.target.value})} 
                                        placeholder="Type or select existing..."
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-blue-500 transition-all" 
                                    />
                                    <datalist id="vault-customers">
                                        {(customers || []).map(c => <option key={c.id} value={c.name} />)}
                                    </datalist>
                                    {(!customers || customers.length === 0 || !customers.find(c => c.name.toLowerCase() === (editingProject.customerName||'').toLowerCase())) && (
                                        <div className="mt-1 text-[9px] font-bold text-amber-600 uppercase tracking-widest flex items-center">
                                            <i className="fas fa-info-circle mr-1"></i> New entry will be auto-registered to Vault.
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Deal Type</label>
                                    <select value={editingProject.type} onChange={e=>setEditingProject({...editingProject, type: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-blue-500 transition-all">
                                        <option value="Migration">Cloud Migration</option>
                                        <option value="Modernization">App Modernization</option>
                                        <option value="Greenfield">Greenfield Deploy</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Sales Stage</label>
                                    <select value={editingProject.status} onChange={e=>setEditingProject({...editingProject, status: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-blue-500 transition-all">
                                        <option value="Prospect">Prospect</option>
                                        <option value="Qualification">Qualification</option>
                                        <option value="Proposal">Proposal / Quote</option>
                                        <option value="Negotiation">Negotiation</option>
                                        <option value="Closed Won">Closed Won</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">MRR ($)</label>
                                    <input type="number" value={editingProject.mrr} onChange={e=>setEditingProject({...editingProject, mrr: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-blue-500 transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">OTC ($)</label>
                                    <input type="number" value={editingProject.otc} onChange={e=>setEditingProject({...editingProject, otc: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-blue-500 transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Probability (%)</label>
                                    <input type="number" max="100" min="0" value={editingProject.probability} onChange={e=>setEditingProject({...editingProject, probability: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-blue-500 transition-all" />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={()=>setEditingProject(null)} className="px-6 py-2.5 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleSave} className="px-8 py-2.5 text-xs font-black text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"><i className="fas fa-save mr-2"></i> Save Opportunity</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
