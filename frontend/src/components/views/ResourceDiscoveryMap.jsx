import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

/**
 * MgC Resource Discovery Topology Map
 * Visualizes discovered resources from a migration source environment
 * Design: Huawei Cloud MgC-style with orthogonal routing, rounded-rect nodes, layered swimlanes
 */
export default function ResourceDiscoveryMap({ projectData, compact = false }) {
    const [resources, setResources] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);
    const svgRef = useRef(null);

    // MgC color palette
    const colors = {
        compute: '#1476FC',   // Huawei Blue — ECS, bare metal
        database: '#30C0F5',  // Cyan — RDS, databases
        network: '#85C536',   // Green — VPC, subnets
        storage: '#A156E6',   // Purple — OBS, file storage
        container: '#F96D4E', // Orange — containers, K8s
        default: '#1476FC'
    };

    const nodeRadius = 28;
    const nodeGap = 80;

    useEffect(() => {
        async function fetchData() {
            const resp = await fetch('/api/resource-discovery/summary');
            const data = await resp.json();
            setResources(data.resources || []);
        }
        if (projectData?.resources) {
            setResources(projectData.resources);
        } else {
            fetchData().catch(() => setResources([]));
        }
    }, [projectData]);

    const layout = useMemo(() => {
        if (!resources || resources.length === 0) return null;

        // Group by resource category
        const categories = {
            Compute: resources.filter(r => ['ECS','BMS','VMware','Compute'].includes(r.type)),
            Database: resources.filter(r => ['RDS','Database','MySQL','PostgreSQL','Oracle'].includes(r.type)),
            Network: resources.filter(r => ['VPC','Subnet','VPN','Direct Connect'].includes(r.type)),
            Storage: resources.filter(r => ['OBS','S3','File Storage','NFS'].includes(r.type)),
            Container: resources.filter(r => ['K8s','Docker','Container'].includes(r.type))
        };

        // Remove empty categories
        const activeCategories = Object.entries(categories).filter(([_, items]) => items.length > 0);
        if (activeCategories.length === 0) activeCategories.push(['Compute', resources]);

        const totalWidth = activeCategories.length * 220;
        const maxNodesInCategory = Math.max(...activeCategories.map(([_, items]) => items.length));
        const totalHeight = maxNodesInCategory * (nodeRadius * 2 + nodeGap) + 80;

        const nodes = [];
        const edges = [];
        let centerX = 120;
        const centerY = totalHeight / 2;

        activeCategories.forEach(([category, items], catIndex) => {
            const catColor = colors[category.toLowerCase()] || colors.default;
            const startY = centerY - ((items.length - 1) * (nodeRadius * 2 + nodeGap)) / 2;

            items.forEach((resource, i) => {
                const y = startY + i * (nodeRadius * 2 + nodeGap);
                nodes.push({
                    id: resource.id,
                    name: resource.name || resource.id,
                    type: resource.type,
                    x: centerX + catIndex * 220,
                    y,
                    color: catColor,
                    category
                });
            });

            // Connect to next category
            if (catIndex < activeCategories.length - 1) {
                edges.push({
                    from: nodes[nodes.length - items.length].id,
                    to: nodes[nodes.length - 1].id,
                    fromX: centerX + catIndex * 220 + nodeRadius,
                    fromY: startY,
                    toX: centerX + (catIndex + 1) * 220 - nodeRadius,
                    toY: startY
                });
            }
        });

        return { nodes, edges, width: totalWidth, height: totalHeight };
    }, [resources]);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.3));
    const handleReset = () => setZoom(1);

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
                    <div className="animate-pulse w-12 h-12 mx-auto mb-3 rounded-full bg-slate-700" />
                    <p className="text-sm">Loading resource map...</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className={`relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${compact ? 'h-64' : 'h-96'}`}
        >
            {/* Toolbar */}
            <div className="absolute top-3 right-3 z-10 flex gap-1">
                <button onClick={handleZoomIn} className="p-1.5 rounded-md bg-white/90 hover:bg-slate-100 border border-slate-200 shadow-sm" title="Zoom in">
                    <ZoomIn size={16} />
                </button>
                <button onClick={handleZoomOut} className="p-1.5 rounded-md bg-white/90 hover:bg-slate-100 border border-slate-200 shadow-sm" title="Zoom out">
                    <ZoomOut size={16} />
                </button>
                <button onClick={handleReset} className="p-1.5 rounded-md bg-white/90 hover:bg-slate-100 border border-slate-200 shadow-sm" title="Reset view">
                    <RotateCcw size={16} />
                </button>
                <button onClick={toggleFullscreen} className="p-1.5 rounded-md bg-white/90 hover:bg-slate-100 border border-slate-200 shadow-sm" title="Fullscreen">
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
            </div>

            <svg 
                ref={svgRef}
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.3s ease' }}
                className="w-full h-full"
            >
                {/* Connection lines — orthogonal routing */}
                {layout.edges.map((edge, i) => (
                    <g key={i}>
                        {/* Horizontal segment */}
                        <line
                            x1={edge.fromX}
                            y1={edge.fromY}
                            x2={edge.toX}
                            y2={edge.toY}
                            stroke="#cbd5e1"
                            strokeWidth={1.5}
                        />
                        {/* Arrowhead */}
                        <polygon
                            points={`${edge.toX - 8},${edge.toY - 4} ${edge.toX},${edge.toY} ${edge.toX - 8},${edge.toY + 4}`}
                            fill="#94a3b8"
                        />
                    </g>
                ))}

                {/* Category labels */}
                {['Compute','Database','Network','Storage','Container'].map((cat, i) => (
                    layout.nodes.some(n => n.category === cat) && (
                        <text
                            key={cat}
                            x={120 + i * 220}
                            y={20}
                            textAnchor="middle"
                            className="text-xs font-semibold"
                            fill="#64748b"
                        >
                            {cat}
                        </text>
                    )
                ))}

                {/* Resource nodes */}
                {layout.nodes.map(node => (
                    <g key={node.id}>
                        {/* Outer ring */}
                        <circle
                            cx={node.x}
                            cy={node.y}
                            r={nodeRadius}
                            fill={node.color + '15'}
                            stroke={node.color}
                            strokeWidth={2}
                        />
                        {/* Inner circle */}
                        <circle
                            cx={node.x}
                            cy={node.y}
                            r={nodeRadius - 6}
                            fill={node.color + '25'}
                        />
                        {/* Resource type abbreviation */}
                        <text
                            x={node.x}
                            y={node.y + 1}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="text-xs font-bold"
                            fill={node.color}
                        >
                            {node.type?.substring(0, 3).toUpperCase()}
                        </text>
                        {/* Resource name */}
                        <text
                            x={node.x}
                            y={node.y + nodeRadius + 14}
                            textAnchor="middle"
                            className="text-[10px]"
                            fill="#334155"
                        >
                            {node.name?.length > 12 ? node.name.substring(0, 11) + '…' : node.name}
                        </text>
                    </g>
                ))}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex gap-3">
                {Object.entries(colors).filter(([cat]) => layout.nodes.some(n => n.category.toLowerCase() === cat)).map(([cat, color]) => (
                    <div key={cat} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[10px] text-slate-500">{cat}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
