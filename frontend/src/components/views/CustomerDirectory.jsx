import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function CustomerDirectory() {
    const { customers, handleAddCustomer, handleUpdateCustomer, handleDeleteCustomer } = useContext(ERPContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    const filteredCustomers = (customers || []).filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openCreateModal = () => {
        setEditingCustomer({
            id: String(Date.now()), 
            name: '', 
            region: 'la-south-2', 
            contact: '', 
            email: '',
            ak: '', sk: '', 
            tier1AK: '', tier1SK: '', 
            tier2AK: '', tier2SK: '', 
            tier3AK: '', tier3SK: '',
            awsAK: '', awsSK: '', 
            azureTenant: '', azureClient: '', azureSecret: '',
            vCenterHost: '',
            osDomain: '', osUser: '', osPassword: '' 
        });
        setIsCreating(true);
        setActiveTab('general');
    };

    const handleSave = () => {
        if (!editingCustomer.name) return alert("Customer Name is required.");
        
        if (isCreating) {
            handleAddCustomer(editingCustomer);
        } else {
            handleUpdateCustomer(editingCustomer.id, editingCustomer);
        }
        setEditingCustomer(null);
        setIsCreating(false);
    };

    const handleDelete = (id) => {
        if(window.confirm("Are you sure you want to permanently delete this customer's secure vault?")) {
            handleDeleteCustomer(id);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center">
                        <i className="fas fa-building text-blue-600 mr-3"></i> 
                        Enterprise Secure Vault
                    </h2>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Multi-Cloud Credential Matrix</p>
                </div>
                <div className="flex gap-4">
                    <input 
                        type="text" 
                        placeholder="Search accounts..." 
                        value={searchTerm} 
                        onChange={e=>setSearchTerm(e.target.value)} 
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 w-64 transition-colors" 
                    />
                    <button 
                        onClick={openCreateModal} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all"
                    >
                        <i className="fas fa-plus mr-2"></i> Register Vault
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCustomers.map(c => (
                    <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-black text-lg text-slate-800 truncate pr-4">{c.name}</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingCustomer({...c}); setIsCreating(false); setActiveTab('vault'); }} className="text-slate-400 hover:text-blue-600 transition-colors"><i className="fas fa-shield-alt"></i></button>
                                    <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-rose-600 transition-colors"><i className="fas fa-trash"></i></button>
                                </div>
                            </div>
                            <div className="space-y-2 mb-6">
                                <div className="text-xs text-slate-600 font-medium"><i className="fas fa-globe text-slate-400 w-4"></i> {c.region || 'la-south-2'}</div>
                            </div>
                            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                                {c.ak && <div className="w-full text-center text-[9px] font-black uppercase py-1.5 rounded bg-rose-50 text-rose-600 border border-rose-200 mb-1"><i className="fas fa-star mr-1"></i> Master Key Configured</div>}
                                
                                <div className="flex w-full gap-2 mt-1">
                                    <div className={`flex-1 text-center text-[9px] font-black uppercase py-1.5 rounded ${c.awsAK ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}><i className="fab fa-aws mr-1"></i> AWS</div>
                                    <div className={`flex-1 text-center text-[9px] font-black uppercase py-1.5 rounded ${c.azureTenant ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}><i className="fab fa-windows mr-1"></i> Azure</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {editingCustomer && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col border border-slate-700 max-h-[90vh] animate-slide-up">
                        
                        {/* TABS */}
                        <div className="flex border-b border-slate-200 bg-slate-50 pt-4 px-4 justify-between items-center shrink-0 overflow-x-auto">
                            <div className="flex">
                                <button onClick={()=>setActiveTab('general')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab==='general' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>General Info</button>
                                <button onClick={()=>setActiveTab('vault')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab==='vault' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-cloud mr-2"></i> Huawei Tiers</button>
                                <button onClick={()=>setActiveTab('multicloud')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab==='multicloud' ? 'border-amber-500 text-amber-600 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-network-wired mr-2"></i> Multi-Cloud</button>
                                <button onClick={()=>setActiveTab('os')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab==='os' ? 'border-purple-600 text-purple-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-terminal mr-2"></i> Data Plane</button>
                            </div>
                            <button onClick={()=>setEditingCustomer(null)} className="text-slate-400 hover:text-slate-700 mr-4"><i className="fas fa-times text-xl"></i></button>
                        </div>

                        {/* CONTENT AREA */}
                        <div className="p-8 overflow-y-auto bg-slate-50 space-y-6 flex-1 custom-scrollbar">
                            
                            {/* GENERAL TAB */}
                            {activeTab === 'general' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Company Name</label>
                                            <input type="text" value={editingCustomer.name} onChange={e=>setEditingCustomer({...editingCustomer, name: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 shadow-sm" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Target Cloud Region</label>
                                            <input type="text" value={editingCustomer.region} onChange={e=>setEditingCustomer({...editingCustomer, region: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 shadow-sm" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* HUAWEI TIERS TAB */}
                            {activeTab === 'vault' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 shadow-sm">
                                        <h4 className="font-black text-rose-800 text-sm mb-1"><i className="fas fa-star mr-2"></i>Master / Full Admin Key</h4>
                                        <p className="text-[10px] text-rose-600 font-bold mb-4 uppercase tracking-widest">Unrestricted access. Used to generate Sandbox identities.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="password" placeholder="Access Key" value={editingCustomer.ak || ''} onChange={e=>setEditingCustomer({...editingCustomer, ak: e.target.value})} className="p-3 border border-rose-300 rounded-lg text-xs font-mono outline-none focus:border-rose-500" />
                                            <input type="password" placeholder="Secret Key" value={editingCustomer.sk || ''} onChange={e=>setEditingCustomer({...editingCustomer, sk: e.target.value})} className="p-3 border border-rose-300 rounded-lg text-xs font-mono outline-none focus:border-rose-500" />
                                        </div>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 shadow-sm">
                                        <h4 className="font-black text-emerald-800 text-sm mb-1">Tier 2: Sandbox EPS Admin Key</h4>
                                        <p className="text-[10px] text-emerald-700 font-bold mb-4 uppercase tracking-widest">Scoped strictly to Day-1 Landing Zones.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="password" placeholder="Access Key" value={editingCustomer.tier2AK || ''} onChange={e=>setEditingCustomer({...editingCustomer, tier2AK: e.target.value})} className="p-3 border border-emerald-300 rounded-lg text-xs font-mono outline-none focus:border-emerald-500" />
                                            <input type="password" placeholder="Secret Key" value={editingCustomer.tier2SK || ''} onChange={e=>setEditingCustomer({...editingCustomer, tier2SK: e.target.value})} className="p-3 border border-emerald-300 rounded-lg text-xs font-mono outline-none focus:border-emerald-500" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* MULTI-CLOUD TAB */}
                            {activeTab === 'multicloud' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                        <h4 className="font-black text-slate-800 text-sm mb-1"><i className="fab fa-aws text-orange-500 mr-2"></i>AWS Control Plane</h4>
                                        <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase tracking-widest">Used for AWS Systems Manager (SSM) Push & API Discovery.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Access Key ID</label>
                                                <input type="password" placeholder="AKIA..." value={editingCustomer.awsAK || ''} onChange={e=>setEditingCustomer({...editingCustomer, awsAK: e.target.value})} className="w-full p-2.5 border rounded-lg text-xs font-mono outline-none focus:border-orange-500" />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Secret Access Key</label>
                                                <input type="password" placeholder="Secret..." value={editingCustomer.awsSK || ''} onChange={e=>setEditingCustomer({...editingCustomer, awsSK: e.target.value})} className="w-full p-2.5 border rounded-lg text-xs font-mono outline-none focus:border-orange-500" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                        <h4 className="font-black text-slate-800 text-sm mb-1"><i className="fab fa-windows text-blue-500 mr-2"></i>Azure Control Plane</h4>
                                        <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase tracking-widest">Used for Azure Run Command Push & API Discovery.</p>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tenant ID</label>
                                                <input type="password" value={editingCustomer.azureTenant || ''} onChange={e=>setEditingCustomer({...editingCustomer, azureTenant: e.target.value})} className="w-full p-2.5 border rounded-lg text-xs font-mono outline-none focus:border-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Client ID (App)</label>
                                                <input type="password" value={editingCustomer.azureClient || ''} onChange={e=>setEditingCustomer({...editingCustomer, azureClient: e.target.value})} className="w-full p-2.5 border rounded-lg text-xs font-mono outline-none focus:border-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Client Secret</label>
                                                <input type="password" value={editingCustomer.azureSecret || ''} onChange={e=>setEditingCustomer({...editingCustomer, azureSecret: e.target.value})} className="w-full p-2.5 border rounded-lg text-xs font-mono outline-none focus:border-blue-500" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                        <h4 className="font-black text-slate-800 text-sm mb-1"><i className="fas fa-server text-indigo-500 mr-2"></i>VMware vCenter</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">vCenter Host / IP</label>
                                                <input type="text" placeholder="vcenter.corp.local" value={editingCustomer.vCenterHost || ''} onChange={e=>setEditingCustomer({...editingCustomer, vCenterHost: e.target.value})} className="w-full p-2.5 border rounded-lg text-xs font-mono outline-none focus:border-indigo-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* OS / DATA PLANE TAB */}
                            {activeTab === 'os' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 shadow-sm">
                                        <h4 className="font-black text-indigo-900 text-sm mb-1"><i className="fas fa-terminal text-indigo-500 mr-2"></i>Local OS / Data Plane</h4>
                                        <p className="text-[10px] text-indigo-700 mb-4 font-bold uppercase tracking-widest">Used for direct SSH or WinRM agent installation loops.</p>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Domain</label>
                                                <input type="text" placeholder="(Optional)" value={editingCustomer.osDomain || ''} onChange={e=>setEditingCustomer({...editingCustomer, osDomain: e.target.value})} className="w-full p-3 border border-indigo-200 rounded-lg text-xs font-mono outline-none focus:border-indigo-500" />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Username</label>
                                                <input type="text" placeholder="root / Administrator" value={editingCustomer.osUser || ''} onChange={e=>setEditingCustomer({...editingCustomer, osUser: e.target.value})} className="w-full p-3 border border-indigo-200 rounded-lg text-xs font-mono outline-none focus:border-indigo-500" />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Password</label>
                                                <input type="password" placeholder="Password" value={editingCustomer.osPassword || ''} onChange={e=>setEditingCustomer({...editingCustomer, osPassword: e.target.value})} className="w-full p-3 border border-indigo-200 rounded-lg text-xs font-mono outline-none focus:border-indigo-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* FOOTER ACTIONS */}
                        <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3 rounded-b-2xl shrink-0">
                            <button onClick={()=>setEditingCustomer(null)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={handleSave} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-md transition-colors">Save Vault</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
