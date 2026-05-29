import React, { useState, useEffect, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import TwoFactorModal from '../utils/TwoFactorModal'; 

// 🚨 COMPREHENSIVE HUAWEI CLOUD REGION DICTIONARY
export const HUAWEI_REGIONS = [
    { group: "Latin America", options: [{ id: "na-mexico-1", name: "LA-Mexico City1" }, { id: "la-north-2", name: "LA-Mexico City2" }, { id: "sa-brazil-1", name: "LA-Sao Paulo1" }, { id: "la-south-2", name: "LA-Santiago" }, { id: "sa-argentina-1", name: "LA-Buenos Aires1" }] },
    { group: "Europe, Middle East & Africa", options: [{ id: "eu-west-101", name: "EU-Dublin" }, { id: "tr-west-1", name: "TR-Istanbul" }, { id: "me-east-1", name: "ME-Riyadh" }, { id: "af-south-1", name: "AF-Johannesburg" }, { id: "af-north-1", name: "AF-Cairo" }] },
    { group: "Asia Pacific", options: [{ id: "ap-southeast-1", name: "CN-Hong Kong" }, { id: "ap-southeast-2", name: "AP-Bangkok" }, { id: "ap-southeast-3", name: "AP-Singapore" }, { id: "ap-southeast-4", name: "AP-Jakarta" }, { id: "ap-southeast-5", name: "AP-Manila" }] },
    { group: "Chinese Mainland", options: [{ id: "cn-north-1", name: "CN North-Beijing1" }, { id: "cn-north-4", name: "CN North-Beijing4" }, { id: "cn-north-9", name: "CN North-Ulanqab1" }, { id: "cn-north-12", name: "CN North3" }, { id: "cn-east-3", name: "CN East-Shanghai1" }, { id: "cn-east-2", name: "CN East-Shanghai2" }, { id: "cn-east-5", name: "CN East-Qingdao" }, { id: "cn-east-4", name: "CN East2" }, { id: "cn-south-1", name: "CN South-Guangzhou" }, { id: "cn-southwest-2", name: "CN Southwest-Guiyang1" }] }
];

export default function CustomerDirectory() {
    const context = useContext(ERPContext);
    
    const customers = context.customers || [];
    const projects = context.projects || [];
    const handleUpdateCustomer = context.handleUpdateCustomer || function(){};
    const handleDeleteCustomer = context.handleDeleteCustomer || function(){};

    const [selectedId, setSelectedId] = useState(customers.length > 0 ? customers[0].id : null);
    const [show2FA, setShow2FA] = useState(false); 
    
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
    const [region, setRegion] = useState('la-south-2'); // Stores as comma-separated string
    
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

    const executeDelete = () => {
        handleDeleteCustomer(activeCustomer.id);
        setShow2FA(false);
        alert("Customer and associated projects permanently deleted.");
    };

    // 🚨 MULTI-REGION TAG LOGIC
    const selectedRegions = region ? region.split(',').map(r => r.trim()).filter(Boolean) : [];

    const handleAddRegion = (e) => {
        const val = e.target.value;
        if (!val) return;
        if (!selectedRegions.includes(val)) {
            setRegion(selectedRegions.length > 0 ? `${region}, ${val}` : val);
        }
        e.target.value = ''; // Reset select back to placeholder
    };

    const handleRemoveRegion = (regToRemove) => {
        setRegion(selectedRegions.filter(r => r !== regToRemove).join(', '));
    };

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto space-y-6 pb-12">
            <div className="bg-slate-900 rounded-2xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center text-white border border-slate-700 gap-4 text-center md:text-left">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black mb-2">
                        <i className="fas fa-building text-blue-400 mr-3"></i> Customer Directory
                    </h2>
                    <p className="text-sm text-slate-400">Master Accounts, Security Vaults, and Associated Portfolios.</p>
                </div>
                <div className="md:text-right">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total Managed Accounts</div>
                    <div className="text-3xl font-black text-blue-400">{customers.length}</div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Sidebar: Customer List */}
                <div className="w-full lg:w-80 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[400px] lg:h-[650px] flex flex-col">
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

                {/* Right Panel: Vault & Projects */}
                {activeCustomer ? (
                    <div className="flex-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4 gap-4">
                                <h3 className="font-black text-2xl text-slate-800">{activeCustomer.name}</h3>
                                <button onClick={() => setShow2FA(true)} className="w-full sm:w-auto px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">
                                    <i className="fas fa-trash-alt mr-2"></i> Delete Account
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* The Vault Form */}
                                <div className="space-y-5">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4"><i className="fas fa-lock text-emerald-500 mr-2"></i> Security Vault</h4>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Access Key (AK)</label>
                                        <input type="password" value={ak} onChange={e => setAk(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-mono bg-slate-50 focus:border-blue-500 outline-none" placeholder="HW_XXXXXXXXXXXXXXXX" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Secret Key (SK)</label>
                                        <input type="password" value={sk} onChange={e => setSk(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-mono bg-slate-50 focus:border-blue-500 outline-none" placeholder="••••••••••••••••••••••••••••••••" />
                                    </div>
                                    
                                    {/* 🚨 THE NEW MULTI-REGION SELECTOR */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Authorized Regions</label>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {selectedRegions.length === 0 && <span className="text-[10px] text-slate-400 italic">No regions assigned. Select below.</span>}
                                            {selectedRegions.map(r => (
                                                <span key={r} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-200 flex items-center gap-2 shadow-sm">
                                                    <i className="fas fa-map-marker-alt opacity-50"></i> {r} 
                                                    <i className="fas fa-times-circle cursor-pointer hover:text-rose-500 transition-colors ml-1 text-sm" onClick={() => handleRemoveRegion(r)}></i>
                                                </span>
                                            ))}
                                        </div>
                                        <select onChange={handleAddRegion} defaultValue="" className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold bg-white focus:border-indigo-500 outline-none cursor-pointer">
                                            <option value="" disabled>+ Add Region to Vault...</option>
                                            {HUAWEI_REGIONS.map(group => (
                                                <optgroup key={group.group} label={`-- ${group.group} --`}>
                                                    {group.options.map(o => (
                                                        <option key={o.id} value={o.id}>{o.name} ({o.id})</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>

                                    <button onClick={handleSaveVault} className="w-full py-3 mt-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md transition-colors uppercase tracking-widest">Update Security Vault</button>
                                </div>

                                {/* Active Portfolio */}
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4"><i className="fas fa-folder-open text-blue-500 mr-2"></i> Active Portfolio</h4>
                                    <div className="space-y-3 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
                                        {linkedProjects.length === 0 && (
                                            <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs font-bold text-slate-400">No active projects found.</div>
                                        )}
                                        {linkedProjects.map(p => (
                                            <div 
                                                key={p.id} 
                                                onClick={() => { context.setActiveProjectId(p.id); context.setActivePhase('wizard'); }} 
                                                className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                                title="Open Project Workspace"
                                            >
                                                <div className="truncate pr-2">
                                                    <div className="font-bold text-sm text-slate-800 truncate">{p.name}</div>
                                                    <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold truncate"><i className="fas fa-globe-americas mr-1"></i> {p.country || 'Global'} | SA: {p.sa}</div>
                                                </div>
                                                <div className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 shrink-0">${p.mrr}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 min-h-[400px]">
                        <div className="text-center p-6"><i className="fas fa-id-card text-6xl mb-4 opacity-30"></i><h3 className="font-black text-xl text-slate-500">Select a Customer Profile</h3><p className="text-sm mt-2 font-medium">Choose a customer from the left to manage keys.</p></div>
                    </div>
                )}
            </div>
            
            {show2FA && (
                <TwoFactorModal 
                    actionName={`Delete Customer Profile: ${activeCustomer?.name}`} 
                    onConfirm={executeDelete} 
                    onCancel={() => setShow2FA(false)} 
                />
            )}
        </div>
    );
}
