import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Card, Spin, Space, Tag, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { buildConstellationData, computeConstellationLayout } from './AgenticOrchestrationPanel.jsx';

const { Text } = Typography;

/* ═══════════════════════════════════════════════
   3D Simulation Constellation — Three.js
   Resource-type-aware shapes:
     ECS/Compute  → Server box (BoxGeometry)
     RDS/Database → Cylinder (cylinder)
     Storage/OBS  → Disk (flat cylinder)
     VPC          → Large translucent sphere
     EIP          → Small sphere with glow
     SG           → Octahedron (shield-like)
     NAT          → Tetrahedron
     mig_worker   → Hexagonal cylinder
   Replay: shows trace steps one-by-one synced to replayIndex
   ═══════════════════════════════════════════════ */

/* ── Resource type → 3D geometry config ── */
function getResourceGeometry(type, THREE) {
  const t = (type || '').toUpperCase();
  if (t === 'ECS' || t === 'COMPUTE') {
    return { geo: new THREE.BoxGeometry(20, 14, 16), label: 'ECS', color: 0x3b82f6 };
  }
  if (t === 'RDS' || t === 'DATABASE' || t.includes('DB')) {
    return { geo: new THREE.CylinderGeometry(10, 10, 18, 24), label: 'RDS', color: 0x10b981 };
  }
  if (t === 'STORAGE' || t === 'OBS' || t === 'DISK') {
    return { geo: new THREE.CylinderGeometry(12, 12, 4, 24), label: 'OBS', color: 0xf59e0b };
  }
  if (t === 'VPC') {
    return { geo: new THREE.SphereGeometry(22, 24, 24), label: 'VPC', color: 0x8b5cf6 };
  }
  if (t === 'EIP') {
    return { geo: new THREE.SphereGeometry(7, 20, 20), label: 'EIP', color: 0xfbbf24 };
  }
  if (t === 'SG' || t === 'SECURITY_GROUP' || t.includes('SECURITY')) {
    return { geo: new THREE.OctahedronGeometry(10, 0), label: 'SG', color: 0xef4444 };
  }
  if (t === 'NAT') {
    return { geo: new THREE.TetrahedronGeometry(11, 0), label: 'NAT', color: 0xec4899 };
  }
  // Default: server
  return { geo: new THREE.BoxGeometry(18, 12, 14), label: t || 'ECS', color: 0x3b82f6 };
}

/* ── Network node type from action string ── */
function getNetworkNodeType(action) {
  const a = (action || '').toUpperCase();
  if (a.includes('VPC')) return 'VPC';
  if (a.includes('SUBNET')) return 'SUBNET';
  if (a.includes('SG') || a.includes('SECURITY')) return 'SG';
  if (a.includes('EIP')) return 'EIP';
  if (a.includes('NAT')) return 'NAT';
  return 'NET';
}

