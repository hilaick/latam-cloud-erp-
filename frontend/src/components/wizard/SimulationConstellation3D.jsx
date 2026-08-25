import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Spin, Space, Tag, Typography, Button, Tooltip as AntTooltip } from 'antd';
import {
  ArrowRightOutlined, PlayCircleOutlined, PauseCircleOutlined,
  StopOutlined, RedoOutlined, ZoomInOutlined, ZoomOutOutlined,
  FullscreenOutlined, FullscreenExitOutlined, CameraOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

/* ═══════════════════════════════════════════════
   3D Huawei Cloud Architecture Constellation
   — Builds scene ONCE, then shows/hides objects
     as the replay trace advances.
   — Works with ANY project's resources.
   — Includes replay controls + zoom/pan/reset.
   ═══════════════════════════════════════════════ */

const PHASE_CONFIG = {
  'PHASE_4_0':            { label: 'Phase 4.0 — Initialization', short: 'Init', icon: 'fa-rocket', color: '#6366f1' },
  'PHASE_4_1':            { label: 'Phase 4.1 — Network Verify', short: 'Network', icon: 'fa-network-wired', color: '#8b5cf6' },
  'PHASE_4_2':            { label: 'Phase 4.2 — Wave Planning', short: 'Wave', icon: 'fa-layer-group', color: '#8b5cf6' },
  'PHASE_4_2_KNOWLEDGE':  { label: 'Phase 4.2K — Knowledge & Skills', short: 'Skills', icon: 'fa-brain', color: '#a78bfa' },
  'PHASE_4_2_PREFLIGHT':  { label: 'Phase 4.2P — Capacity Preflight', short: 'Preflight', icon: 'fa-clipboard-check', color: '#a78bfa' },
  'PHASE_4_2b_PREFLIGHT': { label: 'Phase 4.2b — Source & Agent Prep', short: 'Agent Prep', icon: 'fa-download', color: '#f59e0b' },
  'PHASE_4_2c_TARGET':    { label: 'Phase 4.2c — Target Provisioning', short: 'Provision', icon: 'fa-server', color: '#3b82f6' },
  'PHASE_4_2c_TARGET_PREFLIGHT': { label: 'Phase 4.2cP — Disk Mapping', short: 'Disk Map', icon: 'fa-hdd', color: '#3b82f6' },
  'PHASE_4_2d_SYNC':      { label: 'Phase 4.2d — Data Sync', short: 'Sync', icon: 'fa-sync-alt', color: '#10b981' },
  'PHASE_4_2e':           { label: 'Phase 4.2e — Post-Sync', short: 'Post-Sync', icon: 'fa-check-circle', color: '#10b981' },
  'PHASE_4_2f':           { label: 'Phase 4.2f — Smoke Tests', short: 'Test', icon: 'fa-vial', color: '#10b981' },
  'PHASE_4_2f_POST':      { label: 'Phase 4.2f — Smoke Tests', short: 'Test', icon: 'fa-vial', color: '#10b981' },
  'PHASE_4_3':            { label: 'Phase 4.3 — Landing Zone', short: 'Landing', icon: 'fa-flag', color: '#10b981' },
  'PHASE_4_4':            { label: 'Phase 4.4 — HSS', short: 'HSS', icon: 'fa-shield-alt', color: '#06b6d4' },
  'PHASE_4_5':            { label: 'Phase 4.5 — Continuous Sync', short: 'Monitor', icon: 'fa-eye', color: '#06b6d4' },
  'PHASE_4_6':            { label: 'Phase 4.6 — Cutover', short: 'Cutover', icon: 'fa-exchange-alt', color: '#ef4444' },
  'PHASE_4_7':            { label: 'Phase 4.7 — Cleanup', short: 'Cleanup', icon: 'fa-broom', color: '#6b7280' },
  'PHASE_4_8':            { label: 'Phase 4.8 — Finalize', short: 'Finalize', icon: 'fa-flag-checkered', color: '#10b981' },
};

/* ── Resource type → visual config ── */
const RESOURCE_CONFIG = {
  ECS:        { color: 0x3b82f6, label: 'ECS',  icon: 'fa-server',        shape: 'server' },
  COMPUTE:    { color: 0x3b82f6, label: 'ECS',  icon: 'fa-server',        shape: 'server' },
  RDS:        { color: 0x10b981, label: 'RDS',  icon: 'fa-database',      shape: 'database' },
  DATABASE:   { color: 0x10b981, label: 'DB',   icon: 'fa-database',      shape: 'database' },
  DB:         { color: 0x10b981, label: 'DB',   icon: 'fa-database',      shape: 'database' },
  DCS:        { color: 0x10b981, label: 'DCS',  icon: 'fa-database',      shape: 'database' },
  CACHE:      { color: 0x10b981, label: 'Cache',icon: 'fa-database',      shape: 'database' },
  EVS:        { color: 0xf59e0b, label: 'EVS',  icon: 'fa-hdd',           shape: 'disk' },
  STORAGE:    { color: 0xf59e0b, label: 'EVS',  icon: 'fa-hdd',           shape: 'disk' },
  OBS:        { color: 0xf59e0b, label: 'OBS',  icon: 'fa-cube',          shape: 'bucket' },
  VPC:        { color: 0x8b5cf6, label: 'VPC',  icon: 'fa-cloud',         shape: 'vpc' },
  SUBNET:     { color: 0x8b5cf6, label: 'Subnet',icon: 'fa-network-wired',shape: 'subnet' },
  EIP:        { color: 0xfbbf24, label: 'EIP',  icon: 'fa-globe',         shape: 'eip' },
  SG:         { color: 0xef4444, label: 'SG',   icon: 'fa-shield-alt',    shape: 'shield' },
  SECURITY_GROUP: { color: 0xef4444, label: 'SG', icon: 'fa-shield-alt',  shape: 'shield' },
  NAT:        { color: 0xec4899, label: 'NAT',  icon: 'fa-route',         shape: 'nat' },
  ELB:        { color: 0x06b6d4, label: 'ELB',  icon: 'fa-balance-scale', shape: 'elb' },
  VPN:        { color: 0x6366f1, label: 'VPN',  icon: 'fa-lock',          shape: 'vpn' },
  CBR:        { color: 0xf97316, label: 'CBR',  icon: 'fa-archive',       shape: 'cbr' },
  WAF:        { color: 0xef4444, label: 'WAF',  icon: 'fa-fire-extinguisher', shape: 'shield' },
  HSS:        { color: 0x06b6d4, label: 'HSS',  icon: 'fa-shield-virus',  shape: 'shield' },
  CDN:        { color: 0xfbbf24, label: 'CDN',  icon: 'fa-globe',         shape: 'eip' },
  APP:        { color: 0x3b82f6, label: 'App',  icon: 'fa-cube',          shape: 'server' },
  WEB:        { color: 0x3b82f6, label: 'Web',  icon: 'fa-globe',         shape: 'server' },
  INFRASTRUCTURE: { color: 0x6b7280, label: 'Infra', icon: 'fa-cogs',     shape: 'server' },
};

function getResConfig(type) {
  const t = (type || '').toUpperCase();
  return RESOURCE_CONFIG[t] || { color: 0x6b7280, label: t || 'ECS', icon: 'fa-server', shape: 'server' };
}

/* ── Status colors ── */
const STATUS_COLOR = {
  success: 0x10b981, green: 0x10b981, ok: 0x10b981, completed: 0x10b981,
  running: 0xf59e0b, amber: 0xf59e0b, active: 0xf59e0b, in_progress: 0xf59e0b,
  failed: 0xef4444, red: 0xef4444, error: 0xef4444,
  deployed: 0x3b82f6, blue: 0x3b82f6,
  pending: 0x6b7280, gray: 0x6b7280,
};
function statusToColor(status) {
  const s = (status || '').toLowerCase();
  for (const k of Object.keys(STATUS_COLOR)) { if (s.includes(k)) return STATUS_COLOR[k]; }
  return 0x6b7280;
}

/* ── Canvas text label → Sprite ── */
function makeLabel(THREE, text, opts = {}) {
  const { fontSize = 13, color = '#e5e7eb', bg = 'rgba(10,12,24,0.85)', bold = true } = opts;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fw = bold ? 'bold' : 'normal';
  ctx.font = `${fontSize}px ${fw} monospace`;
  const tw = ctx.measureText(text).width + 14;
  const th = fontSize + 8;
  canvas.width = tw; canvas.height = th;
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(0, 0, tw, th, 4); ctx.fill();
  ctx.strokeStyle = color + '30'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = `${fontSize}px ${fw} monospace`; ctx.fillStyle = color; ctx.textBaseline = 'middle';
  ctx.fillText(text, 7, th / 2 + 1);
  const tex = new THREE.CanvasTexture(canvas); tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sp.scale.set(tw * 0.45, th * 0.45, 1);
  return sp;
}

/* ── Geometry builders — return THREE.Group with userData ── */
function buildObject(THREE, type, name, color) {
  const cfg = getResConfig(type);
  const g = new THREE.Group();
  const c = color !== undefined ? color : cfg.color;

  switch (cfg.shape) {
    case 'server': {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(26, 32, 18),
        new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.4, emissive: c, emissiveIntensity: 0.2 })
      );
      g.add(body);
      for (let i = 0; i < 4; i++) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 0.5), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
        slot.position.set(0, 10 - i * 7, 9.2); g.add(slot);
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 6), new THREE.MeshBasicMaterial({ color: c }));
        led.position.set(9, 10 - i * 7, 9.5); g.add(led);
      }
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(26, 32, 18)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.5, transparent: true }));
      g.add(edges);
      break;
    }
    case 'database': {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(13, 13, 22, 20),
        new THREE.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.4, emissive: c, emissiveIntensity: 0.2 })
      );
      g.add(body);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(14, 13, 2.5, 20),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(1.3), metalness: 0.7 }));
      cap.position.y = 12; g.add(cap);
      for (let i = -1; i <= 1; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(13, 0.3, 6, 20), new THREE.MeshBasicMaterial({ color: 0x1f2937 }));
        ring.rotation.x = Math.PI / 2; ring.position.y = i * 5; g.add(ring);
      }
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(13, 13, 22, 12)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.4, transparent: true }));
      g.add(edges);
      break;
    }
    case 'disk': {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(14, 14, 4, 20),
        new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.3, emissive: c, emissiveIntensity: 0.2 })
      );
      g.add(body);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(14, 14, 4, 12)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.5, transparent: true }));
      g.add(edges);
      break;
    }
    case 'bucket': {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(14, 10, 18, 6),
        new THREE.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.4, emissive: c, emissiveIntensity: 0.2 })
      );
      g.add(body);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(14, 10, 18, 6)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.5, transparent: true }));
      g.add(edges);
      break;
    }
    case 'vpc': {
      const w = 280, h = 220, d = 180;
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.03, side: THREE.DoubleSide }));
      g.add(box);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
        new THREE.LineDashedMaterial({ color: c, dashSize: 8, gapSize: 4, opacity: 0.5, transparent: true }));
      edges.computeLineDistances(); g.add(edges);
      break;
    }
    case 'subnet': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(100, 4, 80),
        new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.15, emissive: c, emissiveIntensity: 0.1 }));
      g.add(body);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(100, 4, 80)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.3, transparent: true }));
      g.add(edges);
      break;
    }
    case 'eip': {
      const globe = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 16),
        new THREE.MeshStandardMaterial({ color: c, metalness: 0.4, roughness: 0.3, emissive: c, emissiveIntensity: 0.4 }));
      g.add(globe);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 7, 6), new THREE.MeshBasicMaterial({ color: c }));
      stem.position.y = -7; g.add(stem);
      break;
    }
    case 'shield': {
      const shield = new THREE.Mesh(new THREE.OctahedronGeometry(12, 0),
        new THREE.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.4, emissive: c, emissiveIntensity: 0.3, transparent: true, opacity: 0.7 }));
      shield.scale.y = 1.3; g.add(shield);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(12, 0)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.6, transparent: true }));
      edges.scale.y = 1.3; g.add(edges);
      break;
    }
    case 'nat': {
      const body = new THREE.Mesh(new THREE.TetrahedronGeometry(11, 0),
        new THREE.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.4, emissive: c, emissiveIntensity: 0.3 }));
      g.add(body);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.TetrahedronGeometry(11, 0)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.5, transparent: true }));
      g.add(edges);
      break;
    }
    case 'elb': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(30, 6, 10),
        new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.3, emissive: c, emissiveIntensity: 0.3 }));
      g.add(body);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(30, 6, 10)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.5, transparent: true }));
      g.add(edges);
      break;
    }
    case 'vpn': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14),
        new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.3, emissive: c, emissiveIntensity: 0.3 }));
      g.add(body);
      const lock = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff }));
      lock.position.set(0, 10, 0); g.add(lock);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(14, 14, 14)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.5, transparent: true }));
      g.add(edges);
      break;
    }
    case 'cbr': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(20, 16, 14),
        new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.3, emissive: c, emissiveIntensity: 0.2 }));
      g.add(body);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(20, 16, 14)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.5, transparent: true }));
      g.add(edges);
      break;
    }
    default: {
      const body = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20),
        new THREE.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.4, emissive: c, emissiveIntensity: 0.2 }));
      g.add(body);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(20, 20, 20)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.5, transparent: true }));
      g.add(edges);
    }
  }

  // Label
  const lbl = makeLabel(THREE, `${cfg.label}: ${name}`, { fontSize: 11, color: '#' + new THREE.Color(c).getHexString() });
  lbl.position.set(0, cfg.shape === 'vpc' ? 120 : 24, 0);
  g.add(lbl);

  g.userData = { name, type: cfg.label, resType: type, color: c, shape: cfg.shape };
  return g;
}

