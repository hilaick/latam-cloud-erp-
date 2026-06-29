import React, { useState, useContext, useEffect, useRef } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function GlobalCommandDrawer({ isOpen, onClose }) {
    const { activeProjectId, projects, activePhase } = useContext(ERPContext);
    const [command, setCommand] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [terminalOutput, setTerminalOutput] = useState([
        "[system] Control Plane initialized.",
        "[system] Type /help to see available execution commands."
    ]);
    const scrollRef = useRef(null);

    const currentProject = (projects || []).find(p => String(p.id) === String(activeProjectId));
    const isGlobal = !activeProjectId || activeProjectId === 'none';

    // Auto-scroll to bottom of terminal
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [terminalOutput]);

    const handleCommand = async (cmdOverride = null) => {
        const cmdToRun = cmdOverride || command;
        if (!cmdToRun || isExecuting) return;
        
        setCommand('');
        setIsExecuting(true);
        setTerminalOutput(prev => [...prev, `\n> ${cmdToRun}`]);

        if (isGlobal) {
            setTerminalOutput(prev => [...prev, `[error] No active project selected. Please select a project from the TopBar to execute context-aware commands.`]);
            setIsExecuting(false);
            return;
        }
        
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const res = await fetch(`/api/executions/${activeProjectId}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ command: cmdToRun, contextPhase: activePhase })
            });
            
            const data = await res.json();
            if (data.success) {
                setTerminalOutput(prev => [...prev, data.output]);
            } else {
                setTerminalOutput(prev => [...prev, `[error] Execution failed: ${data.error}`]);
            }
        } catch (err) {
            setTerminalOutput(prev => [...prev, `[network error] Failed to reach Control Plane: ${err.message}`]);
        } finally {
            setIsExecuting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end pointer-events-none">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Drawer */}
            <div className="w-full max-w-lg bg-slate-900 h-full shadow-2xl border-l border-slate-700 flex flex-col relative z-10 pointer-events-auto animate-slide-left">
                
                {/* Header */}
                <div className="bg-slate-800 border-b border-slate-700 p-5 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-black text-base text-white flex items-center">
                            <i className="fas fa-terminal text-emerald-400 mr-3"></i> Delivery Command Interface
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {isGlobal ? "Global Mode (Read-Only)" : `Context: ${currentProject?.name} | Phase ${activePhase}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Quick Actions */}
                <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex gap-2 overflow-x-auto custom-scrollbar shrink-0">
                    <button onClick={() => handleCommand('/status')} disabled={isExecuting} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors shadow-sm disabled:opacity-50">/status</button>
                    <button onClick={() => handleCommand('/preflight')} disabled={isExecuting} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors shadow-sm disabled:opacity-50">/preflight</button>
                    <button onClick={() => handleCommand('/deploy-wave0')} disabled={isExecuting} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors shadow-sm disabled:opacity-50">/deploy-wave0</button>
                </div>

                {/* Terminal Window */}
                <div ref={scrollRef} className="flex-1 p-5 font-mono text-xs text-emerald-400 overflow-y-auto whitespace-pre-wrap custom-scrollbar">
                    {terminalOutput.map((line, i) => (
                        <div key={i} className={`mb-1 ${line.includes('[error]') ? 'text-rose-400' : line.startsWith('>') ? 'text-white font-bold mt-3' : 'text-emerald-400/90'}`}>
                            {line}
                        </div>
                    ))}
                    {isExecuting && (
                        <div className="mt-2 text-emerald-500 animate-pulse">
                            <i className="fas fa-circle-notch fa-spin mr-2"></i> Executing...
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-slate-800 border-t border-slate-700 shrink-0">
                    <div className="flex gap-3">
                        <input 
                            type="text" 
                            value={command} 
                            onChange={e=>setCommand(e.target.value)} 
                            onKeyDown={e=>e.key==='Enter'&&handleCommand()} 
                            placeholder={isGlobal ? "Select a project to execute commands..." : "Enter a slash command..."}
                            disabled={isExecuting || isGlobal}
                            className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50 placeholder-slate-500" 
                        />
                        <button 
                            onClick={() => handleCommand()} 
                            disabled={isExecuting || !command || isGlobal} 
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white px-5 py-3 rounded-xl font-black text-sm transition-colors shadow-lg shadow-emerald-900/20"
                        >
                            <i className="fas fa-play"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
