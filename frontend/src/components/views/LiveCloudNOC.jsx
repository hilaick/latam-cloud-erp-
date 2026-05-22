import React, { useState } from 'react';

export default function LiveCloudNOC() {
    const [ak, setAk] = useState('');
    const [sk, setSk] = useState('');
    const [projectId, setProjectId] = useState('');
    const [region, setRegion] = useState('la-south-2');
    const [inventory, setInventory] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const fetchInventory = async () => {
        if (!ak || !sk || !projectId) {
            alert("Credentials required.");
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch('/api/cloud/inventory', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ ak, sk, projectId, region }) 
            });
            const data = await res.json();
            if (data.success) {
                setInventory(data.inventory);
            } else {
                alert("API Error: " + data.error);
            }
        } catch (err) { 
            alert("Network Error"); 
        } finally { 
            setIsLoading(false); 
        }
    };

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            <div className="bg-slate-900 rounded-2xl shadow-xl p-6 flex flex-wrap gap-4 items-center text-white">
                <div className="flex-1 min-w-[250px]">
                    <h2 className="text-2xl font-black mb-1">
                        <i className="fas fa-tv text-blue-400 mr-3"></i> Live Cloud NOC
                    </h2>
                    <p className="text-xs text-slate-400">Real-time resource discovery directly via AK/SK.</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <input 
                        type="password" 
                        value={ak} 
                        onChange={e => setAk(e.target.value)} 
                        placeholder="AK" 
                        className="p-3 rounded-xl bg-slate-800 border border-slate-600 text-xs font-mono w-32 outline-none" 
                    />
                    <input 
                        type="password" 
                        value={sk} 
                        onChange={e => setSk(e.target.value)} 
                        placeholder="SK" 
                        className="p-3 rounded-xl bg-slate-800 border border-slate-600 text-xs font-mono w-32 outline-none" 
                    />
                    <input 
                        type="text" 
                        value={projectId} 
                        onChange={e => setProjectId(e.target.value)} 
                        placeholder="Project ID" 
                        className="p-3 rounded-xl bg-slate-800 border border-slate-600 text-xs font-mono w-32 outline-none" 
                    />
                    <button 
                        onClick={fetchInventory} 
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black uppercase tracking-widest"
                    >
                        {isLoading ? 'Scanning...' : 'Scan Environment'}
                    </button>
                </div>
            </div>

            {inventory && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* ECS Servers */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[500px] flex flex-col">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-black text-slate-800">
                                <i className="fas fa-server text-blue-500 mr-2"></i> Compute (ECS)
                            </h3>
                            <span className="bg-blue-100 text-blue-800 px-2 rounded font-black text-xs">
                                {inventory.ecs.length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0">
                                    <tr>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">Flavor</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {inventory.ecs.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-bold">{s.name}</td>
                                            <td className="p-3 font-mono text-[10px]">{s.flavor?.id}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black ${s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* VPCs */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[500px] flex flex-col">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-black text-slate-800">
                                <i className="fas fa-network-wired text-purple-500 mr-2"></i> Networks (VPC)
                            </h3>
                            <span className="bg-purple-100 text-purple-800 px-2 rounded font-black text-xs">
                                {inventory.vpc.length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0">
                                    <tr>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">CIDR</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {inventory.vpc.map(v => (
                                        <tr key={v.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-bold">{v.name}</td>
                                            <td className="p-3 font-mono text-[10px]">{v.cidr}</td>
                                            <td className="p-3">
                                                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700">
                                                    {v.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* RDS */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[500px] flex flex-col">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-black text-slate-800">
                                <i className="fas fa-database text-rose-500 mr-2"></i> Databases (RDS)
                            </h3>
                            <span className="bg-rose-100 text-rose-800 px-2 rounded font-black text-xs">
                                {inventory.rds.length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0">
                                    <tr>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">Engine</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {inventory.rds.map(r => (
                                        <tr key={r.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-bold">{r.name}</td>
                                            <td className="p-3 font-mono text-[10px]">{r.datastore?.type}</td>
                                            <td className="p-3">
                                                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700">
                                                    {r.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}