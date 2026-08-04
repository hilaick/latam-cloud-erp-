import React, { useMemo } from 'react';
import { ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

/* ─── Phase header node renderer ─── */
function PhaseHeaderNode({ data }) {
  const props = data?.parameters || {};
  return (
    <div
      className="rounded-2xl px-6 py-4 text-white font-black shadow-lg border-2"
      style={{
        background: `linear-gradient(135deg, ${props.color}ee, ${props.color})`,
        borderColor: props.color,
        width: 280,
      }}
    >
      <div className="flex items-center gap-2 text-sm tracking-wider uppercase opacity-80">
        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">
          {props.phase}
        </div>
        {data.label}
      </div>
      {props.summary && (
        <div className="text-[11px] opacity-75 font-medium mt-1.5 leading-tight">
          {props.summary}
        </div>
      )}
    </div>
  );
}

/* ─── Phase gate node renderer ─── */
function PhaseGateNode({ data }) {
  const props = data?.parameters || {};
  const idx = props.gate_index ?? 0;
  const isLast = idx === 3;
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm font-bold shadow-sm border transition-all"
      style={{
        background: `${props.color}15`,
        borderColor: `${props.color}60`,
        borderLeftWidth: 4,
        color: props.color,
        width: 260,
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black"
          style={{ background: `${props.color}30`, color: props.color }}
        >
          {idx + 1}
        </span>
        <span>{data.label}</span>
        {isLast && (
          <span className="ml-auto text-[10px] font-medium opacity-50">✓ gate</span>
        )}
      </div>
    </div>
  );
}

/* Stable at module level — ReactFlow requirement */
const nodeTypes = {
  'phase-header': PhaseHeaderNode,
  'phase-gate': PhaseGateNode,
};

/* ─── Backend JSON → ReactFlow format (objects only, no primitives in data) ─── */
function parseN8nToReactFlow(n8nWorkflow) {
  if (!n8nWorkflow || !Array.isArray(n8nWorkflow.nodes)) {
    return { nodes: [], edges: [] };
  }

  // 1. Nodes — every data field must be an object, never a primitive
  const nodes = n8nWorkflow.nodes.map((node) => {
    const posX = Array.isArray(node.position) ? node.position[0] : (node.position?.x || 0);
    const posY = Array.isArray(node.position) ? node.position[1] : (node.position?.y || 0);

    return {
      id: String(node.id || node.name),
      type: node.type || 'default',           // must match a key in nodeTypes
      position: { x: Number(posX), y: Number(posY) },
      // CRITICAL: data must be a clean object, never a primitive
      data: {
        label: String(node.name || ''),
        n8nType: node.type,
        parameters: node.data || {},           // all custom props nest here
      },
    };
  });

  // 2. Edges — data container initialised as object or omitted
  const edges = [];
  if (n8nWorkflow.connections) {
    Object.entries(n8nWorkflow.connections).forEach(([sourceNodeName, connectionData]) => {
      connectionData.main?.forEach((outputBranch) => {
        outputBranch?.forEach((targetConfig) => {
          if (targetConfig && targetConfig.node) {
            const srcNode = nodes.find(n => n.id === sourceNodeName);
            const srcColor = srcNode?.data?.parameters?.color || '#94a3b8';
            const isPhaseJump = srcNode?.data?.n8nType === 'phase-gate'
                             && targetConfig.node.includes('_header');
            edges.push({
              id: `edge-${sourceNodeName}-${targetConfig.node}`,
              source: String(sourceNodeName),
              target: String(targetConfig.node),
              animated: true,
              style: {
                stroke: srcColor,
                strokeWidth: isPhaseJump ? 3 : 2,
              },
              data: {},                         // initialised object, never a string
            });
          }
        });
      });
    });
  }

  return { nodes, edges };
}

/* ─── Main viewer ─── */
export default function WorkflowGraph({ workflow, compact }) {
  const { nodes, edges } = useMemo(() => {
    return parseN8nToReactFlow(workflow);
  }, [workflow]);

  if (!workflow) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4">
        <i className="fas fa-spinner fa-spin text-2xl" />
        <span className="font-bold text-sm">Loading workflow...</span>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <span className="font-bold text-sm">No workflow elements found.</span>
      </div>
    );
  }

  const h = compact ? '50vh' : '70vh';

  return (
    <div style={{ width: '100%', height: h, backgroundColor: '#f8fafc' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.5 }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      />
    </div>
  );
}
