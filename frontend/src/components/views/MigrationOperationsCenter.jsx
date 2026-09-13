import React, { useState, useEffect, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import LiveCloudNOC from './LiveCloudNOC';

/* ═══════════════════════════════════════════════════════════════════
   Migration Operations Center — top-level LIVE dashboard.
   Tabbed: Status (monitoring) · Inventory (infrastructure scanner) · mig_worker (SSH access)
   Available ANY time: during 4.1-4.7 execution, after completion, or before starting.
   Project filter list: switch between concurrent migrations.
   ═══════════════════════════════════════════════════════════════════ */

const MIG_PHASES = [
    ['4.1', 'Network'], ['4.2', 'Source Prep'], ['4.3', 'Target ECS'],
    ['4.4', 'Data Sync'], ['4.5', 'Cutover'], ['4.6', 'Harden'], ['4.7', 'Test'],
];

function MigrationOpsDashboard({ project }) {
    const [prompt, setPrompt] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [term, setTerm] = useState([]);
    const [profileInfo, setProfileInfo] = useState(null);
    const [cloudState, setCloudState] = useState(null);
    const [execPlan, setExecPlan] = useState(null);
    const [executionState, setExecutionState] = useState(null);
    const [selectedServer, setSelectedServer] = useState('');
    const [selectedAction, setSelectedAction] = useState('SMS_SUBTASK_MONITOR');
    const [taskBusy, setTaskBusy] = useState(null);
    const [taskResult, setTaskResult] = useState(null);
    const [showPlan, setShowPlan] = useState(true);
    const token = sessionStorage.getItem('hermes_access_token');
    const log = (l) => setTerm(p => [...p.slice(-200), l]);

    useEffect(() => {
        fetch('/api/hermes-cli/health').then(r => r.json()).then(d => { if (d?.capabilities) setProfileInfo(d); }).catch(() => {});
    }, []);

    useEffect(() => {
        if (!project?.id) return;
        let a = true;
        const p = () => fetch(`/api/execution/${project.id}/orchestrate/status`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { if (a) setExecutionState(d); }).catch(() => {});
        p(); const iv = setInterval(p, 5000);
        return () => { a = false; clearInterval(iv); };
    }, [project?.id]);

    useEffect(() => {
        if (!project?.id) return;
        let a = true;
        const p = () => fetch(`/api/execution/${project.id}/cloud-state`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { if (a && d.success) setCloudState(d); }).catch(() => {});
        p(); const iv = setInterval(p, 5000);
        return () => { a = false; clearInterval(iv); };
    }, [project?.id]);

    const buildPlan = async () => {
        log('[plan] building...');
        try {
            const r = await fetch(`/api/execution/${project.id}/build-plan`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}' });
            const d = await r.json();
            setExecPlan(d.plan || d);
            log(`[plan ✓] ${(d.plan || d).steps?.length || 0} steps`);
        } catch (e) { log(`[plan ✗] ${e.message}`); }
    };
    useEffect(() => { if (project?.id) buildPlan(); }, [project?.id]);

    const runStep = async () => {
        if (!selectedServer) { log('[exec] pick a server'); return; }
        const step = (execPlan?.steps || []).find(s => s.target_resource === selectedServer && s.action === selectedAction);
        if (!step) { log(`[exec ✗] no step ${selectedAction} for ${selectedServer}`); return; }
        setTaskBusy(selectedAction);
        log(`[exec] step ${step.step_id} ${selectedAction} → ${selectedServer}`);
        try {
            const r = await fetch(`/api/execution/${project.id}/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ step_id: step.step_id, dry_run: false }) });
            const d = await r.json();
            setTaskResult(d);
            log(!d?.error && !d?.result?.steps?.some?.(s => s.status === 'failed') ? `[exec ✓] ${selectedAction}` : `[exec ✗] ${d?.error || 'failed'}`);
        } catch (e) { log(`[exec ✗] ${e.message}`); }
        setTaskBusy(null);
    };

    const handleDelegate = async () => {
        if (!prompt || isExecuting) return;
        setIsExecuting(true);
        log(`[hermes] ${prompt.slice(0, 120)}`);
        try {
            const r = await fetch('/api/hermes-cli/delegate-task', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ goal: prompt, project_id: project?.id || '', context: `Phase: ${executionState?.current_phase || executionState?.currentPhase || '4.0'}.` }) });
            const d = await r.json();
            log(d.success ? `[hermes ✓]\n${(d.response || '').slice(0, 1000)}` : `[hermes ✗] ${d.error}`);
        } catch (e) { log(`[hermes ✗] ${e.message}`); }
        setIsExecuting(false);
        setPrompt('');
    };

    const cap = profileInfo?.capabilities || {};
    const realDelegation = cap.delegation || 'zai/glm-5.1';
    const realModel = cap.model || 'deepseek/pro';
    const phase = (executionState?.current_phase || executionState?.currentPhase || 'PHASE_4_1').replace('PHASE_4_', '4.');
    const servers = [...new Set((execPlan?.steps || []).map(s => s.target_resource).filter(Boolean))];
    const actions = [...new Set((execPlan?.steps || []).filter(s => s.target_resource === selectedServer).map(s => s.action))];
    const reconciled = cloudState?.reconciled_steps || {};
    const planSteps = execPlan?.steps || [];
    const stepStatus = (sid) => reconciled[sid] || 'pending';
    const cloudPhase = cloudState?.inferred_phase?.replace('PHASE_4_', '4.') || '—';

    return (
        <div className="animate-fade-in">
            {/* ── HEADER ── */}
            <div className="bg-slate-900 rounded-2xl border border-slate-700 p-4 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <div className="text-white font-black text-sm uppercase tracking-widest"><i className="fas fa-tools text-emerald-400 mr-2"></i>Status Dashboard</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Engine: <span className="text-emerald-400 font-bold">{phase}</span> · Cloud: <span className="text-cyan-400 font-bold">{cloudPhase}</span> · {cloudState?.phase_reason || ''}</div>
                    </div>
                    <div className="flex gap-2 text-[9px] font-mono">
                        <span className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-300"><i className="fas fa-robot mr-1 text-purple-400"></i>main: {realModel}</span>
                        <span className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-300"><i className="fas fa-paper-plane mr-1 text-blue-400"></i>delegate: {realDelegation}</span>
                        <span className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-300"><i className="fas fa-network-wired mr-1 text-amber-400"></i>VPC: {cloudState?.vpc_count || 0} · ECS: {cloudState?.ecs_count || 0}</span>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-1.5 mt-3">
                    {MIG_PHASES.map(([pk, label]) => {
                        const curIdx = parseInt(String(phase).replace('4.', '') || '1');
                        const idx = parseInt(pk.split('.')[1]);
                        const done = curIdx > idx || String(phase) === 'COMPLETED';
                        const active = curIdx === idx;
                        return <div key={pk} className={`p-2 rounded-lg text-center border ${done ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : active ? 'bg-purple-500/20 border-purple-500 text-purple-300 animate-pulse' : 'bg-slate-800/60 border-slate-700 text-slate-500'}`}><div className="text-[9px] font-black">{pk.split('.')[1]}</div><div className="text-[8px] font-medium truncate">{label}</div><i className={`fas ${done ? 'fa-check' : active ? 'fa-spinner fa-spin' : 'fa-circle'} text-[7px] mt-0.5`}></i></div>;
                    })}
                </div>
            </div>

            {/* ── SUMMARY CARDS ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                    { l: 'SMS Sources', v: cloudState?.sms_source_count ?? '—', sub: `${cloudState?.sms_sources_connected ?? 0} connected`, c: 'text-emerald-600' },
                    { l: 'SMS Tasks', v: cloudState?.sms_progress?.total ?? '—', sub: `${cloudState?.sms_progress?.running ?? 0} running`, c: 'text-amber-600' },
                    { l: 'Plan', v: `${planSteps.length} steps`, sub: `${Object.values(reconciled).filter(v => v === 'completed_by_cloud').length} done in cloud`, c: 'text-indigo-600' },
                    { l: 'Delegated', v: '—', sub: 'profile: default', c: 'text-purple-600' },
                ].map(c => <div key={c.l} className="bg-white border border-slate-200 rounded-xl p-3"><div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{c.l}</div><div className="text-xl font-black text-slate-800 mt-0.5">{c.v}</div><div className={`text-[9px] font-bold ${c.c}`}>{c.sub}</div></div>)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* COL 1: Plan Navigator */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden lg:col-span-1">
                    <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center"><h3 className="font-black text-xs text-slate-800 uppercase tracking-widest"><i className="fas fa-list-check text-indigo-600 mr-1.5"></i>Plan Navigator</h3><button onClick={() => setShowPlan(v => !v)} className="text-[9px] text-indigo-600 font-black uppercase tracking-widest"><i className={`fas ${showPlan ? 'fa-chevron-up' : 'fa-chevron-down'} mr-1`}></i>{showPlan ? 'Hide' : 'Show'}</button></div>
                    {showPlan && <div className="p-2 flex-1 overflow-y-auto max-h-[320px] custom-scrollbar">
                        {!planSteps.length && <div className="text-[11px] text-slate-400 p-2">No plan. <button onClick={buildPlan} className="text-indigo-600 font-bold">Build now</button></div>}
                        <div className="flex gap-1.5 mb-2">
                            <select value={selectedServer} onChange={e => { setSelectedServer(e.target.value); setTaskResult(null); }} className="flex-1 min-w-0 p-1.5 text-[10px] border border-slate-200 rounded-lg text-slate-700 font-medium"><option value="">— server —</option>{servers.map(s => <option key={s} value={s}>{s}</option>)}</select>
                            <select value={selectedAction} onChange={e => setSelectedAction(e.target.value)} className="flex-1 min-w-0 p-1.5 text-[10px] border border-slate-200 rounded-lg text-slate-700 font-medium"><option value="">— action —</option>{actions.map(a => <option key={a} value={a}>{a}</option>)}</select>
                            <button onClick={runStep} disabled={!selectedServer || !selectedAction || taskBusy} className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black disabled:opacity-40">{taskBusy ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-play mr-1"></i>Run</>}</button>
                        </div>
                        {taskResult && <div className={`mb-2 p-2 rounded-lg border text-[9px] font-mono ${taskResult.error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{taskResult.error ? taskResult.error : `done: ${JSON.stringify(taskResult.result?.summary || taskResult.message || 'ok').slice(0, 200)}`}</div>}
                        <table className="w-full text-left"><thead><tr className="border-b border-slate-200 text-[8px] font-black uppercase text-slate-400 tracking-widest"><th className="py-1 pr-1 w-7">#</th><th className="py-1 pr-1 w-9">Ph</th><th className="py-1 pr-1">Server</th><th className="py-1 pr-1">Action</th><th className="py-1 w-14">Status</th></tr></thead><tbody>{planSteps.filter(s => !selectedServer || s.target_resource === selectedServer).slice(0, 60).map(s => <tr key={s.step_id} className={`border-b border-slate-50 cursor-pointer hover:bg-indigo-50/40 ${s.target_resource === selectedServer ? 'bg-indigo-50/30' : ''}`} onClick={() => { setSelectedServer(s.target_resource); setSelectedAction(s.action); }}><td className="py-1 pr-1 text-[9px] font-mono text-slate-400">{s.step_id}</td><td className="py-1 pr-1 text-[9px] font-bold text-slate-500">{String(s.phase || '').replace('PHASE_4_', '4.')}</td><td className="py-1 pr-1 text-[9px] font-bold text-slate-600 truncate max-w-[90px]">{s.target_resource}</td><td className="py-1 pr-1 text-[9px] font-mono text-slate-700">{s.action}</td><td className={`py-1 text-[8px] font-black uppercase ${stepStatus(s.step_id) === 'completed_by_cloud' ? 'text-indigo-600' : stepStatus(s.step_id) === 'running_in_cloud' ? 'text-cyan-600' : 'text-slate-400'}`}>{stepStatus(s.step_id).replace(/_/g, ' ')}</td></tr>)}</tbody></table>
                    </div>}
                </div>

                {/* COL 2: Live Tasks */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden lg:col-span-1">
                    <div className="bg-slate-50 border-b border-slate-200 p-3"><h3 className="font-black text-xs text-slate-800 uppercase tracking-widest"><i className="fas fa-satellite-dish text-cyan-600 mr-1.5"></i>Live Migration Status</h3><div className="text-[9px] text-slate-400 mt-0.5">Real Huawei Cloud · polls every 5s</div></div>
                    <div className="p-2 flex-1 overflow-y-auto max-h-[420px] custom-scrollbar">
                        {(cloudState?.resources?.sms_tasks || []).length === 0 && <div className="text-[11px] text-slate-400 p-2">No tasks. {cloudState?.credentials_found === false ? 'Credentials missing.' : 'Waiting for cloud data…'}</div>}
                        {(cloudState?.resources?.sms_tasks || []).map(t => <div key={t.id} className="mb-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                            <div className="flex items-center justify-between"><span className="font-bold text-[10px] text-slate-800">{t.source_server_name || t.name}</span><span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${t.state === 'RUNNING' || t.state === 'SYNCING' ? 'bg-emerald-100 text-emerald-700' : t.state === 'SUCCESS' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{t.state}</span></div>
                            <div className="text-[9px] text-slate-500 mt-1 font-mono">{t.target_server_name && <div>→ {t.target_server_name}</div>}{t.migration_percent > 0 && <div className="font-bold text-emerald-700">{t.migration_percent}% · {t.subtask_info || ''}</div>}{t.syncing && <div className="text-cyan-600"><i className="fas fa-sync fa-spin mr-1"></i>continuous sync</div>}</div>
                            <div className="mt-1.5 bg-slate-100 rounded h-1.5 overflow-hidden"><div className="h-full rounded transition-all" style={{ width: `${t.migration_percent || 0}%`, background: t.migration_percent >= 100 ? '#0891b2' : '#10b981' }}></div></div>
                        </div>)}
                        {(cloudState?.resources?.sms_sources || []).slice(0, 8).map(s => <div key={s.id} className="mb-1.5 px-2 py-1.5 rounded-lg border border-slate-100 flex items-center justify-between"><span className="text-[9px] font-bold text-slate-600">{s.name}</span><span className={`text-[8px] font-black uppercase ${s.connected ? 'text-emerald-600' : 'text-slate-400'}`}>{s.connected ? '● connected' : '○ ' + (s.state || 'offline')}</span></div>)}
                        {cloudState && <div className="mt-2 text-[8px] font-mono text-slate-400">↻ {cloudState.timestamp} · credentials: {cloudState.credentials_found ? '✓' : '✗'}</div>}
                    </div>
                </div>

                {/* COL 3: Agent + Activity Log */}
                <div className="flex flex-col gap-4 lg:col-span-1">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center"><h3 className="font-black text-xs text-slate-800 uppercase tracking-widest"><i className="fas fa-robot text-purple-600 mr-1.5"></i>Delegated Agent</h3><span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[8px] font-black uppercase">{realDelegation}</span></div>
                        <div className="p-3">
                            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && handleDelegate()} placeholder="Freeform ops — e.g. 'verify task 4b88f2' or 'check quota'" className="w-full p-2.5 bg-slate-100 border-none rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none resize-none h-20" />
                            <div className="flex gap-2 mt-2">
                                <button onClick={handleDelegate} disabled={!prompt || isExecuting} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">{isExecuting ? <><i className="fas fa-spinner fa-spin mr-1"></i>Delegating…</> : <><i className="fas fa-paper-plane mr-1"></i>Delegate</>}</button>
                                <button onClick={() => { setTerm([]); log('[log] cleared'); }} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-[10px]"><i className="fas fa-eraser"></i></button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden flex-1 min-h-[200px]">
                        <div className="bg-slate-800 border-b border-slate-700 p-3"><h3 className="font-black text-xs text-white flex items-center"><i className="fas fa-terminal text-emerald-400 mr-1.5"></i>Activity Log</h3></div>
                        <div className="flex-1 p-3 font-mono text-[10px] text-emerald-400 overflow-y-auto whitespace-pre-wrap custom-scrollbar bg-slate-950 min-h-[140px] max-h-[280px]">
                            {term.length === 0 && <div className="text-slate-500">[system] no activity — run a step, poll status, or delegate a freeform task.</div>}
                            {term.map((l, i) => <div key={i}>{l}</div>)}
                            {isExecuting && <div className="text-amber-400 animate-pulse mt-1"><i className="fas fa-spinner fa-spin mr-1"></i>agent working…</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── QUICK TOOLBAR ── */}
            <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-1"><i className="fas fa-bolt mr-1 text-amber-500"></i>Quick tools</span>
                <button onClick={buildPlan} className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider border border-indigo-100"><i className="fas fa-drafting-compass mr-1"></i>Rebuild Plan</button>
                <button onClick={() => fetch(`/api/execution/${project.id}/orchestrate/status`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { setExecutionState(d); log(`[status] phase ${d.current_phase || d.currentPhase || '?'} · ${d.log?.length || 0} log lines`); })} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider"><i className="fas fa-sync mr-1"></i>Status</button>
                <button onClick={() => fetch(`/api/execution/${project.id}/cloud-state`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { if (d.success) setCloudState(d); log(`[cloud] phase ${d.inferred_phase} · ${d.sms_progress?.total || 0} tasks · ${d.sms_sources_connected || 0} sources`); })} className="px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-[10px] font-black uppercase tracking-wider border border-cyan-100"><i className="fas fa-satellite-dish mr-1"></i>Cloud</button>
                <button onClick={() => fetch('/api/hermes-cli/health').then(r => r.json()).then(d => { setProfileInfo(d); log(`[health] delegation: ${d.capabilities?.delegation} · model: ${d.capabilities?.model}`); })} className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-wider border border-purple-100"><i className="fas fa-heartbeat mr-1"></i>Health</button>
                <button onClick={() => fetch('/api/hermes-cli/system-info', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { log(`[sys] customers:${d.database_counts?.customers} projects:${d.database_counts?.projects} bridge:${d.status?.hermes_daemon_bridge}`); })} className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-100"><i className="fas fa-stethoscope mr-1"></i>DB</button>
                <span className="ml-auto text-[8px] font-mono text-slate-400">mode: {project?.executionMode || 'manual'} · this tab shows STATUS only</span>
            </div>
        </div>
    );
}

/* ── Inventory tab — original Cloud Infrastructure Scanner, driven by the GLOBAL project picker ── */
function InventoryScanTab({ project, customer }) {
    return (
        <div className="min-h-[500px]">
            <LiveCloudNOC defaultCustomerId={customer?.id || ''} />
        </div>
    );
}

/* ── mig_worker tab — real registered workers + triggers + deploy ── */
function MigWorkerTab({ project }) {
    const [workers, setWorkers] = useState([]);
    const [workerLog, setWorkerLog] = useState([]);
    const [showTriggers, setShowTriggers] = useState(false);
    const token = sessionStorage.getItem('hermes_access_token');
    const wlog = (l) => setWorkerLog(p => [...p.slice(-100), l]);

    useEffect(() => {
        const fetchWorkers = () => fetch('/api/mig-worker/list').then(r => r.json()).then(d => {
            if (d.workers) setWorkers(d.workers);
        }).catch(() => {});
        fetchWorkers();
        const iv = setInterval(fetchWorkers, 10000);
        return () => clearInterval(iv);
    }, []);

    const deployWorker = async (trigger) => {
        wlog(`[deploy] deploying mig_worker via trigger="${trigger}"...`);
        try {
            const r = await fetch('/api/mig-worker/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ region: project?.region || 'la-north-2', project_id: project?.id, triggers: [trigger] }) });
            const d = await r.json();
            wlog(d.success ? `[deploy ✓] ${d.ecs_name} in ${d.region} | triggers: ${d.triggers.join(', ')}` : `[deploy ✗] ${d.error}`);
        } catch (e) { wlog(`[deploy ✗] ${e.message}`); }
    };

    const triggers = [
        { id: 'cross_cloud', label: 'Cross-Cloud (AWS/Azure/vSphere)', icon: 'fa-cloud', desc: 'Needs qemu-img in target region' },
        { id: 'source_inaccessible', label: 'Source Inaccessible (Zero Trust)', icon: 'fa-lock', desc: 'Agent install + discovery' },
        { id: 'concurrent_overload', label: 'Concurrent Overload (>12 SMS tasks)', icon: 'fa-tasks', desc: `Currently: ${workers.length} workers` },
        { id: 'manual', label: 'Manual (request now)', icon: 'fa-user-cog', desc: 'Explicit user request' },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: registered workers */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden lg:col-span-1">
                <div className="bg-slate-50 border-b border-slate-200 p-3">
                    <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest"><i className="fas fa-server text-emerald-600 mr-1.5"></i>Registered mig_workers</h3>
                    <div className="text-[9px] text-slate-400 mt-0.5">{workers.filter(w => !w.stale).length} active · {workers.filter(w => w.stale).length} stale · {workers.length} total</div>
                </div>
                <div className="p-2 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar">
                    {workers.length === 0 && <div className="text-[11px] text-slate-400 p-2">No mig_workers registered yet. Workers appear here after registering via <code className="bg-slate-100 px-1 rounded">POST /api/mig-worker/register</code> (cloud-init does this automatically on boot).</div>}
                    {workers.map(w => (
                        <div key={w.worker_id} className="mb-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-[10px] text-slate-800 font-mono">{w.worker_id}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${w.stale ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>{w.stale ? 'stale' : w.status || 'ready'}</span>
                            </div>
                            <div className="text-[9px] text-slate-500 mt-1 font-mono">region: {w.region} · tools: {(w.tools || []).join(', ')}</div>
                            <div className="text-[8px] text-slate-400 font-mono">last heartbeat: {w.last_heartbeat ? new Date(w.last_heartbeat).toLocaleTimeString() : 'never'}</div>
                            {w.active_tasks?.length > 0 && <div className="text-[8px] text-cyan-600 font-bold mt-0.5">tasks: {w.active_tasks.join(', ')}</div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Center: deploy triggers */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden lg:col-span-1">
                <div className="bg-slate-50 border-b border-slate-200 p-3">
                    <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest"><i className="fas fa-bolt text-amber-600 mr-1.5"></i>Deploy Triggers</h3>
                    <div className="text-[9px] text-slate-400 mt-0.5">From execution_engine.py line 670: when would a mig_worker deploy?</div>
                </div>
                <div className="p-2 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar">
                    {triggers.map(t => (
                        <div key={t.id} className="mb-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50">
                            <div className="flex items-center justify-between">
                                <div><span className="text-[10px] font-bold text-slate-700"><i className={`fas ${t.icon} mr-1.5 text-amber-500`}></i>{t.label}</span><div className="text-[9px] text-slate-400">{t.desc}</div></div>
                                <button onClick={() => deployWorker(t.id)} disabled={t.id === 'concurrent_overload' && workers.length <= 12} className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest"><i className="fas fa-rocket mr-1"></i>Deploy</button>
                            </div>
                        </div>
                    ))}
                    <div className="mt-2 text-[9px] text-slate-400 border-t border-slate-100 pt-2"><i className="fas fa-info-circle mr-1"></i>Deploys a real ECS with cloud-init that bakes hcloud, obsutil, qemu-img, paramiko, MCP client, and Skills tree (target VPC for resilience tasks, source VPC for zero-trust agent install).</div>
                </div>
            </div>

            {/* Right: deploy log */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden lg:col-span-1">
                <div className="bg-slate-800 border-b border-slate-700 p-3"><h3 className="font-black text-xs text-white flex items-center"><i className="fas fa-terminal text-emerald-400 mr-1.5"></i>mig_worker Activity Log</h3></div>
                <div className="flex-1 p-3 font-mono text-[10px] text-emerald-400 overflow-y-auto whitespace-pre-wrap bg-slate-950 min-h-[200px] max-h-[420px]">
                    {workerLog.length === 0 && <div className="text-slate-500">[system] no mig_worker activity yet. Deploy a worker or wait for auto-registration.</div>}
                    {workerLog.map((l, i) => <div key={i}>{l}</div>)}
                </div>
            </div>
        </div>
    );
}

/* ═══ Top-level: tabbed Ops Center ═══ */
const TABS = [
    { id: 'status', label: 'Status', icon: 'fa-chart-line' },
    { id: 'inventory', label: 'Inventory', icon: 'fa-search' },
    { id: 'mig_worker', label: 'mig_worker', icon: 'fa-server' },
];

export default function MigrationOperationsCenter() {
    const { projects, customers } = useContext(ERPContext);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [activeTab, setActiveTab] = useState('status');
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const activeProjects = (projects || []).filter(p => p.id);
    const sp = activeProjects.find(p => String(p.id) === String(selectedProjectId)) || activeProjects[0];
    // Resolve the customer from the selected project (single source of truth — no duplicate picker)
    const customer = customers?.find(c => String(c.id) === (sp?.customerId || sp?.customer_id || ''));

    return (
        <div className="animate-fade-in min-h-screen bg-slate-50">
            <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-6 pb-12 space-y-4">
                {/* Brand + project filter */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center"><i className="fas fa-tv text-white"></i></div>
                        <div><h1 className="text-xl font-black text-slate-800 tracking-tight">Migration Operations Center</h1><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live status across projects · during & after execution</p></div>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2 lg:justify-end">
                        {/* Collapsible project search bar — one control for all tabs */}
                        <div className="relative min-w-[260px]">
                            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm cursor-pointer" onClick={() => setSearchOpen(v => !v)}>
                                <i className={`fas fa-search text-slate-400 ${searchOpen ? '' : ''}`}></i>
                                <span className="text-sm font-bold text-slate-700 flex-1 truncate">{sp?.projectName || sp?.name || 'Select project…'}</span>
                                {sp && <span className="px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-700 text-[9px] font-black uppercase tracking-wider">{sp.executionMode || sp.phase || '—'}</span>}
                                <i className={`fas ${searchOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-slate-400 text-xs transition-transform`}></i>
                            </div>
                            {searchOpen && (
                                <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                                    <div className="p-3 border-b border-slate-100">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search projects by name…"
                                            className="w-full p-2 bg-slate-100 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-cyan-400"
                                        />
                                    </div>
                                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                        {activeProjects.filter(p => {
                                            const q = searchQuery.toLowerCase();
                                            if (!q) return true;
                                            return ((p.projectName || p.name || '') + ' ' + (p.executionMode || '') + ' ' + p.id).toLowerCase().includes(q);
                                        }).map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => { setSelectedProjectId(p.id); setSearchOpen(false); setSearchQuery(''); }}
                                                className={`w-full text-left px-4 py-2.5 hover:bg-cyan-50 transition-colors flex items-center justify-between ${String(p.id) === String(sp?.id) ? 'bg-cyan-50' : ''}`}
                                            >
                                                <span>
                                                    <span className="block text-sm font-bold text-slate-700">{p.projectName || p.name || `Project ${String(p.id).slice(-6)}`}</span>
                                                    <span className="block text-[9px] text-slate-400 font-mono">id: {String(p.id).slice(0, 14)} · {p.executionMode || p.phase || 'no mode'}</span>
                                                </span>
                                                {String(p.id) === String(sp?.id) && <i className="fas fa-check text-cyan-600 text-xs"></i>}
                                            </button>
                                        ))}
                                        {activeProjects.filter(p => searchQuery ? ((p.projectName || p.name || '') + ' ' + (p.executionMode || '') + ' ' + p.id).toLowerCase().includes(searchQuery.toLowerCase()) : true).length === 0 && (
                                            <div className="px-4 py-6 text-center text-xs text-slate-400">No projects match "{searchQuery}"</div>
                                        )}
                                    </div>
                                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[9px] text-slate-400 font-mono">{activeProjects.length} projects</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}>
                            <i className={`fas ${t.icon} mr-1.5`}></i>{t.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {sp ? (
                    <>
                        {activeTab === 'status' && <MigrationOpsDashboard project={sp} />}
                        {activeTab === 'inventory' && <InventoryScanTab project={sp} customer={customer} />}
                        {activeTab === 'mig_worker' && <MigWorkerTab project={sp} />}
                    </>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm"><i className="fas fa-inbox text-3xl mb-3"></i><div>No projects yet. Create one in the wizard to start monitoring.</div></div>
                )}
            </div>
        </div>
    );
}
