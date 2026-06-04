import React, { useState, useEffect, useRef } from 'react';

export default function StepExecution({ project, onUpdateProject, onPromote }) {
    const [isInitializing, setIsInitializing] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [vaultLocked, setVaultLocked] = useState(false);
    const [executionComplete, setExecutionComplete] = useState(false);
    const [agentLog, setAgentLog] = useState([
        "[SYSTEM] ERP Cognitive Migration Orchestrator Initialized.",
        "[SYSTEM] Awaiting identity pipeline generation..."
    ]);
    
    const terminalEndRef = useRef(null);
    const execStatus = project.execStatus || 'pending';

    // Auto-scroll the terminal to the bottom as new logs stream in
    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [agentLog]);

    const handleInitializeIdentity = async () => {
        setIsInitializing(true);
        setAgentLog(prev => [...prev, "--------------------------------------------------", "[IAM] Authenticating with Huawei Cloud Master Admin Key..."]);
        
        try {
            const token = localStorage.getItem('erp_jwt_token') || '';
            const res = await fetch(`/api/projects/${project.id}/initialize-vault`, { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                setVaultLocked(true);
                setAgentLog(prev => [
                    ...prev, 
                    "✅ [IAM] Ephemeral Identity 'latam-erp-tier2' generated successfully.", 
                    "🔒 [VAULT] Master keys purged from local execution memory.",
                    "🔒 [VAULT] Tier 2 Sandbox tokens locked and loaded.",
                    "▶️ [SYSTEM] Ready for Agentic Orchestration."
                ]);
            } else {
                setAgentLog(prev => [...prev, `❌ [ERROR] Identity provisioning failed: ${data.error}`]);
            }
        } catch (error) {
            setAgentLog(prev => [...prev, `❌ [NETWORK ERROR] Unable to reach backend: ${error.message}`]);
        } finally {
            setIsInitializing(false);
        }
    };

    const handleExecuteAgent = async () => {
        setIsExecuting(true);
        setAgentLog(prev => [
            ...prev, 
            "--------------------------------------------------",
            "[AGENT] Awakening DeepSeek v3.2 via Internal ModelSquare Gateway...",
            "[AGENT] Loading Deterministic Blueprint...",
            "[AGENT] Injecting Tier 2 Execution Credentials...",
            "⏳ [AGENT] Orchestrating Landing Zone provision..."
        ]);

        try {
            const token = localStorage.getItem('erp_jwt_token') || '';
            const res = await fetch(`/api/projects/${project.id}/execute-agent`, { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                setAgentLog(prev => [
                    ...prev, 
                    "✅ [AGENT] Infrastructure Provisioning Complete.",
                    `📝 [AGENT LOG] ${data.result.ai_remediation_plan}`,
                    "📡 [MGC] Initiating Block-Level SMS Replication Tasks...",
                    "✅ [SYSTEM] Day-1 Execution Phase Concluded Successfully."
                ]);
                setExecutionComplete(true);
                onUpdateProject(project.id, 'execStatus', 'completed');
            } else {
                setAgentLog(prev => [...prev, `❌ [AGENT ERROR] Orchestration halted: ${data.error}`]);
            }
        } catch (error) {
            setAgentLog(prev => [...prev, `❌ [NETWORK ERROR] Unable to reach backend: ${error.message}`]);
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto pb-12 space-y-8 animate-fade-in">
            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden relative">
                
                {/* Background Glow Effect */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>

                {/* Header Section */}
                <div className="px-8 py-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/80 z-10 relative">
                    <div>
                        <h3 className="font-black text-2xl text-white flex items-center">
                            <i className="fas fa-microchip text-indigo-400 mr-3"></i>
                            Cognitive Execution Console
                        </h3>
                        <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Zero-Trust Agentic Provisioning & Orchestration</p>
                    </div>
                    <div className="flex gap-2">
                        <div className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border ${vaultLocked ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700' : 'bg-rose-900/50 text-rose-400 border-rose-700'}`}>
                            <i className={`fas ${vaultLocked ? 'fa-lock' : 'fa-unlock'} mr-2`}></i> 
                            Vault Status: {vaultLocked ? 'Secured' : 'Unsecured'}
                        </div>
                        <div className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-blue-900/50 text-blue-400 border-blue-700">
                            <i className="fas fa-brain mr-2"></i> Model: DeepSeek v3.2
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 relative z-10 bg-slate-950">
                    
                    {/* LEFT PANEL: COMMAND CENTER */}
                    <div className="p-8 border-r border-slate-800 space-y-8 bg-slate-900">
                        {/* Step 1 Command */}
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-700 pb-2">Step 1: Ephemeral Identity Generation</h4>
                            <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">Derives micro-scoped Tier 2 Sandbox keys from the Master Vault using Huawei IAM.</p>
                            <button 
                                onClick={handleInitializeIdentity}
                                disabled={vaultLocked || isInitializing}
                                className={`w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg transition-all flex justify-center items-center ${vaultLocked ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-600/50 cursor-default' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/50 hover:shadow-indigo-500/50'}`}
                            >
                                {isInitializing ? (
                                    <><i className="fas fa-circle-notch fa-spin mr-2"></i> Generating...</>
                                ) : vaultLocked ? (
                                    <><i className="fas fa-check-circle mr-2"></i> Identity Locked</>
                                ) : (
                                    <><i className="fas fa-key mr-2"></i> Initialize Vault Tiers</>
                                )}
                            </button>
                        </div>

                        {/* Step 2 Command */}
                        <div className={`transition-opacity duration-500 ${vaultLocked ? 'opacity-100' : 'opacity-40'}`}>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-700 pb-2">Step 2: AI Orchestration</h4>
                            <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">Hands the deterministic blueprint and Sandbox keys to the Cognitive Engine for RFS execution.</p>
                            <button 
                                onClick={handleExecuteAgent}
                                disabled={!vaultLocked || isExecuting || executionComplete}
                                className={`w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg transition-all flex justify-center items-center ${
                                    executionComplete ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-600/50 cursor-default' : 
                                    (!vaultLocked) ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 
                                    'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50 hover:shadow-blue-500/50'
                                }`}
                            >
                                {isExecuting ? (
                                    <><i className="fas fa-circle-notch fa-spin mr-2"></i> Agent Running...</>
                                ) : executionComplete ? (
                                    <><i className="fas fa-flag-checkered mr-2"></i> Pipeline Complete</>
                                ) : (
                                    <><i className="fas fa-play mr-2"></i> Trigger Execution Agent</>
                                )}
                            </button>
                        </div>

                        {/* Handover Button */}
                        {executionComplete && (
                            <div className="pt-6 mt-6 border-t border-slate-800 animate-slide-up">
                                <button 
                                    onClick={onPromote} 
                                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
                                >
                                    Proceed to Post-Live <i className="fas fa-arrow-right ml-2"></i>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT PANEL: STREAMING TERMINAL */}
                    <div className="p-6 lg:col-span-2 flex flex-col min-h-[500px]">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                                Live Cognitive Telemetry
                            </h4>
                            <div className="text-[10px] font-mono text-slate-500">Connected: ERP Local Host</div>
                        </div>
                        
                        <div className="flex-1 bg-slate-900/80 rounded-xl p-5 font-mono text-xs text-slate-300 border border-slate-800 shadow-inner overflow-y-auto max-h-[500px] custom-scrollbar">
                            {agentLog.map((log, i) => {
                                // Basic formatting for different log types
                                let colorClass = "text-slate-300";
                                if (log.includes("[ERROR]") || log.includes("❌")) colorClass = "text-rose-400";
                                if (log.includes("[IAM]") || log.includes("✅")) colorClass = "text-emerald-400";
                                if (log.includes("[AGENT]")) colorClass = "text-blue-300";
                                if (log.includes("[SYSTEM]")) colorClass = "text-indigo-300";
                                if (log.includes("[VAULT]") || log.includes("🔒")) colorClass = "text-amber-300";
                                if (log.includes("---")) colorClass = "text-slate-600";

                                return (
                                    <div key={i} className={`mb-2 leading-relaxed ${colorClass} break-words`}>
                                        {log}
                                    </div>
                                );
                            })}
                            
                            {/* Blinking cursor effect if executing/initializing */}
                            {(isInitializing || isExecuting) && (
                                <div className="mt-2 text-slate-500 animate-pulse">_</div>
                            )}
                            
                            <div ref={terminalEndRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
