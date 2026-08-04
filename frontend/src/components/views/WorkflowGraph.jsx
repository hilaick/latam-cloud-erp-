import React, { useMemo } from 'react';
import { ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

/* ═══════════════════════════════════════════════
   CUSTOM LAYOUT — 5 columns × 5 rows grid
   Phase headers at top, sub-gates stacked below
   Inter-column connections: gate-4 → next header
   ═══════════════════════════════════════════════ */

const COL_W = 340;   // gap between phase columns
const ROW_H = 100;   // gap between gate rows
const NODE_W = 300;  // visual width (for centering)
const NODE_H = 72;   // visual height (for centering)

function customLayout(nodes, edges) {
  // Separate phase headers from sub-gates
  const headers = nodes.filter(n => n.type === 'phase-header');
  const gates   = nodes.filter(n => n.type === 'phase-gate');

  // Sort: extract phase number from id (e.g. "phase_1_header" → 1)
  const phaseNum = (id) => parseInt((id.match(/phase_(\d+)/) || [])[1]) || 0;

  headers.sort((a, b) => phaseNum(a.id) - phaseNum(b.id));
  gates.sort((a, b) => {
    const pa = phaseNum(a.id), pb = phaseNum(b.id);
    if (pa !== pb) return pa - pb;
    // Within same phase, sort by gate index
    const ga = a.data?.parameters?.gate_index ?? 0;
    const gb = b.data?.parameters?.gate_index ?? 0;
    return ga - gb;
  });

  // Position phase headers: row 0, columns 0..4
  const positioned = [];
  const colPositions = {}; // phase_num → x

  headers.forEach((node, i) => {
    const pn = phaseNum(node.id);
    const x = i * COL_W;
    colPositions[pn] = x;
    positioned.push({
      ...node,
      position: { x, y: 0 },
    });
  });

  // Position sub-gates: rows 1..4, columns matching their phase
  gates.forEach(node => {
    const pn = phaseNum(node.id);
    const gateIdx = node.data?.parameters?.gate_index ?? 0;
    const x = colPositions[pn] ?? 0;
    positioned.push({
      ...node,
      position: { x, y: ROW_H * (gateIdx + 1) },
    });
  });

  // Add isometric 3D offset — skew x up and to the right
  const isoAngle = 0.3; // isometric skew factor
  return positioned.map(n => ({
    ...n,
    position: {
      x: n.position.x + n.position.y * isoAngle,
      y: n.position.y * 0.7,  // foreshorten vertical
    },
    // Attach un-projected coords for debugging if needed
    data: {
      ...n.data,
      _gridX: n.position.x,
      _gridY: n.position.y,
    },
  }));
}

/* ─── Phase header node renderer ─── */
function PhaseHeaderNode({ data }) {
  const props = data?.parameters || {};
  return (
    <div
      className="phase-header-node"
      style={{
        '--color': props.color || '#3b82f6',
        width: NODE_W,
      }}
    >
      <div className="phase-header-inner">
        <div className="phase-badge">{props.phase || '?'}</div>
        <div className="phase-label">{data.label}</div>
      </div>
      {props.summary && (
        <div className="phase-summary">{props.summary}</div>
      )}
      {/* 3D depth face */}
      <div className="node-depth" />
      <div className="node-depth-right" />
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
      className="phase-gate-node"
      style={{
        '--color': props.color || '#94a3b8',
        width: NODE_W - 40,
      }}
    >
      <div className="gate-inner">
        <span className="gate-index">{idx + 1}</span>
        <span className="gate-label">{data.label}</span>
        {isLast && <span className="gate-marker">✓ gate</span>}
      </div>
      <div className="node-depth" />
      <div className="node-depth-right" />
    </div>
  );
}

/* Stable at module level — ReactFlow requirement */
const nodeTypes = {
  'phase-header': PhaseHeaderNode,
  'phase-gate': PhaseGateNode,
};

/* ─── Backend JSON → ReactFlow format ─── */
function parseN8nToReactFlow(n8nWorkflow) {
  if (!n8nWorkflow || !Array.isArray(n8nWorkflow.nodes)) {
    return { nodes: [], edges: [] };
  }

  const nodes = n8nWorkflow.nodes.map(node => ({
    id: String(node.id || node.name),
    type: node.type || 'default',
    position: { x: 0, y: 0 },  // will be overwritten by layout
    data: {
      label: String(node.name || ''),
      n8nType: node.type,
      parameters: node.data || {},
    },
  }));

  const edges = [];
  if (n8nWorkflow.connections) {
    Object.entries(n8nWorkflow.connections).forEach(([srcId, connData]) => {
      connData.main?.forEach(branch => {
        branch?.forEach(target => {
          if (target?.node) {
            const srcNode = nodes.find(n => n.id === srcId);
            const srcColor = srcNode?.data?.parameters?.color || '#64748b';
            const isPhaseJump = srcNode?.data?.n8nType === 'phase-gate'
                             && target.node.includes('_header');
            edges.push({
              id: `e-${srcId}-${target.node}`,
              source: String(srcId),
              target: String(target.node),
              type: 'smoothstep',
              animated: true,
              style: {
                stroke: srcColor,
                strokeWidth: isPhaseJump ? 3 : 2,
                opacity: isPhaseJump ? 1 : 0.7,
              },
              data: {},
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
  const { nodes: rawNodes, edges } = useMemo(
    () => parseN8nToReactFlow(workflow),
    [workflow]
  );

  const nodes = useMemo(
    () => customLayout(rawNodes, edges),
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
        <span className="font-bold text-sm">No workflow elements found.</span>
      </div>
    );
  }

  const h = compact ? '55vh' : '75vh';

  return (
    <div
      className="workflow-3d-container"
      style={{
        width: '100%',
        height: h,
        perspective: '3000px',
        perspectiveOrigin: '50% 40%',
        background: 'radial-gradient(ellipse at 50% 30%, #1e293b 0%, #0f172a 100%)',
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      <div
        className="workflow-3d-stage"
        style={{
          width: '100%',
          height: '100%',
          transform: 'rotateX(20deg) rotateZ(-3deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.5, maxZoom: 1.2 }}
          minZoom={0.05}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll={false}
          zoomOnScroll={false}
          panOnDrag={false}
          preventScrolling={false}
        >
          {/* Dark theme background for ReactFlow internals */}
          <svg>
            <defs>
              <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.6" />
              </linearGradient>
            </defs>
          </svg>
        </ReactFlow>
      </div>
    </div>
  );
}