function buildSourceCloud(THREE, label) {
  const g = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(38, 28, 28),
    new THREE.MeshStandardMaterial({ color: 0x6b7280, transparent: true, opacity: 0.15, emissive: 0x6b7280, emissiveIntensity: 0.1 }));
  g.add(sphere);
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(38, 12, 12)),
    new THREE.LineBasicMaterial({ color: 0x6b7280, opacity: 0.25, transparent: true }));
  g.add(wire);
  const lbl = makeLabel(THREE, `SOURCE: ${label}`, { fontSize: 14, color: '#d1d5db', bold: true });
  lbl.position.set(0, 52, 0); g.add(lbl);
  g.userData = { name: label, type: 'Cloud', color: 0x6b7280 };
  return g;
}

function buildTargetCloud(THREE) {
  const g = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(38, 28, 28),
    new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.15, emissive: 0x3b82f6, emissiveIntensity: 0.2 }));
  g.add(sphere);
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(38, 12, 12)),
    new THREE.LineBasicMaterial({ color: 0x3b82f6, opacity: 0.3, transparent: true }));
  g.add(wire);
  const lbl = makeLabel(THREE, 'TARGET: Huawei Cloud', { fontSize: 14, color: '#93c5fd', bold: true });
  lbl.position.set(0, 52, 0); g.add(lbl);
  g.userData = { name: 'Huawei Cloud', type: 'Cloud', color: 0x3b82f6 };
  return g;
}

