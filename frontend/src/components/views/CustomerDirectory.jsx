import React, { useState, useEffect, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function CustomerDirectory() {
    const context = useContext(ERPContext);
    
    const customers = context.customers || [];
    const projects = context.projects || [];
    const handleUpdateCustomer = context.handleUpdateCustomer || function(){};
    const handleDeleteCustomer = context.handleDeleteCustomer || function(){};

    const [selectedId, setSelectedId] = useState(customers.length > 0 ? customers[0].id : null);
    
    useEffect(() => {
        if (customers.length > 0 && !selectedId) {
            setSelectedId(customers[0].id);
        }
    }, [customers, selectedId]);

    const activeCustomer = customers.find(c => c.id === selectedId);
    
    const linkedProjects = projects.filter(p => {
        if (p.isWaiting || p.isDeleted || !activeCustomer || !p.name) return false;
        return p.name.toLowerCase().includes((activeCustomer.name || '').toLowerCase().split(' ')[0]);
    });

    const [ak, setAk] = useState('');
    const [sk, setSk] = useState('');
    const [region, setRegion] = useState('la-south-2');
    
    useEffect(() => {
        if (activeCustomer) { 
            setAk(activeCustomer.ak || ''); 
            setSk(activeCustomer.sk || ''); 
            setRegion(activeCustomer.region || 'la-south-2'); 
        } else {
            setAk(''); setSk(''); setRegion('la-south-2');
        }
    }, [activeCustomer]);

    const handleSaveVault = () => {
        if (!activeCustomer) return;
        handleUpdateCustomer({ ...activeCustomer, ak, sk, region });
        alert("Secure Customer Vault Updated.");
    };

    // 🚨 THE DELETION PROTECTION FIX
    const confirmDelete = () => {
        const input = window.prompt(`CRITICAL WARNING:\n\nThis will permanently delete the Security Vault and cascade delete ALL associated projects from the Master Pipeline.\n\nTo confirm, type exactly: "${activeCustomer.name}"`);
        
        if (input === activeCustomer.name) {
            handleDeleteCustomer(activeCustomer.id);
            alert("Customer and associated projects permanently deleted.");
        } else if (input !== null) {
            alert("Confirmation failed. Deletion aborted.");
        }
    };

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto space-y-6 pb-12">
            <div className="bg-slate-900 rounded-2xl shadow-xl p-8 flex justify-between items-center text-white border border-slate-700">
                <div>
                    <h2 className="text-3xl font-black mb-2">
                        <i className="fas fa-building text-blue-400 mr-3"></i> Customer Directory
                    </h2>
                    <p className="text-sm text-slate-400">Master Accounts, Security Vaults, and Associated Portfolios.</p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total Managed Accounts</div>
                    <div className="text-3xl font-black text-blue-400">{customers.length}</div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-80 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[600px] flex flex-col">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <input type="text" placeholder="Search accounts..." className="w-full p-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {customers.length === 0 && (
                            <div className="p-8 text-center text-xs font-bold text-slate-400 border-2 border-dashed border-slate-200 rounded-xl m-2">
                                No customers generated yet. Move a lead to the pipeline to auto-generate an account.
                            </div>
                        )}
                        {customers.map(c => (
                            <div key={c.id} onClick={() => setSelectedId(c.id)} className={`p-4 rounded-xl cursor-pointer transition-colors border-2 ${selectedId === c.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}>
                                <div className="font-black text-sm text-slate-800 truncate">{c.name}</div>
                                <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">
                                    <i className={`fas fa-key mr-1 ${c.ak ? 'text-emerald-500' : 'text-slate-300'}`}></i> 
                                    {c.ak ? 'Vault Active' : 'Keys Missing'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {activeCustomer ? (
                    <div className="flex-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                <h3 className="font-black text-2xl text-slate-800">{activeCustomer.name}</h3>
                                {/* 🚨 UPDATED BUTTON TO TRIGGER PROTECTION MODAL */}
                                <button onClick={confirmDelete} className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">
                                    <i className="fas fa-trash-alt mr-2"></i> Delete Account
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4"><i className="fas fa-lock text-emerald-500 mr-2"></i> Security Vault</h4>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Access Key (AK)</label>
                                        <input type="password" value={ak} onChange={e => setAk(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-mono bg-slate-50 focus:border-blue-500 outline-none" placeholder="HW_XXXXXXXXXXXXXXXX" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Secret Key (SK)</label>
                                        <input type="password" value={sk} onChange={e => setSk(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-mono bg-slate-50 focus:border-blue-500 outline-none" placeholder="••••••••••••••••••••••••••••••••" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Default Region</label>
                                        <select value={region} onChange={e => setRegion(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold bg-white focus:border-blue-500 outline-none">
                                            <option value="la-south-2">la-south-2 (Mexico / Santiago)</option>
                                            <option value="la-north-2">la-north-2 (Lima)</option>
                                            <option value="sa-brazil-1">sa-brazil-1 (Sao Paulo)</option>
                                        </select>
                                    </div>
                                    <button onClick={handleSaveVault} className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md transition-colors">Update Security Vault</button>
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4"><i className="fas fa-folder-open text-blue-500 mr-2"></i> Active Portfolio</h4>
                                    <div className="space-y-3">
                                        {linkedProjects.length === 0 && (
                                            <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs font-bold text-slate-400">No active projects found.</div>
                                        )}
                                        {linkedProjects.map(p => (
                                            <div key={p.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                                                <div>
                                                    <div className="font-bold text-sm text-slate-800">{p.name}</div>
                                                    <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold"><i className="fas fa-globe-americas mr-1"></i> {p.country || 'Global'} | SA: {p.sa}</div>
                                                </div>
                                                <div className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">${p.mrr}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 min-h-[600px]">
                        <div className="text-center"><i className="fas fa-id-card text-6xl mb-4 opacity-30"></i><h3 className="font-black text-xl text-slate-500">Select a Customer Profile</h3><p className="text-sm mt-2 font-medium">Choose a customer from the left to manage keys.</p></div>
                    </div>
                )}
            </div>
        </div>
    );
}
