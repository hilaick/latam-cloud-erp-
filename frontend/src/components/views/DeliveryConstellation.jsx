import React, { useState, useEffect, useRef, useMemo } from 'react';

/* ═══════════════════════════════════════════════
   DELIVERY CONSTELLATION — 5-phase methodology
   as an interactive spatial star map.
   Inspired by LiveConstellationView from Phase 5.
   ═══════════════════════════════════════════════ */

/* ─── Configuration: 5 phase hubs + their sub-gates ─── */
const PHASES = [
  {
    id: 'phase_1',
    label: 'Discovery & Assessment',
    summary: 'ARB Intake, WBS, BoM validation',
    color: '#3b82f6', // blue
    icon: 'fa-search',
    gates: [
      'ARB Handover & SOW',
      'High-Level WBS',
      'Quotation BoM Upload',
      'Gate Validation',
    ],
  },
  {
    id: 'phase_2',
    label: 'Infrastructure Setup',
    summary: 'Source discovery, topology, DTRB',
    color: '#8b5cf6', // purple
    icon: 'fa-sitemap',
    gates: [
      'MgC Source Discovery',
      'ORA Risk Assessment',
      'Target Topology Mapper',
      'DTRB Governance Lock',
    ],
  },
  {
    id: 'phase_3',
    label: 'Data Migration',
    summary: 'WBS, tooling, physics, cutover plan',
    color: '#f59e0b', // amber
    icon: 'fa-database',
    gates: [
      'WBS & RACI Matrix',
      'Strategic Tooling',
      'Delivery Physics',
      'Wave & Runbook Plan',
    ],
  },
  {
    id: 'phase_4',
    label: 'Application Migration',
    summary: 'CI/CD pipeline, workbench, command center',
    color: '#ef4444', // red
    icon: 'fa-rocket',
    gates: [
      'Readiness Gateway',
      'CI/CD Orchestrator',
      'Agent Workbench',
      'Command Center',
    ],
  },
  {
    id: 'phase_5',
    label: 'Cutover & Hypercare',
    summary: '3-Way diff, constellation, WAR, commercial',
    color: '#10b981', // emerald
    icon: 'fa-flag-checkered',
    gates: [
      '3-Way Infra Diff',
      'Target Constellation',
      'WAR Sign-Off',
      'Commercial True-Up',
    ],
  },
];

/* ─── Spatial layout: pentagon arrangement ─── */
const W = 1200;
const H = 750;
const CX = W / 2;
const CY = H / 2;
const PENTAGON_R = 260; // radius for phase hubs

function polar(angle, radius, cx = CX, cy = CY) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function computeLayout() {
  // Place 5 phase hubs in a pentagon
  const hubs = PHASES.map((p, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / 5; // start from top
    const pos = polar(angle, PENTAGON_R);
    return {
      ...p,
      x: pos.x,
      y: pos.y,
      angle,
    };
  });

  // Place sub-gate nodes around each hub
  const gateRadius = 110;
  const allNodes = [];
  const allEdges = [];

  hubs.forEach((hub, pi) => {
    hub.gates.forEach((gateName, gi) => {
      // Orbiting angle: spread gates in an arc facing outward
      const gateCount = hub.gates.length;
      const startAngle = hub.angle - 0.5;
      const arc = 1.0; // radians spread
      const step = gateCount > 1 ? arc / (gateCount - 1) : 0;
      const gAngle = startAngle + step * gi;
      const pos = polar(gAngle, gateRadius, hub.x, hub.y);

      const node = {
        id: `${hub.id}_gate_${gi}`,
        label: gateName,
        phaseId: hub.id,
        phaseLabel: hub.label,
        gateIndex: gi,
        isLast: gi === gateCount - 1,
        color: hub.color,
        icon: hub.icon,
        x: pos.x,
        y: pos.y,
        category: hub.id,
      };
      allNodes.push(node);

      // Edge from hub to first gate, then gate-to-gate within phase
      if (gi === 0) {
        allEdges.push({
          id: `${hub.id}_hub_to_g0`,
          from: { x: hub.x, y: hub.y },
          to: { x: pos.x, y: pos.y },
          color: hub.color,
          type: 'phase-internal',
        });
      } else {
        const prev = allNodes.find(
          n => n.phaseId === hub.id && n.gateIndex === gi - 1
        );
        if (prev) {
          allEdges.push({
            id: `${hub.id}_g${gi - 1}_to_g${gi}`,
            from: { x: prev.x, y: prev.y },
            to: { x: pos.x, y: pos.y },
            color: hub.color,
            type: 'phase-internal',
          });
        }
      }
    });

    // Cross-phase edge: last gate of this phase → next phase hub
    const nextHub = hubs[(pi + 1) % hubs.length];
    const lastGate = allNodes.filter(
      n => n.phaseId === hub.id && n.isLast
    )[0];
    if (lastGate && nextHub) {
      allEdges.push({
        id: `${hub.id}_to_${nextHub.id}`,
        from: { x: lastGate.x, y: lastGate.y },
        to: { x: nextHub.x, y: nextHub.y },
        color: hub.color,
        type: 'cross-phase',
        dashed: true,
      });
    }
  });

  return { hubs, allNodes, allEdges };
}

