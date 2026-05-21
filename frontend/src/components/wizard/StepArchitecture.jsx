import React, { useState } from 'react';

export default function StepArchitecture({ project, onUpdateProject }) {
    const servers = project.blueprintData?.topology?.compute || [];
    const autoDeployable = servers.filter(s => !s.metadata?.os_type || s.metadata?.os_type === 'Unknown').length + (project.blueprintData?.topology?.database?.length || 0) + 2;
    const manual = servers.length - (servers.filter(s => !s.metadata?.os_type || s.metadata?.os_type === 'Unknown').length);
    const percentage = (autoDeployable + manual) > 0 ? Math.round((autoDeployable / (autoDeployable + manual)) * 100) : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-4xl mx-auto">
                <h3 className="font-black text-xl text-slate-800 mb-2"><i className="fas fa-robot text-indigo-500 mr-3"></i> API Orchestration Analysis</h3>
                <p className="text-sm text-slate-500 mb-8">Scanning blueprint to identify the foundational Landing Zone vs Complex Block-Level Migrations.</p>
                
                <div className="flex items-center gap-8 mb-8">
                    <div className="w-32 h-32 rounded-full border-8 border-slate-100 flex items-center justify-center relative shrink-0">
                        <div className="absolute inset-0 rounded-full border-8 border-indigo-500 border-l-transparent border-b-transparent" style={{transform: `rotate(${percentage * 3.6}deg)`}}></div>
                        <span className="text-2xl font-black text-slate-800">{percentage}%</span>
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex justify-between items-center">
                            <div><div className="font-bold text-emerald-800">Landing Zone (API Auto-Deployable)</div><div className="text-xs text-emerald-600">VPCs, Subnets, SGs, and PaaS DBs extracted from Blueprint.</div></div>
                            <div className="text-2xl font-black text-emerald-700">{autoDeployable}</div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex justify-between items-center">
                            <div><div className="font-bold text-amber-800">Stateful Compute (SMS Migration)</div><div className="text-xs text-amber-600">Stateful OS workloads requiring block-level agent sync.</div></div>
                            <div className="text-2xl font-black text-amber-700">{manual}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}