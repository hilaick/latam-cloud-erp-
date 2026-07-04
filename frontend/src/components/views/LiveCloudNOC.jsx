import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function LiveCloudNOC() {
    const { customers } = useContext(ERPContext);
    
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [projectId, setProjectId] = useState(''); // Huawei Cloud requires the project ID for scoping
    const [inventory, setInventory] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const activeCustomer = customers?.find(c => String(c.id) === selectedCustomerId);

    const fetchInventory = async () => {
        if (!activeCustomer || !activeCustomer.ak || !activeCustomer.sk) {
            alert("This customer does not have valid AK/SK credentials stored in the Customer Directory Vault.");
            return;
        }
        if (!projectId) {
            alert("Please enter the specific Huawei Cloud Project ID to scan.");
            return;
        }

        setIsLoading(true);
        try {
            // Get JWT token from localStorage
            const token = localStorage.getItem('erp_jwt_token');
            if (!token) {
                throw new Error("Authentication required. Please log in again.");
            }

            const res = await fetch('/api/cloud/inventory', { 
                method: 'POST', 
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }, 
                // We securely pass the vaulted keys
                body: JSON.stringify({ ak: activeCustomer.ak, sk: activeCustomer.sk, projectId, region: activeCustomer.region || 'la-south-2' }) 
            });
            
            if (res.status === 401) {
                throw new Error("Authentication failed. Please log in again.");
            }
            
            const data = await res.json();
            if (data.success) {
                setInventory(data.inventory);
            } else {
                alert("API Error: " + data.error);
            }
        } catch (err) { 
            alert("Error: " + err.message); 
        } finally { 
            setIsLoading(false); 
        }
    };

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            <div className="bg-slate-900 rounded-2xl shadow-xl p-8 flex flex-col md:flex-row gap-6 items-center text-white border border-slate-700">
                <div className="flex-1 min-w-[250px]">
                    <h2 className="text-2xl font-black mb-1">
                        <i className="fas fa-tv text-blue-400 mr-3"></i> Live Cloud NOC
                    </h2>
                    <p className="text-xs text-slate-400">Read-only global inventory discovery using vaulted customer credentials.</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-end">
                    <div className="w-full md:w-64">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Select Customer</label>
                        <select 
                            value={selectedCustomerId} 
                            onChange={e => setSelectedCustomerId(e.target.value)}
                            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-sm font-bold text-white outline-none focus:border-blue-500"
                        >
                            <option value="">-- Choose Account --</option>
                            {(customers || []).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full md:w-48">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Project ID</label>
                        <input 
                            type="text" 
                            value={projectId} 
                            onChange={e => setProjectId(e.target.value)} 
                            placeholder="e.g. 0b1234567..." 
                            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-sm font-mono text-white outline-none focus:border-blue-500" 
                        />
                    </div>
                    
                    <button 
                        onClick={fetchInventory} 
                        disabled={!activeCustomer || isLoading}
                        className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors"
                    >
                        {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Scanning</> : <><i className="fas fa-search mr-2"></i> Scan Cloud</>}
                    </button>
                </div>
            </div>

            {!activeCustomer && (
                <div className="p-12 text-center border-2 border-dashed border-slate-300 rounded-2xl bg-white text-slate-400 font-bold">
                    <i className="fas fa-shield-alt text-4xl mb-4 opacity-30"></i>
                    <p>Select a customer from the dropdown to access their cloud environment.</p>
                </div>
            )}

            {activeCustomer && !activeCustomer.ak && (
                <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold flex items-center shadow-sm">
                    <i className="fas fa-exclamation-triangle text-xl mr-3 text-rose-500"></i>
                    This customer does not have AK/SK credentials vaulted. Please update their profile in the Customer Directory.
                </div>
            )}

            {/* Rest of the inventory rendering remains identical to original... */}
            {inventory && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
                    {/* ECS Servers */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[500px] flex flex-col">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-black text-slate-800"><i className="fas fa-server text-blue-500 mr-2"></i> Compute (ECS)</h3>
                            <span className="bg-blue-100 text-blue-800 px-2 rounded font-black text-xs">{inventory.ecs.length}</span>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0"><tr><th className="p-3">Name</th><th className="p-3">Flavor</th><th className="p-3">Status</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {inventory.ecs.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50"><td className="p-3 font-bold">{s.name}</td><td className="p-3 font-mono text-[10px]">{s.flavor?.id}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-[9px] font-black ${s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{s.status}</span></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* VPCs */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[500px] flex flex-col">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-black text-slate-800"><i className="fas fa-network-wired text-purple-500 mr-2"></i> Networks (VPC)</h3>
                            <span className="bg-purple-100 text-purple-800 px-2 rounded font-black text-xs">{inventory.vpc.length}</span>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0"><tr><th className="p-3">Name</th><th className="p-3">CIDR</th><th className="p-3">Status</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {inventory.vpc.map(v => (
                                        <tr key={v.id} className="hover:bg-slate-50"><td className="p-3 font-bold">{v.name}</td><td className="p-3 font-mono text-[10px]">{v.cidr}</td><td className="p-3"><span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700">{v.status}</span></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* RDS */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[500px] flex flex-col">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-black text-slate-800"><i className="fas fa-database text-rose-500 mr-2"></i> Databases (RDS)</h3>
                            <span className="bg-rose-100 text-rose-800 px-2 rounded font-black text-xs">{inventory.rds.length}</span>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0"><tr><th className="p-3">Name</th><th className="p-3">Engine</th><th className="p-3">Status</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {inventory.rds.map(r => (
                                        <tr key={r.id} className="hover:bg-slate-50"><td className="p-3 font-bold">{r.name}</td><td className="p-3 font-mono text-[10px]">{r.datastore?.type}</td><td className="p-3"><span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700">{r.status}</span></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* EIP Cost Leakage Panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[500px] flex flex-col">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-black text-slate-800"><i className="fas fa-money-bill-wave text-amber-500 mr-2"></i> EIP Cost Leakage</h3>
                            <span className="bg-amber-100 text-amber-800 px-2 rounded font-black text-xs">
                                {inventory.network?.filter(n => n.type === "EIP").length || 0} EIPs
                            </span>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            {inventory.network?.filter(n => n.type === "EIP").length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <i className="fas fa-check-circle text-2xl mb-3 opacity-50"></i>
                                    <p className="font-bold">No Elastic IPs found</p>
                                    <p className="text-xs mt-1">All EIPs are properly bound</p>
                                </div>
                            ) : (
                                <>
                                    {/* Warning banner for unbound EIPs */}
                                    {inventory.network?.filter(n => n.type === "EIP" && n.is_unbound_risk).length > 0 && (
                                        <div className="m-4 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                                            <div className="flex items-center mb-2">
                                                <i className="fas fa-exclamation-triangle text-rose-500 mr-2"></i>
                                                <span className="font-black text-rose-700 text-sm">COST LEAKAGE DETECTED</span>
                                            </div>
                                            <p className="text-xs text-rose-600">
                                                {inventory.network?.filter(n => n.type === "EIP" && n.is_unbound_risk).length} unbound EIPs detected
                                            </p>
                                            <div className="mt-3 flex gap-2">
                                                <button 
                                                    onClick={() => window.open('/api/cloud/eip-cleanup-report?projectId=' + projectId + '&customerId=' + selectedCustomerId, '_blank')}
                                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-lg transition-colors"
                                                >
                                                    <i className="fas fa-file-invoice-dollar mr-1"></i> Cost Report
                                                </button>
                                                <button 
                                                    onClick={() => window.open('/api/cloud/eip-cleanup?projectId=' + projectId + '&customerId=' + selectedCustomerId + '&dryRun=true', '_blank')}
                                                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black rounded-lg transition-colors"
                                                >
                                                    <i className="fas fa-eye mr-1"></i> Dry Run
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0">
                                                <tr>
                                                    <th className="p-3">IP Address</th>
                                                    <th className="p-3">Status</th>
                                                    <th className="p-3">Bound To</th>
                                                    <th className="p-3">Risk</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {inventory.network
                                                    ?.filter(n => n.type === "EIP")
                                                    .map(eip => (
                                                        <tr key={eip.id} className={`hover:bg-slate-50 ${eip.is_unbound_risk ? 'bg-rose-50' : ''}`}>
                                                            <td className="p-3 font-mono text-[10px] font-bold">{eip.public_ip}</td>
                                                            <td className="p-3">
                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                                                                    eip.status === 'ACTIVE' 
                                                                        ? (eip.is_unbound_risk ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700')
                                                                        : 'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                    {eip.status}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-[10px]">
                                                                {eip.bound_to ? (
                                                                    <span className="text-slate-700">{eip.bound_to}</span>
                                                                ) : (
                                                                    <span className="text-rose-600 font-bold">UNBOUND</span>
                                                                )}
                                                            </td>
                                                            <td className="p-3">
                                                                {eip.is_unbound_risk ? (
                                                                    <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-700">COST LEAKAGE</span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700">SAFE</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                    </table>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
