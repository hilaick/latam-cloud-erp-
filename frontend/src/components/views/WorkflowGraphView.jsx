import React, { useState, useEffect } from 'react';
import WorkflowGraph from './WorkflowGraph';
import { useAuth } from '../../context/AuthContext';

export default function WorkflowGraphView() {
  const { token } = useAuth();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorkflow = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch('/api/gateway/generate-n8n-workflow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({}),
        });
        const data = await resp.json();
        if (data.success) {
          setWorkflow(data.workflow);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (err) {
        console.error('Failed to load standard workflow', err);
        setError(err.message || 'Failed to load workflow');
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflow();
  }, [token]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
        <i className="fas fa-spinner fa-spin text-3xl" />
        <div className="text-sm font-bold">Loading Standard Delivery Methodology...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-red-400 gap-3">
        <i className="fas fa-exclamation-triangle text-3xl" />
        <div className="font-bold text-sm">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <WorkflowGraph
        workflow={workflow}
        title="Standard Delivery Methodology"
      />
    </div>
  );
}
