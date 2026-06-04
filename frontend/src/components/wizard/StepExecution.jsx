import React, { useState, useEffect, useRef } from 'react';

export default function StepExecution({ project, onUpdateProject, onPromote }) {
    const [isInitializing, setIsInitializing] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [vaultLocked, setVaultLocked] = useState(false);
    const [executionComplete, setExecutionComplete] = useState(false);
    
    const [agentLogs, setAgentLogs] = useState([
        { type: 'system', content: "[SYSTEM] ERP Cognitive Migration Orchestrator Initialized." },
        { type: 'system', content: "[SYSTEM] Awaiting identity pipeline generation..." }
    ]);
    const [activeAiStream, setActiveAiStream] = useState("");
    
    const terminalEndRef = useRef(null);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [agentLogs, activeAiStream]);

    const handleInitializeIdentity = async () => {
        setIsInitializing(true);
        setAgentLogs(prev => [...prev, { type: 'divider', content: "--------------------------------------------------" }, { type: 'system', content: "[IAM] Authenticating with Huawei Cloud Master Admin Key..." }]);
        
        try {
            const token = localStorage.getItem('erp_jwt_token') || '';
            const res = await fetch(`/api/projects/${project.id}/initialize-vault`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ customer_id: project.customerId })
            });
            const data = await res.json();
            
            if (data.success) {
                setVaultLocked(true);
                setAgentLogs(prev => [
                    ...prev, 
                    { type: 'success', content: "✅ [IAM] Ephemeral Identity 'latam-erp-tier2' generated successfully." }, 
                    { type: 'vault', content: "🔒 [VAULT] Tier 2 Sandbox tokens locked and loaded." },
                    { type: 'system', content: "▶️ [SYSTEM] Ready for Agentic Orchestration." }
                ]);
            } else {
                setAgentLogs(prev => [...prev, { type: 'error', content: `❌ [ERROR] Identity provisioning failed: ${data.error}` }]);
            }
        } catch (error) {
            setAgentLogs(prev => [...prev, { type: 'error', content: `❌ [NETWORK ERROR] Unable to reach backend: ${error.message}` }]);
        } finally {
            setIsInitializing(false);
        }
    };

    const handleExecuteAgentStream = async () => {
        setIsExecuting(true);
        setAgentLogs(prev => [
            ...prev, 
            { type: 'divider', content: "--------------------------------------------------" },
            { type: 'agent', content: "[AGENT] Awakening DeepSeek v3.2 via Internal ModelSquare Gateway..." },
            { type: 'agent', content: "[AGENT] Loading Deterministic Blueprint & Tier 2 Credentials..." }
        ]);

        try {
            const token = localStorage.getItem('erp_jwt_token') || '';
            const response = await fetch(`/api/projects/${project.id}/execute-agent-stream`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ customer_id: project.customerId })
            });

            if (!response.body) throw new Error("ReadableStream not supported in this browser.");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const events = chunk.split('\n\n');

                for (const event of events) {
                    if (event.startsWith('data: ')) {
                        const dataStr = event.replace('data: ', '');
                        if (!dataStr) continue;

                        try {
                            const data = JSON.parse(dataStr);
                            if (data.type === 'log') setAgentLogs(prev => [...prev, { type: 'system', content: data.content }]);
                            else if (data.type === 'ai_stream_start') setActiveAiStream("");
                            else if (data.type === 'ai_token') setActiveAiStream(prev => prev + data.content);
                            else if (data.type === 'ai_stream_end') {
                                setActiveAiStream(finalText => {
                                    setAgentLogs(prev => [...prev, { type: 'ai_response', content: `🧠 DeepSeek Action: ${finalText}` }]);
                                    return "";
                                });
                            }
                            else if (data.type === 'done') {
                                setExecutionComplete(true);
                                onUpdateProject(project.id, 'execStatus', 'completed');
                                break;
                            }
                        } catch (e) { console.error("Error parsing SSE chunk:", dataStr); }
                    }
                }
            }
        } catch (error) {
            setAgentLogs(prev => [...prev, { type: 'error', content: `❌ [NETWORK ERROR] Unable to reach backend: ${error.message}` }]);
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto pb-12 space-y-8 animate-fade-in">
            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden relative">
                
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
                            <i className={`fas ${vaultLocked ? 'fa-lock' : 'fa-unlock'} mr-2`}></i> Vault: {vaultLocked ? 'Secured' : 'Unsecured'}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 relative z-10 bg-slate-950">
                    
                    <div className="p-8 border-r border-slate-800 space-y-8 bg-slate-900">
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-700 pb-2">Step 1: Ephemeral Identity Generation</h4>
                            <button 
                                onClick={handleInitializeIdentity}
                                disabled={vaultLocked || isInitializing}
                                className={`w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg transition-all flex justify-center items-center ${vaultLocked ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-600/50 cursor-default' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                            >
                                {isInitializing ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Generating...</> : vaultLocked ? <><i className="fas fa-check-circle mr-2"></i> Identity Locked</> : <><i className="fas fa-key mr-2"></i> Initialize Vault Tiers</>}
                            </button>
                        </div>

                        <div className={`transition-opacity duration-500 ${vaultLocked ? 'opacity-100' : 'opacity-40'}`}>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-700 pb-2">Step 2: AI Orchestration</h4>
                            <button 
                                onClick={handleExecuteAgentStream}
                                disabled={!vaultLocked || isExecuting || executionComplete}
                                className={`w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg transition-all flex justify-center items-center ${executionComplete ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-600/50 cursor-default' : (!vaultLocked) ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                            >
                                {isExecuting ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Agent Running...</> : executionComplete ? <><i className="fas fa-flag-checkered mr-2"></i> Pipeline Complete</> : <><i className="fas fa-play mr-2"></i> Trigger Execution Agent</>}
                            </button>
                        </div>

                        {executionComplete && (
                            <div className="pt-6 mt-6 border-t border-slate-800 animate-slide-up">
                                <button onClick={onPromote} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all">Proceed to Post-Live <i className="fas fa-arrow-right ml-2"></i></button>
                            </div>
                        )}
                    </div>

                    <div className="p-6 lg:col-span-2 flex flex-col min-h-[500px]">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>Live Cognitive Telemetry</h4>
                        </div>
                        
                        <div className="flex-1 bg-slate-900/80 rounded-xl p-5 font-mono text-xs text-slate-300 border border-slate-800 shadow-inner overflow-y-auto max-h-[500px] custom-scrollbar">
                            {agentLogs.map((log, i) => {
                                let colorClass = "text-slate-300";
                                if (log.type === 'error' || log.content.includes("❌")) colorClass = "text-rose-400 font-bold";
                                if (log.type === 'success' || log.content.includes("✅")) colorClass = "text-emerald-400 font-bold";
                                if (log.type === 'agent') colorClass = "text-blue-300";
                                if (log.type === 'vault') colorClass = "text-amber-300";
                                if (log.type === 'ai_response') colorClass = "text-blue-400 bg-blue-900/20 p-3 rounded-lg border border-blue-800/50 my-2";

                                return <div key={i} className={`mb-2 leading-relaxed ${colorClass} break-words`}>{log.content}</div>;
                            })}
                            
                            {activeAiStream && (
                                <div className="mb-2 leading-relaxed text-blue-400 bg-blue-900/20 p-3 rounded-lg border border-blue-800/50 my-2 break-words">
                                    🧠 DeepSeek Action: {activeAiStream}<span className="inline-block w-1.5 h-3 bg-blue-400 ml-1 animate-pulse"></span>
                                </div>
                            )}

                            {(isInitializing || (isExecuting && !activeAiStream)) && <div className="mt-2 text-slate-500 animate-pulse">_</div>}
                            <div ref={terminalEndRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
