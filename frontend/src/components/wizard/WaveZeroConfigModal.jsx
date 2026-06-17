import React, { useState } from 'react';

export default function WaveZeroConfigModal({ onClose, onConfirm }) {
    const [config, setConfig] = useState({
        targetEnv: 'Sandbox VPC', // 'Create New EP', 'Use Existing EP', 'Sandbox VPC'
        epId: '',
        networkState: 'Create New VPC', // 'Create New VPC', 'Use Existing VPC'
        vpcId: '',
        vpcCidr: '10.0.0.0/16',
        subnetCidr: '10.0.1.0/24',
        sgRules: [
            { port: '22', protocol: 'TCP', desc: 'SSH for Linux Sync' },
            { port: '5985', protocol: 'TCP', desc: 'WinRM for Windows Sync' },
            { port: '443', protocol: 'TCP', desc: 'Huawei SMS Agent Outbound' },
            { port: '8900', protocol: 'TCP', desc: 'SMS Block Replication' }
        ]
    });

    const [newPort, setNewPort] = useState({ port: '', protocol: 'TCP', desc: '' });

    const handleAddRule = () => {
        if (!newPort.port) return;
        setConfig({
            ...config,
            sgRules: [...config.sgRules, newPort]
        });
        setNewPort({ port: '', protocol: 'TCP', desc: '' });
    };

    const handleRemoveRule = (index) => {
        const newRules = config.sgRules.filter((_, i) => i !== index);
        setConfig({ ...config, sgRules: newRules });
    };

    const handleSubmit = () => {
        // Validate required fields
        if (config.targetEnv === 'Use Existing EP' && !config.epId) return alert("Enterprise Project ID is required.");
        if (config.networkState === 'Use Existing VPC' && !config.vpcId) return alert("Existing VPC ID is required.");
        if (config.networkState === 'Create New VPC' && (!config.vpcCidr || !config.subnetCidr)) return alert("CIDR blocks are required.");
        
        onConfirm(config);
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col border border-slate-700 animate-slide-up max-h-[95vh] overflow-hidden">
                
                {/* Header */}
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="font-black text-lg text-blue-400 flex items-center">
                            <i className="fas fa-network-wired mr-3"></i> Wave 0: Network Pre-Flight Config
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Define Terraform Parameters for Target Environment</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto bg-slate-50 space-y-8 flex-1 custom-scrollbar">
                    
                    {/* 1. Target Environment Boundary */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="font-black text-sm text-slate-800 border-b border-slate-100 pb-2">1. Target Environment Boundary</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">IAM Isolation Strategy</label>
                                <select 
                                    value={config.targetEnv} 
                                    onChange={e => setConfig({...config, targetEnv: e.target.value})} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-blue-500 bg-slate-50"
                                >
                                    <option value="Sandbox VPC">Isolated Sandbox VPC (Fallback)</option>
                                    <option value="Create New EP">Create New Enterprise Project (EP)</option>
                                    <option value="Use Existing EP">Use Existing Enterprise Project</option>
                                </select>
                            </div>
                            {config.targetEnv === 'Use Existing EP' && (
                                <div className="animate-fade-in">
                                    <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-blue-600">Enterprise Project ID</label>
                                    <input 
                                        type="text" 
                                        value={config.epId} 
                                        onChange={e => setConfig({...config, epId: e.target.value})} 
                                        placeholder="e.g., 0a1b2c3d..." 
                                        className="w-full p-2.5 border border-blue-300 rounded-lg text-xs font-mono outline-none focus:border-blue-500" 
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Virtual Private Cloud State */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="font-black text-sm text-slate-800 border-b border-slate-100 pb-2">2. Network State Definition</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">VPC Creation Intent</label>
                                <select 
                                    value={config.networkState} 
                                    onChange={e => setConfig({...config, networkState: e.target.value})} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-blue-500 bg-slate-50"
                                >
                                    <option value="Create New VPC">Create New VPC & Subnets</option>
                                    <option value="Use Existing VPC">Use Existing VPC (Read-Only State)</option>
                                </select>
                            </div>
                            {config.networkState === 'Use Existing VPC' ? (
                                <div className="animate-fade-in">
                                    <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-emerald-600">Existing VPC ID</label>
                                    <input 
                                        type="text" 
                                        value={config.vpcId} 
                                        onChange={e => setConfig({...config, vpcId: e.target.value})} 
                                        placeholder="VPC UUID..." 
                                        className="w-full p-2.5 border border-emerald-300 rounded-lg text-xs font-mono outline-none focus:border-emerald-500" 
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">VPC CIDR</label>
                                        <input type="text" value={config.vpcCidr} onChange={e=>setConfig({...config, vpcCidr: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Subnet CIDR</label>
                                        <input type="text" value={config.subnetCidr} onChange={e=>setConfig({...config, subnetCidr: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Security Group Rules */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="font-black text-sm text-slate-800 border-b border-slate-100 pb-2">3. Diagnostic Security Group Rules</h4>
                        
                        <div className="space-y-2 mb-4 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                            {config.sgRules.map((rule, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                    <div className="flex items-center gap-4">
                                        <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded w-12 text-center">{rule.protocol}</span>
                                        <span className="font-mono text-xs font-bold text-slate-700 w-12">:{rule.port}</span>
                                        <span className="text-xs text-slate-500">{rule.desc}</span>
                                    </div>
                                    <button onClick={() => handleRemoveRule(idx)} className="text-slate-400 hover:text-rose-500"><i className="fas fa-times"></i></button>
                                </div>
                            ))}
                        </div>

                        {/* Add Custom Rule */}
                        <div className="flex gap-2 items-end border-t border-slate-100 pt-4">
                            <div className="w-24">
                                <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Protocol</label>
                                <select value={newPort.protocol} onChange={e=>setNewPort({...newPort, protocol: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-xs outline-none">
                                    <option>TCP</option><option>UDP</option><option>ICMP</option>
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Port</label>
                                <input type="text" placeholder="e.g. 3389" value={newPort.port} onChange={e=>setNewPort({...newPort, port: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-xs font-mono outline-none" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Description</label>
                                <input type="text" placeholder="e.g. RDP Access" value={newPort.desc} onChange={e=>setNewPort({...newPort, desc: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-xs outline-none" />
                            </div>
                            <button onClick={handleAddRule} disabled={!newPort.port} className="px-4 py-2 bg-slate-800 disabled:bg-slate-300 text-white rounded text-xs font-black uppercase shadow-sm">Add</button>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleSubmit} className="px-8 py-2.5 text-xs font-black text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors">
                        <i className="fas fa-check mr-2"></i> Confirm & Execute Terraform
                    </button>
                </div>

            </div>
        </div>
    );
}
