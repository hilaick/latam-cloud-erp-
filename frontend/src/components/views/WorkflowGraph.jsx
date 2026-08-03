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

/* ─── Phase header node ─── */
function PhaseHeaderNode({ data }) {
  return (
    <div
      className="rounded-2xl px-6 py-4 text-white font-black shadow-lg border-2"
      style={{
        background: `linear-gradient(135deg, ${data.color}ee, ${data.color})`,
        borderColor: data.color,
        width: 280,
      }}
    >
      <div className="flex items-center gap-2 text-sm tracking-wider uppercase opacity-80">
        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">
          {data.phase}
        </div>
        {data.label}
      </div>
      {data.summary && (
        <div className="text-[11px] opacity-75 font-medium mt-1.5 leading-tight">
          {data.summary}
        </div>
      )}
    </div>
  );
}

/* ─── Phase gate node ─── */
function PhaseGateNode({ data }) {
  const isLast = data.gate_index === 3;
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm font-bold shadow-sm border transition-all"
      style={{
        background: `${data.color}15`,
        borderColor: `${data.color}60`,
        borderLeftWidth: 4,
        color: data.color,
        width: 260,
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black"
          style={{ background: `${data.color}30`, color: data.color }}>
          {data.gate_index + 1}
        </span>
        <span>{data.label}</span>
        {isLast && (
          <span className="ml-auto text-[10px] font-medium opacity-50">✓ gate</span>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  'phase-header': PhaseHeaderNode,
  'phase-gate': PhaseGateNode,
};

/* ─── Backend workflow JSON → React Flow ─── */
export function workflowToFlowGraph(workflow) {
  const nodes = (workflow.nodes || []).map(n => ({
    id: n.id,
    type: n.type === 'phase-header' ? 'phase-header' : n.type === 'phase-gate' ? 'phase-gate' : 'default',
    position: { x: n.position?.[0] ?? 0, y: n.position?.[1] ?? 0 },
    data: {
      label: n.name || '',
      color: n.data?.color || '#475569',
      summary: n.data?.summary || '',
      phase: n.data?.phase || 0,
    },
  }));

  const edges = [];
  Object.entries(workflow.connections || {}).forEach(([srcId, targets]) => {
    (targets.main?.[0] || []).forEach(t => {
      const srcExists = nodes.some(n => n.id === srcId);
      const tgtExists = nodes.some(n => n.id === t.node);
      if (srcExists && tgtExists) {
        const srcNode = nodes.find(n => n.id === srcId);
        const srcColor = srcNode?.data?.color || '#94a3b8';
        const isPhaseJump = srcNode?.type === 'phase-gate' && t.node.includes('_header');
        edges.push({
          id: `e-${srcId}-${t.node}`,
          source: srcId,
          target: t.node,
          type: isPhaseJump ? 'smoothstep' : 'smoothstep',
          animated: true,
          style: { stroke: srcColor, strokeWidth: isPhaseJump ? 3 : 2 },
        });
      }
    });
  });

  return { nodes, edges };
}

/* ─── The viewer ─── */
export default function WorkflowGraph({ workflow, onClose, title, compact }) {
  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => workflow ? workflowToFlowGraph(workflow) : { nodes: [], edges: [] },
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

  const graphHeight = compact ? '50vh' : '70vh';
  const header = compact ? null : (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
      <div>
        <h3 className="font-black text-slate-800 text-lg">
          <i className="fas fa-project-diagram text-blue-600 mr-2" />
          {title || workflow.name || 'Standard Delivery Methodology'}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {workflow.nodes?.length || 0} nodes · {Object.keys(workflow.connections || {}).length || 0} connections
        </p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
        >
          <i className="fas fa-times mr-1" /> Close
        </button>
      )}
    </div>
  );

  return (
    <div className={`bg-white ${compact ? 'rounded-xl' : 'rounded-2xl'} shadow-sm border border-slate-200 overflow-hidden`}>
      {header}
      <div style={{ height: graphHeight, width: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.4, maxZoom: 1.5 }}
          minZoom={0.15}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.55 }}
          nodesDraggable={false}
          nodesConnectable={false}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2 },
          }}
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls className="!rounded-xl !shadow-md !border-slate-200" />
          <MiniMap
            nodeColor={n => n.data?.color || '#475569'}
            className="!rounded-xl !shadow-md !border-slate-200"
            maskColor="rgba(0,0,0,.05)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
