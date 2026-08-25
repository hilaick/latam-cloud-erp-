import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Card, Spin, Space, Tag, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

const { Text } = Typography;

/* ═══════════════════════════════════════════════
   3D Simulation Constellation — Huawei Cloud Architecture
   Shows resource-type-aware icons in a 3D architecture layout.
   During replay, phases light up one by one showing the
   migration progression from source → target.
   ═══════════════════════════════════════════════ */

/* ── Phase display config ── */
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
  'PHASE_4_2f_POST':      { label: 'Phase 4.2f — Smoke Tests', short: 'Test', icon: 'fa-vial', color: '#10b981' },
  'PHASE_4_3':            { label: 'Phase 4.3 — Landing Zone', short: 'Landing', icon: 'fa-flag', color: '#10b981' },
  'PHASE_4_5':            { label: 'Phase 4.5 — Continuous Sync', short: 'Monitor', icon: 'fa-eye', color: '#06b6d4' },
  'PHASE_4_6':            { label: 'Phase 4.6 — Cutover', short: 'Cutover', icon: 'fa-exchange-alt', color: '#ef4444' },
  'PHASE_4_7':            { label: 'Phase 4.7 — Cleanup', short: 'Cleanup', icon: 'fa-broom', color: '#6b7280' },
  'PHASE_4_8':            { label: 'Phase 4.8 — Finalize', short: 'Finalize', icon: 'fa-flag-checkered', color: '#10b981' },
};

/* ── Helper: create a text label sprite ── */
function makeLabelSprite(THREE, text, opts = {}) {
  const { fontSize = 14, color = '#e5e7eb', bg = 'rgba(15,15,26,0.85)', bold = true, maxWidth = 200 } = opts;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = bold ? 'bold' : 'normal';
  ctx.font = `${fontSize}px ${font} monospace`;
  const metrics = ctx.measureText(text);
  const tw = Math.min(metrics.width + 16, maxWidth);
  const th = fontSize + 10;
  canvas.width = tw;
  canvas.height = th;
  // Background
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, tw, th, 4);
  ctx.fill();
  // Border
  ctx.strokeStyle = color + '40';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Text
  ctx.font = `${fontSize}px ${font} monospace`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 8, th / 2 + 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(tw * 0.5, th * 0.5, 1);
  return sprite;
}

/* ── Helper: create an ECS server rack mesh group ── */
function makeServerRack(THREE, name, color, status) {
  const group = new THREE.Group();

  // Main server body — tall box
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(28, 36, 20),
    new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.4, emissive: color, emissiveIntensity: 0.2 })
  );
  group.add(body);

  // Server slot lines (horizontal)
  for (let i = 0; i < 4; i++) {
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(24, 1.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8, roughness: 0.2 })
    );
    slot.position.set(0, 12 - i * 8, 10.2);
    group.add(slot);

    // LED indicator
    const ledColor = status === 'success' ? 0x10b981 : status === 'running' ? 0xf59e0b : status === 'failed' ? 0xef4444 : 0x6b7280;
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 8, 8),
      new THREE.MeshBasicMaterial({ color: ledColor })
    );
    led.position.set(10, 12 - i * 8, 10.5);
    group.add(led);
  }

  // Top label
  const label = makeLabelSprite(THREE, name, { fontSize: 12, color: '#93c5fd' });
  label.position.set(0, 28, 0);
  group.add(label);

  // Edge wireframe
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(28, 36, 20)),
    new THREE.LineBasicMaterial({ color, opacity: 0.5, transparent: true })
  );
  group.add(edges);

  group.userData = { name, type: 'ECS', color, status };
  return group;
}

/* ── Helper: create a database cylinder ── */
function makeDatabase(THREE, name, color) {
  const group = new THREE.Group();
  // Cylinder body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 14, 24, 24),
    new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.4, emissive: color, emissiveIntensity: 0.2 })
  );
  group.add(body);
  // Top cap (slightly larger)
  const topCap = new THREE.Mesh(
    new THREE.CylinderGeometry(15, 14, 3, 24),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(1.3), metalness: 0.7, roughness: 0.3 })
  );
  topCap.position.y = 13;
  group.add(topCap);
  // Horizontal lines
  for (let i = -1; i <= 1; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(14, 0.4, 6, 24),
      new THREE.MeshBasicMaterial({ color: 0x1f2937 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = i * 6;
    group.add(ring);
  }
  // Label
  const label = makeLabelSprite(THREE, name, { fontSize: 12, color: '#6ee7b7' });
  label.position.set(0, 22, 0);
  group.add(label);
  // Edges
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.CylinderGeometry(14, 14, 24, 16)),
    new THREE.LineBasicMaterial({ color, opacity: 0.4, transparent: true })
  );
  group.add(edges);
  group.userData = { name, type: 'RDS', color };
  return group;
}

