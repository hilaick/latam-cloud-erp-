import React, { useMemo, useEffect } from 'react';
import {
  WorkflowBuilderRoot,
  WorkflowBuilderCanvas,
  useWorkflowBuilderActions,
} from '@workflowbuilder/sdk';
import '@xyflow/react/dist/style.css';

/* ─── Phase header node renderer ─── */
function PhaseHeaderNode({ data }) {
  const props = data?.properties || {};
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
  const props = data?.properties || {};
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

/* Stable references — declared at module level per SDK docs */
const rfNodeTypes = {
  'phase-header': PhaseHeaderNode,
  'phase-gate': PhaseGateNode,
};

const paletteNodeTypes = [
  { type: 'phase-header', label: 'Phase Header', icon: 'Activity' },
  { type: 'phase-gate', label: 'Phase Gate', icon: 'CheckCircle' },
];

/* ─── Backend JSON → WorkflowBuilder format ─── */
function toWBFormat(workflow) {
  const nodes = (workflow.nodes || []).map(n => ({
    id: n.id,
    type: n.type,                              // ReactFlow node type
    position: { x: n.position?.[0] ?? 0, y: n.position?.[1] ?? 0 },
    data: {
      type: n.type,                            // maps to palette item
      icon: n.type === 'phase-header' ? 'Activity' : 'CheckCircle',
      label: n.name,
      properties: {
        ...(n.data || {}),
        color: n.data?.color || '#475569',
        phase: n.data?.phase,
        gate_index: n.data?.gate_index,
        summary: n.data?.summary || '',
      },
    },
  }));

  const edges = [];
  Object.entries(workflow.connections || {}).forEach(([srcId, targets]) => {
    const tgtList = targets.main?.[0] || [];
    tgtList.forEach(t => {
      const srcNode = nodes.find(n => n.id === srcId);
      const srcColor = srcNode?.data?.properties?.color || '#94a3b8';
      const isPhaseJump = srcNode?.data?.type === 'phase-gate' && t.node.includes('_header');
      edges.push({
        id: `e-${srcId}-${t.node}`,
        source: srcId,
        target: t.node,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: srcColor,
          strokeWidth: isPhaseJump ? 3 : 2,
        },
        data: { label: '' },
      });
    });
  });

  return { nodes, edges };
}

/* ─── Read-only enforcer — must be child of WorkflowBuilderRoot ─── */
function ReadOnlyEnforcer() {
  const { setReadOnly } = useWorkflowBuilderActions();
  useEffect(() => {
    setReadOnly(true);
  }, [setReadOnly]);
  return null;
}

/* ─── Main viewer ─── */
export default function WorkflowGraph({ workflow, compact }) {
  const initData = useMemo(
    () => workflow ? toWBFormat(workflow) : { nodes: [], edges: [] },
    [workflow]
  );

  if (!workflow) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4">
        <i className="fas fa-spinner fa-spin text-2xl" />
        <span className="font-bold text-sm">Loading workflow...</span>
      </div>
    );
  }

  const h = compact ? '50vh' : '70vh';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <WorkflowBuilderRoot
        initialNodes={initData.nodes}
        initialEdges={initData.edges}
        nodeTypes={paletteNodeTypes}
        layoutDirection="RIGHT"
        name="Standard Delivery Methodology"
        integration={{ strategy: 'localStorage' }}
        reactFlowProps={{
          nodeTypes: rfNodeTypes,
          fitView: true,
          fitViewOptions: { padding: 0.3, maxZoom: 1.5 },
          minZoom: 0.1,
          maxZoom: 2,
          nodesDraggable: false,
          nodesConnectable: false,
        }}
      >
        <ReadOnlyEnforcer />
        <div style={{ height: h, width: '100%' }}>
          <WorkflowBuilderCanvas />
        </div>
      </WorkflowBuilderRoot>
    </div>
  );
}