/* ─── Main component ─── */
export default function DeliveryConstellation({ compact }) {
  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const { hubs, allNodes, allEdges } = useMemo(computeLayout, []);
  const total = allNodes.length; // 20 gates

  const containerRef = useRef(null);

  // Pan handlers
  const onMouseDown = (e) => {
    setDrag({ sx: e.clientX - pan.x, sy: e.clientY - pan.y });
  };
  const onMouseMove = (e) => {
    if (!drag) return;
    setPan({ x: e.clientX - drag.sx, y: e.clientY - drag.sy });
  };
  const onMouseUp = () => setDrag(null);

  // Playback
  useEffect(() => {
    if (!playing) return;
    if (step >= total) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep(s => s + 1), 250);
    return () => clearTimeout(t);
  }, [playing, step, total]);

  const h = compact ? '55vh' : '75vh';

  return (
    <div
      className="delivery-constellation-container"
      style={{
        width: '100%',
        height: h,
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1a 100%)',
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        cursor: drag ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* ─── Controls ─── */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 20, display: 'flex', gap: 8 }}>
        <button
          onClick={() => { setStep(0); setPlaying(true); }}
          disabled={playing}
          style={{
            background: playing ? '#374151' : '#4f46e5',
            color: 'white', border: 'none', borderRadius: 14,
            padding: '10px 18px', fontWeight: 800, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            cursor: playing ? 'default' : 'pointer',
            opacity: playing ? 0.6 : 1,
          }}
        >
          <i className="fas fa-play mr-2" />
          Animate Flow
        </button>
        <button
          onClick={() => { setStep(total); setPlaying(false); }}
          style={{
            background: '#1f2937', color: '#d1d5db', border: '1px solid #374151',
            borderRadius: 14, padding: '10px 18px', fontWeight: 800, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
          }}
        >
          <i className="fas fa-eye mr-2" />
          Show All
        </button>
        <button
          onClick={() => { setStep(0); setPlaying(false); }}
          style={{
            background: '#1f2937', color: '#d1d5db', border: '1px solid #374151',
            borderRadius: 14, padding: '10px 18px', fontWeight: 800, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
          }}
        >
          <i className="fas fa-undo mr-2" />
          Reset
        </button>
      </div>

      {/* ─── Zoom controls ─── */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 20, display: 'flex', gap: 4 }}>
        <button
          onClick={() => setZoom(z => Math.max(0.3, z - 0.15))}
          style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151',
            borderRadius: 10, width: 36, height: 36, fontSize: 16, fontWeight: 800, cursor: 'pointer' }}
        >−</button>
        <div style={{ background: '#111827', color: '#d1d5db', border: '1px solid #374151',
          borderRadius: 10, padding: '0 12px', display: 'flex', alignItems: 'center',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.05em' }}>
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={() => setZoom(z => Math.min(3, z + 0.15))}
          style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151',
            borderRadius: 10, width: 36, height: 36, fontSize: 16, fontWeight: 800, cursor: 'pointer' }}
        >+</button>
        <button
          onClick={() => { setZoom(0.7); setPan({ x: 0, y: 0 }); }}
          style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151',
            borderRadius: 10, width: 36, height: 36, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
        ><i className="fas fa-sync-alt" /></button>
      </div>

      {/* ─── Progress bar ─── */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          {step}/{total} Gates Revealed
        </div>
        <div style={{ width: 200, height: 4, background: '#1f2937', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${(step / total) * 100}%`, height: '100%', background: '#6366f1', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* ─── Constellation stage ─── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: drag ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        <div style={{ width: W, height: H, position: 'relative', margin: 'auto' }}>
          {/* ─── SVG edges layer ─── */}
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${W} ${H}`}
            style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
          >
            {/* Inter-hub pentagon ring */}
            <polygon
              points={hubs.map(h => `${h.x},${h.y}`).join(' ')}
              fill="none"
              stroke="#6366f1"
              strokeWidth="1"
              strokeDasharray="6 4"
              opacity="0.25"
            />

            {/* All edges (animated in based on step) */}
            {allEdges.map((edge, i) => {
              // Show edge if BOTH endpoints' nodes are revealed
              // For cross-phase: show if source gate (which is last gate) is revealed
              if (edge.type === 'cross-phase') {
                const srcGate = allNodes.find(
                  n => n.phaseId === edge.id.split('_to_')[0] && n.isLast
                );
                if (!srcGate) return null;
                const srcIdx = allNodes.indexOf(srcGate);
                if (srcIdx >= step) return null;
              } else {
                // phase-internal: show if target gate revealed
                const parts = edge.id.split('_g');
                if (parts.length >= 3) {
                  const targetIdx = parseInt(parts[2]) || 0;
                  const phaseId = parts[0];
                  const targetNode = allNodes.find(
                    n => n.phaseId === phaseId && n.gateIndex === targetIdx
                  );
                  if (targetNode && allNodes.indexOf(targetNode) >= step) return null;
                }
              }

              return (
                <line
                  key={edge.id}
                  x1={edge.from.x}
                  y1={edge.from.y}
                  x2={edge.to.x}
                  y2={edge.to.y}
                  stroke={edge.color}
                  strokeWidth={edge.type === 'cross-phase' ? 2.5 : 1.5}
                  strokeDasharray={edge.dashed ? '5 3' : undefined}
                  opacity={edge.type === 'cross-phase' ? 0.6 : 0.4}
                  style={{
                    filter: `drop-shadow(0 0 6px ${edge.color}40)`,
                  }}
                />
              );
            })}
          </svg>

          {/* ─── Phase hubs ─── */}
          {hubs.map((hub, i) => {
            const revealed = step > 0; // hubs visible once animation starts
            return (
              <div
                key={hub.id}
                style={{
                  position: 'absolute',
                  left: hub.x - 50,
                  top: hub.y - 50,
                  width: 100,
                  height: 100,
                  borderRadius: 28,
                  background: `${hub.color}18`,
                  border: `2px solid ${hub.color}50`,
                  boxShadow: revealed ? `0 0 30px ${hub.color}30, inset 0 0 20px ${hub.color}10` : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  opacity: revealed ? 1 : 0.3,
                  transition: 'opacity 0.5s, box-shadow 0.5s',
                  zIndex: 10,
                  pointerEvents: 'auto',
                  cursor: 'default',
                }}
              >
                <i
                  className={`fas ${hub.icon}`}
                  style={{ fontSize: 20, color: hub.color }}
                />
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 900,
                    color: hub.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    maxWidth: 90,
                  }}
                >
                  {hub.label}
                </span>
              </div>
            );
          })}

          {/* ─── Central "delivery" core ─── */}
          {step > 0 && (
            <div
              style={{
                position: 'absolute',
                left: CX - 35,
                top: CY - 35,
                width: 70,
                height: 70,
                borderRadius: 22,
                background: 'rgba(99,102,241,0.15)',
                border: '2px solid rgba(99,102,241,0.5)',
                boxShadow: '0 0 40px rgba(99,102,241,0.3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                zIndex: 15,
              }}
            >
              <i className="fas fa-cloud" style={{ fontSize: 18, color: '#818cf8' }} />
              <span style={{ fontSize: 7, fontWeight: 900, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                LATAM ERP
              </span>
            </div>
          )}

          {/* ─── Sub-gate nodes ─── */}
          {allNodes.map((node, i) => {
            if (i >= step) return null;
            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: node.x - 6,
                  top: node.y - 6,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: node.color,
                  boxShadow: `0 0 14px ${node.color}70`,
                  zIndex: 20,
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                }}
                title={`${node.phaseLabel} → ${node.label}`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.8)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {/* Tooltip */}
                <div
                  style={{
                    position: 'absolute',
                    top: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1f2937ee',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #374151',
                    borderRadius: 12,
                    padding: '8px 12px',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    zIndex: 50,
                  }}
                  className="gate-tooltip"
                >
                  <div style={{ fontSize: 10, fontWeight: 800, color: node.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {node.phaseLabel}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af', marginTop: 2 }}>
                    Gate {node.gateIndex + 1}: {node.label}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ─── Edge labels (cross-phase only, when revealed) ─── */}
          {allEdges
            .filter(e => e.type === 'cross-phase')
            .map((edge) => {
              const [fromId, toId] = edge.id.split('_to_');
              const srcGate = allNodes.find(
                n => n.phaseId === fromId && n.isLast
              );
              if (!srcGate || allNodes.indexOf(srcGate) >= step) return null;
              const mx = (edge.from.x + edge.to.x) / 2;
              const my = (edge.from.y + edge.to.y) / 2;
              return (
                <div
                  key={`label-${edge.id}`}
                  style={{
                    position: 'absolute',
                    left: mx - 24,
                    top: my - 10,
                    fontSize: 8,
                    fontWeight: 800,
                    color: edge.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: '#0f0f1a99',
                    padding: '2px 6px',
                    borderRadius: 6,
                    border: `1px solid ${edge.color}40`,
                    pointerEvents: 'none',
                    zIndex: 5,
                  }}
                >
                  ✓ gate
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
