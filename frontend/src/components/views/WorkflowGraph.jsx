import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

/* ─── Phase → colour map ─── */
const PHASE_COLORS = {
  'Phase 1': '#f59e0b',
  'Phase 2': '#3b82f6',
  'Phase 3': '#8b5cf6',
  'Phase 4': '#10b981',
  'Phase 4.0': '#10b981',
  'Phase 5': '#ef4444',
  'Gate': '#6b7280',
};

function phaseColor(name) {
  for (const [k, v] of Object.entries(PHASE_COLORS)) {
    if (name.includes(k)) return v;
  }
  return '#475569';
}

function nodeIcon(type) {
  if (type.includes('trigger')) return '⚡';
  if (type.includes('httpRequest')) return '🌐';
  if (type.includes('if') || type.includes('switch')) return '🔀';
  if (type.includes('wait')) return '⏳';
  if (type.includes('noOp')) return '🏁';
  if (type.includes('splitInBatches')) return '📦';
  return '⬡';
}

/* ─── n8n JSON → React Flow  ─── */
export function n8nToFlowGraph(workflow) {
  const nodes = (workflow.nodes || []).map(n => {
    const shortName = (n.name || '').replace(/^[^\s]*\s+(Phase\s[0-9.]+:\s*)?/, '').substring(0, 28);
    return {
      id: n.id || n.name,
      type: 'default',
      position: { x: (n.position?.[0] ?? 0) / 5 + 40, y: (n.position?.[1] ?? 0) / 5 + 10 },
      data: {
        label: (
          <div className="text-xs leading-tight">
            <span className="font-black text-[10px] opacity-70">{nodeIcon(n.type)} {shortName}</span>
          </div>
        ),
      },
      style: {
        background: phaseColor(n.name),
        color: '#fff',
        border: '1px solid rgba(0,0,0,.2)',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 700,
        minWidth: 130,
      },
    };
  });

  const edges = [];
  Object.entries(workflow.connections || {}).forEach(([srcName, targets]) => {
    (targets.main?.[0] || []).forEach(t => {
      const srcNode = nodes.find(n => n.id === srcName || n.data?.label?.props?.children?.[1]?.includes?.(srcName));
      edges.push({
        id: `e-${srcName}-${t.node}`,
        source: srcName,
        target: t.node,
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      });
    });
  });

  return { nodes, edges };
}

/* ─── The viewer ─── */
export default function WorkflowGraph({ workflow, onClose, title }) {
  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => workflow ? n8nToFlowGraph(workflow) : { nodes: [], edges: [] },
    [workflow]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  if (!workflow) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4">
        <i className="fas fa-spinner fa-spin text-2xl" />
        <span className="font-bold text-sm">Loading workflow...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h3 className="font-black text-slate-800 text-lg">
            <i className="fas fa-project-diagram text-blue-600 mr-2" />
            {title || workflow.name || 'Migration Workflow'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {workflow.nodes?.length || 0} nodes · {Object.keys(workflow.connections || {}).length || 0} connections
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
          >
            <i className="fas fa-times mr-1" /> Close
          </button>
        </div>
      </div>
      {/* Graph */}
      <div style={{ height: '70vh', width: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls className="!rounded-xl !shadow-md !border-slate-200" />
          <MiniMap
            nodeColor={n => n.style?.background || '#475569'}
            className="!rounded-xl !shadow-md !border-slate-200"
            maskColor="rgba(0,0,0,.05)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
