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

/* ── Procedural environment map for reflections ── */
function makeEnvMap(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#1a1a3e');
  grad.addColorStop(0.3, '#0d0d24');
  grad.addColorStop(0.5, '#080816');
  grad.addColorStop(0.7, '#0d1024');
  grad.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);
  // Light streaks
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * 512;
    const y = 30 + Math.random() * 80;
    const r = 30 + Math.random() * 60;
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
    const hue = [129, 140, 248, 59, 130, 251][i % 6];
    g2.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.4)`);
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

/* ── Procedural glow texture for particles & sprites ── */
function makeGlowTexture(THREE, hexColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const c = new THREE.Color(hexColor);
  const r = Math.round(c.r * 255), g = Math.round(c.g * 255), b = Math.round(c.b * 255);
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.2, `rgba(${r},${g},${b},0.8)`);
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.3)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/* ── Shared env map cache ── */
let _envMapCache = null;
function getEnvMap(THREE) {
  if (!_envMapCache) _envMapCache = makeEnvMap(THREE);
  return _envMapCache;
}

/* ── Geometry builders — return THREE.Group with userData ── */
function buildObject(THREE, type, name, color) {
  const cfg = getResConfig(type);
  const g = new THREE.Group();
  const c = color !== undefined ? color : cfg.color;
  const envMap = getEnvMap(THREE);
  const mat = (opts = {}) => new THREE.MeshPhysicalMaterial({
    color: c, metalness: 0.7, roughness: 0.3,
    emissive: c, emissiveIntensity: 0.12,
    clearcoat: 0.5, clearcoatRoughness: 0.3,
    envMap, envMapIntensity: 0.8,
    ...opts,
  });

  switch (cfg.shape) {
    case 'server': {
      // Main chassis with rounded feel
      const body = new THREE.Mesh(new THREE.BoxGeometry(26, 32, 18), mat({ metalness: 0.85, roughness: 0.25, clearcoat: 0.8 }));
      g.add(body);
      // Front panel inset
      const panel = new THREE.Mesh(new THREE.BoxGeometry(24, 30, 0.8), new THREE.MeshPhysicalMaterial({ color: 0x0a0a14, metalness: 0.9, roughness: 0.2, envMap, envMapIntensity: 1.0 }));
      panel.position.z = 9.1; g.add(panel);
      // Server slots with glowing LED strips
      for (let i = 0; i < 5; i++) {
        const y = 11 - i * 6;
        const slot = new THREE.Mesh(new THREE.BoxGeometry(20, 3.5, 0.6), new THREE.MeshPhysicalMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.4, envMap, envMapIntensity: 0.5 }));
        slot.position.set(0, y, 9.3); g.add(slot);
        // LED strip
        const ledColor = i === 2 ? 0x10b981 : c;
        const led = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.3), new THREE.MeshBasicMaterial({ color: ledColor }));
        led.position.set(-8, y, 9.6); g.add(led);
        const led2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.3), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
        led2.position.set(-5, y, 9.6); g.add(led2);
        // Vent lines
        for (let v = 0; v < 4; v++) {
          const vent = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.2), new THREE.MeshBasicMaterial({ color: 0x1f2937 }));
          vent.position.set(3 + v * 2.5, y, 9.6); g.add(vent);
        }
      }
      // Top vent grille
      const ventTop = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 8), new THREE.MeshPhysicalMaterial({ color: 0x0a0a14, metalness: 0.9, roughness: 0.3, envMap }));
      ventTop.position.set(0, 15, 2); g.add(ventTop);
      // Subtle glow plane behind server
      const glowTex = makeGlowTexture(THREE, c);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending }));
      glow.scale.set(60, 60, 1); glow.position.set(0, 0, -10); g.add(glow);
      // Edge wireframe
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(26, 32, 18)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.3, transparent: true }));
      g.add(edges);
      break;
    }
    case 'database': {
      // Main cylinder with PBR
      const body = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 22, 32), mat({ metalness: 0.8, roughness: 0.2, clearcoat: 1.0 }));
      g.add(body);
      // Top cap with bevel
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(14, 13, 2.5, 32),
        new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c).multiplyScalar(1.4), metalness: 0.9, roughness: 0.15, clearcoat: 1.0, envMap, envMapIntensity: 1.2 }));
      cap.position.y = 12; g.add(cap);
      // Bottom cap
      const capB = new THREE.Mesh(new THREE.CylinderGeometry(13, 14, 2.5, 32),
        new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c).multiplyScalar(1.4), metalness: 0.9, roughness: 0.15, clearcoat: 1.0, envMap, envMapIntensity: 1.2 }));
      capB.position.y = -12; g.add(capB);
      // Data rings (animated by storing in userData)
      const rings = [];
      for (let i = -1; i <= 1; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(13.2, 0.4, 8, 32),
          new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.2, envMap }));
        ring.rotation.x = Math.PI / 2; ring.position.y = i * 5; g.add(ring);
        rings.push(ring);
      }
      g.userData.rings = rings;
      // Glowing data core
      const core = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 16),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.3 }));
      core.position.y = 0; g.add(core);
      g.userData.core = core;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(13, 13, 22, 16)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.25, transparent: true }));
      g.add(edges);
      break;
    }
    case 'disk': {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 4, 32), mat({ metalness: 0.85, roughness: 0.15, clearcoat: 1.0 }));
      g.add(body);
      // Platter surface
      const platter = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 0.5, 32),
        new THREE.MeshPhysicalMaterial({ color: 0x1a1a2e, metalness: 1.0, roughness: 0.05, clearcoat: 1.0, envMap, envMapIntensity: 2.0 }));
      platter.position.y = 2; g.add(platter);
      // Center spindle
      const spindle = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 6, 12),
        new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.9, roughness: 0.1, envMap, envMapIntensity: 1.5, emissive: c, emissiveIntensity: 0.3 }));
      g.add(spindle);
      // Glow ring
      const glowTex = makeGlowTexture(THREE, c);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending }));
      glow.scale.set(40, 40, 1); glow.position.set(0, 0, 0); g.add(glow);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(14, 14, 4, 16)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.3, transparent: true }));
      g.add(edges);
      break;
    }
    case 'bucket': {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(14, 10, 18, 8), mat({ metalness: 0.7, roughness: 0.3, clearcoat: 0.6 }));
      g.add(body);
      // Lid
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(14.5, 14, 2, 8),
        new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c).multiplyScalar(1.3), metalness: 0.85, roughness: 0.2, clearcoat: 0.8, envMap }));
      lid.position.y = 9; g.add(lid);
      // Handle
      const handleGeo = new THREE.TorusGeometry(8, 0.5, 6, 12, Math.PI);
      const handle = new THREE.Mesh(handleGeo, new THREE.MeshPhysicalMaterial({ color: 0x374151, metalness: 0.9, roughness: 0.2, envMap }));
      handle.rotation.x = Math.PI / 2; handle.position.y = 12; g.add(handle);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(14, 10, 18, 8)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.3, transparent: true }));
      g.add(edges);
      break;
    }
    case 'vpc': {
      const w = 280, h = 220, d = 180;
      // Glass-like enclosure
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        new THREE.MeshPhysicalMaterial({ color: c, transparent: true, opacity: 0.04, side: THREE.DoubleSide,
          transmission: 0.9, roughness: 0.1, metalness: 0, ior: 1.4, envMap, envMapIntensity: 0.5 }));
      g.add(box);
      // Glowing border edges
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.4, transparent: true }));
      g.add(edges);
      // Corner accent spheres
      const corners = [[w/2,h/2,d/2],[-w/2,h/2,d/2],[w/2,-h/2,d/2],[-w/2,-h/2,d/2],
                       [w/2,h/2,-d/2],[-w/2,h/2,-d/2],[w/2,-h/2,-d/2],[-w/2,-h/2,-d/2]];
      corners.forEach(([x,y,z]) => {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8),
          new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6 }));
        dot.position.set(x, y, z); g.add(dot);
      });
      break;
    }
    case 'subnet': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(100, 4, 80),
        new THREE.MeshPhysicalMaterial({ color: c, transparent: true, opacity: 0.12, emissive: c, emissiveIntensity: 0.15,
          metalness: 0.3, roughness: 0.5, envMap, envMapIntensity: 0.3 }));
      g.add(body);
      // Grid pattern on surface
      for (let i = -2; i <= 2; i++) {
        for (let j = -1; j <= 1; j++) {
          const cell = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 22),
            new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.15 }));
          cell.position.set(i * 20, 2.2, j * 26); g.add(cell);
        }
      }
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(100, 4, 80)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.25, transparent: true }));
      g.add(edges);
      break;
    }
    case 'eip': {
      // Glowing globe with longitude/latitude lines
      const globe = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 24),
        new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.3, roughness: 0.2, emissive: c, emissiveIntensity: 0.5, clearcoat: 1.0, envMap, envMapIntensity: 1.0 }));
      g.add(globe);
      // Latitude rings
      for (let i = -2; i <= 2; i++) {
        const r = Math.cos(i * 0.6) * 6.5;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.15, 4, 24),
          new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.4 }));
        ring.rotation.x = Math.PI / 2; ring.position.y = i * 2; g.add(ring);
      }
      // Longitude ring
      const lon = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.12, 4, 24),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.3 }));
      g.add(lon);
      const lon2 = lon.clone(); lon2.rotation.y = Math.PI / 2; g.add(lon2);
      // Glow halo
      const glowTex = makeGlowTexture(THREE, c);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending }));
      halo.scale.set(28, 28, 1); g.add(halo);
      // Stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 7, 8),
        new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.8, roughness: 0.2, envMap }));
      stem.position.y = -7; g.add(stem);
      g.userData.globe = globe;
      break;
    }
    case 'shield': {
      // Shield shape using extruded geometry
      const shieldShape = new THREE.Shape();
      shieldShape.moveTo(0, 13);
      shieldShape.quadraticCurveTo(12, 10, 12, 2);
      shieldShape.quadraticCurveTo(12, -8, 0, -13);
      shieldShape.quadraticCurveTo(-12, -8, -12, 2);
      shieldShape.quadraticCurveTo(-12, 10, 0, 13);
      const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, { depth: 4, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 3 });
      const shield = new THREE.Mesh(shieldGeo, mat({ metalness: 0.6, roughness: 0.3, clearcoat: 0.8, transparent: true, opacity: 0.85 }));
      shield.rotation.y = 0; g.add(shield);
      // Inner crest
      const crest = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 16),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.4 }));
      crest.position.z = 3; g.add(crest);
      // Glow
      const glowTex = makeGlowTexture(THREE, c);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending }));
      glow.scale.set(36, 36, 1); glow.position.z = -2; g.add(glow);
      break;
    }
    case 'nat': {
      // Diamond/gateway shape
      const body = new THREE.Mesh(new THREE.OctahedronGeometry(11, 0),
        mat({ metalness: 0.7, roughness: 0.2, clearcoat: 0.8, emissive: c, emissiveIntensity: 0.2 }));
      body.scale.y = 1.2; g.add(body);
      // Inner core
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(5, 0),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5 }));
      g.add(core);
      // Rotating ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(13, 0.3, 6, 24),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.4 }));
      ring.rotation.x = Math.PI / 3; g.add(ring);
      g.userData.ring = ring;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(11, 0)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.3, transparent: true }));
      edges.scale.y = 1.2; g.add(edges);
      break;
    }
    case 'elb': {
      // Load balancer bar with connection points
      const body = new THREE.Mesh(new THREE.BoxGeometry(30, 6, 10), mat({ metalness: 0.8, roughness: 0.2, clearcoat: 0.8 }));
      g.add(body);
      // Connection nodes
      for (let i = -1; i <= 1; i++) {
        const node = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 12),
          new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, metalness: 0.5, roughness: 0.2, envMap }));
        node.position.set(i * 10, 3.5, 0); g.add(node);
        // Glow under each node
        const glowTex = makeGlowTexture(THREE, c);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending }));
        glow.scale.set(14, 14, 1); glow.position.set(i * 10, 3.5, 0); g.add(glow);
      }
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(30, 6, 10)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.3, transparent: true }));
      g.add(edges);
      break;
    }
    case 'vpn': {
      // Lock body
      const body = new THREE.Mesh(new THREE.BoxGeometry(14, 12, 10), mat({ metalness: 0.85, roughness: 0.2, clearcoat: 0.8 }));
      body.position.y = -2; g.add(body);
      // Shackle
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(4, 1.2, 8, 16, Math.PI),
        new THREE.MeshPhysicalMaterial({ color: 0x9ca3af, metalness: 0.95, roughness: 0.1, envMap, envMapIntensity: 1.5 }));
      shackle.position.set(0, 6, 0); g.add(shackle);
      // Keyhole
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1, 12),
        new THREE.MeshBasicMaterial({ color: 0x000000 }));
      hole.rotation.x = Math.PI / 2; hole.position.set(0, -2, 5.1); g.add(hole);
      // Lock glow
      const glowTex = makeGlowTexture(THREE, c);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending }));
      glow.scale.set(30, 30, 1); glow.position.set(0, 0, -3); g.add(glow);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(14, 12, 10)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.3, transparent: true }));
      edges.position.y = -2; g.add(edges);
      break;
    }
    case 'cbr': {
      // Vault/backup box
      const body = new THREE.Mesh(new THREE.BoxGeometry(20, 16, 14), mat({ metalness: 0.85, roughness: 0.2, clearcoat: 0.7 }));
      g.add(body);
      // Front panel
      const panel = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 0.8),
        new THREE.MeshPhysicalMaterial({ color: 0x0a0a14, metalness: 0.9, roughness: 0.2, envMap, envMapIntensity: 1.0 }));
      panel.position.z = 7.1; g.add(panel);
      // Status LEDs
      for (let i = 0; i < 3; i++) {
        const led = new THREE.Mesh(new THREE.CircleGeometry(0.8, 8),
          new THREE.MeshBasicMaterial({ color: i === 0 ? 0x10b981 : i === 1 ? 0xf59e0b : c }));
        led.position.set(-4 + i * 4, 3, 7.5); g.add(led);
      }
      // Handle
      const handle = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, 2),
        new THREE.MeshPhysicalMaterial({ color: 0x374151, metalness: 0.9, roughness: 0.2, envMap }));
      handle.position.set(0, 8.5, 0); g.add(handle);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(20, 16, 14)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.3, transparent: true }));
      g.add(edges);
      break;
    }
    default: {
      const body = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), mat());
      g.add(body);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(20, 20, 20)),
        new THREE.LineBasicMaterial({ color: c, opacity: 0.3, transparent: true }));
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
  const envMap = getEnvMap(THREE);
  // Inner sphere with PBR
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(38, 32, 32),
    new THREE.MeshPhysicalMaterial({ color: 0x6b7280, transparent: true, opacity: 0.12, emissive: 0x6b7280, emissiveIntensity: 0.08,
      metalness: 0.3, roughness: 0.6, envMap, envMapIntensity: 0.5, transmission: 0.5, ior: 1.3 }));
  g.add(sphere);
  // Outer wireframe with higher detail
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(38, 16, 16)),
    new THREE.LineBasicMaterial({ color: 0x6b7280, opacity: 0.2, transparent: true }));
  g.add(wire);
  // Orbiting ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(50, 0.3, 4, 48),
    new THREE.MeshBasicMaterial({ color: 0x6b7280, transparent: true, opacity: 0.25 }));
  ring.rotation.x = Math.PI / 3; g.add(ring);
  g.userData.ring = ring;
  // Glow
  const glowTex = makeGlowTexture(THREE, 0x6b7280);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending }));
  glow.scale.set(120, 120, 1); g.add(glow);
  const lbl = makeLabel(THREE, `SOURCE: ${label}`, { fontSize: 14, color: '#d1d5db', bold: true });
  lbl.position.set(0, 52, 0); g.add(lbl);
  g.userData = { name: label, type: 'Cloud', color: 0x6b7280 };
  return g;
}

function buildTargetCloud(THREE) {
  const g = new THREE.Group();
  const envMap = getEnvMap(THREE);
  // Inner sphere with PBR
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(38, 32, 32),
    new THREE.MeshPhysicalMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.12, emissive: 0x3b82f6, emissiveIntensity: 0.15,
      metalness: 0.3, roughness: 0.5, envMap, envMapIntensity: 0.8, transmission: 0.5, ior: 1.3 }));
  g.add(sphere);
  // Outer wireframe
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(38, 16, 16)),
    new THREE.LineBasicMaterial({ color: 0x3b82f6, opacity: 0.25, transparent: true }));
  g.add(wire);
  // Orbiting ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(50, 0.3, 4, 48),
    new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.3 }));
  ring.rotation.x = Math.PI / 3; ring.rotation.z = Math.PI / 6; g.add(ring);
  g.userData.ring = ring;
  // Glow
  const glowTex = makeGlowTexture(THREE, 0x3b82f6);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending }));
  glow.scale.set(120, 120, 1); g.add(glow);
  const lbl = makeLabel(THREE, 'TARGET: Huawei Cloud', { fontSize: 14, color: '#93c5fd', bold: true });
  lbl.position.set(0, 52, 0); g.add(lbl);
  g.userData = { name: 'Huawei Cloud', type: 'Cloud', color: 0x3b82f6 };
  return g;
}

function buildMigWorker(THREE) {
  const g = new THREE.Group();
  const envMap = getEnvMap(THREE);
  // Hexagonal prism body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 26, 6),
    new THREE.MeshPhysicalMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.15, emissive: 0xfbbf24, emissiveIntensity: 0.3, clearcoat: 1.0, envMap, envMapIntensity: 1.2 }));
  g.add(body);
  // Top cap
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(12, 11, 2, 6),
    new THREE.MeshPhysicalMaterial({ color: 0xfde68a, metalness: 0.95, roughness: 0.1, clearcoat: 1.0, envMap, envMapIntensity: 1.5 }));
  cap.position.y = 13; g.add(cap);
  // Rotating orbital ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(15, 0.4, 6, 32),
    new THREE.MeshPhysicalMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.2, envMap }));
  ring.rotation.x = Math.PI / 2; g.add(ring);
  g.userData.ring = ring;
  // Glow halo
  const glowTex = makeGlowTexture(THREE, 0xfbbf24);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending }));
  glow.scale.set(50, 50, 1); g.add(glow);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(11, 11, 26, 6)),
    new THREE.LineBasicMaterial({ color: 0xfbbf24, opacity: 0.4, transparent: true }));
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
  const [showLayers, setShowLayers] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  // Layer visibility overrides — null = auto (phase-based), true/false = user override
  const [layerOverrides, setLayerOverrides] = useState({
    subnet: null, eip: null, vpn: null, nat: null, elb: null,
    sg: null, storage: null, vpc: null, worker: null, cdn: null, cbr: null,
  });
  const toggleLayer = useCallback((layer) => {
    setLayerOverrides(prev => ({ ...prev, [layer]: prev[layer] === null ? true : prev[layer] === true ? false : null }));
  }, []);
  const layerEffective = (layer, autoVisible) => {
    const ov = layerOverrides[layer];
    return ov === null ? autoVisible : ov;
  };

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
    scene.background = new THREE.Color(0x06060f);
    scene.fog = new THREE.Fog(0x06060f, 400, 1200);
    // Set environment map for scene-wide reflections
    scene.environment = getEnvMap(THREE);
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
      controls.autoRotate = true; controls.autoRotateSpeed = 0.05;  // SLOWER rotation
      controls.minDistance = 150; controls.maxDistance = 1200;
      controls.maxPolarAngle = Math.PI * 0.88;
      controlsRef.current = controls;
    }

    // ── Professional 3-point lighting + atmosphere ──
    const hemi = new THREE.HemisphereLight(0x818cf8, 0x0a0a14, 0.4);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight(0x1a1a3e, 0.3);
    scene.add(ambient);
    // Key light — warm-white from top-right
    const key = new THREE.DirectionalLight(0xfff5e6, 0.9);
    key.position.set(200, 300, 200); scene.add(key);
    // Fill light — cool blue from left
    const fill = new THREE.DirectionalLight(0x818cf8, 0.5);
    fill.position.set(-200, 100, 150); scene.add(fill);
    // Rim light — behind, for edge separation
    const rim = new THREE.DirectionalLight(0x3b82f6, 0.6);
    rim.position.set(0, 50, -300); scene.add(rim);
    // Colored point lights near source and target
    const plSource = new THREE.PointLight(0x6b7280, 0.8, 600); plSource.position.set(-420, 80, 50); scene.add(plSource);
    const plTarget = new THREE.PointLight(0x3b82f6, 1.2, 600); plTarget.position.set(420, 80, 50); scene.add(plTarget);

    // ── Starfield background ──
    const starGeo = new THREE.BufferGeometry();
    const starCount = 800;
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 800 + Math.random() * 600;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
      const hue = [0.8, 0.6, 0.7, 0.5, 0.9][Math.floor(Math.random() * 5)];
      const sc = new THREE.Color().setHSL(hue, 0.5, 0.7);
      starColors[i * 3] = sc.r; starColors[i * 3 + 1] = sc.g; starColors[i * 3 + 2] = sc.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.5, vertexColors: true, transparent: true, opacity: 0.6, sizeAttenuation: true });
    const starfield = new THREE.Points(starGeo, starMat);
    scene.add(starfield);

    // ── Subtle ground grid platform ──
    const grid = new THREE.GridHelper(1200, 40, 0x1e293b, 0x111827);
    grid.position.y = -200;
    grid.material.transparent = true;
    grid.material.opacity = 0.3;
    scene.add(grid);

    // ── Ground glow disc ──
    const discGeo = new THREE.CircleGeometry(400, 64);
    const discMat = new THREE.MeshBasicMaterial({ color: 0x0a0a14, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2; disc.position.y = -199;
    scene.add(disc);

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

    // ── Categorize resources — also extract from trace if not in resources ──
    // The trace may reference VPC, EIP, SG, Subnet etc. that aren't in mapper nodes
    const traceResourceNames = new Set();
    (trace || []).forEach(step => {
      const action = (step.action || '').toUpperCase();
      const target = step.target || '';
      if (action.includes('VPC') && target) traceResourceNames.add({ name: target, type: 'VPC' });
      if (action.includes('EIP') && target) traceResourceNames.add({ name: target, type: 'EIP' });
      if ((action.includes('SG') || action.includes('SECURITY')) && target) traceResourceNames.add({ name: target, type: 'SG' });
      if (action.includes('SUBNET') && target) traceResourceNames.add({ name: target, type: 'SUBNET' });
      if (action.includes('NAT') && target) traceResourceNames.add({ name: target, type: 'NAT' });
      if (action.includes('ELB') && target) traceResourceNames.add({ name: target, type: 'ELB' });
    });

    // Merge trace-discovered resources with mapper nodes (dedup by name)
    const allResources = [...resources];
    const existingNames = new Set(resources.map(r => r.name));
    traceResourceNames.forEach(r => {
      if (!existingNames.has(r.name)) allResources.push(r);
    });

    const computeNodes = allResources.filter(r => {
      const t = (r.type || '').toUpperCase();
      return t === 'ECS' || t === 'COMPUTE' || t === 'APP' || t === 'WEB' || t === 'INFRASTRUCTURE';
    });
    const dbNodes = allResources.filter(r => {
      const t = (r.type || '').toUpperCase();
      return t === 'RDS' || t === 'DATABASE' || t === 'DB' || t === 'DCS' || t === 'CACHE';
    });
    const storageNodes = allResources.filter(r => {
      const t = (r.type || '').toUpperCase();
      return t === 'EVS' || t === 'STORAGE' || t === 'OBS' || t === 'CBR';
    });
    const vpcNodes = allResources.filter(r => (r.type || '').toUpperCase() === 'VPC');
    const eipNodes = allResources.filter(r => (r.type || '').toUpperCase() === 'EIP');
    const sgNodes = allResources.filter(r => {
      const t = (r.type || '').toUpperCase();
      return t === 'SG' || t === 'SECURITY_GROUP' || t === 'WAF' || t === 'HSS';
    });
    const netNodes = allResources.filter(r => {
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
      objectMapRef.current[name] = { group: obj, name, isStorage: true, shape: cfg.shape, layerType: 'storage' };
    });

    // ── EIPs (floating near target) ──
    eipNodes.forEach((res, i) => {
      const name = res.name || res.id || `EIP-${i}`;
      const obj = buildObject(THREE, 'EIP', name, 0xfbbf24);
      obj.position.set(400 + i * 22, 100 + i * 12, 50);
      obj.visible = false;
      scene.add(obj);
      objectMapRef.current[name] = { group: obj, name, isEIP: true, layerType: 'eip' };
    });

    // ── Security Groups (inside VPC, top) ──
    sgNodes.forEach((res, i) => {
      const name = res.name || res.id || `SG-${i}`;
      const cfg = getResConfig(res.type);
      const obj = buildObject(THREE, res.type, name, cfg.color);
      obj.position.set(300 + i * 30, 80, 60);
      obj.visible = false;
      scene.add(obj);
      objectMapRef.current[name] = { group: obj, name, isSG: true, layerType: 'sg' };
    });

    // ── Network nodes (NAT, ELB, VPN, Subnet, CDN) ──
    netNodes.forEach((res, i) => {
      const name = res.name || res.id || `Net-${i}`;
      const rType = (res.type || '').toUpperCase();
      const cfg = getResConfig(res.type);
      const obj = buildObject(THREE, res.type, name, cfg.color);
      obj.position.set(300 + i * 40, -100, 60);
      obj.visible = false;
      scene.add(obj);
      // Tag with specific layer type
      const layerType = rType === 'SUBNET' ? 'subnet' : rType === 'VPN' ? 'vpn' :
        rType === 'NAT' ? 'nat' : rType === 'ELB' ? 'elb' : rType === 'CDN' ? 'cdn' : 'net';
      objectMapRef.current[name] = { group: obj, name, isNet: true, layerType };
    });

    // ── mig_worker ──
    const mw = buildMigWorker(THREE);
    mw.position.set(380, -70, 60);
    mw.visible = false;
    scene.add(mw);
    objectMapRef.current['mig_worker'] = { group: mw, name: 'mig_worker', isWorker: true, layerType: 'worker' };

    // ── Connection beams (source → target) — energy beam style ──
    const lines = [];
    allCompute.forEach((res, i) => {
      const name = res.name || res.id || `Server-${i}`;
      const yOff = (i - (allCompute.length - 1) / 2) * 60;
      const srcPos = new THREE.Vector3(-360, yOff, 30);
      const tgtPos = new THREE.Vector3(300, yOff, -20);
      // Main beam — thin tube for 3D depth
      const dir = new THREE.Vector3().subVectors(tgtPos, srcPos);
      const len = dir.length();
      const tubeGeo = new THREE.CylinderGeometry(0.5, 0.5, len, 8);
      const tubeMat = new THREE.MeshBasicMaterial({ color: 0x374151, transparent: true, opacity: 0.3 });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.position.copy(srcPos).addScaledVector(dir, 0.5);
      tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      tube.visible = false;
      scene.add(tube);
      // Glow sprite along the beam for energy effect
      const glowTex = makeGlowTexture(THREE, 0x818cf8);
      const beamGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending }));
      beamGlow.position.copy(srcPos).addScaledVector(dir, 0.5);
      beamGlow.scale.set(len * 0.8, 20, 1);
      beamGlow.visible = false;
      scene.add(beamGlow);
      lines.push({ line: tube, beamGlow, srcPos, tgtPos, sourceName: name });
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
      const t = Date.now() * 0.001;
      // Flow particles — glowing orbs with arc trajectory
      particlesRef.current.forEach(p => {
        p.userData.progress += p.userData.speed;
        if (p.userData.progress > 1) p.userData.progress = 0;
        const pos = new THREE.Vector3().lerpVectors(p.userData.srcPos, p.userData.tgtPos, p.userData.progress);
        pos.y += Math.sin(p.userData.progress * Math.PI) * 30;
        p.position.copy(pos);
        p.material.opacity = 0.5 + Math.sin(p.userData.progress * Math.PI) * 0.5;
        if (p.userData.halo) {
          p.userData.halo.material.opacity = 0.3 + Math.sin(p.userData.progress * Math.PI) * 0.4;
        }
      });
      // Pulsing running servers
      [...sourceServersRef.current, ...targetServersRef.current].forEach(s => {
        const ud = s.group.userData;
        if (ud && ud.status === 'running' && s.group.children[0] && s.group.children[0].material) {
          s.group.children[0].material.emissiveIntensity = 0.15 + Math.sin(t * 3) * 0.15;
        }
        // Subtle idle float
        if (s.group.visible) {
          s.group.position.y += Math.sin(t * 0.8 + s.group.position.x * 0.01) * 0.02;
        }
      });
      // Rotate orbital rings on objects
      Object.values(objectMapRef.current).forEach(entry => {
        if (entry.group && entry.group.userData && entry.group.userData.ring) {
          entry.group.userData.ring.rotation.z += 0.005;
        }
        // Rotate database rings
        if (entry.group && entry.group.userData && entry.group.userData.rings) {
          entry.group.userData.rings.forEach((r, i) => { r.rotation.z += 0.003 * (i + 1); });
        }
        // Pulse database core
        if (entry.group && entry.group.userData && entry.group.userData.core) {
          const core = entry.group.userData.core;
          core.scale.setScalar(1 + Math.sin(t * 2) * 0.15);
          core.material.opacity = 0.2 + Math.sin(t * 2) * 0.15;
        }
        // Rotate EIP globe
        if (entry.group && entry.group.userData && entry.group.userData.globe) {
          entry.group.userData.globe.rotation.y += 0.005;
        }
      });
      // Starfield subtle rotation
      if (starfield) starfield.rotation.y += 0.0001;
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
  }, [threeReady, hasData, trace, fullscreen]); // Rebuild scene when trace or fullscreen changes

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
      om['__VPC__'].group.visible = layerEffective('vpc', showTargetInfrastructure || phaseProgression.includes('PHASE_4_1'));
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

    // Show EIPs during/after target provisioning OR when layer forced on
    const eipVisible = phaseProgression.includes('PHASE_4_2c_TARGET') || phaseProgression.includes('PHASE_4_2d_SYNC') ||
      phaseProgression.includes('PHASE_4_3') || phaseProgression.includes('PHASE_4_6');
    Object.values(om).forEach(entry => {
      if (entry.isEIP) {
        const autoVis = eipVisible && (discoveredResources.has(entry.name) || phaseProgression.includes('PHASE_4_2c_TARGET'));
        entry.group.visible = layerEffective('eip', autoVis);
      }
      if (entry.isSG) {
        const autoVis = showTargetInfrastructure || phaseProgression.includes('PHASE_4_2b_PREFLIGHT');
        entry.group.visible = layerEffective('sg', autoVis);
      }
      if (entry.isNet) {
        const lt = entry.layerType || 'net';
        const autoVis = showTargetInfrastructure || phaseProgression.includes('PHASE_4_1');
        entry.group.visible = layerEffective(lt, autoVis);
      }
      if (entry.isStorage) {
        const autoVis = sourceVisible || discoveredResources.has(entry.name) || phaseProgression.includes('PHASE_4_2c_TARGET');
        entry.group.visible = layerEffective('storage', autoVis);
      }
      if (entry.isWorker) {
        entry.group.visible = layerEffective('worker', phaseProgression.includes('PHASE_4_2b_PREFLIGHT') || phaseProgression.includes('PHASE_4_2c_TARGET'));
      }
    });

    // Show flow beams when both source and target are connected
    flowLinesRef.current.forEach(fl => {
      const srcObj = om[fl.sourceName];
      const tgtObj = om[`${fl.sourceName}-TARGET`];
      const visible = !!(srcObj && srcObj.group.visible && tgtObj && tgtObj.group.visible);
      fl.line.visible = visible;
      if (fl.beamGlow) fl.beamGlow.visible = visible;
      // Color beam based on sync status
      if (visible) {
        const isSyncing = syncActive;
        const color = isSyncing ? 0x10b981 : 0x374151;
        fl.line.material.color.setHex(color);
        fl.line.material.opacity = isSyncing ? 0.5 : 0.25;
        if (fl.beamGlow) {
          fl.beamGlow.material.opacity = isSyncing ? 0.3 : 0.1;
          // Update glow color
          const oldTex = fl.beamGlow.material.map;
          fl.beamGlow.material.map = makeGlowTexture(THREE, isSyncing ? 0x10b981 : 0x818cf8);
          fl.beamGlow.material.needsUpdate = true;
          if (oldTex) oldTex.dispose();
        }
      }
    });

    // Manage flow particles — glowing orbs with trails
    if (syncActive && particlesRef.current.length === 0) {
      // Create glowing orb particles
      flowLinesRef.current.forEach(fl => {
        if (!fl.line.visible) return;
        for (let p = 0; p < 5; p++) {
          // Core orb
          const orb = new THREE.Mesh(
            new THREE.SphereGeometry(2, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.9 })
          );
          // Glow halo
          const glowTex = makeGlowTexture(THREE, 0x10b981);
          const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
          halo.scale.set(14, 14, 1);
          orb.add(halo);
          orb.userData = { srcPos: fl.srcPos, tgtPos: fl.tgtPos, progress: p / 5, speed: 0.003 + Math.random() * 0.002, halo };
          sceneRef.current.add(orb);
          particlesRef.current.push(orb);
        }
      });
    } else if (!syncActive && particlesRef.current.length > 0) {
      // Remove particles
      particlesRef.current.forEach(p => {
        sceneRef.current.remove(p);
        p.geometry.dispose();
        if (p.material) p.material.dispose();
        if (p.userData.halo) { p.userData.halo.material.map?.dispose(); p.userData.halo.material.dispose(); }
      });
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
  }, [visibleTrace, resourceStates, discoveredResources, phaseProgression, currentPhase, syncActive, layerOverrides]);

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

  /* ── Shared overlay styles ── */
  const panelBg = 'rgba(10,12,24,0.92)';
  const panelBorder = '1px solid #1e293b';
  const panelRadius = 10;

  const layerList = [
    { key: 'vpc',     label: 'VPC',     color: '#8b5cf6', icon: 'fa-cloud' },
    { key: 'subnet',  label: 'Subnet',  color: '#a78bfa', icon: 'fa-network-wired' },
    { key: 'eip',     label: 'EIP',     color: '#fbbf24', icon: 'fa-globe' },
    { key: 'sg',      label: 'SG',      color: '#ef4444', icon: 'fa-shield-alt' },
    { key: 'nat',     label: 'NAT',     color: '#ec4899', icon: 'fa-route' },
    { key: 'elb',     label: 'ELB',     color: '#06b6d4', icon: 'fa-balance-scale' },
    { key: 'vpn',     label: 'VPN',     color: '#6366f1', icon: 'fa-lock' },
    { key: 'cdn',     label: 'CDN',     color: '#fbbf24', icon: 'fa-satellite-dish' },
    { key: 'storage', label: 'EVS/OBS', color: '#f59e0b', icon: 'fa-hdd' },
    { key: 'cbr',     label: 'CBR',     color: '#f97316', icon: 'fa-archive' },
    { key: 'worker',  label: 'Worker',  color: '#fbbf24', icon: 'fa-cogs' },
  ];

  const statusLegends = [
    { label: 'Success', color: '#10b981' },
    { label: 'Running', color: '#f59e0b' },
    { label: 'Failed',  color: '#ef4444' },
    { label: 'Pending', color: '#6b7280' },
  ];

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
        </Space>
      }
      styles={{ body: { padding: 0, position: 'relative' } }}
    >
      <div ref={containerRef} style={{ width: '100%', height: fullscreen ? 'calc(100vh - 60px)' : 600, borderRadius: '0 0 8px 8px', cursor: 'grab' }} />

      {/* Tooltip */}
      {tooltip.visible && (
        <div style={{
          position: 'absolute', left: tooltip.x + 15, top: tooltip.y + 15,
          background: 'rgba(10,10,20,0.95)', color: '#d1d5db', fontSize: 12,
          padding: '6px 10px', borderRadius: 6, border: '1px solid #374151',
          pointerEvents: 'none', zIndex: 100, fontFamily: 'monospace', whiteSpace: 'nowrap',
        }}>{tooltip.text}</div>
      )}

      {/* Loading */}
      {!threeReady && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#6b7280' }}>
          <Spin tip="Loading 3D engine..." />
        </div>
      )}

      {/* ═══════════════════════════════════════════════
         LEFT-SIDE PANEL (collapsible) — Layers + Legend + Direction
         ═══════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 20,
        background: panelBg, border: panelBorder, borderRadius: panelRadius,
        maxWidth: 240, overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        {/* Header row — always visible */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', cursor: 'pointer' }}
          onClick={() => setShowLayers(v => !v)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-layer-group" style={{ color: '#818cf8', fontSize: 12 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#d1d5db' }}>Layers & Legend</span>
          </div>
          <i className={`fas fa-chevron-${showLayers ? 'up' : 'down'}`} style={{ color: '#6b7280', fontSize: 9 }} />
        </div>

        {/* Collapsible content */}
        {showLayers && (
          <div style={{ padding: '0 10px 10px' }}>
            {/* Layer toggles — grid layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginTop: 4 }}>
              {layerList.map(leg => {
                const ov = layerOverrides[leg.key];
                const isOn = ov === true;
                const isOff = ov === false;
                const isAuto = ov === null;
                return (
                  <AntTooltip key={leg.key} title={`${leg.label} — ${isAuto ? 'Auto (phase-based)' : isOn ? 'Force shown' : 'Hidden'}`}>
                    <button
                      onClick={() => toggleLayer(leg.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: isOff ? 'rgba(15,15,26,0.5)' : isOn ? leg.color + '25' : 'rgba(15,15,26,0.6)',
                        border: `1px solid ${isOff ? '#1e293b' : isOn ? leg.color : leg.color + '40'}`,
                        borderRadius: 5, padding: '3px 6px', cursor: 'pointer',
                        opacity: isOff ? 0.45 : 1, transition: 'all 0.2s',
                      }}
                    >
                      <i className={`fas ${leg.icon}`} style={{ color: isOff ? '#4b5563' : leg.color, fontSize: 10 }} />
                      <span style={{ fontSize: 9, fontWeight: 600, color: isOff ? '#6b7280' : isOn ? leg.color : '#9ca3af' }}>{leg.label}</span>
                      {isAuto && <i className="fas fa-magic" style={{ fontSize: 6, color: '#4b5563', marginLeft: 'auto' }} />}
                    </button>
                  </AntTooltip>
                );
              })}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#1e293b', margin: '8px 0' }} />

            {/* Status legend */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {statusLegends.map(leg => (
                <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: leg.color, boxShadow: `0 0 4px ${leg.color}80` }} />
                  <span style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af' }}>{leg.label}</span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#1e293b', margin: '8px 0' }} />

            {/* Direction indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700 }}>SOURCE</span>
              <ArrowRightOutlined style={{ color: '#818cf8', fontSize: 11 }} />
              <span style={{ color: '#3b82f6', fontSize: 10, fontWeight: 700 }}>HUAWEI CLOUD</span>
            </div>

            {/* Replay step info (moved from title to here to decongest) */}
            {replayMode && (
              <div style={{ marginTop: 6, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace' }}>
                  Step {currentStep}/{totalSteps}
                </Text>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
         RIGHT-SIDE — View controls (zoom, reset, rotate)
         ═══════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 20,
        display: 'flex', flexDirection: 'column', gap: 4,
        background: panelBg, border: panelBorder, borderRadius: panelRadius,
        padding: 6,
      }}>
        <AntTooltip title="Zoom In">
          <Button size="small" icon={<ZoomInOutlined />} onClick={zoomIn} style={{ background: 'transparent', borderColor: '#1e293b', color: '#9ca3af' }} />
        </AntTooltip>
        <AntTooltip title="Zoom Out">
          <Button size="small" icon={<ZoomOutOutlined />} onClick={zoomOut} style={{ background: 'transparent', borderColor: '#1e293b', color: '#9ca3af' }} />
        </AntTooltip>
        <AntTooltip title="Reset View">
          <Button size="small" icon={<RedoOutlined />} onClick={resetView} style={{ background: 'transparent', borderColor: '#1e293b', color: '#9ca3af' }} />
        </AntTooltip>
        <div style={{ height: 1, background: '#1e293b', margin: '2px 0' }} />
        <AntTooltip title={autoRotate ? 'Stop Rotation' : 'Auto Rotate'}>
          <Button size="small" icon={<i className="fas fa-sync" style={{ fontSize: 12 }} />} onClick={toggleRotate}
            style={{ background: autoRotate ? 'rgba(129,140,248,0.2)' : 'transparent', borderColor: autoRotate ? '#818cf8' : '#1e293b', color: autoRotate ? '#a5b4fc' : '#9ca3af' }} />
        </AntTooltip>
      </div>

      {/* ═══════════════════════════════════════════════
         BOTTOM-CENTER — Replay controls bar
         ═══════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
        background: panelBg, borderRadius: panelRadius, border: panelBorder,
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
              <Button size="small" icon={<RedoOutlined />} onClick={onReplayReset} style={{ background: 'transparent', borderColor: '#1e293b', color: '#d1d5db' }} />
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
                style={{ background: 'transparent', borderColor: '#1e293b', color: '#d1d5db' }} />
            </AntTooltip>
            <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#9ca3af' }}>{currentStep}/{totalSteps}</Text>
            <div style={{ width: 1, height: 18, background: '#1e293b' }} />
            <AntTooltip title="Replay speed">
              <select value={replaySpeed || 1000} onChange={e => onReplaySpeedChange(Number(e.target.value))}
                style={{ background: 'rgba(15,15,26,0.6)', color: '#d1d5db', fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '3px 6px', border: '1px solid #1e293b', cursor: 'pointer' }}>
                <option value={2000}>0.5x</option>
                <option value={1000}>1x</option>
                <option value={500}>2x</option>
                <option value={150}>5x</option>
                <option value={50}>10x</option>
              </select>
            </AntTooltip>
            <AntTooltip title="Exit replay mode">
              <Button size="small" icon={<StopOutlined />} onClick={onReplayStop}
                style={{ background: 'transparent', borderColor: '#1e293b', color: '#d1d5db' }} />
            </AntTooltip>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
         BOTTOM-LEFT — Phase progression chips (replay only)
         Placed above the replay bar, no overlap
         ═══════════════════════════════════════════════ */}
      {replayMode && phaseProgression.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 60, left: 10, right: 10, zIndex: 15,
          display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {phaseProgression.map(ph => {
            const cfg = PHASE_CONFIG[ph] || { short: ph, color: '#6b7280' };
            const isCurrent = currentPhase && ph === currentPhase.key;
            return (
              <div key={ph} style={{
                padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                background: isCurrent ? cfg.color : 'rgba(10,12,24,0.7)',
                color: isCurrent ? '#fff' : cfg.color + 'aa',
                border: `1px solid ${cfg.color}${isCurrent ? '' : '40'}`,
                transition: 'all 0.3s', transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                textShadow: isCurrent ? '0 1px 2px rgba(0,0,0,0.4)' : 'none',
              }}>{cfg.short}</div>
            );
          })}
        </div>
      )}

      {/* Progress bar — very bottom edge */}
      {replayMode && totalSteps > 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#1f2937', borderRadius: '0 0 8px 8px', zIndex: 10 }}>
          <div style={{ width: `${(currentStep / totalSteps) * 100}%`, height: '100%',
            background: 'linear-gradient(90deg, #818cf8, #3b82f6, #10b981)', borderRadius: '0 0 8px 8px', transition: 'width 0.3s ease' }} />
        </div>
      )}
    </Card>
  );
}

export default SimulationConstellation;