function buildMigWorker(THREE) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 26, 6),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2, emissive: 0xfbbf24, emissiveIntensity: 0.4 }));
  g.add(body);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(11, 11, 26, 6)),
    new THREE.LineBasicMaterial({ color: 0xfbbf24, opacity: 0.7, transparent: true }));
  g.add(edges);
  const lbl = makeLabel(THREE, 'mig_worker', { fontSize: 12, color: '#fde68a', bold: true });
  lbl.position.set(0, 22, 0); g.add(lbl);
  g.userData = { name: 'mig_worker', type: 'Worker', color: 0xfbbf24 };
  return g;
}

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */
function SimulationConstellation({
  trace, resourceUsage, resources,
  replayMode, replayIndex,
  onReplayStart, onReplayStop, onReplayPlay, onReplayPause,
  onReplayStep, onReplayReset,
  isPlaying, replaySpeed, onReplaySpeedChange,
  fullscreen,
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const [threeReady, setThreeReady] = useState(false);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });
  const [autoRotate, setAutoRotate] = useState(true);

  // Keep refs for scene update without rebuild
  const objectMapRef = useRef({}); // resourceName -> { group, visible, status, phase }
  const flowLinesRef = useRef([]);
  const particlesRef = useRef([]);
  const sourceServersRef = useRef([]);
  const targetServersRef = useRef([]);
  const phaseLabelRef = useRef(null);
  const animFrameRef = useRef(null);

  const totalSteps = (trace || []).length;

  // Visible trace slice
  const visibleTrace = useMemo(() => {
    if (!trace || !trace.length) return [];
    if (replayMode && replayIndex >= 0) return trace.slice(0, replayIndex + 1);
    return trace;
  }, [trace, replayMode, replayIndex]);

  const currentStep = visibleTrace.length;

  // Current phase
  const currentPhase = useMemo(() => {
    if (!visibleTrace.length) return null;
    const lastStep = visibleTrace[visibleTrace.length - 1];
    const pk = lastStep.phase || '';
    return { key: pk, ...(PHASE_CONFIG[pk] || { label: pk, short: pk, color: '#6b7280' }) };
  }, [visibleTrace]);

  // Phase progression
  const phaseProgression = useMemo(() => {
    const seen = []; const set = new Set();
    visibleTrace.forEach(s => { const ph = s.phase || 'unknown'; if (!set.has(ph)) { set.add(ph); seen.push(ph); } });
    return seen;
  }, [visibleTrace]);

  // Resource statuses from visible trace
  const resourceStates = useMemo(() => {
    const states = {};
    if (!visibleTrace.length) return states;
    visibleTrace.forEach(step => {
      const target = step.target || (step.decision && step.decision.server_name) || '';
      const result = (step.result || step.outcome || '').toLowerCase();
      if (target) {
        if (!states[target]) states[target] = { status: 'pending', phase: step.phase };
        const isOk = result.includes('success') || result === 'capacity_ok' || (result.includes('complete') && !result.includes('error')) || (result.startsWith('simulated') && !result.includes('error') && !result.includes('fail'));
        const isFail = result.includes('error') || result.includes('fail') || result.includes('blocked');
        const isRun = result.includes('sync') || result.includes('progress') || result.includes('active') || result.includes('install');
        if (isOk) states[target] = { status: 'success', phase: step.phase };
        else if (isFail) states[target] = { status: 'failed', phase: step.phase };
        else if (isRun && states[target].status === 'pending') states[target] = { status: 'running', phase: step.phase };
      }
    });
    return states;
  }, [visibleTrace]);

  // Which resource names are "discovered" (appeared in trace so far)
  const discoveredResources = useMemo(() => {
    const found = new Set();
    // All resources are potential targets; add them as they appear in trace
    visibleTrace.forEach(step => {
      const target = step.target || (step.decision && step.decision.server_name) || '';
      if (target) found.add(target);
      // Also discover from action keywords
      const action = (step.action || '').toUpperCase();
      if (action.includes('VPC')) found.add('__VPC__');
      if (action.includes('EIP')) found.add('__EIP__');
      if (action.includes('SG') || action.includes('SECURITY')) found.add('__SG__');
      if (action.includes('NAT')) found.add('__NAT__');
    });
    return found;
  }, [visibleTrace]);

  // Whether data sync is active
  const syncActive = phaseProgression.includes('PHASE_4_2d_SYNC') && !phaseProgression.includes('PHASE_4_6');

  const hasData = (resources && resources.length > 0) || (trace && trace.length > 0);

  /* ── Load Three.js CDN ── */
  useEffect(() => {
    if (!hasData) return;
    if (window.THREE) { setThreeReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = () => {
      const oc = document.createElement('script');
      oc.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
      oc.onload = () => setThreeReady(true);
      document.head.appendChild(oc);
    };
    document.head.appendChild(s);
  }, [hasData]);

  /* ── Build scene ONCE (when threeReady + resources available) ── */
  useEffect(() => {
    if (!threeReady || !containerRef.current || !window.THREE || !hasData) return;
    const THREE = window.THREE;
    const container = containerRef.current;
    const w = container.clientWidth || 900;
    const h = fullscreen ? (window.innerHeight - 60) : 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    scene.fog = new THREE.Fog(0x0a0a14, 350, 900);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 2500);
    camera.position.set(0, 120, 600);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    let controls = null;
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.autoRotate = true; controls.autoRotateSpeed = 0.15;
      controls.minDistance = 150; controls.maxDistance = 1200;
      controls.maxPolarAngle = Math.PI * 0.88;
      controlsRef.current = controls;
    }

    scene.add(new THREE.AmbientLight(0x404060, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(100, 200, 150); scene.add(dl);
    const pl1 = new THREE.PointLight(0x818cf8, 1, 800); pl1.position.set(-400, 50, 0); scene.add(pl1);
    const pl2 = new THREE.PointLight(0x3b82f6, 1, 800); pl2.position.set(400, 50, 0); scene.add(pl2);

    // ── Source label ──
    const sourceLabel = (() => {
      if (!trace || !trace.length) return 'Source';
      const triage = trace.find(s => s.action === 'PRESALES_TRIAGE_ANALYSIS');
      if (triage && triage.message) {
        const m = triage.message.match(/Source Env:?\s*([^.]+)/);
        if (m) return m[1].trim();
      }
      return 'Source';
    })();

    // ── Source cloud ──
    const srcCloud = buildSourceCloud(THREE, sourceLabel);
    srcCloud.position.set(-420, 0, 0);
    scene.add(srcCloud);
    objectMapRef.current['__SOURCE__'] = { group: srcCloud, alwaysVisible: true };

    // ── Target cloud ──
    const tgtCloud = buildTargetCloud(THREE);
    tgtCloud.position.set(420, 0, 0);
    scene.add(tgtCloud);
    objectMapRef.current['__TARGET__'] = { group: tgtCloud, alwaysVisible: true };

    // ── Categorize resources ──
    const computeNodes = resources.filter(r => {
      const t = (r.type || '').toUpperCase();
      return t === 'ECS' || t === 'COMPUTE' || t === 'APP' || t === 'WEB' || t === 'INFRASTRUCTURE' || t === '';
    });
    const dbNodes = resources.filter(r => {
      const t = (r.type || '').toUpperCase();
      return t === 'RDS' || t === 'DATABASE' || t === 'DB' || t === 'DCS' || t === 'CACHE';
    });
    const storageNodes = resources.filter(r => {
      const t = (r.type || '').toUpperCase();
      return t === 'EVS' || t === 'STORAGE' || t === 'OBS' || t === 'CBR';
    });
    const vpcNodes = resources.filter(r => (r.type || '').toUpperCase() === 'VPC');
    const eipNodes = resources.filter(r => (r.type || '').toUpperCase() === 'EIP');
    const sgNodes = resources.filter(r => {
      const t = (r.type || '').toUpperCase();
      return t === 'SG' || t === 'SECURITY_GROUP' || t === 'WAF' || t === 'HSS';
    });
    const netNodes = resources.filter(r => {
      const t = (r.type || '').toUpperCase();
      return t === 'NAT' || t === 'ELB' || t === 'VPN' || t === 'CDN' || t === 'SUBNET';
    });

    // ── Source-side servers (left) ──
    const srcServers = [];
    const allCompute = [...computeNodes, ...dbNodes];
    allCompute.forEach((res, i) => {
      const name = res.name || res.id || `Server-${i}`;
      const cfg = getResConfig(res.type);
      const obj = buildObject(THREE, res.type, name, cfg.color);
      const yOff = (i - (allCompute.length - 1) / 2) * 60;
      obj.position.set(-360, yOff, 30);
      obj.visible = false; // hidden until discovered
      scene.add(obj);
      objectMapRef.current[name] = { group: obj, name, isSource: true, shape: cfg.shape };
      srcServers.push({ group: obj, name, resType: res.type });
    });
    sourceServersRef.current = srcServers;

    // ── Target VPC (right) ──
    const vpcName = vpcNodes.length > 0 ? (vpcNodes[0].name || 'VPC') : 'VPC';
    const vpcObj = buildObject(THREE, 'VPC', vpcName, 0x8b5cf6);
    vpcObj.position.set(300, 0, 0);
    scene.add(vpcObj);
    objectMapRef.current['__VPC__'] = { group: vpcObj, alwaysVisible: false, isVPC: true };

    // ── Target-side servers (inside VPC, right) ──
    const tgtServers = [];
    allCompute.forEach((res, i) => {
      const name = res.name || res.id || `Server-${i}`;
      const tgtName = `${name}-TARGET`;
      const cfg = getResConfig(res.type);
      const obj = buildObject(THREE, res.type, tgtName, cfg.color);
      const yOff = (i - (allCompute.length - 1) / 2) * 60;
      obj.position.set(300, yOff, -20);
      obj.visible = false;
      scene.add(obj);
      objectMapRef.current[tgtName] = { group: obj, name: tgtName, isTarget: true, sourceName: name, shape: cfg.shape };
      tgtServers.push({ group: obj, name: tgtName, sourceName: name, resType: res.type });
    });
    targetServersRef.current = tgtServers;

    // ── Storage nodes (disks, OBS, CBR) near their servers ──
    storageNodes.forEach((res, i) => {
      const name = res.name || res.id || `Storage-${i}`;
      const cfg = getResConfig(res.type);
      const obj = buildObject(THREE, res.type, name, cfg.color);
      obj.position.set(-360, -80 - i * 30, 30);
      obj.visible = false;
      scene.add(obj);
      objectMapRef.current[name] = { group: obj, name, isStorage: true, shape: cfg.shape };
    });

    // ── EIPs (floating near target) ──
    eipNodes.forEach((res, i) => {
      const name = res.name || res.id || `EIP-${i}`;
      const obj = buildObject(THREE, 'EIP', name, 0xfbbf24);
      obj.position.set(400 + i * 22, 100 + i * 12, 50);
      obj.visible = false;
      scene.add(obj);
      objectMapRef.current[name] = { group: obj, name, isEIP: true };
    });

    // ── Security Groups (inside VPC, top) ──
    sgNodes.forEach((res, i) => {
      const name = res.name || res.id || `SG-${i}`;
      const cfg = getResConfig(res.type);
      const obj = buildObject(THREE, res.type, name, cfg.color);
      obj.position.set(300 + i * 30, 80, 60);
      obj.visible = false;
      scene.add(obj);
      objectMapRef.current[name] = { group: obj, name, isSG: true };
    });

    // ── Network nodes (NAT, ELB, VPN) ──
    netNodes.forEach((res, i) => {
      const name = res.name || res.id || `Net-${i}`;
      const cfg = getResConfig(res.type);
      const obj = buildObject(THREE, res.type, name, cfg.color);
      obj.position.set(300 + i * 40, -100, 60);
      obj.visible = false;
      scene.add(obj);
      objectMapRef.current[name] = { group: obj, name, isNet: true };
    });

    // ── mig_worker ──
    const mw = buildMigWorker(THREE);
    mw.position.set(380, -70, 60);
    mw.visible = false;
    scene.add(mw);
    objectMapRef.current['mig_worker'] = { group: mw, name: 'mig_worker', isWorker: true };

    // ── Connection lines (source → target) ──
    const lines = [];
    allCompute.forEach((res, i) => {
      const name = res.name || res.id || `Server-${i}`;
      const yOff = (i - (allCompute.length - 1) / 2) * 60;
      const srcPos = new THREE.Vector3(-360, yOff, 30);
      const tgtPos = new THREE.Vector3(300, yOff, -20);
      const lineGeo = new THREE.BufferGeometry().setFromPoints([srcPos, tgtPos]);
      const lineMat = new THREE.LineDashedMaterial({ color: 0x374151, dashSize: 5, gapSize: 4, opacity: 0.3, transparent: true });
      const line = new THREE.Line(lineGeo, lineMat);
      line.computeLineDistances();
      line.visible = false;
      scene.add(line);
      lines.push({ line, srcPos, tgtPos, sourceName: name });
    });
    flowLinesRef.current = lines;

    // ── Phase label sprite (updated dynamically) ──
    const phaseLbl = makeLabel(THREE, '', { fontSize: 16, color: '#a78bfa', bold: true });
    phaseLbl.position.set(0, 200, 0);
    phaseLbl.visible = false;
    scene.add(phaseLbl);
    phaseLabelRef.current = phaseLbl;

    // ── Hover detection ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hovered = null;
    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const visibleObjs = Object.values(objectMapRef.current)
        .filter(e => e.group && e.group.visible)
        .map(e => e.group);
      const allMeshes = [];
      visibleObjs.forEach(obj => obj.traverse(c => { if (c.isMesh) allMeshes.push(c); }));
      const hits = raycaster.intersectObjects(allMeshes);
      if (hits.length > 0) {
        let target = hits[0].object;
        while (target.parent && target.parent.type !== 'Scene') target = target.parent;
        if (hovered !== target) {
          if (hovered) hovered.scale.set(1, 1, 1);
          target.scale.set(1.15, 1.15, 1.15);
          hovered = target;
        }
        if (controls) controls.autoRotate = false;
        const ud = target.userData || {};
        setTooltip({ visible: true, x: event.clientX - rect.left, y: event.clientY - rect.top,
          text: `${ud.name || '?'} [${ud.type || '?'}]` });
      } else {
        if (hovered) { hovered.scale.set(1, 1, 1); hovered = null; }
        if (controls) controls.autoRotate = autoRotate;
        setTooltip({ visible: false, x: 0, y: 0, text: '' });
      }
    };
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // ── Animation loop ──
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (controls) controls.update();
      // Flow particles
      const t = Date.now() * 0.001;
      particlesRef.current.forEach(p => {
        p.userData.progress += p.userData.speed;
        if (p.userData.progress > 1) p.userData.progress = 0;
        const pos = new THREE.Vector3().lerpVectors(p.userData.srcPos, p.userData.tgtPos, p.userData.progress);
        pos.y += Math.sin(p.userData.progress * Math.PI) * 30;
        p.position.copy(pos);
        p.material.opacity = Math.sin(p.userData.progress * Math.PI);
      });
      // Pulsing running servers
      [...sourceServersRef.current, ...targetServersRef.current].forEach(s => {
        const ud = s.group.userData;
        if (ud && ud.status === 'running' && s.group.children[0] && s.group.children[0].material) {
          s.group.children[0].material.emissiveIntensity = 0.15 + Math.sin(t * 3) * 0.15;
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const nw = container.clientWidth || 900;
      camera.aspect = nw / h; camera.updateProjectionMatrix();
      renderer.setSize(nw, h);
    };
    window.addEventListener('resize', onResize);

    // Cleanup
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) { if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose()); else obj.material.dispose(); }
      });
      sceneRef.current = null; cameraRef.current = null; controlsRef.current = null; rendererRef.current = null;
      objectMapRef.current = {}; flowLinesRef.current = []; particlesRef.current = [];
    };
  }, [threeReady, hasData]); // Build scene ONCE

  /* ── Update scene when replay state changes (no rebuild!) ── */
  useEffect(() => {
    const om = objectMapRef.current;
    if (!om || !Object.keys(om).length) return;
    const THREE = window.THREE;
    if (!THREE) return;

    // Show source + target always
    if (om['__SOURCE__']) om['__SOURCE__'].group.visible = true;
    if (om['__TARGET__']) om['__TARGET__'].group.visible = true;

    // Determine which phase we're at
    const showTargetInfrastructure = phaseProgression.some(p =>
      p === 'PHASE_4_1' || p === 'PHASE_4_2c_TARGET' || p === 'PHASE_4_2d_SYNC' ||
      p === 'PHASE_4_3' || p === 'PHASE_4_5' || p === 'PHASE_4_6' || p === 'PHASE_4_8'
    );

    // Show VPC when network is verified or target provisioning starts
    if (om['__VPC__']) {
      om['__VPC__'].group.visible = showTargetInfrastructure || phaseProgression.includes('PHASE_4_1');
    }

    // Show/hide source servers — appear during agent prep / preflight
    const sourceVisible = phaseProgression.some(p =>
      p === 'PHASE_4_2b_PREFLIGHT' || p === 'PHASE_4_2d_SYNC' || p === 'PHASE_4_2c_TARGET' ||
      p === 'PHASE_4_2_KNOWLEDGE' || p === 'PHASE_4_2_PREFLIGHT' || p === 'PHASE_4_2' ||
      p === 'PHASE_4_3' || p === 'PHASE_4_5' || p === 'PHASE_4_6' || p === 'PHASE_4_8'
    );

    // Show/hide each source server based on discovery
    sourceServersRef.current.forEach(s => {
      const isDiscovered = discoveredResources.has(s.name) || sourceVisible;
      s.group.visible = isDiscovered;
      // Update status color
      const rState = resourceStates[s.name];
      if (rState) {
        const color = statusToColor(rState.status);
        s.group.userData.status = rState.status;
        // Update main mesh color
        s.group.children.forEach(child => {
          if (child.isMesh && child.material && child.material.color) {
            child.material.color.setHex(color);
            if (child.material.emissive) child.material.emissive.setHex(color);
          }
        });
      }
    });

    // Show/hide target servers — appear during target provisioning
    const targetVisible = phaseProgression.some(p =>
      p === 'PHASE_4_2c_TARGET' || p === 'PHASE_4_2d_SYNC' || p === 'PHASE_4_3' ||
      p === 'PHASE_4_5' || p === 'PHASE_4_6' || p === 'PHASE_4_8'
    );
    targetServersRef.current.forEach(s => {
      const isDiscovered = discoveredResources.has(s.sourceName) && targetVisible;
      s.group.visible = isDiscovered;
      const rState = resourceStates[s.sourceName];
      if (rState) {
        const color = statusToColor(rState.status);
        s.group.userData.status = rState.status;
        s.group.children.forEach(child => {
          if (child.isMesh && child.material && child.material.color) {
            child.material.color.setHex(color);
            if (child.material.emissive) child.material.emissive.setHex(color);
          }
        });
      }
    });

    // Show EIPs during/after target provisioning
    const eipVisible = phaseProgression.includes('PHASE_4_2c_TARGET') || phaseProgression.includes('PHASE_4_2d_SYNC') ||
      phaseProgression.includes('PHASE_4_3') || phaseProgression.includes('PHASE_4_6');
    Object.values(om).forEach(entry => {
      if (entry.isEIP) entry.group.visible = eipVisible && discoveredResources.has(entry.name);
      if (entry.isSG) entry.group.visible = showTargetInfrastructure;
      if (entry.isNet) entry.group.visible = showTargetInfrastructure;
      if (entry.isStorage) entry.group.visible = sourceVisible || discoveredResources.has(entry.name);
      if (entry.isWorker) {
        entry.group.visible = phaseProgression.includes('PHASE_4_2b_PREFLIGHT') || phaseProgression.includes('PHASE_4_2c_TARGET');
      }
    });

    // Show flow lines when both source and target are connected
    flowLinesRef.current.forEach(fl => {
      const srcObj = om[fl.sourceName];
      const tgtObj = om[`${fl.sourceName}-TARGET`];
      fl.line.visible = !!(srcObj && srcObj.group.visible && tgtObj && tgtObj.group.visible);
      // Color line based on sync status
      if (fl.line.visible) {
        const isSyncing = syncActive;
        const color = isSyncing ? 0x10b981 : 0x374151;
        fl.line.material.color.setHex(color);
        fl.line.material.opacity = isSyncing ? 0.6 : 0.3;
      }
    });

    // Manage flow particles
    if (syncActive && particlesRef.current.length === 0) {
      // Create particles
      flowLinesRef.current.forEach(fl => {
        if (!fl.line.visible) return;
        for (let p = 0; p < 4; p++) {
          const particle = new THREE.Mesh(
            new THREE.SphereGeometry(2.5, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.8 })
          );
          particle.userData = { srcPos: fl.srcPos, tgtPos: fl.tgtPos, progress: p / 4, speed: 0.003 + Math.random() * 0.002 };
          sceneRef.current.add(particle);
          particlesRef.current.push(particle);
        }
      });
    } else if (!syncActive && particlesRef.current.length > 0) {
      // Remove particles
      particlesRef.current.forEach(p => { sceneRef.current.remove(p); p.geometry.dispose(); p.material.dispose(); });
      particlesRef.current = [];
    }

    // Update phase label
    if (phaseLabelRef.current) {
      if (currentPhase) {
        phaseLabelRef.current.visible = true;
        // Recreate label sprite with new text
        const old = phaseLabelRef.current;
        const newLbl = makeLabel(THREE, currentPhase.label, { fontSize: 16, color: currentPhase.color || '#a78bfa', bold: true });
        newLbl.position.copy(old.position);
        newLbl.scale.set(220, 26, 1);
        sceneRef.current.remove(old);
        if (old.material) { old.material.dispose(); }
        sceneRef.current.add(newLbl);
        phaseLabelRef.current = newLbl;
      } else {
        phaseLabelRef.current.visible = false;
      }
    }
  }, [visibleTrace, resourceStates, discoveredResources, phaseProgression, currentPhase, syncActive]);

  /* ── Controls: zoom, reset, auto-rotate ── */
  const zoomIn = useCallback(() => {
    const cam = cameraRef.current; const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    const dir = new (window.THREE.Vector3)().subVectors(ctrl.target, cam.position).normalize();
    cam.position.addScaledVector(dir, 80); ctrl.update();
  }, []);
  const zoomOut = useCallback(() => {
    const cam = cameraRef.current; const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    const dir = new (window.THREE.Vector3)().subVectors(ctrl.target, cam.position).normalize();
    cam.position.addScaledVector(dir, -80); ctrl.update();
  }, []);
  const resetView = useCallback(() => {
    const cam = cameraRef.current; const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    cam.position.set(0, 120, 600); ctrl.target.set(0, 0, 0); ctrl.update();
  }, []);
  const toggleRotate = useCallback(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    ctrl.autoRotate = !ctrl.autoRotate;
    setAutoRotate(ctrl.autoRotate);
  }, []);

  if (!hasData) return null;

  return (
    <Card
      title={
        <Space>
          <i className="fas fa-cube" style={{ color: '#818cf8' }} />
          <Text strong style={{ fontSize: 14 }}>3D Architecture Constellation</Text>
          <Tag color="blue">Three.js</Tag>
          {replayMode && currentPhase && (
            <Tag color="purple">
              <i className={`fas ${currentPhase.icon || 'fa-circle'}`} style={{ marginRight: 4 }} />
              {currentPhase.label}
            </Tag>
          )}
          {replayMode && (
            <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
              Step {currentStep}/{totalSteps}
            </Text>
          )}
        </Space>
      }
      styles={{ body: { padding: 0, position: 'relative' } }}
    >
      <div ref={containerRef} style={{ width: '100%', height: fullscreen ? 'calc(100vh - 60px)' : 600, borderRadius: '0 0 8px 8px', cursor: 'grab' }} />

      {tooltip.visible && (
        <div style={{
          position: 'absolute', left: tooltip.x + 15, top: tooltip.y + 15,
          background: 'rgba(10,10,20,0.95)', color: '#d1d5db', fontSize: 11,
          padding: '6px 10px', borderRadius: 6, border: '1px solid #374151',
          pointerEvents: 'none', zIndex: 100, fontFamily: 'monospace', whiteSpace: 'nowrap',
        }}>{tooltip.text}</div>
      )}
      {!threeReady && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#6b7280' }}>
          <Spin tip="Loading 3D engine..." />
        </div>
      )}

      {/* ── Zoom / view controls (top-right) ── */}
      <div style={{ position: 'absolute', top: 10, right: 14, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 20 }}>
        <AntTooltip title="Zoom In">
          <Button size="small" icon={<ZoomInOutlined />} onClick={zoomIn} style={{ background: 'rgba(15,15,26,0.8)', borderColor: '#374151', color: '#9ca3af' }} />
        </AntTooltip>
        <AntTooltip title="Zoom Out">
          <Button size="small" icon={<ZoomOutOutlined />} onClick={zoomOut} style={{ background: 'rgba(15,15,26,0.8)', borderColor: '#374151', color: '#9ca3af' }} />
        </AntTooltip>
        <AntTooltip title="Reset View">
          <Button size="small" icon={<RedoOutlined />} onClick={resetView} style={{ background: 'rgba(15,15,26,0.8)', borderColor: '#374151', color: '#9ca3af' }} />
        </AntTooltip>
        <AntTooltip title={autoRotate ? 'Stop Rotation' : 'Auto Rotate'}>
          <Button size="small" icon={<i className="fas fa-sync" style={{ fontSize: 12 }} />} onClick={toggleRotate}
            style={{ background: autoRotate ? 'rgba(129,140,248,0.3)' : 'rgba(15,15,26,0.8)', borderColor: autoRotate ? '#818cf8' : '#374151', color: autoRotate ? '#a5b4fc' : '#9ca3af' }} />
        </AntTooltip>
      </div>

      {/* ── Replay controls bar (bottom) ── */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
        background: 'rgba(15,15,26,0.9)', borderRadius: 8, border: '1px solid #374151', zIndex: 20,
      }}>
        {!replayMode ? (
          <AntTooltip title="Start replaying the simulation step by step">
            <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={onReplayStart}
              style={{ background: '#722ed1', borderColor: '#722ed1' }}>
              Replay Simulation
            </Button>
          </AntTooltip>
        ) : (
          <>
            <AntTooltip title="Reset to first step">
              <Button size="small" icon={<RedoOutlined />} onClick={onReplayReset} style={{ background: 'rgba(31,41,55,0.8)', borderColor: '#374151', color: '#d1d5db' }} />
            </AntTooltip>
            <AntTooltip title={isPlaying ? 'Pause replay' : 'Play replay'}>
              <Button size="small" type="primary" icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={isPlaying ? onReplayPause : onReplayPlay}
                style={{ background: isPlaying ? '#ff4d4f' : '#722ed1', borderColor: isPlaying ? '#ff4d4f' : '#722ed1' }}>
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
            </AntTooltip>
            <AntTooltip title="Step forward one step">
              <Button size="small" icon={<ArrowRightOutlined />} onClick={onReplayStep} disabled={isPlaying || currentStep >= totalSteps}
                style={{ background: 'rgba(31,41,55,0.8)', borderColor: '#374151', color: '#d1d5db' }} />
            </AntTooltip>
            <Text style={{ fontSize: 10, fontFamily: 'monospace', color: '#9ca3af' }}>{currentStep}/{totalSteps}</Text>
            <div style={{ width: 1, height: 16, background: '#374151' }} />
            <AntTooltip title="Replay speed">
              <select value={replaySpeed || 1000} onChange={e => onReplaySpeedChange(Number(e.target.value))}
                style={{ background: 'rgba(31,41,55,0.8)', color: '#d1d5db', fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px', border: '1px solid #374151' }}>
                <option value={2000}>0.5x</option>
                <option value={1000}>1x</option>
                <option value={500}>2x</option>
                <option value={150}>5x</option>
                <option value={50}>10x</option>
              </select>
            </AntTooltip>
            <AntTooltip title="Exit replay mode">
              <Button size="small" icon={<StopOutlined />} onClick={onReplayStop}
                style={{ background: 'rgba(31,41,55,0.8)', borderColor: '#374151', color: '#d1d5db' }} />
            </AntTooltip>
          </>
        )}
      </div>

      {/* Legend (top-left) */}
      <div style={{ position: 'absolute', top: 10, left: 14, display: 'flex', gap: 8, flexWrap: 'wrap', zIndex: 10, maxWidth: 400 }}>
        {[
          { label: 'ECS', color: '#3b82f6', icon: 'fa-server' },
          { label: 'RDS', color: '#10b981', icon: 'fa-database' },
          { label: 'EVS/OBS', color: '#f59e0b', icon: 'fa-hdd' },
          { label: 'VPC', color: '#8b5cf6', icon: 'fa-cloud' },
          { label: 'EIP', color: '#fbbf24', icon: 'fa-globe' },
          { label: 'SG', color: '#ef4444', icon: 'fa-shield-alt' },
          { label: 'NAT', color: '#ec4899', icon: 'fa-route' },
          { label: 'ELB', color: '#06b6d4', icon: 'fa-balance-scale' },
          { label: 'VPN', color: '#6366f1', icon: 'fa-lock' },
        ].map(leg => (
          <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(15,15,26,0.7)', padding: '2px 5px', borderRadius: 3 }}>
            <i className={`fas ${leg.icon}`} style={{ color: leg.color, fontSize: 9 }} />
            <span style={{ fontSize: 8, fontWeight: 600, color: '#9ca3af' }}>{leg.label}</span>
          </div>
        ))}
      </div>

      {/* Status legend */}
      <div style={{ position: 'absolute', top: 36, left: 14, display: 'flex', gap: 8, zIndex: 10 }}>
        {[
          { label: 'Success', color: '#10b981' }, { label: 'Running', color: '#f59e0b' },
          { label: 'Failed', color: '#ef4444' }, { label: 'Pending', color: '#6b7280' },
        ].map(leg => (
          <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: leg.color, boxShadow: `0 0 3px ${leg.color}80` }} />
            <span style={{ fontSize: 8, fontWeight: 600, color: '#9ca3af' }}>{leg.label}</span>
          </div>
        ))}
      </div>

      {/* Direction indicator */}
      <div style={{
        position: 'absolute', top: 62, left: 14, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(17,24,39,0.7)', borderRadius: 6, padding: '3px 8px', border: '1px solid #374151',
      }}>
        <span style={{ color: '#9ca3af', fontSize: 9, fontWeight: 700 }}>SOURCE</span>
        <ArrowRightOutlined style={{ color: '#818cf8', fontSize: 10 }} />
        <span style={{ color: '#3b82f6', fontSize: 9, fontWeight: 700 }}>HUAWEI CLOUD</span>
      </div>

      {/* Progress bar */}
      {replayMode && totalSteps > 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#1f2937', borderRadius: '0 0 8px 8px', zIndex: 10 }}>
          <div style={{ width: `${(currentStep / totalSteps) * 100}%`, height: '100%',
            background: 'linear-gradient(90deg, #818cf8, #3b82f6, #10b981)', borderRadius: '0 0 8px 8px', transition: 'width 0.3s ease' }} />
        </div>
      )}

      {/* Phase chips */}
      {replayMode && phaseProgression.length > 0 && (
        <div style={{ position: 'absolute', bottom: 50, left: 14, right: 14, display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center', zIndex: 10 }}>
          {phaseProgression.map(ph => {
            const cfg = PHASE_CONFIG[ph] || { short: ph, color: '#6b7280' };
            const isCurrent = currentPhase && ph === currentPhase.key;
            return (
              <div key={ph} style={{
                padding: '2px 6px', borderRadius: 3, fontSize: 8, fontWeight: 700,
                background: isCurrent ? cfg.color : cfg.color + '25',
                color: isCurrent ? '#fff' : cfg.color,
                border: `1px solid ${cfg.color}${isCurrent ? '' : '30'}`,
                transition: 'all 0.3s', transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
              }}>{cfg.short}</div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default SimulationConstellation;
