import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Card, Spin, Space, Tag, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { buildConstellationData, computeConstellationLayout } from './AgenticOrchestrationPanel.jsx';

const { Text } = Typography;

// Three.js 3D Simulation Constellation
// Loaded dynamically via CDN — no npm dependency
function SimulationConstellation({ trace, resourceUsage, resources }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });
  const [threeReady, setThreeReady] = useState(false);

  const data = useMemo(() => buildConstellationData(trace, resourceUsage, resources), [trace, resourceUsage, resources]);
  const layout = useMemo(() => computeConstellationLayout(data), [data]);
  const hasData = data.servers.length > 0 || data.networkNodes.length > 0;

  // Load Three.js from CDN
  useEffect(() => {
    if (!hasData) return;
    if (window.THREE) { setThreeReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
      // Also load OrbitControls
      const ocScript = document.createElement('script');
      ocScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
      ocScript.onload = () => setThreeReady(true);
      document.head.appendChild(ocScript);
    };
    document.head.appendChild(script);
    return () => { /* CDN scripts persist — don't remove */ };
  }, [hasData]);

  // Build 3D scene
  useEffect(() => {
    if (!threeReady || !containerRef.current || !window.THREE) return;
    const THREE = window.THREE;
    const container = containerRef.current;
    const w = container.clientWidth || 900;
    const h = 500;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f1a);
    scene.fog = new THREE.Fog(0x0f0f1a, 200, 600);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000);
    camera.position.set(0, 50, 400);

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
      controls.autoRotateSpeed = 0.5;
      controls.minDistance = 150;
      controls.maxDistance = 800;
    }

    // Lights
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 150);
    scene.add(dirLight);
    const pointLight1 = new THREE.PointLight(0x818cf8, 1, 500);
    pointLight1.position.set(-300, 0, 0);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x3b82f6, 1, 500);
    pointLight2.position.set(300, 0, 0);
    scene.add(pointLight2);

    // Helper: color from status
    const colorMap = {
      success: 0x10b981, green: 0x10b981, ok: 0x10b981,
      running: 0xf59e0b, amber: 0xf59e0b, active: 0xf59e0b,
      failed: 0xef4444, red: 0xef4444, error: 0xef4444,
      deployed: 0x3b82f6, blue: 0x3b82f6,
      pending: 0x6b7280, gray: 0x6b7280,
    };
    const getColor = (status) => colorMap[status] || 0x6b7280;

    const nodes3D = []; // { mesh, name, status, sourceLabel }

    // ── Source cloud (left) ──
    const sourceGeo = new THREE.SphereGeometry(30, 32, 32);
    const sourceMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280, metalness: 0.3, roughness: 0.5,
      emissive: 0x6b7280, emissiveIntensity: 0.3, transparent: true, opacity: 0.4,
    });
    const sourceMesh = new THREE.Mesh(sourceGeo, sourceMat);
    sourceMesh.position.set(-350, 0, 0);
    scene.add(sourceMesh);
    nodes3D.push({ mesh: sourceMesh, name: `SOURCE: ${layout.sourceLabel || 'Source'}`, status: 'source', sourceLabel: '' });

    // ── Target cloud (right) ──
    const targetGeo = new THREE.SphereGeometry(30, 32, 32);
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, metalness: 0.3, roughness: 0.5,
      emissive: 0x3b82f6, emissiveIntensity: 0.4, transparent: true, opacity: 0.4,
    });
    const targetMesh = new THREE.Mesh(targetGeo, targetMat);
    targetMesh.position.set(350, 0, 0);
    scene.add(targetMesh);
    nodes3D.push({ mesh: targetMesh, name: `TARGET: ${layout.targetLabel || 'Huawei Cloud'}`, status: 'target', sourceLabel: '' });

    // ── Server nodes ──
    const serverCount = data.servers.length;
    data.servers.forEach((srv, i) => {
      const angle = (i / Math.max(serverCount, 1)) * Math.PI * 2;
      const radius = 150 + (i % 3) * 40;
      const x = Math.cos(angle) * radius * 0.8;
      const y = Math.sin(angle) * radius * 0.5;
      const z = (i % 5 - 2) * 30;

      const geo = new THREE.SphereGeometry(12, 24, 24);
      const color = getColor(srv.status);
      const mat = new THREE.MeshStandardMaterial({
        color, metalness: 0.7, roughness: 0.3,
        emissive: color, emissiveIntensity: 0.4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      nodes3D.push({ mesh, name: srv.name, status: srv.status, sourceLabel: srv.source_label });

      // Connection: source → server (dashed line)
      const srcLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-350, 0, 0),
        new THREE.Vector3(x, y, z),
      ]);
      const srcLineMat = new THREE.LineDashedMaterial({ color: 0x6b7280, dashSize: 5, gapSize: 3, opacity: 0.3, transparent: true });
      const srcLine = new THREE.Line(srcLineGeo, srcLineMat);
      srcLine.computeLineDistances();
      scene.add(srcLine);

      // Connection: server → target (solid line with glow)
      const tgtLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(350, 0, 0),
      ]);
      const tgtLineMat = new THREE.LineBasicMaterial({ color, opacity: 0.5, transparent: true });
      const tgtLine = new THREE.Line(tgtLineGeo, tgtLineMat);
      scene.add(tgtLine);
    });

    // ── Network nodes (octahedrons) ──
    data.networkNodes.forEach((net, i) => {
      const angle = (i / Math.max(data.networkNodes.length, 1)) * Math.PI * 2;
      const x = Math.cos(angle) * 200;
      const y = 120 + Math.sin(angle) * 40;
      const z = Math.sin(i) * 50;

      const geo = new THREE.OctahedronGeometry(8, 0);
      const color = getColor(net.status);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x8b5cf6, metalness: 0.6, roughness: 0.4,
        emissive: 0x8b5cf6, emissiveIntensity: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      nodes3D.push({ mesh, name: net.name, status: net.status, sourceLabel: net.source_label });
    });

    // ── mig_worker (hexagonal) ──
    if (data.migWorker) {
      const geo = new THREE.CylinderGeometry(15, 15, 20, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24, metalness: 0.8, roughness: 0.2,
        emissive: 0xfbbf24, emissiveIntensity: 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(300, 80, 50);
      scene.add(mesh);
      nodes3D.push({ mesh, name: 'mig_worker', status: 'deployed', sourceLabel: data.migWorker.source_label });
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
            hit.scale.set(1.3, 1.3, 1.3);
            hoveredMesh = hit;
          }
          if (controls) controls.autoRotate = false;
          setTooltip({
            visible: true,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            text: `${node.name}${node.status ? ` | ${node.status}` : ''}${node.sourceLabel ? ` | ${node.sourceLabel}` : ''}`,
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

      // Pulsing glow on server nodes
      const t = Date.now() * 0.001;
      data.servers.forEach((srv, i) => {
        const node = nodes3D.find(n => n.name === srv.name);
        if (node && node.mesh.material) {
          node.mesh.material.emissiveIntensity = 0.3 + Math.sin(t + i * 0.5) * 0.15;
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
        </Space>
      }
      styles={{ body: { padding: 0, position: 'relative' } }}
    >
      <div
        ref={containerRef}
        style={{ width: '100%', height: 500, borderRadius: '0 0 8px 8px', cursor: 'grab' }}
      />
      {tooltip.visible && (
        <div style={{
          position: 'absolute', left: tooltip.x + 15, top: tooltip.y + 15,
          background: 'rgba(15,15,26,0.95)', color: '#d1d5db', fontSize: 11,
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
      <div style={{ position: 'absolute', top: 10, left: 14, display: 'flex', gap: 12, flexWrap: 'wrap', zIndex: 10 }}>
        {[
          { label: 'Success', color: '#10b981' }, { label: 'Running', color: '#f59e0b' },
          { label: 'Failed', color: '#ef4444' }, { label: 'Deployed', color: '#3b82f6' },
        ].map(leg => (
          <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: leg.color, boxShadow: `0 0 6px ${leg.color}80` }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af' }}>{leg.label}</span>
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
    </Card>
  );
}

export default SimulationConstellation;
