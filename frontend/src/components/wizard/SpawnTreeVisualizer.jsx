import React, { useState, useEffect, useRef, useMemo } from 'react';

const STATUS_COLORS = {
  succeeded: { bg: '#10b981', text: '#fff', label: '✓' },
  success: { bg: '#10b981', text: '#fff', label: '✓' },
  running: { bg: '#f59e0b', text: '#fff', label: '●' },
  started: { bg: '#f59e0b', text: '#fff', label: '●' },
  failed: { bg: '#ef4444', text: '#fff', label: '✗' },
  timeout: { bg: '#ef4444', text: '#fff', label: '✗' },
  error: { bg: '#ef4444', text: '#fff', label: '✗' },
  pending: { bg: '#6b7280', text: '#fff', label: '○' },
  simulated: { bg: '#6366f1', text: '#fff', label: '📋' },
  warning: { bg: '#f59e0b', text: '#fff', label: '⚠' },
  pass: { bg: '#10b981', text: '#fff', label: '✓' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status?.toLowerCase()] || STATUS_COLORS.pending;
  return (
    <span style={{
      background: cfg.bg, color: cfg.text, fontSize: '9px', fontWeight: 700,
      padding: '2px 6px', borderRadius: '4px', display: 'inline-flex',
      alignItems: 'center', gap: '3px', textTransform: 'uppercase',
    }}>
      {cfg.label} {status || 'pending'}
    </span>
  );
}

