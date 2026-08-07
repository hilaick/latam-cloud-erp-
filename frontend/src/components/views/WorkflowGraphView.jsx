import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';

/**
 * MgC-Style Dependency Graph View
 * Maps dependencies between resources in the source environment.
 * Visual design: Huawei Cloud MgC color palette, orthogonal routing, rounded-rect nodes.
 */
export default function WorkflowGraphView({ projectData }) {
    const [deps, setDeps] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);

    // MgC color palette
    const colors = {
        compute: '#1476FC',
        database: '#30C0F5',
        network: '#85C536',
        storage: '#A156E6',
        container: '#F96D4E',
        default: '#1476FC'
    };

    useEffect(() => {
        async function fetchDeps() {
            try {
                const resp = await fetch('/api/resource-discovery/dependencies');
                const data = await resp.json();
                if (data.success) setDeps(data.dependencies);
            } catch {
                setDeps([]);
            }
        }
        if (projectData?.deps) {
            setDeps(projectData.deps);
        } else {
            fetchDeps();
        }
    }, [projectData]);

    const layout = useMemo(() => {
        if (!deps || deps.length === 0) return null;
        
        // Build node list from unique IDs in dependencies
        const nodeSet = new Map();
        deps.forEach(d => {
            if (!nodeSet.has(d.from)) nodeSet.set(d.from, { id: d.from, label: d.from, type: d.type || 'default' });
            if (!nodeSet.has(d.to)) nodeSet.set(d.to, { id: d.to, label: d.to, type: d.type || 'default' });
        });
        const nodes = Array.from(nodeSet.values());
        const nodeWidth = 180;
        const nodeHeight = 64;
        const gapX = 120;
        const gapY = 100;

        // Simple layout: left-to-right flow
        // Group by type, place vertically
        const nodeMap = {};
        nodes.forEach((n, i) => {
            nodeMap[n.id] = {
                x: i % 2 === 0 ? 100 : 380,
                y: Math.floor(i/2) * gapY + 80,
                ...n
            };
        });

        const edges = deps.map(d => ({
            from: nodeMap[d.from],
            to: nodeMap[d.to],
        }));

        return { nodes: nodeMap, edges, width: 600, height: Math.ceil(nodes.length/2) * gapY + 100 };
    }, [deps]);

    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    }, []);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    if (!layout) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                <div className="text-center">
                    <div className="animate-pulse w-12 h-12 mx-auto mb-3 rounded-full bg-slate-200" />
                    <p className="text-sm">Loading dependency graph...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            style={{ height: layout.height + 80 }}
        >
            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex gap-1.5">
                <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-2 rounded-lg bg-white/95 hover:bg-slate-100 border border-slate-200 shadow-sm"><ZoomIn size={16} /></button>
                <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.3))} className="p-2 rounded-lg bg-white/95 hover:bg-slate-100 border border-slate-200 shadow-sm"><ZoomOut size={16} /></button>
                <button onClick={() => setZoom(1)} className="p-2 rounded-lg bg-white/95 hover:bg-slate-100 border border-slate-200 shadow-sm"><RotateCcw size={16} /></button>
                <button onClick={toggleFullscreen} className="p-2 rounded-lg bg-white/95 hover:bg-slate-100 border border-slate-200 shadow-sm">
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
            </div>

            <div className="absolute top-4 left-4 z-10">
                <button className="px-3 py-1.5 rounded-lg bg-white/90 border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <ChevronLeft size={14} /> Source Environment
                </button>
            </div>

            <svg
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.3s ease' }}
                className="w-full h-full"
            >
                {/* Edges */}
                {layout.edges.map((edge, i) => {
                    const fx = edge.from.x + 90;
                    const fy = edge.from.y + 32;
                    const tx = edge.to.x;
                    const ty = edge.to.y + 32;
                    const mx = (fx + tx) / 2;
                    return (
                        <g key={i}>
                            <path
                                d={`M ${fx} ${fy} L ${mx} ${fy} L ${mx} ${ty} L ${tx} ${ty}`}
                                fill="none"
                                stroke="#cbd5e1"
                                strokeWidth={1.5}
                                markerEnd="url(#arrowhead)"
                            />
                        </g>
                    );
                })}

                <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                    </marker>
                </defs>

                {/* Nodes */}
                {Object.values(layout.nodes).map(node => {
                    const catColor = colors[node.type] || colors.default;
                    return (
                        <g key={node.id}>
                            <rect
                                x={node.x}
                                y={node.y}
                                width={180}
                                height={64}
                                rx={12}
                                fill={catColor + '10'}
                                stroke={catColor}
                                strokeWidth={1.5}
                            />
                            <text
                                x={node.x + 12}
                                y={node.y + 28}
                                className="text-sm font-bold"
                                fill={catColor}
                            >
                                {node.label}
                            </text>
                            <text
                                x={node.x + 12}
                                y={node.y + 48}
                                className="text-[11px]"
                                fill="#64748b"
                            >
                                {node.type}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 flex gap-4">
                {Object.entries(colors).filter(([cat]) => layout.edges.some(e => e.from.type === cat || e.to.type === cat)).map(([cat, color]) => (
                    <div key={cat} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                        <span className="text-[10px] text-slate-500 capitalize">{cat}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
