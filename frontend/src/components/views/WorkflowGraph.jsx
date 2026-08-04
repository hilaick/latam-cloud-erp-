import React, { useMemo } from 'react';
import { ReactFlow } from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';

/* ═══════════════════════════════════════════════
   LAYOUT ENGINE — Dagre hierarchical (left→right)
   ═══════════════════════════════════════════════ */

const NODE_W = 280;
const NODE_H = 80;

function dagreLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    align: 'UL',
    ranksep: 150,
    nodesep: 30,
    edgesep: 20,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach(n => {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  });

  edges.forEach(e => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map(n => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: pos.x - NODE_W / 2,
        y: pos.y - NODE_H / 2,
      },
    };
  });
}

/* ═══════════════════════════════════════════════
   CUSTOM NODE RENDERERS
   ═══════════════════════════════════════════════ */

function PhaseHeaderNode({ data }) {
  const p = data?.parameters || {};
  const color = p.color || '#3b82f6';
  return (
    <div
      style={{
        width: NODE_W,
        background: `linear-gradient(135deg, ${color}, ${color}dd)`,
        color: 'white',
        borderRadius: 16,
        padding: '14px 18px',
        fontWeight: 800,
        boxShadow: `0 6px 20px ${color}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
        border: `2px solid ${color}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: p.summary ? 6 : 0 }}>
        <span style={{
          display: 'inline-flex', width: 28, height: 28,
          borderRadius: 10, background: 'rgba(255,255,255,0.2)',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 900,
        }}>
          {p.phase || '?'}
        </span>
        <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
          {data.label}
        </span>
      </div>
      {p.summary && (
        <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 500, lineHeight: 1.4 }}>
          {p.summary}
        </div>
      )}
    </div>
  );
}

function PhaseGateNode({ data }) {
  const p = data?.parameters || {};
  const color = p.color || '#64748b';
  const idx = p.gate_index ?? 0;
  const isLast = idx === 3;
  return (
    <div
      style={{
        width: NODE_W - 40,
        background: `${color}10`,
        border: `1.5px solid ${color}40`,
        borderLeft: `5px solid ${color}`,
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 700,
        color: `${color}`,
        boxShadow: `0 2px 8px rgba(0,0,0,0.04)`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{
        display: 'inline-flex', width: 24, height: 24,
        borderRadius: 8, background: `${color}20`,
        alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 900,
      }}>
        {idx + 1}
      </span>
      <span style={{ flex: 1 }}>{data.label}</span>
      {isLast && (
        <span style={{ fontSize: 10, opacity: 0.4, marginLeft: 'auto' }}>✓ gate</span>
      )}
    </div>
  );
}

const nodeTypes = {
  'phase-header': PhaseHeaderNode,
  'phase-gate': PhaseGateNode,
};

/* ═══════════════════════════════════════════════
   BACKEND JSON → REACTFLOW
   ═══════════════════════════════════════════════ */

function parseWorkflow(wf) {
  if (!wf?.nodes?.length) return { nodes: [], edges: [] };

  // Nodes: id, type, data (all objects, no primitives)
  const nodes = wf.nodes.map(n => ({
    id: String(n.id || n.name),
    type: n.type || 'default',
    position: { x: 0, y: 0 },
    data: {
      label: String(n.name || ''),
      parameters: n.data || {},
    },
  }));

  // Edges: source→target, animated, colored by source phase
  const edges = [];
  const conns = wf.connections || {};
  Object.entries(conns).forEach(([src, targets]) => {
    targets.main?.[0]?.forEach(t => {
      if (!t?.node) return;
      const srcNode = nodes.find(n => n.id === src);
      const color = srcNode?.data?.parameters?.color || '#94a3b8';
      const isJump = srcNode?.type === 'phase-gate' && t.node.includes('_header');
      edges.push({
        id: `e-${src}-${t.node}`,
        source: src,
        target: t.node,
        type: 'smoothstep',
        animated: true,
        style: { stroke: color, strokeWidth: isJump ? 3 : 2 },
        data: {},
      });
    });
  });

  return { nodes, edges };
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */

export default function WorkflowGraph({ workflow, compact }) {
  const { nodes: rawNodes, edges } = useMemo(
    () => parseWorkflow(workflow),
    [workflow]
  );

  const nodes = useMemo(
    () => dagreLayout(rawNodes, edges),
    [rawNodes, edges]
  );

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
        <span className="font-bold text-sm">No workflow elements.</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: compact ? '55vh' : '75vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        style={{ background: '#f8fafc', borderRadius: 16 }}
      />
    </div>
  );
}