function TreeNode({ node, children, isRoot }) {
  const cfg = STATUS_COLORS[node.status?.toLowerCase()] || STATUS_COLORS.pending;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={{
        background: isRoot ? '#1e1b4b' : '#1f2937',
        border: `2px solid ${cfg.bg}`,
        borderRadius: '10px',
        padding: '8px 14px',
        minWidth: '180px',
        textAlign: 'center',
        boxShadow: `0 0 12px ${cfg.bg}33`,
        marginBottom: children?.length ? '24px' : '0',
      }}>
        <div style={{ fontSize: '10px', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {isRoot ? '🎯 Main Orchestrator' : node.label || node.operation}
        </div>
        {!isRoot && (
          <>
            <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>
              {node.server && `🖥 ${node.server.substring(0, 25)}`}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
              <StatusBadge status={node.status} />
              {node.model && (
                <span style={{ fontSize: '8px', color: '#a78bfa', background: '#312e81', padding: '1px 4px', borderRadius: '3px' }}>
                  {node.model}
                </span>
              )}
            </div>
          </>
        )}
        {isRoot && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
            <span style={{ fontSize: '8px', color: '#a78bfa' }}>glm-5.2</span>
            <StatusBadge status={node.status || 'running'} />
          </div>
        )}
      </div>
      {children?.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', position: 'relative' }}>
          {/* Vertical connector from parent */}
          <div style={{
            position: 'absolute', top: '-24px', left: '50%', width: '2px', height: '24px',
            background: '#374151', transform: 'translateX(-50%)',
          }} />
          {children.map((child, i) => (
            <div key={i} style={{ position: 'relative' }}>
              {/* Horizontal connector */}
              {i > 0 && (
                <div style={{
                  position: 'absolute', top: '-24px', left: '-8px', right: '50%',
                  height: '2px', background: '#374151',
                }} />
              )}
              <TreeNode node={child.node} children={child.children} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SpawnTreeVisualizer({ projectId, simulationTrace, isActive, mode = 'execution' }) {
  const [progress, setProgress] = useState({ operations: [], spawnTree: { nodes: [], edges: [] } });
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  // Poll execution progress
  useEffect(() => {
    if (mode !== 'execution' || !isActive) return;
    const fetchProgress = async () => {
      try {
        const token = sessionStorage.getItem('hermes_access_token') || localStorage.getItem('token');
        const res = await fetch(`/api/execution/${projectId}/progress`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setProgress(data.progress || { operations: [], spawnTree: { nodes: [], edges: [] } });
        }
      } catch (e) { /* ignore */ }
    };
    fetchProgress();
    intervalRef.current = setInterval(fetchProgress, 3000);
    return () => clearInterval(intervalRef.current);
  }, [projectId, isActive, mode]);

  // Build tree from execution progress
  const executionTree = useMemo(() => {
    const { nodes, edges } = progress.spawnTree;
    if (!nodes?.length) return null;
    const rootNode = nodes.find(n => n.id === 'main') || { id: 'main', label: 'Main Orchestrator', status: 'running', model: 'glm-5.2' };
    const children = nodes
      .filter(n => n.id !== 'main')
      .map(n => ({ node: n, children: [] }));
    return { node: rootNode, children };
  }, [progress]);

  // Build tree from simulation trace
  const simulationTree = useMemo(() => {
    if (!simulationTrace?.length) return null;
    const agents = {};
    simulationTrace.forEach(step => {
      const agent = step.agent || 'System';
      if (!agents[agent]) {
        agents[agent] = {
          id: agent,
          label: agent,
          status: step.result === 'fail' ? 'failed' : step.result === 'simulated' ? 'simulated' : 'pass',
          model: 'glm-5.2',
          server: step.target || '',
          operations: [],
        };
      }
      agents[agent].operations.push({
        action: step.action,
        result: step.result,
        message: step.message?.substring(0, 100),
      });
      // Update status to worst case
      if (step.result === 'fail') agents[agent].status = 'failed';
    });
    const childNodes = Object.values(agents).filter(a => a.id !== 'Main Orchestrator' && a.id !== 'System');
    return {
      node: { id: 'main', label: 'Main Orchestrator', status: 'running', model: 'glm-5.2' },
      children: childNodes.map(n => ({ node: n, children: [] })),
    };
  }, [simulationTrace]);

  const tree = mode === 'simulation' ? simulationTree : executionTree;

  // Operation timeline
  const operations = mode === 'simulation'
    ? (simulationTrace || []).map(s => ({
        operation: s.action, status: s.result === 'fail' ? 'failed' : s.result || 'pending',
        server: s.target || s.agent || '', detail: s.message?.substring(0, 120) || '',
        timestamp: '',
      }))
    : progress.operations || [];

  return (
    <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px', border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ color: '#e0e7ff', fontSize: '13px', fontWeight: 700, margin: 0 }}>
          🌳 Agent Spawn Tree {mode === 'simulation' && '(Simulation)'} {mode === 'execution' && '(Execution)'}
        </h3>
        {isActive && (operations.length > 0 || tree) && (
          <span style={{ fontSize: '9px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', background: '#f59e0b', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
            {mode === 'simulation' ? 'REPLAY' : 'LIVE'}
          </span>
        )}
        {isActive && !operations.length && !tree && (
          <span style={{ fontSize: '9px', color: '#6b7280' }}>
            {mode === 'simulation' ? 'WAITING FOR SIMULATION...' : 'WAITING FOR EXECUTION...'}
          </span>
        )}
        {!isActive && operations.length > 0 && (
          <span style={{ fontSize: '9px', color: '#10b981' }}>✓ COMPLETED</span>
        )}
      </div>

      {/* Spawn Tree */}
      {tree ? (
        <div style={{ overflowX: 'auto', padding: '8px 0', minHeight: '120px', display: 'flex', justifyContent: 'center' }}>
          <TreeNode node={tree.node} children={tree.children} isRoot />
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '11px', padding: '20px' }}>
          {isActive ? 'Waiting for agent spawns...' : 'No active execution'}
        </div>
      )}

      {/* Operation Timeline */}
      {operations.length > 0 && (
        <div style={{ marginTop: '12px', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
          <div style={{ fontSize: '10px', color: '#818cf8', fontWeight: 600, marginBottom: '6px' }}>OPERATION TIMELINE</div>
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {operations.slice(-20).map((op, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                background: '#111827', padding: '6px 8px', borderRadius: '6px',
                border: '1px solid #1e293b',
              }}>
                <StatusBadge status={op.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '10px', color: '#e5e7eb', fontWeight: 600 }}>
                    {op.operation}
                    {op.server && <span style={{ color: '#818cf8', marginLeft: '6px' }}>{op.server.substring(0, 30)}</span>}
                  </div>
                  {op.detail && <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>{op.detail}</div>}
                </div>
                {op.timestamp && <span style={{ fontSize: '8px', color: '#6b7280' }}>{op.timestamp.substring(11, 19)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}