/* ── Helper: create an EVS disk ── */
function makeDisk(THREE, name, color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(16, 16, 5, 24),
    new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.3, emissive: color, emissiveIntensity: 0.2 })
  );
  group.add(body);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.CylinderGeometry(16, 16, 5, 16)),
    new THREE.LineBasicMaterial({ color, opacity: 0.5, transparent: true })
  );
  group.add(edges);
  const label = makeLabelSprite(THREE, name, { fontSize: 10, color: '#fcd34d' });
  label.position.set(0, 8, 0);
  group.add(label);
  group.userData = { name, type: 'EVS', color };
  return group;
}

/* ── Helper: create an EIP floating globe ── */
function makeEIP(THREE, ip) {
  const group = new THREE.Group();
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(8, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.4, roughness: 0.3, emissive: 0xfbbf24, emissiveIntensity: 0.4 })
  );
  group.add(globe);
  // Pin stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
  );
  stem.position.y = -8;
  group.add(stem);
  // Label
  const label = makeLabelSprite(THREE, `EIP: ${ip}`, { fontSize: 10, color: '#fcd34d' });
  label.position.set(0, 12, 0);
  group.add(label);
  group.userData = { name: ip, type: 'EIP', color: 0xfbbf24 };
  return group;
}

/* ── Helper: create a VPC boundary box ── */
function makeVPCBoundary(THREE, label) {
  const group = new THREE.Group();
  const w = 260, h = 220, d = 180;
  // Translucent walls
  const mat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6, transparent: true, opacity: 0.04,
    emissive: 0x8b5cf6, emissiveIntensity: 0.05, side: THREE.DoubleSide,
  });
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  group.add(box);
  // Wireframe edges
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
    new THREE.LineDashedMaterial({ color: 0x8b5cf6, dashSize: 8, gapSize: 4, opacity: 0.5, transparent: true })
  );
  edges.computeLineDistances();
  group.add(edges);
  // Label at top
  const sprite = makeLabelSprite(THREE, `VPC: ${label}`, { fontSize: 16, color: '#c4b5fd', bold: true });
  sprite.position.set(0, h / 2 + 15, 0);
  group.add(sprite);
  group.userData = { name: label, type: 'VPC', color: 0x8b5cf6 };
  return group;
}

/* ── Helper: create a Security Group shield ── */
function makeSecurityGroup(THREE, name) {
  const group = new THREE.Group();
  // Shield shape using octahedron
  const shield = new THREE.Mesh(
    new THREE.OctahedronGeometry(14, 0),
    new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.5, roughness: 0.4, emissive: 0xef4444, emissiveIntensity: 0.3, transparent: true, opacity: 0.7 })
  );
  shield.scale.y = 1.3;
  group.add(shield);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(14, 0)),
    new THREE.LineBasicMaterial({ color: 0xef4444, opacity: 0.6, transparent: true })
  );
  edges.scale.y = 1.3;
  group.add(edges);
  const label = makeLabelSprite(THREE, `SG: ${name}`, { fontSize: 11, color: '#fca5a5' });
  label.position.set(0, 22, 0);
  group.add(label);
  group.userData = { name, type: 'SG', color: 0xef4444 };
  return group;
}

/* ── Helper: create mig_worker hex pillar ── */
function makeMigWorker(THREE) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(12, 12, 28, 6),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2, emissive: 0xfbbf24, emissiveIntensity: 0.4 })
  );
  group.add(body);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.CylinderGeometry(12, 12, 28, 6)),
    new THREE.LineBasicMaterial({ color: 0xfbbf24, opacity: 0.7, transparent: true })
  );
  group.add(edges);
  const label = makeLabelSprite(THREE, 'mig_worker', { fontSize: 12, color: '#fde68a', bold: true });
  label.position.set(0, 24, 0);
  group.add(label);
  group.userData = { name: 'mig_worker', type: 'Worker', color: 0xfbbf24 };
  return group;
}