function SimulationConstellation({ trace, resourceUsage, resources, replayMode, replayIndex }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });
  const [threeReady, setThreeReady] = useState(false);

  // Slice trace for replay mode
  const visibleTrace = useMemo(() => {
    if (!trace || trace.length === 0) return [];
    if (replayMode && replayIndex >= 0) {
      return trace.slice(0, replayIndex + 1);
    }
    return trace;
  }, [trace, replayMode, replayIndex]);

  // Current phase label
  const currentPhase = useMemo(() => {
    if (!visibleTrace || visibleTrace.length === 0) return '';
    const lastStep = visibleTrace[visibleTrace.length - 1];
    return (lastStep.phase || '').replace('PHASE_', 'Phase ') || '';
  }, [visibleTrace]);

  // Build data from visible trace only
  const data = useMemo(() => buildConstellationData(visibleTrace, resourceUsage, resources), [visibleTrace, resourceUsage, resources]);
  const layout = useMemo(() => computeConstellationLayout(data), [data]);
  const hasData = data.servers.length > 0 || data.networkNodes.length > 0;

  // Total steps (for progress display)
  const totalSteps = (trace || []).length;
  const currentStep = visibleTrace.length;

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
    const h = 550;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    scene.fog = new THREE.Fog(0x0a0a14, 250, 700);

    // Camera
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 2000);
    camera.position.set(0, 80, 450);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Controls
    let controls = null;
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.minDistance = 150;
      controls.maxDistance = 900;
    }

    // Lights
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(100, 200, 150);
    scene.add(dirLight);
    const pointLight1 = new THREE.PointLight(0x818cf8, 1.2, 600);
    pointLight1.position.set(-350, 50, 0);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x3b82f6, 1.2, 600);
    pointLight2.position.set(350, 50, 0);
    scene.add(pointLight2);

    // ── Status colors ──
    const statusColor = (status) => {
      const s = (status || '').toLowerCase();
      if (s.includes('success') || s === 'green' || s === 'ok' || s === 'completed') return 0x10b981;
      if (s === 'running' || s === 'amber' || s === 'active' || s === 'in_progress') return 0xf59e0b;
      if (s.includes('fail') || s.includes('error') || s === 'red' || s === 'failed') return 0xef4444;
      if (s.includes('deploy') || s === 'blue') return 0x3b82f6;
      return 0x6b7280; // pending/gray
    };

    const nodes3D = []; // { mesh, name, status, type, sourceLabel, targetPos }

    // ── Source cloud (left) — translucent gray sphere ──
    const sourceGeo = new THREE.SphereGeometry(35, 32, 32);
    const sourceMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280, metalness: 0.2, roughness: 0.6,
      emissive: 0x6b7280, emissiveIntensity: 0.2, transparent: true, opacity: 0.35,
    });
    const sourceMesh = new THREE.Mesh(sourceGeo, sourceMat);
    sourceMesh.position.set(-380, 0, 0);
    scene.add(sourceMesh);
    nodes3D.push({ mesh: sourceMesh, name: `SOURCE: ${layout.sourceLabel || 'Source Cloud'}`, status: 'source', type: 'cloud', sourceLabel: '' });

    // Source wireframe outline
    const sourceWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(sourceGeo),
      new THREE.LineBasicMaterial({ color: 0x6b7280, opacity: 0.4, transparent: true })
    );
    sourceWire.position.copy(sourceMesh.position);
    scene.add(sourceWire);

    // ── Target cloud (right) — Huawei blue sphere ──
    const targetGeo = new THREE.SphereGeometry(35, 32, 32);
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, metalness: 0.2, roughness: 0.6,
      emissive: 0x3b82f6, emissiveIntensity: 0.35, transparent: true, opacity: 0.35,
    });
    const targetMesh = new THREE.Mesh(targetGeo, targetMat);
    targetMesh.position.set(380, 0, 0);
    scene.add(targetMesh);
    nodes3D.push({ mesh: targetMesh, name: `TARGET: ${layout.targetLabel || 'Huawei Cloud'}`, status: 'target', type: 'cloud', sourceLabel: '' });

    const targetWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(targetGeo),
      new THREE.LineBasicMaterial({ color: 0x3b82f6, opacity: 0.4, transparent: true })
    );
    targetWire.position.copy(targetMesh.position);
    scene.add(targetWire);

    // ── VPC: large translucent sphere around target ──
    if (data.counts && (data.counts.vpcs > 0 || data.counts.subnets > 0)) {
      const vpcGeo = new THREE.SphereGeometry(80, 24, 24);
      const vpcMat = new THREE.MeshStandardMaterial({
        color: 0x8b5cf6, transparent: true, opacity: 0.08,
        emissive: 0x8b5cf6, emissiveIntensity: 0.1, wireframe: false,
      });
      const vpcMesh = new THREE.Mesh(vpcGeo, vpcMat);
      vpcMesh.position.set(380, 0, 0);
      scene.add(vpcMesh);
      nodes3D.push({ mesh: vpcMesh, name: 'VPC (Target Network)', status: 'deployed', type: 'VPC', sourceLabel: '' });

      // VPC wireframe
      const vpcWire = new THREE.LineSegments(
        new THREE.EdgesGeometry(vpcGeo),
        new THREE.LineBasicMaterial({ color: 0x8b5cf6, opacity: 0.2, transparent: true })
      );
      vpcWire.position.copy(vpcMesh.position);
      scene.add(vpcWire);
    }

    // ── Server/Resource nodes — positioned in arc between source and target ──
    const serverCount = data.servers.length;
    const serverNodes = [];

    data.servers.forEach((srv, i) => {
      const angle = (i / Math.max(serverCount, 1)) * Math.PI * 2;
      const ringRadius = 120 + (i % 3) * 35;
      const x = Math.cos(angle) * ringRadius * 0.6;
      const y = Math.sin(angle) * ringRadius * 0.4;
      const z = (i % 5 - 2) * 35;

      // Determine resource type from the resource data
      const resourceType = srv.resourceType || 'ECS';
      const { geo, label: typeLabel, color: baseColor } = getResourceGeometry(resourceType, THREE);
      const color = statusColor(srv.status) !== 0x6b7280 ? statusColor(srv.status) : baseColor;

      const mat = new THREE.MeshStandardMaterial({
        color, metalness: 0.7, roughness: 0.3,
        emissive: color, emissiveIntensity: 0.35,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);

      // Add edge wireframe for definition
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color, opacity: 0.6, transparent: true })
      );
      edges.position.copy(mesh.position);
      scene.add(mesh);
      scene.add(edges);

      const nodeInfo = { mesh, edges, name: srv.name, status: srv.status, type: typeLabel, sourceLabel: srv.source_label, baseColor };
      nodes3D.push(nodeInfo);
      serverNodes.push(nodeInfo);

      // Connection: source → server (dashed line)
      const srcLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-380, 0, 0),
        new THREE.Vector3(x, y, z),
      ]);
      const srcLineMat = new THREE.LineDashedMaterial({ color: 0x6b7280, dashSize: 6, gapSize: 4, opacity: 0.35, transparent: true });
      const srcLine = new THREE.Line(srcLineGeo, srcLineMat);
      srcLine.computeLineDistances();
      scene.add(srcLine);

      // Connection: server → target (solid line, colored by status)
      const tgtLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(380, 0, 0),
      ]);
      const tgtLineMat = new THREE.LineBasicMaterial({ color, opacity: 0.5, transparent: true });
      const tgtLine = new THREE.Line(tgtLineGeo, tgtLineMat);
      scene.add(tgtLine);
    });

    // ── Network nodes (VPC, EIP, SG, NAT) — positioned above ──
    data.networkNodes.forEach((net, i) => {
      const angle = (i / Math.max(data.networkNodes.length, 1)) * Math.PI * 2;
      const x = Math.cos(angle) * 180;
      const y = 130 + Math.sin(angle) * 30;
      const z = Math.sin(i * 1.3) * 45;

      const netType = getNetworkNodeType(net.id || net.name);
      const { geo, label: typeLabel, color: baseColor } = getResourceGeometry(netType, THREE);
      const color = baseColor;

      const mat = new THREE.MeshStandardMaterial({
        color, metalness: 0.6, roughness: 0.4,
        emissive: color, emissiveIntensity: 0.3, transparent: true, opacity: 0.85,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color, opacity: 0.5, transparent: true })
      );
      edges.position.copy(mesh.position);
      scene.add(mesh);
      scene.add(edges);

      nodes3D.push({ mesh, edges, name: net.name, status: net.status, type: typeLabel, sourceLabel: net.source_label, baseColor });

      // Connect to target cloud
      const netLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(380, 0, 0),
      ]);
      const netLineMat = new THREE.LineDashedMaterial({ color, dashSize: 4, gapSize: 3, opacity: 0.3, transparent: true });
      const netLine = new THREE.Line(netLineGeo, netLineMat);
      netLine.computeLineDistances();
      scene.add(netLine);
    });

    // ── mig_worker — hexagonal cylinder near target ──
    if (data.migWorker) {
      const mwGeo = new THREE.CylinderGeometry(14, 14, 22, 6);
      const mwColor = 0xfbbf24;
      const mwMat = new THREE.MeshStandardMaterial({
        color: mwColor, metalness: 0.8, roughness: 0.2,
        emissive: mwColor, emissiveIntensity: 0.5,
      });
      const mwMesh = new THREE.Mesh(mwGeo, mwMat);
      mwMesh.position.set(320, 90, 40);
      scene.add(mwMesh);

      const mwEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mwGeo),
        new THREE.LineBasicMaterial({ color: mwColor, opacity: 0.7, transparent: true })
      );
      mwEdges.position.copy(mwMesh.position);
      scene.add(mwEdges);

      nodes3D.push({ mesh: mwMesh, edges: mwEdges, name: 'mig_worker', status: 'deployed', type: 'Worker', sourceLabel: data.migWorker.source_label, baseColor: mwColor });
    }

    // ── Hover detection ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredMesh = null;

    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = nodes3D.map(n => n.mesh);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const node = nodes3D.find(n => n.mesh === hit);
        if (node) {
          if (hoveredMesh !== hit) {
            if (hoveredMesh) hoveredMesh.scale.set(1, 1, 1);
            hit.scale.set(1.35, 1.35, 1.35);
            hoveredMesh = hit;
          }
          if (controls) controls.autoRotate = false;
          setTooltip({
            visible: true,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            text: `${node.name} [${node.type}]${node.status ? ` | ${node.status}` : ''}${node.sourceLabel ? ` | ${node.sourceLabel}` : ''}`,
          });
          return;
        }
      }
      if (hoveredMesh) { hoveredMesh.scale.set(1, 1, 1); hoveredMesh = null; }
      if (controls) controls.autoRotate = true;
      setTooltip({ visible: false, x: 0, y: 0, text: '' });
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // ── Animation loop ──
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (controls) controls.update();

      // Pulsing glow on server/resource nodes
      const t = Date.now() * 0.001;
      serverNodes.forEach((node, i) => {
        if (node.mesh.material) {
          node.mesh.material.emissiveIntensity = 0.25 + Math.sin(t + i * 0.4) * 0.15;
        }
        // Gentle floating for non-pending resources
        if (node.mesh) {
          node.mesh.position.y += Math.sin(t * 0.8 + i) * 0.08;
          if (node.edges) node.edges.position.y = node.mesh.position.y;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize handler ──
    const onResize = () => {
      const newW = container.clientWidth || 900;
      camera.aspect = newW / h;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, h);
    };
    window.addEventListener('resize', onResize);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) { if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose()); else obj.material.dispose(); }
      });
    };
  }, [threeReady, data, layout]);

  if (!hasData) return null;

  return (
    <Card
      title={
        <Space>
          <i className="fas fa-cube" style={{ color: '#818cf8' }} />
          <Text strong style={{ fontSize: 14 }}>3D Simulation Constellation</Text>
          <Tag color="blue">Three.js</Tag>
          {replayMode && (
            <Tag color="purple">
              {currentPhase} · Step {currentStep}/{totalSteps}
            </Tag>
          )}
        </Space>
      }
      styles={{ body: { padding: 0, position: 'relative' } }}
    >
      <div
        ref={containerRef}
        style={{ width: '100%', height: 550, borderRadius: '0 0 8px 8px', cursor: 'grab' }}
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

      {/* Legend — resource type shapes */}
      <div style={{ position: 'absolute', top: 10, left: 14, display: 'flex', gap: 10, flexWrap: 'wrap', zIndex: 10 }}>
        {[
          { label: 'ECS (Compute)', color: '#3b82f6', shape: '◼' },
          { label: 'RDS (Database)', color: '#10b981', shape: '◉' },
          { label: 'OBS (Storage)', color: '#f59e0b', shape: '◇' },
          { label: 'VPC', color: '#8b5cf6', shape: '⬡' },
          { label: 'EIP', color: '#fbbf24', shape: '●' },
          { label: 'SG', color: '#ef4444', shape: '◆' },
        ].map(leg => (
          <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: leg.color, fontSize: 12, fontWeight: 900 }}>{leg.shape}</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af' }}>{leg.label}</span>
          </div>
        ))}
      </div>

      {/* Status legend */}
      <div style={{ position: 'absolute', top: 38, left: 14, display: 'flex', gap: 10, flexWrap: 'wrap', zIndex: 10 }}>
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
        <span style={{ color: '#6b7280', fontSize: 9, fontWeight: 700 }}>{layout.sourceLabel || 'Source'}</span>
        <ArrowRightOutlined style={{ color: '#818cf8', fontSize: 12 }} />
        <span style={{ color: '#3b82f6', fontSize: 9, fontWeight: 700 }}>{layout.targetLabel || 'Huawei Cloud'}</span>
      </div>

      {/* Replay progress bar */}
      {replayMode && totalSteps > 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: '#1f2937', borderRadius: '0 0 8px 8px', zIndex: 10 }}>
          <div style={{
            width: `${(currentStep / totalSteps) * 100}%`, height: '100%',
            background: 'linear-gradient(90deg, #818cf8, #3b82f6)',
            borderRadius: '0 0 8px 8px', transition: 'width 0.3s ease',
          }} />
        </div>
      )}
    </Card>
  );
}

export default SimulationConstellation;
