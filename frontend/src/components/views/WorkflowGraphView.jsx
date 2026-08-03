import React, { useContext, useState, useEffect } from 'react';
import { ERPContext } from '../../context/ERPContext';
import WorkflowGraph from './WorkflowGraph';

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('hermes_access_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export default function WorkflowGraphView() {
  const { projects, activeProjectId } = useContext(ERPContext);
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // On mount, try active project first
  useEffect(() => {
    if (activeProjectId && activeProjectId !== 'none' && activeProjectId !== 'global') {
      setSelectedProjectId(activeProjectId);
    }
  }, [activeProjectId]);

  const fetchWorkflow = async () => {
    if (!selectedProjectId) {
      setError('Select a project first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gateway/generate-n8n-workflow', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ project_id: selectedProjectId }),
      });
      const data = await res.json();
      if (data.success) {
        setWorkflow(data.workflow);
      } else {
        setError(data.error || 'Failed to generate workflow');
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedProjectId) fetchWorkflow();
  }, [selectedProjectId]);

  const projectList = (projects || []).filter(p => !p.isDeleted);
  const activeProj = projectList.find(p => String(p.id) === String(activeProjectId));

  return (
    <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
      {/* Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <i className="fas fa-project-diagram text-blue-600 text-xl" />
          <div>
            <h3 className="font-black text-slate-800">Migration Workflow Graph</h3>
            <p className="text-xs text-slate-500">Visual representation of the ERP migration orchestration pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-white min-w-[240px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select a project --</option>
            {projectList.map(p => (
              <option key={p.id} value={p.id}>
                {p.customerName || p.name || `Project ${p.id}`} {activeProj?.id === p.id ? '(active)' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={fetchWorkflow}
            disabled={!selectedProjectId || loading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95"
          >
            {loading ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-sync-alt mr-1" />}
            Generate
          </button>
        </div>
      </div>

      {/* Content */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 font-bold text-sm">
          <i className="fas fa-exclamation-triangle mr-2" />{error}
        </div>
      )}
      {workflow && <WorkflowGraph workflow={workflow} title={workflow.name} onClose={() => setWorkflow(null)} />}
      {!workflow && !loading && !error && selectedProjectId && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-400">
          <i className="fas fa-arrow-up text-4xl mb-3" />
          <p className="font-bold">Click "Generate" to render the workflow graph</p>
        </div>
      )}
    </div>
  );
}
