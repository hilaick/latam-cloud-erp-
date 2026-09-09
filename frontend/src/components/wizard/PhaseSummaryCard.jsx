import React, { useState, useEffect } from 'react';

// ═══ PHASE SUMMARY CARD — collapsible report from agent output ═══
// Renders after [done] appears in orchestrationLog, shows agent's full output
// Parses markdown tables from the report into a proper resource table

export default function PhaseSummaryCard({ phase, logLines, phaseKey, color, onRollback, projectId }) {
  const [open, setOpen] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [rollbackPreview, setRollbackPreview] = useState(null);
  const [rollbackSelected, setRollbackSelected] = useState({});
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackExecuting, setRollbackExecuting] = useState(false);
  const [rollbackResult, setRollbackResult] = useState(null);

  // Fetch full agent report from session DB (log truncates [output] to 200 chars)
  const [fullReport, setFullReport] = useState(null);
  useEffect(() => {
    if (!projectId) return;
    const token = sessionStorage.getItem('hermes_access_token');
    if (!token) return;
    let cancelled = false;
    fetch(`/api/execution/${projectId}/orchestrate/report`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (!cancelled && d.success && d.report) setFullReport(d.report); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [projectId]);

  // Build complete resource list with type
  const allResources = [
    ...(rollbackPreview?.vpcs || []).map(r => ({...r, type: 'VPC'})),
    ...(rollbackPreview?.subnets || []).map(r => ({...r, type: 'Subnet'})),
    ...(rollbackPreview?.security_groups || []).map(r => ({...r, type: 'SG'})),
    ...(rollbackPreview?.eips || []).map(r => ({...r, type: 'EIP'})),
  ];

  // Extract the agent output from log — everything after [output]
  const outputIdx = logLines.findIndex(l => l.startsWith('[output]'));
  const agentOutput = outputIdx >= 0 ? logLines.slice(outputIdx).join('\n').replace(/\[output\]\s?/g,'') : '';

  // Use full report from session DB when available (log truncates to 200 chars)
  const reportSource = fullReport || agentOutput;

  // Parse markdown table rows from the agent report
  const resourceRows = [];
  if (reportSource) {
    const tableMatch = reportSource.match(/\|.*\|/g);
    if (tableMatch) {
      let header = null;
      for (const row of tableMatch) {
        const cells = row.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length >= 2) {
          if (!header) header = cells;
          else if (cells.length === header.length && !row.includes('---')) {
            resourceRows.push(cells);
          }
        }
      }
    }
  }

  const handleRollbackClick = async () => {
    setRollbackOpen(true);
    setRollbackPreview(null);
    setRollbackLoading(true);
    // Preview
    try {
      const res = await fetch(`/api/execution/${projectId}/orchestrate/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('hermes_access_token')}` },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        setRollbackPreview(data.found || {});
        // Pre-select all
        const all = {};
        for (const list of Object.values(data.found || {})) for (const r of list) all[r.id] = true;
        setRollbackSelected(all);
      }
      else alert('Rollback preview failed: ' + (data.error || 'Unknown'));
    } catch (err) {
      alert('Rollback preview error: ' + err.message);
    }
    setRollbackLoading(false);
  };

  const handleRollbackExecute = async () => {
    const selected = Object.entries(rollbackSelected).filter(([_,v]) => v).map(([id]) => id);
    setRollbackExecuting(true);
    try {
      const res = await fetch(`/api/execution/${projectId}/orchestrate/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('hermes_access_token')}` },
        body: JSON.stringify({ resources: selected.length > 0 ? selected : 'all' })
      });
      const data = await res.json();
      if (data.success) {
        const deleted = data.deleted || {};
        const count = (deleted.vpcs?.length||0) + (deleted.subnets?.length||0) + (deleted.security_groups?.length||0) + (deleted.eips?.length||0);
        setRollbackResult(`✅ ${count} deleted. ${data.message || ''}`);
        setRollbackPreview(null); // clear stale list — show only confirmation
      } else {
        setRollbackResult(`❌ ${data.error || 'Rollback failed'}`);
      }
    } catch (err) {
      setRollbackResult(`❌ ${err.message}`);
    }
    setRollbackExecuting(false);
    // Keep the result visible — reopen panel with just the confirmation
    setRollbackOpen(true);
  };

  const found = rollbackPreview || {};
  const total = (found.vpcs?.length||0) + (found.subnets?.length||0) + (found.security_groups?.length||0) + (found.eips?.length||0);

  return (
    <div className="mt-3 border border-emerald-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-between text-sm font-black text-emerald-800 transition-colors"
      >
        <span><i className={`fas fa-chevron-${open ? 'down' : 'right'} mr-2 text-emerald-500`}></i> Phase Summary — {phase?.label || phaseKey}</span>
        <span className="text-[9px] text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">{resourceRows.length} resources</span>
      </button>
      {open && (
        <div className="p-4 bg-white border-t border-emerald-100">
          {resourceRows.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Resources Deployed</div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Resource','ID','Status','Details'].map(h => <th key={h} className="py-1 px-2 text-left text-[9px] font-black uppercase text-slate-400">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {resourceRows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {row.map((cell, j) => (
                        <td key={j} className={`py-2 px-2 ${j === 0 ? 'font-bold text-slate-800' : 'text-slate-600 font-mono text-[10px]'}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mb-3">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Agent Output</div>
            <pre className="text-[10px] text-slate-700 font-mono bg-slate-50 p-3 rounded-lg max-h-40 overflow-y-auto whitespace-pre-wrap">{agentOutput.slice(0,2000)}</pre>
          </div>
          {/* Rollback section */}
          <div className="border-t border-slate-200 pt-3 mt-3">
            {!rollbackOpen ? (
              <button onClick={handleRollbackClick} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-md transition-colors">
                <i className="fas fa-undo mr-1"></i> Rollback Phase {phaseKey.replace('PHASE_4_','4.')}
              </button>
            ) : (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <div className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-2">Rollback — Select Resources to Destroy</div>
                {rollbackResult && !rollbackPreview && (
                  <p className="text-xs font-bold text-emerald-700 mb-2 whitespace-pre-wrap">{rollbackResult}</p>
                )}
                {rollbackLoading ? (
                  <p className="text-xs text-slate-500"><i className="fas fa-spinner fa-spin mr-1"></i> Enumerating resources...</p>
                ) : total === 0 && !rollbackResult ? (
                  <p className="text-xs text-slate-500">No ERP-tagged resources found to rollback.</p>
                ) : total > 0 && rollbackPreview ? (
                  <>
                    <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
                      {found.vpcs?.map(r => <label key={r.id} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={rollbackSelected[r.id] !== false} onChange={() => setRollbackSelected(p => ({...p, [r.id]: p[r.id] === false}))} /> VPC: {r.name} ({r.id.slice(0,8)})</label>)}
                      {found.subnets?.map(r => <label key={r.id} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={rollbackSelected[r.id] !== false} onChange={() => setRollbackSelected(p => ({...p, [r.id]: p[r.id] === false}))} /> Subnet: {r.name}</label>)}
                      {found.security_groups?.map(r => <label key={r.id} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={rollbackSelected[r.id] !== false} onChange={() => setRollbackSelected(p => ({...p, [r.id]: p[r.id] === false}))} /> SG: {r.name}</label>)}
                      {found.eips?.map(r => <label key={r.id} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={rollbackSelected[r.id] !== false} onChange={() => setRollbackSelected(p => ({...p, [r.id]: p[r.id] === false}))} /> EIP: {r.ip}</label>)}
                    </div>
                    <button
                      onClick={handleRollbackExecute}
                      disabled={rollbackExecuting}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-md disabled:opacity-50"
                    >
                      {rollbackExecuting ? <><i className="fas fa-spinner fa-spin mr-1"></i> Deleting...</> : <><i className="fas fa-trash-alt mr-1"></i> Destroy Selected ({Object.values(rollbackSelected).filter(v => v).length})</>}
                    </button>
                  </>
                ) : null}
                {rollbackResult && <p className="text-[10px] mt-2 font-bold text-slate-600 whitespace-pre-wrap">{rollbackResult}</p>}
                <button onClick={() => setRollbackOpen(false)} className="ml-2 text-[10px] text-slate-400 hover:text-slate-600 underline">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
