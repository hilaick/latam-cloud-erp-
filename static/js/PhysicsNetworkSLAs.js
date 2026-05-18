// Network and SLA components for Physics Engine
import React from 'react';

export function NetworkRouting({ 
    storageMode, netSource, transitType, netTunnel, netTarget, 
    omsTasks, omsObjPerSec, omsBackbone, onParamChange 
}) {
    if (storageMode === 'Object') {
        return (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 hover:shadow-md transition-shadow animate-fade-in">
                <div className="flex justify-between items-center mb-5">
                    <h4 className="font-black text-sm flex items-center gap-2 text-slate-800">
                        <i className="fas fa-cloud text-blue-500"></i> 5. Cloud-to-Cloud Backbone (OMS)
                    </h4>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-[10px] text-blue-800 font-bold leading-relaxed mb-5">
                    Serverless Object Migration active. Data travels over high-speed cloud provider backbone, bypassing customer VPNs and Direct Connects. Speed is bounded by Concurrent API Tasks and limits.
                </div>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                            Concurrent Tasks
                        </label>
                        <input 
                            type="number" 
                            value={omsTasks} 
                            onChange={e => onParamChange('omsTasks', e.target.value)} 
                            className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50"
                        />
                    </div>
                    <i className="fas fa-times text-slate-300 text-xl hidden md:block mt-8"></i>
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                            API Speed (Obj/sec per task)
                        </label>
                        <input 
                            type="number" 
                            value={omsObjPerSec} 
                            onChange={e => onParamChange('omsObjPerSec', e.target.value)} 
                            className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50"
                        />
                    </div>
                    <i className="fas fa-plus text-slate-300 text-xl hidden md:block mt-8"></i>
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-emerald-700">
                            Backbone Peak (Gbps)
                        </label>
                        <input 
                            type="number" 
                            value={omsBackbone} 
                            onChange={e => onParamChange('omsBackbone', e.target.value)} 
                            className="w-full p-3 border-2 border-emerald-200 rounded-xl text-sm font-black outline-none focus:border-emerald-500 bg-emerald-50 text-emerald-900 shadow-inner"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 hover:shadow-md transition-shadow animate-fade-in">
            <div className="flex justify-between items-center mb-5">
                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800">
                    <i className="fas fa-network-wired text-emerald-500"></i> 5. End-to-End Network Route (Mbps)
                </h4>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-[10px] text-emerald-800 font-bold leading-relaxed mb-5">
                E2E limits apply to all replication data flowing from the source OS block agent to the destination block storage.
            </div>
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1 w-full">
                    <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                        Source Outbound
                    </label>
                    <input 
                        type="number" 
                        value={netSource} 
                        onChange={e => onParamChange('netSource', e.target.value)} 
                        className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 bg-slate-50"
                    />
                </div>
                <i className="fas fa-arrow-right text-slate-300 text-xl hidden md:block mt-8"></i>
                <div className="flex-1 w-full">
                    <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-indigo-500">
                        Transit Route
                    </label>
                    <select 
                        value={transitType} 
                        onChange={e => onParamChange('transitType', e.target.value)} 
                        className="w-full p-3 border-2 border-indigo-200 rounded-xl text-xs font-black outline-none focus:border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm mb-3"
                    >
                        <option value="DirectConnect">DirectConnect / ExpressRoute</option>
                        <option value="IPsec VPN">IPsec VPN Tunnel</option>
                        <option value="Public Internet">Public Internet / EIP</option>
                    </select>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">Limit:</span>
                        <input 
                            type="number" 
                            value={netTunnel} 
                            onChange={e => onParamChange('netTunnel', e.target.value)} 
                            className="w-full p-2 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500 bg-white"
                        />
                    </div>
                </div>
                <i className="fas fa-arrow-right text-slate-300 text-xl hidden md:block mt-8"></i>
                <div className="flex-1 w-full">
                    <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                        Target Cloud Inbound
                    </label>
                    <input 
                        type="number" 
                        value={netTarget} 
                        onChange={e => onParamChange('netTarget', e.target.value)} 
                        className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 bg-slate-50"
                    />
                </div>
            </div>
        </div>
    );
}

export function SLASection({ drBackupHrs, drStability, downtimeWindow, onParamChange }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-black text-sm mb-5 flex items-center gap-2 text-slate-800">
                <i className="fas fa-shield-alt text-amber-500"></i> 4. Operations & DR SLA
            </h4>
            <div className="flex flex-col gap-6">
                <div className="flex gap-3">
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                            Cold Backup (Hrs)
                        </label>
                        <input 
                            type="number" 
                            value={drBackupHrs} 
                            onChange={e => onParamChange('drBackupHrs', e.target.value)} 
                            className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-500 bg-slate-50"
                        />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                            Link Stability
                        </label>
                        <select 
                            value={drStability} 
                            onChange={e => onParamChange('drStability', e.target.value)} 
                            className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-500 bg-slate-50"
                        >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>
                </div>
                <div className="w-full">
                    <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-emerald-700">
                        Target Go-Live Window (Hrs)
                    </label>
                    <input 
                        type="number" 
                        value={downtimeWindow} 
                        onChange={e => onParamChange('downtimeWindow', e.target.value)} 
                        className="w-full p-4 border-2 border-emerald-300 rounded-xl bg-emerald-50 font-black text-base text-emerald-900 outline-none text-center shadow-inner"
                    />
                </div>
            </div>
        </div>
    );
}