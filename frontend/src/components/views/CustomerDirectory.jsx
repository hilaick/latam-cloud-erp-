import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import TwoFactorModal from '../utils/TwoFactorModal';
import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import TwoFactorModal from '../utils/TwoFactorModal';

export default function CustomerDirectory() {
    const { customers, handleAddCustomer, handleUpdateCustomer, handleDeleteCustomer } = useContext(ERPContext);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [activeTab, setActiveTab] = useState('general');

    const filteredCustomers = (customers || []).filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const openCreateModal = () => {
        setEditingCustomer({
            id: String(Date.now()), name: '', contact: '', email: '', region: 'la-south-2',
            ak: '', sk: '', // Master / Full Admin Keys (Legacy DB Fields)
            tier1AK: '', tier1SK: '', // Tier 1 Global Read-Only
            tier2AK: '', tier2SK: '', // Tier 2 Sandbox Admin
            tier3AK: '', tier3SK: '', // Tier 3 Prod Admin
            osDomain: '', osUser: '', osPassword: '', vCenterHost: ''
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

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><i className="fas fa-building text-blue-600"></i> Customer Directory & Secure Vault</h2>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Multi-Tiered Least Privilege Credential Management</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <i className="fas fa-search absolute left-4 top-3.5 text-slate-400"></i>
                        <input type="text" placeholder="Search accounts..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 w-64" />
                    </div>
                    <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors"><i className="fas fa-plus mr-2"></i> Register Customer</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCustomers.map(c => (
                    <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 z-0 transition-transform group-hover:scale-110"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-black text-lg text-slate-800 truncate pr-4">{c.name}</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingCustomer({...c}); setIsCreating(false); setActiveTab('vault'); }} className="text-slate-400 hover:text-blue-600 transition-colors"><i className="fas fa-shield-alt"></i></button>
                                </div>
                            </div>
                            <div className="space-y-2 mb-6">
                                <div className="text-xs text-slate-600 font-medium"><i className="fas fa-globe text-slate-400 w-4"></i> Region: {c.region || 'la-south-2'}</div>
                                <div className="text-xs text-slate-600 font-medium"><i className="fas fa-user text-slate-400 w-4"></i> {c.contact || 'No Primary Contact'}</div>
                            </div>
                            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                                {c.ak ? (
                                    <div className="w-full text-center text-[9px] font-black uppercase tracking-widest py-1.5 rounded bg-rose-50 text-rose-600 border border-rose-200 mb-1"><i className="fas fa-star mr-1"></i> Master Admin Configured</div>
                                ) : null}
                                <div className="flex w-full gap-2">
                                    <div className={`flex-1 text-center text-[9px] font-black uppercase tracking-widest py-1.5 rounded ${c.tier1AK ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>Tier 1</div>
                                    <div className={`flex-1 text-center text-[9px] font-black uppercase tracking-widest py-1.5 rounded ${c.tier2AK ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>Tier 2</div>
                                    <div className={`flex-1 text-center text-[9px] font-black uppercase tracking-widest py-1.5 rounded ${c.tier3AK ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>Tier 3</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {editingCustomer && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col border border-slate-700 animate-slide-up max-h-[90vh]">
                        <div className="bg-slate-900 px-8 py-5 rounded-t-2xl flex justify-between items-center text-white shrink-0">
                            <div>
                                <h3 className="font-black text-xl text-blue-400"><i className="fas fa-user-shield mr-3"></i> {isCreating ? 'Register Customer' : 'Customer Profile & Vault'}</h3>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Enterprise Credential Matrix</p>
                            </div>
                            <div className="flex gap-4">
                                {!isCreating && <button onClick={()=>setCustomerToDelete(editingCustomer.id)} className="text-rose-400 hover:text-rose-300 text-xs font-black uppercase tracking-widest"><i className="fas fa-trash mr-1"></i> Delete</button>}
                                <button onClick={()=>setEditingCustomer(null)} className="text-slate-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
                            </div>
                        </div>

                        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
                            <button onClick={()=>setActiveTab('general')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab==='general' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>General Info</button>
                            <button onClick={()=>setActiveTab('vault')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab==='vault' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-key mr-2"></i> Cloud API Keys</button>
                            <button onClick={()=>setActiveTab('os')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab==='os' ? 'border-purple-600 text-purple-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-terminal mr-2"></i> OS & Data Plane</button>
                        </div>

                        <div className="p-8 overflow-y-auto bg-slate-50 space-y-6 flex-1 custom-scrollbar">
                            {activeTab === 'general' && (
                                <div className="space-y-5 animate-fade-in">
                                    <div className="grid grid-cols-2 gap-5">
                                        <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Company Name *</label><input type="text" value={editingCustomer.name} onChange={e=>setEditingCustomer({...editingCustomer, name: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500" /></div>
                                        <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Default Cloud Region</label><input type="text" value={editingCustomer.region || ''} onChange={e=>setEditingCustomer({...editingCustomer, region: e.target.value})} placeholder="e.g. la-south-2" className="w-full p-3 border border-slate-300 rounded-lg text-sm font-mono outline-none focus:border-blue-500" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Primary Contact</label><input type="text" value={editingCustomer.contact || ''} onChange={e=>setEditingCustomer({...editingCustomer, contact: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm font-medium outline-none focus:border-blue-500" /></div>
                                        <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Contact Email</label><input type="email" value={editingCustomer.email || ''} onChange={e=>setEditingCustomer({...editingCustomer, email: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm font-medium outline-none focus:border-blue-500" /></div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'vault' && (
                                <div className="space-y-6 animate-fade-in">
                                    {/* 🚨 MASTER FULL ADMIN KEY (LEGACY FALLBACK) */}
                                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 relative shadow-sm">
                                        <div className="absolute top-0 right-0 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg rounded-tr-xl"><i className="fas fa-star mr-1"></i> Global Master</div>
                                        <h4 className="font-black text-rose-800 text-sm mb-1">Master / Full Admin Key</h4>
                                        <p className="text-[10px] text-rose-600 font-bold mb-4">Legacy Root Key. Provides unrestricted access across all Enterprise Projects. If tiered keys below are missing, the ERP will fall back to using this key.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-[9px] font-black text-rose-700 uppercase tracking-widest mb-1">Access Key (AK)</label><input type="password" value={editingCustomer.ak || ''} onChange={e=>setEditingCustomer({...editingCustomer, ak: e.target.value})} className="w-full p-2.5 border border-rose-300 rounded-lg text-xs font-mono outline-none focus:border-rose-500 bg-white" /></div>
                                            <div><label className="block text-[9px] font-black text-rose-700 uppercase tracking-widest mb-1">Secret Key (SK)</label><input type="password" value={editingCustomer.sk || ''} onChange={e=>setEditingCustomer({...editingCustomer, sk: e.target.value})} className="w-full p-2.5 border border-rose-300 rounded-lg text-xs font-mono outline-none focus:border-rose-500 bg-white" /></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="h-px bg-slate-300 flex-1"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Least Privilege Compliance Tiers</span>
                                        <div className="h-px bg-slate-300 flex-1"></div>
                                    </div>

                                    {/* TIER 1 */}
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 relative">
                                        <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg rounded-tr-xl">Day 0: Discovery</div>
                                        <h4 className="font-black text-emerald-800 text-sm mb-1">Tier 1: Global Read-Only Key</h4>
                                        <p className="text-[10px] text-emerald-600 font-bold mb-4">Strictly for MgC Source Discovery. Cannot modify production environments.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">Access Key (AK)</label><input type="password" value={editingCustomer.tier1AK || ''} onChange={e=>setEditingCustomer({...editingCustomer, tier1AK: e.target.value})} className="w-full p-2.5 border border-emerald-300 rounded-lg text-xs font-mono outline-none focus:border-emerald-500 bg-white" /></div>
                                            <div><label className="block text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">Secret Key (SK)</label><input type="password" value={editingCustomer.tier1SK || ''} onChange={e=>setEditingCustomer({...editingCustomer, tier1SK: e.target.value})} className="w-full p-2.5 border border-emerald-300 rounded-lg text-xs font-mono outline-none focus:border-emerald-500 bg-white" /></div>
                                        </div>
                                    </div>

                                    {/* TIER 2 */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 relative">
                                        <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg rounded-tr-xl">Day 1: Execution</div>
                                        <h4 className="font-black text-amber-800 text-sm mb-1">Tier 2: Sandbox EPS Admin Key</h4>
                                        <p className="text-[10px] text-amber-700 font-bold mb-4">Used by RFS to provision landing zones. Scoped strictly to the Sandbox Project ID.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">Access Key (AK)</label><input type="password" value={editingCustomer.tier2AK || ''} onChange={e=>setEditingCustomer({...editingCustomer, tier2AK: e.target.value})} className="w-full p-2.5 border border-amber-300 rounded-lg text-xs font-mono outline-none focus:border-amber-500 bg-white" /></div>
                                            <div><label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">Secret Key (SK)</label><input type="password" value={editingCustomer.tier2SK || ''} onChange={e=>setEditingCustomer({...editingCustomer, tier2SK: e.target.value})} className="w-full p-2.5 border border-amber-300 rounded-lg text-xs font-mono outline-none focus:border-amber-500 bg-white" /></div>
                                        </div>
                                    </div>

                                    {/* TIER 3 */}
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 relative">
                                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg rounded-tr-xl">Day 2: Handover</div>
                                        <h4 className="font-black text-indigo-800 text-sm mb-1">Tier 3: Production EPS Admin Key</h4>
                                        <p className="text-[10px] text-indigo-700 font-bold mb-4">Used exclusively during DTRB-approved cutovers to bind prod EIPs and SGs.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-[9px] font-black text-indigo-700 uppercase tracking-widest mb-1">Access Key (AK)</label><input type="password" value={editingCustomer.tier3AK || ''} onChange={e=>setEditingCustomer({...editingCustomer, tier3AK: e.target.value})} className="w-full p-2.5 border border-indigo-300 rounded-lg text-xs font-mono outline-none focus:border-indigo-500 bg-white" /></div>
                                            <div><label className="block text-[9px] font-black text-indigo-700 uppercase tracking-widest mb-1">Secret Key (SK)</label><input type="password" value={editingCustomer.tier3SK || ''} onChange={e=>setEditingCustomer({...editingCustomer, tier3SK: e.target.value})} className="w-full p-2.5 border border-indigo-300 rounded-lg text-xs font-mono outline-none focus:border-indigo-500 bg-white" /></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'os' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                        <h4 className="font-black text-slate-800 text-sm mb-1"><i className="fab fa-windows text-blue-500 mr-2"></i> Active Directory / OS Admin</h4>
                                        <p className="text-[10px] text-slate-500 font-bold mb-4 leading-relaxed">If provided, the ERP bypasses the Cloud Control plane and pushes MgC Agents directly to the Data Plane via SSH or WinRM loops.</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Domain (e.g. CORP)</label><input type="text" value={editingCustomer.osDomain || ''} onChange={e=>setEditingCustomer({...editingCustomer, osDomain: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-purple-500" /></div>
                                            <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Admin Username</label><input type="text" value={editingCustomer.osUser || ''} onChange={e=>setEditingCustomer({...editingCustomer, osUser: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-purple-500" /></div>
                                            <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Admin Password</label><input type="password" value={editingCustomer.osPassword || ''} onChange={e=>setEditingCustomer({...editingCustomer, osPassword: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-purple-500" /></div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                        <h4 className="font-black text-slate-800 text-sm mb-1"><i className="fas fa-server text-emerald-500 mr-2"></i> VMware vCenter Access</h4>
                                        <p className="text-[10px] text-slate-500 font-bold mb-4 leading-relaxed">For agentless snapshot migrations. Requires network line-of-sight to the vCenter API.</p>
                                        <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">vCenter Host / IP</label><input type="text" value={editingCustomer.vCenterHost || ''} onChange={e=>setEditingCustomer({...editingCustomer, vCenterHost: e.target.value})} placeholder="https://vcenter.local" className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-emerald-500" /></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="px-8 py-5 border-t border-slate-200 bg-white rounded-b-2xl flex justify-end gap-3 shrink-0">
                            <button onClick={()=>setEditingCustomer(null)} className="px-6 py-2.5 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleSave} className="px-8 py-2.5 text-xs font-black text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"><i className="fas fa-save mr-2"></i> Save Profile</button>
                        </div>
                    </div>
                </div>
            )}

            {customerToDelete && (
                <TwoFactorModal actionName="Delete Customer & Purge Keys" onConfirm={() => { handleDeleteCustomer(customerToDelete); setCustomerToDelete(null); setEditingCustomer(null); }} onCancel={() => setCustomerToDelete(null)} />
            )}
        </div>
    );
}

export default function CustomerDirectory() {
    const { customers, handleAddCustomer, handleUpdateCustomer, handleDeleteCustomer } = useContext(ERPContext);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [activeTab, setActiveTab] = useState('general');

    const filteredCustomers = (customers || []).filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const openCreateModal = () => {
        setEditingCustomer({
            id: String(Date.now()), name: '', contact: '', email: '',
            tier1AK: '', tier1SK: '', // Read-Only
            tier2AK: '', tier2SK: '', // Sandbox Admin
            tier3AK: '', tier3SK: '', // Prod Admin
            osDomain: '', osUser: '', osPassword: '', vCenterHost: ''
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

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><i className="fas fa-building text-blue-600"></i> Customer Directory & Secure Vault</h2>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Multi-Tiered Least Privilege Credential Management</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <i className="fas fa-search absolute left-4 top-3.5 text-slate-400"></i>
                        <input type="text" placeholder="Search accounts..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 w-64" />
                    </div>
                    <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors"><i className="fas fa-plus mr-2"></i> Register Customer</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCustomers.map(c => (
                    <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 z-0 transition-transform group-hover:scale-110"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-black text-lg text-slate-800 truncate pr-4">{c.name}</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingCustomer({...c}); setIsCreating(false); setActiveTab('vault'); }} className="text-slate-400 hover:text-blue-600 transition-colors"><i className="fas fa-shield-alt"></i></button>
                                </div>
                            </div>
                            <div className="space-y-2 mb-6">
                                <div className="text-xs text-slate-600 font-medium"><i className="fas fa-user text-slate-400 w-4"></i> {c.contact || 'No Primary Contact'}</div>
                                <div className="text-xs text-slate-600 font-medium"><i className="fas fa-envelope text-slate-400 w-4"></i> {c.email || 'No Email'}</div>
                            </div>
                            <div className="flex gap-2 border-t border-slate-100 pt-4">
                                <div className={`flex-1 text-center text-[9px] font-black uppercase tracking-widest py-1.5 rounded ${c.tier1AK ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>Tier 1</div>
                                <div className={`flex-1 text-center text-[9px] font-black uppercase tracking-widest py-1.5 rounded ${c.tier2AK ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>Tier 2</div>
                                <div className={`flex-1 text-center text-[9px] font-black uppercase tracking-widest py-1.5 rounded ${c.tier3AK ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>Tier 3</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {editingCustomer && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col border border-slate-700 animate-slide-up max-h-[90vh]">
                        <div className="bg-slate-900 px-8 py-5 rounded-t-2xl flex justify-between items-center text-white shrink-0">
                            <div>
                                <h3 className="font-black text-xl text-blue-400"><i className="fas fa-user-shield mr-3"></i> {isCreating ? 'Register Customer' : 'Customer Profile & Vault'}</h3>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Enterprise Credential Matrix</p>
                            </div>
                            <div className="flex gap-4">
                                {!isCreating && <button onClick={()=>setCustomerToDelete(editingCustomer.id)} className="text-rose-400 hover:text-rose-300 text-xs font-black uppercase tracking-widest"><i className="fas fa-trash mr-1"></i> Delete</button>}
                                <button onClick={()=>setEditingCustomer(null)} className="text-slate-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
                            </div>
                        </div>

                        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
                            <button onClick={()=>setActiveTab('general')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab==='general' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>General Info</button>
                            <button onClick={()=>setActiveTab('vault')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab==='vault' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-key mr-2"></i> Cloud API Keys</button>
                            <button onClick={()=>setActiveTab('os')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab==='os' ? 'border-purple-600 text-purple-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-terminal mr-2"></i> OS & Data Plane</button>
                        </div>

                        <div className="p-8 overflow-y-auto bg-slate-50 space-y-6 flex-1 custom-scrollbar">
                            {activeTab === 'general' && (
                                <div className="space-y-5 animate-fade-in">
                                    <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Company Name *</label><input type="text" value={editingCustomer.name} onChange={e=>setEditingCustomer({...editingCustomer, name: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500" /></div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Primary Contact</label><input type="text" value={editingCustomer.contact} onChange={e=>setEditingCustomer({...editingCustomer, contact: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm font-medium outline-none focus:border-blue-500" /></div>
                                        <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Contact Email</label><input type="email" value={editingCustomer.email} onChange={e=>setEditingCustomer({...editingCustomer, email: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm font-medium outline-none focus:border-blue-500" /></div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'vault' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 relative">
                                        <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg rounded-tr-xl">Day 0: Discovery</div>
                                        <h4 className="font-black text-emerald-800 text-sm mb-1">Tier 1: Global Read-Only Key</h4>
                                        <p className="text-[10px] text-emerald-600 font-bold mb-4">Required for MgC Source Discovery. Cannot modify production.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">Access Key (AK)</label><input type="password" value={editingCustomer.tier1AK || ''} onChange={e=>setEditingCustomer({...editingCustomer, tier1AK: e.target.value})} className="w-full p-2.5 border border-emerald-300 rounded-lg text-xs font-mono outline-none" /></div>
                                            <div><label className="block text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">Secret Key (SK)</label><input type="password" value={editingCustomer.tier1SK || ''} onChange={e=>setEditingCustomer({...editingCustomer, tier1SK: e.target.value})} className="w-full p-2.5 border border-emerald-300 rounded-lg text-xs font-mono outline-none" /></div>
                                        </div>
                                    </div>

                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 relative">
                                        <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg rounded-tr-xl">Day 1: Execution</div>
                                        <h4 className="font-black text-amber-800 text-sm mb-1">Tier 2: Sandbox EPS Admin Key</h4>
                                        <p className="text-[10px] text-amber-700 font-bold mb-4">Used by RFS to provision landing zones. Scoped strictly to the Sandbox Project ID.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">Access Key (AK)</label><input type="password" value={editingCustomer.tier2AK || ''} onChange={e=>setEditingCustomer({...editingCustomer, tier2AK: e.target.value})} className="w-full p-2.5 border border-amber-300 rounded-lg text-xs font-mono outline-none" /></div>
                                            <div><label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">Secret Key (SK)</label><input type="password" value={editingCustomer.tier2SK || ''} onChange={e=>setEditingCustomer({...editingCustomer, tier2SK: e.target.value})} className="w-full p-2.5 border border-amber-300 rounded-lg text-xs font-mono outline-none" /></div>
                                        </div>
                                    </div>

                                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 relative">
                                        <div className="absolute top-0 right-0 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg rounded-tr-xl">Day 2: Handover</div>
                                        <h4 className="font-black text-rose-800 text-sm mb-1">Tier 3: Production EPS Admin Key</h4>
                                        <p className="text-[10px] text-rose-700 font-bold mb-4">Used exclusively during DTRB-approved cutovers to bind prod EIPs and SGs.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-[9px] font-black text-rose-700 uppercase tracking-widest mb-1">Access Key (AK)</label><input type="password" value={editingCustomer.tier3AK || ''} onChange={e=>setEditingCustomer({...editingCustomer, tier3AK: e.target.value})} className="w-full p-2.5 border border-rose-300 rounded-lg text-xs font-mono outline-none" /></div>
                                            <div><label className="block text-[9px] font-black text-rose-700 uppercase tracking-widest mb-1">Secret Key (SK)</label><input type="password" value={editingCustomer.tier3SK || ''} onChange={e=>setEditingCustomer({...editingCustomer, tier3SK: e.target.value})} className="w-full p-2.5 border border-rose-300 rounded-lg text-xs font-mono outline-none" /></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'os' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                        <h4 className="font-black text-slate-800 text-sm mb-1"><i className="fab fa-windows text-blue-500 mr-2"></i> Active Directory / OS Admin</h4>
                                        <p className="text-[10px] text-slate-500 font-bold mb-4 leading-relaxed">If provided, the ERP bypasses the Cloud Control plane and pushes MgC Agents directly to the Data Plane via SSH or WinRM loops.</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Domain (e.g. CORP)</label><input type="text" value={editingCustomer.osDomain || ''} onChange={e=>setEditingCustomer({...editingCustomer, osDomain: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-purple-500" /></div>
                                            <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Admin Username</label><input type="text" value={editingCustomer.osUser || ''} onChange={e=>setEditingCustomer({...editingCustomer, osUser: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-purple-500" /></div>
                                            <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Admin Password</label><input type="password" value={editingCustomer.osPassword || ''} onChange={e=>setEditingCustomer({...editingCustomer, osPassword: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-purple-500" /></div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                        <h4 className="font-black text-slate-800 text-sm mb-1"><i className="fas fa-server text-emerald-500 mr-2"></i> VMware vCenter Access</h4>
                                        <p className="text-[10px] text-slate-500 font-bold mb-4 leading-relaxed">For agentless snapshot migrations. Requires network line-of-sight to the vCenter API.</p>
                                        <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">vCenter Host / IP</label><input type="text" value={editingCustomer.vCenterHost || ''} onChange={e=>setEditingCustomer({...editingCustomer, vCenterHost: e.target.value})} placeholder="https://vcenter.local" className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-emerald-500" /></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="px-8 py-5 border-t border-slate-200 bg-white rounded-b-2xl flex justify-end gap-3 shrink-0">
                            <button onClick={()=>setEditingCustomer(null)} className="px-6 py-2.5 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleSave} className="px-8 py-2.5 text-xs font-black text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"><i className="fas fa-save mr-2"></i> Save Profile</button>
                        </div>
                    </div>
                </div>
            )}

            {customerToDelete && (
                <TwoFactorModal actionName="Delete Customer & Purge Keys" onConfirm={() => { handleDeleteCustomer(customerToDelete); setCustomerToDelete(null); setEditingCustomer(null); }} onCancel={() => setCustomerToDelete(null)} />
            )}
        </div>
    );
}
