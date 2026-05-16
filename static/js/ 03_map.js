function GeospatialMap({ projects }) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersLayer = useRef(null);

    const countryCoords = {
        'Mexico': [23.6345, -102.5528], 'Panama': [8.5379, -80.7821], 'Guatemala': [15.7834, -90.2307],
        'Colombia': [4.5709, -74.2973], 'Chile': [-35.6751, -71.5429], 'Peru': [-9.1899, -75.0152],
        'Argentina': [-38.4161, -63.6167], 'Brazil': [-14.2350, -51.9253], 'Costa Rica': [9.7489, -83.7534], 'Ecuador': [-1.8312, -78.1834]
    };

    const fm = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num || 0);

    const getBusinessUnit = (country) => {
        const multiCountry = ['Panama', 'Guatemala', 'Costa Rica', 'El Salvador', 'Honduras', 'Nicaragua', 'Dominican Republic', 'Puerto Rico'];
        if (country === 'Mexico') return 'Mexico Region';
        if (multiCountry.includes(country)) return 'Multi-Country Region';
        if (country === 'Brazil') return 'Brazil Region';
        return 'South America Region'; 
    };

    const mapData = useMemo(() => {
        const active = (projects || []).filter(p => p && !p.isWaiting);
        const aggregated = {};
        let totalMrr = 0;
        const buSet = new Set();
        
        active.forEach(p => {
            const c = p.country || 'Unknown';
            const bu = getBusinessUnit(c);
            buSet.add(bu);

            if (!countryCoords[c]) return; 
            if (!aggregated[c]) aggregated[c] = { name: c, bu: bu, coords: countryCoords[c], projects: [], totalMrr: 0, worstHealth: 'Green' };
            
            aggregated[c].projects.push(p);
            aggregated[c].totalMrr += Number(p.mrr) || 0;
            totalMrr += Number(p.mrr) || 0;
            
            if (p.health === 'Red') aggregated[c].worstHealth = 'Red';
            else if (p.health === 'Yellow' && aggregated[c].worstHealth !== 'Red') aggregated[c].worstHealth = 'Yellow';
        });
        
        return { regions: Object.values(aggregated), totalMrr, count: active.length, buCount: buSet.size };
    }, [projects]);

    useEffect(() => {
        if (typeof L === 'undefined') return;

        if (mapRef.current && !mapInstance.current) {
            mapInstance.current = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([4.5709, -74.2973], 4); 
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: '&copy; CartoDB' }).addTo(mapInstance.current);
            L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
            markersLayer.current = L.featureGroup().addTo(mapInstance.current);
            setTimeout(() => { if(mapInstance.current) mapInstance.current.invalidateSize(); }, 250);
        }

        if (mapInstance.current && markersLayer.current) {
            markersLayer.current.clearLayers();
            mapData.regions.forEach(region => {
                let coreColor = "bg-cyan-500 shadow-[0_0_12px_#06b6d4]"; let pingColor = "bg-cyan-400";
                if (region.worstHealth === 'Red') { coreColor = "bg-rose-600 shadow-[0_0_12px_#e11d48]"; pingColor = "bg-rose-500"; }
                else if (region.worstHealth === 'Yellow') { coreColor = "bg-amber-400 shadow-[0_0_12px_#fbbf24]"; pingColor = "bg-amber-300"; }

                const htmlIcon = L.divIcon({
                    className: 'custom-beacon',
                    html: `<div class="relative flex items-center justify-center w-8 h-8"><span class="animate-ping absolute inline-flex h-full w-full rounded-full ${pingColor} opacity-75"></span><span class="relative inline-flex rounded-full h-3.5 w-3.5 ${coreColor} border-2 border-slate-900"></span></div>`,
                    iconSize: [32, 32], iconAnchor: [16, 16]
                });

                let popupHTML = `<div class="p-4 w-64"><div class="border-b border-slate-700 pb-2 mb-3"><h4 class="font-black text-sm uppercase tracking-widest text-white">${region.name}</h4><div class="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1">${region.bu}</div><div class="text-xs text-slate-400 font-bold mt-1">Aggregated MRR: <span class="text-cyan-400">${fm(region.totalMrr)}</span></div></div><div class="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">`;
                region.projects.forEach(p => {
                    let dot = '#06b6d4'; if(p.health==='Red') dot = '#e11d48'; if(p.health==='Yellow') dot = '#fbbf24';
                    popupHTML += `<div class="bg-slate-800/80 p-2 rounded border border-slate-700 flex justify-between items-center"><div class="truncate pr-2"><div class="text-[10px] font-bold text-white flex items-center"><span class="w-2 h-2 rounded-full inline-block mr-1.5" style="background:${dot}"></span>${p.name || 'Unknown'}</div><div class="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">${p.sa || ''}</div></div><div class="text-[10px] font-black text-slate-300">${p.progress || ''}</div></div>`;
                });
                popupHTML += `</div></div>`;

                L.marker(region.coords, { icon: htmlIcon }).bindPopup(popupHTML).addTo(markersLayer.current);
            });
        }
    }, [mapData]);

    useEffect(() => { return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } }; }, []);

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-140px)] min-h-[800px] pb-6">
            <div className="w-full lg:w-80 bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-6 flex flex-col text-white shrink-0 h-auto lg:h-full">
                <h2 className="font-black text-sm uppercase tracking-widest text-slate-300 flex items-center mb-6 border-b border-slate-800 pb-4"><i className="fas fa-globe-americas text-blue-400 mr-3 text-xl"></i> Operations Node</h2>
                <div className="space-y-6 flex-1">
                    <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 shadow-inner"><div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Total Network MRR</div><div className="text-4xl font-black text-cyan-400">{fm(mapData.totalMrr)}</div></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 text-center shadow-inner"><div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-2">Business Units</div><div className="text-3xl font-black text-blue-300">{mapData.buCount}</div></div>
                        <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 text-center shadow-inner"><div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-2">Geographies</div><div className="text-3xl font-black text-blue-300">{mapData.regions.length}</div></div>
                    </div>
                    <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 text-center shadow-inner"><div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Active Projects</div><div className="text-3xl font-black text-blue-300">{mapData.count}</div></div>
                </div>
            </div>
            <div className="flex-1 rounded-2xl shadow-xl overflow-hidden border border-slate-300 bg-slate-900 relative min-h-[500px] w-full flex flex-col">
                <div ref={mapRef} className="absolute inset-0 bg-slate-950"></div>
            </div>
        </div>
    )
}