/* ── Helper: create source cloud ── */
function makeSourceCloud(THREE, label) {
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(40, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x6b7280, transparent: true, opacity: 0.2, emissive: 0x6b7280, emissiveIntensity: 0.15 })
  );
  group.add(sphere);
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.SphereGeometry(40, 16, 16)),
    new THREE.LineBasicMaterial({ color: 0x6b7280, opacity: 0.3, transparent: true })
  );
  group.add(wire);
  const labelSprite = makeLabelSprite(THREE, `SOURCE\n${label}`, { fontSize: 14, color: '#d1d5db', bold: true });
  labelSprite.position.set(0, 55, 0);
  group.add(labelSprite);
  group.userData = { name: label, type: 'cloud', color: 0x6b7280 };
  return group;
}

/* ── Main component ── */
function SimulationConstellation({ trace, resourceUsage, resources, replayMode, replayIndex }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });
  const [threeReady, setThreeReady] = useState(false);

  // Slice trace for replay
  const visibleTrace = useMemo(() => {
    if (!trace || trace.length === 0) return [];
    if (replayMode && replayIndex >= 0) return trace.slice(0, replayIndex + 1);
    return trace;
  }, [trace, replayMode, replayIndex]);

  // Current phase info
  const currentPhase = useMemo(() => {
    if (!visibleTrace.length) return null;
    const lastStep = visibleTrace[visibleTrace.length - 1];
    const phaseKey = lastStep.phase || '';
    return { key: phaseKey, ...(PHASE_CONFIG[phaseKey] || { label: phaseKey, short: phaseKey, color: '#6b7280' }) };
  }, [visibleTrace]);

  // Phase progression — which phases are visible
  const phaseProgression = useMemo(() => {
    const seen = [];
    const seenSet = new Set();
    visibleTrace.forEach(step => {
      const ph = step.phase || 'unknown';
      if (!seenSet.has(ph)) { seenSet.add(ph); seen.push(ph); }
    });
    return seen;
  }, [visibleTrace]);

  const totalSteps = (trace || []).length;
  const currentStep = visibleTrace.length;

  // Determine which resources are "active" / "completed" based on visible trace
  const resourceStates = useMemo(() => {
    const states = {}; // resourceName -> { status, phase }
    if (!visibleTrace.length) return states;

    visibleTrace.forEach(step => {
      const target = step.target || (step.decision && step.decision.server_name) || '';
      const action = step.action || '';
      const result = (step.result || step.outcome || '').toLowerCase();

      if (target) {
        if (!states[target]) states[target] = { status: 'pending', phase: step.phase };
        const isSuccess = result.includes('success') || result === 'capacity_ok' || result.includes('complete') || result.startsWith('simulated') && !result.includes('error');
        const isFail = result.includes('error') || result.includes('fail') || result.includes('blocked');
        const isRunning = result.includes('sync') || result.includes('progress') || result.includes('active');

        if (isSuccess) states[target] = { status: 'success', phase: step.phase };
        else if (isFail) states[target] = { status: 'failed', phase: step.phase };
        else if (isRunning && states[target].status === 'pending') states[target] = { status: 'running', phase: step.phase };
      }
    });
    return states;
  }, [visibleTrace]);

  const hasData = visibleTrace.length > 0;

  // Load Three.js from CDN
  useEffect(() => {
    if (!hasData) return;
    if (window.THREE) { setThreeReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
      const ocScript = document.createElement('script');
      ocScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
      ocScript.onload = () => setThreeReady(true);
      document.head.appendChild(ocScript);
    };
    document.head.appendChild(script);
    return () => {};
  }, [hasData]);

  // Build 3D scene
  useEffect(() => {
    if (!threeReady || !containerRef.current || !window.THREE || !hasData) return;
    const THREE = window.THREE;
    const container = containerRef.current;
    const w = container.clientWidth || 900;
    const h = 580;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    scene.fog = new THREE.Fog(0x0a0a14, 300, 800);

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 2000);
    camera.position.set(0, 100, 550);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    let controls = null;
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.minDistance = 200;
      controls.maxDistance = 1000;
      controls.maxPolarAngle = Math.PI * 0.85;
    }

    // Lighting
    scene.add(new THREE.AmbientLight(0x404060, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 150);
    scene.add(dirLight);
    scene.add(new THREE.PointLight(0x818cf8, 1, 800)).position.set(-400, 0, 0);
    scene.add(new THREE.PointLight(0x3b82f6, 1, 800)).position.set(400, 0, 0);

    const interactiveObjects = []; // for raycasting

    // ── SOURCE CLOUD (left) ──
    const sourceLabel = (() => {
      const triage = visibleTrace.find(s => s.action === 'PRESALES_TRIAGE_ANALYSIS');
      if (triage && triage.message) {
        const m = triage.message.match(/Source Env:?\s*([^.]+)/);
        if (m) return m[1].trim();
      }
      return 'Source';
    })();
    const sourceCloud = makeSourceCloud(THREE, sourceLabel);
    sourceCloud.position.set(-400, 0, 0);
    scene.add(sourceCloud);
    interactiveObjects.push(sourceCloud);

    // Source ECS servers (from resources)
    const ecsResources = resources.filter(r => (r.type || '').toUpperCase() === 'ECS' || (r.type || '').toUpperCase() === 'COMPUTE');
    const eipResources = resources.filter(r => (r.type || '').toUpperCase() === 'EIP');
    const vpcResources = resources.filter(r => (r.type || '').toUpperCase() === 'VPC');
    const sgResources = resources.filter(r => (r.type || '').toUpperCase() === 'SG');

    // ── Source ECS servers on left side ──
    const sourceServers = [];
    ecsResources.forEach((srv, i) => {
      const name = srv.name || srv.id || `ECS-${i}`;
      const rState = resourceStates[name] || { status: 'pending' };
      const status = rState.status;
      const color = status === 'success' ? 0x10b981 : status === 'running' ? 0xf59e0b : status === 'failed' ? 0xef4444 : 0x3b82f6;
      const rack = makeServerRack(THREE, name, color, status);
      const yOffset = (i - (ecsResources.length - 1) / 2) * 55;
      rack.position.set(-350, yOffset, 40);
      scene.add(rack);
      sourceServers.push(rack);
      interactiveObjects.push(rack);

      // EVS disk under each server
      const diskName = `${name}-disk`;
      const disk = makeDisk(THREE, 'EVS', 0xf59e0b);
      disk.position.set(-350, yOffset - 32, 40);
      scene.add(disk);
      interactiveObjects.push(disk);
    });

    // ── TARGET VPC (right) ──
    const vpcName = vpcResources.length > 0 ? (vpcResources[0].name || 'vpc-default') : 'VPC';
    const vpcBoundary = makeVPCBoundary(THREE, vpcName);
    vpcBoundary.position.set(300, 0, 0);
    scene.add(vpcBoundary);
    interactiveObjects.push(vpcBoundary);

    // ── Security Group inside VPC ──
    if (sgResources.length > 0) {
      const sg = makeSecurityGroup(THREE, sgResources[0].name || 'default');
      sg.position.set(300, 70, 60);
      scene.add(sg);
      interactiveObjects.push(sg);
    }

    // ── Target ECS servers inside VPC ──
    const targetServers = [];
    ecsResources.forEach((srv, i) => {
      const name = `${srv.name || srv.id || 'ECS'}-TARGET`;
      const rState = resourceStates[srv.name || srv.id] || { status: 'pending' };
      const status = rState.status;
      const color = status === 'success' ? 0x10b981 : status === 'running' ? 0xf59e0b : status === 'failed' ? 0xef4444 : 0x3b82f6;
      const rack = makeServerRack(THREE, name, color, status);
      const yOffset = (i - (ecsResources.length - 1) / 2) * 55;
      rack.position.set(300, yOffset, -20);
      scene.add(rack);
      targetServers.push(rack);
      interactiveObjects.push(rack);
    });

    // ── EIPs floating near target ──
    eipResources.forEach((eip, i) => {
      const eipObj = makeEIP(THREE, eip.name || eip.id || 'EIP');
      eipObj.position.set(380 + i * 20, 90 + i * 15, 40);
      scene.add(eipObj);
      interactiveObjects.push(eipObj);
    });

    // ── mig_worker ──
    const hasMigWorker = visibleTrace.some(s => (s.action || '').includes('MIG_WORKER') || (s.message || '').toLowerCase().includes('mig_worker'));
    if (hasMigWorker) {
      const mw = makeMigWorker(THREE);
      mw.position.set(360, -60, 50);
      scene.add(mw);
      interactiveObjects.push(mw);
    }

    // ── Connection lines: source → target ──
    const flowLines = [];
    ecsResources.forEach((srv, i) => {
      const yOffset = (i - (ecsResources.length - 1) / 2) * 55;
      const srcPos = new THREE.Vector3(-350, yOffset, 40);
      const tgtPos = new THREE.Vector3(300, yOffset, -20);

      // Dashed line from source to target
      const lineGeo = new THREE.BufferGeometry().setFromPoints([srcPos, tgtPos]);
      const isSyncing = visibleTrace.some(s => s.phase === 'PHASE_4_2d_SYNC' && (s.target || '').includes(srv.name || ''));
      const lineColor = isSyncing ? 0x10b981 : 0x6b7280;
      const lineMat = new THREE.LineDashedMaterial({ color: lineColor, dashSize: 6, gapSize: 4, opacity: 0.5, transparent: true });
      const line = new THREE.Line(lineGeo, lineMat);
      line.computeLineDistances();
      scene.add(line);
      flowLines.push({ line, srcPos, tgtPos, isSyncing });
    });

    // ── Animated data flow particles (during sync phase) ──
    const syncActive = phaseProgression.includes('PHASE_4_2d_SYNC') && !phaseProgression.includes('PHASE_4_6');
    const particles = [];
    if (syncActive) {
      ecsResources.forEach((srv, i) => {
        const yOffset = (i - (ecsResources.length - 1) / 2) * 55;
        for (let p = 0; p < 5; p++) {
          const particle = new THREE.Mesh(
            new THREE.SphereGeometry(2.5, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x10b981 })
          );
          particle.userData = {
            srcPos: new THREE.Vector3(-350, yOffset, 40),
            tgtPos: new THREE.Vector3(300, yOffset, -20),
            progress: p / 5,
            speed: 0.003 + Math.random() * 0.002,
          };
          scene.add(particle);
          particles.push(particle);
        }
      });
    }

    // ── Phase indicator label (3D text in scene) ──
    if (currentPhase) {
      const phaseLabel = makeLabelSprite(THREE, currentPhase.label, {
        fontSize: 16, color: currentPhase.color || '#a78bfa', bold: true,
        bg: 'rgba(15,15,26,0.9)',
      });
      phaseLabel.position.set(0, 180, 0);
      phaseLabel.scale.set(200, 24, 1);
      scene.add(phaseLabel);
    }

    // ── Hover detection ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hovered = null;

    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // Flatten all meshes from groups
      const allMeshes = [];
      interactiveObjects.forEach(obj => {
        obj.traverse(child => { if (child.isMesh) allMeshes.push(child); });
      });
      const intersects = raycaster.intersectObjects(allMeshes);
      if (intersects.length > 0) {
        // Find the parent group
        let target = intersects[0].object;
        while (target.parent && target.parent.type !== 'Scene') target = target.parent;
        const ud = target.userData || {};
        if (hovered !== target) {
          if (hovered) hovered.scale.set(1, 1, 1);
          target.scale.set(1.15, 1.15, 1.15);
          hovered = target;
        }
        if (controls) controls.autoRotate = false;
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          text: `${ud.name || '?'} [${ud.type || '?'}]${ud.status ? ` | ${ud.status}` : ''}`,
        });
        return;
      }
      if (hovered) { hovered.scale.set(1, 1, 1); hovered = null; }
      if (controls) controls.autoRotate = true;
      setTooltip({ visible: false, x: 0, y: 0, text: '' });
    };
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // ── Animation loop ──
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (controls) controls.update();

      // Animate data flow particles
      const t = Date.now() * 0.001;
      particles.forEach(p => {
        p.userData.progress += p.userData.speed;
        if (p.userData.progress > 1) p.userData.progress = 0;
        const pos = new THREE.Vector3().lerpVectors(p.userData.srcPos, p.userData.tgtPos, p.userData.progress);
        // Arc trajectory
        pos.y += Math.sin(p.userData.progress * Math.PI) * 30;
        p.position.copy(pos);
        p.material.opacity = Math.sin(p.userData.progress * Math.PI);
        p.material.transparent = true;
      });

      // Pulsing glow on running servers
      [...sourceServers, ...targetServers].forEach((srv) => {
        if (srv.userData.status === 'running' && srv.children[0] && srv.children[0].material) {
          srv.children[0].material.emissiveIntensity = 0.2 + Math.sin(t * 3) * 0.15;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const nw = container.clientWidth || 900;
      camera.aspect = nw / h;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, h);
    };
    window.addEventListener('resize', onResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [threeReady, data_internal(visibleTrace, resources, resourceStates, currentPhase, phaseProgression)]);

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
      <div
        ref={containerRef}
        style={{ width: '100%', height: 580, borderRadius: '0 0 8px 8px', cursor: 'grab' }}
      />
      {tooltip.visible && (
        <div style={{
          position: 'absolute', left: tooltip.x + 15, top: tooltip.y + 15,
          background: 'rgba(10,10,20,0.95)', color: '#d1d5db', fontSize: 11,
          padding: '6px 10px', borderRadius: 6, border: '1px solid #374151',
          pointerEvents: 'none', zIndex: 100, fontFamily: 'monospace', whiteSpace: 'nowrap',
        }}>
          {tooltip.text}
        </div>
      )}
      {!threeReady && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#6b7280' }}>
          <Spin tip="Loading 3D engine..." />
        </div>
      )}

      {/* Legend */}
      <div style={{ position: 'absolute', top: 10, left: 14, display: 'flex', gap: 10, flexWrap: 'wrap', zIndex: 10 }}>
        {[
          { label: 'ECS (Compute)', color: '#3b82f6', icon: 'fa-server' },
          { label: 'EVS (Disk)', color: '#f59e0b', icon: 'fa-hdd' },
          { label: 'VPC', color: '#8b5cf6', icon: 'fa-cloud' },
          { label: 'EIP', color: '#fbbf24', icon: 'fa-globe' },
          { label: 'SG', color: '#ef4444', icon: 'fa-shield-alt' },
          { label: 'mig_worker', color: '#fbbf24', icon: 'fa-cogs' },
        ].map(leg => (
          <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(15,15,26,0.7)', padding: '2px 6px', borderRadius: 4 }}>
            <i className={`fas ${leg.icon}`} style={{ color: leg.color, fontSize: 10 }} />
            <span style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af' }}>{leg.label}</span>
          </div>
        ))}
      </div>

      {/* Status legend */}
      <div style={{ position: 'absolute', top: 38, left: 14, display: 'flex', gap: 10, zIndex: 10 }}>
        {[
          { label: 'Success', color: '#10b981' },
          { label: 'Running', color: '#f59e0b' },
          { label: 'Failed', color: '#ef4444' },
          { label: 'Pending', color: '#6b7280' },
        ].map(leg => (
          <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: leg.color, boxShadow: `0 0 4px ${leg.color}80` }} />
            <span style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af' }}>{leg.label}</span>
          </div>
        ))}
      </div>

      {/* Direction indicator */}
      <div style={{
        position: 'absolute', top: 10, right: 14, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(6px)',
        borderRadius: 8, padding: '4px 10px', border: '1px solid #374151',
      }}>
        <span style={{ color: '#9ca3af', fontSize: 9, fontWeight: 700 }}>SOURCE</span>
        <ArrowRightOutlined style={{ color: '#818cf8', fontSize: 12 }} />
        <span style={{ color: '#3b82f6', fontSize: 9, fontWeight: 700 }}>HUAWEI CLOUD</span>
      </div>

      {/* Replay progress bar */}
      {replayMode && totalSteps > 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: '#1f2937', borderRadius: '0 0 8px 8px', zIndex: 10 }}>
          <div style={{
            width: `${(currentStep / totalSteps) * 100}%`, height: '100%',
            background: 'linear-gradient(90deg, #818cf8, #3b82f6, #10b981)',
            borderRadius: '0 0 8px 8px', transition: 'width 0.3s ease',
          }} />
        </div>
      )}

      {/* Phase progression chips */}
      {replayMode && phaseProgression.length > 0 && (
        <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, display: 'flex', gap: 4, flexWrap: 'wrap', zIndex: 10 }}>
          {phaseProgression.map(ph => {
            const cfg = PHASE_CONFIG[ph] || { short: ph, color: '#6b7280' };
            const isCurrent = currentPhase && ph === currentPhase.key;
            return (
              <div key={ph} style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700,
                background: isCurrent ? cfg.color : cfg.color + '30',
                color: isCurrent ? '#fff' : cfg.color,
                border: `1px solid ${cfg.color}${isCurrent ? '' : '40'}`,
                transition: 'all 0.3s',
                transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
              }}>
                {cfg.short}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* Helper for useEffect deps — serialize the dynamic data */
function data_internal(visibleTrace, resources, resourceStates, currentPhase, phaseProgression) {
  return JSON.stringify({
    vt: visibleTrace.length,
    r: resources.map(r => r.name || r.id),
    rs: resourceStates,
    cp: currentPhase?.key,
    pp: phaseProgression,
  });
}

export default SimulationConstellation;
