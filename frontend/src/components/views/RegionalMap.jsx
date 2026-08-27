import React, { useState, useEffect, useMemo, useRef, useContext, useCallback } from 'react';
import { ERPContext } from '../../context/ERPContext';

/* ── helpers ─────────────────────────────────────────────────── */

const fm = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

const regionMeta = {
  'la-north-2':  { name: 'Mexico (la-north-2)',   hub: [23.6, -102.5], color: '#3b82f6', cities: ['Mexico City', 'Querétaro'] },
  'la-south-2':  { name: 'Chile (la-south-2)',     hub: [-33.4, -70.6], color: '#10b981', cities: ['Santiago'] },
  'sa-brazil-1': { name: 'Brazil (sa-brazil-1)',   hub: [-23.5, -46.6], color: '#8b5cf6', cities: ['São Paulo', 'Rio de Janeiro'] },
};

const countryCoords = {
  'Mexico': [23.6, -102.5], 'Guatemala': [15.8, -90.2], 'El Salvador': [13.8, -88.9],
  'Honduras': [15.2, -86.2], 'Nicaragua': [12.9, -85.2], 'Costa Rica': [9.7, -83.8],
  'Panama': [8.5, -80.8], 'Colombia': [4.6, -74.3], 'Venezuela': [6.4, -66.6],
  'Ecuador': [-1.8, -78.2], 'Peru': [-9.2, -75.0], 'Bolivia': [-16.3, -63.6],
  'Chile': [-35.7, -71.5], 'Argentina': [-38.4, -63.6], 'Uruguay': [-32.5, -55.8],
  'Paraguay': [-23.4, -58.4], 'Brazil': [-14.2, -51.9],
  'Dominican Republic': [18.7, -70.2], 'Cuba': [21.5, -77.8], 'Puerto Rico': [18.2, -66.6],
  'Jamaica': [18.1, -77.3], 'Trinidad and Tobago': [10.7, -61.2],
};

const getBusinessUnit = (c) => {
  if (c === 'Mexico') return 'Mexico BU';
  if (c === 'Brazil') return 'Brazil BU';
  if (['Chile', 'Argentina', 'Peru', 'Colombia', 'Ecuador', 'Bolivia', 'Uruguay', 'Paraguay', 'Venezuela'].includes(c)) return 'South America BU';
  return 'Multi-Country BU';
};

const getCloudRegion = (c) => {
  if (!c) return 'la-south-2';
  const l = c.toLowerCase();
  if (l.includes('mexico') || l.includes('guatemala') || l.includes('belize') || l.includes('el salvador') ||
      l.includes('honduras') || l.includes('nicaragua') || l.includes('costa') || l.includes('panama') ||
      l.includes('dominican') || l.includes('cuba') || l.includes('jamaica') || l.includes('puerto') ||
      l.includes('trinidad') || l.includes('caribbean')) return 'la-north-2';
  if (l.includes('brazil')) return 'sa-brazil-1';
  if (l.includes('argentina')) return 'la-south-2';
  return 'la-south-2';
};

const badge = (label, color) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-${color}-400/10 text-${color}-400 border border-${color}-400/20`}>{label}</span>
);

/* ── component ───────────────────────────────────────────────── */

export default function RegionalMap() {
  const { projects, customers } = useContext(ERPContext);

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [filterPhase, setFilterPhase] = useState('all');
  const [filterHealth, setFilterHealth] = useState('all');
  const [layers, setLayers] = useState({
    projects: true,
    regions: true,
    customers: true,
    arcs: false,
  });

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layerGroups = useRef({});

  /* ── data ── */

  const active = useMemo(() => (projects || []).filter(p => p && !p.isWaiting && !p.isDeleted), [projects]);

  const filtered = useMemo(() => {
    let list = active;
    if (filterPhase !== 'all') list = list.filter(p => (p.phase || '').toLowerCase() === filterPhase);
    if (filterHealth !== 'all') list = list.filter(p => (p.health || 'Green').toLowerCase() === filterHealth);
    return list;
  }, [active, filterPhase, filterHealth]);

  const countries = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      let c = p.country || 'Unknown';
      // Normalize missing/unknown countries
      if (c === '?' || c === 'Other / TBD' || c === 'Unknown' || !c.trim()) c = 'Unknown';
      // Try exact match first, then partial match
      if (!countryCoords[c]) {
        const partial = Object.keys(countryCoords).find(k =>
          c.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(c.toLowerCase())
        );
        if (partial) c = partial;
        else return; // Skip truly unmappable countries
      }
      if (!map[c]) map[c] = { name: c, coords: countryCoords[c], bu: getBusinessUnit(c), region: getCloudRegion(c), projects: [], mrr: 0, health: 'Green' };
      map[c].projects.push(p);
      map[c].mrr += Number(p.mrr) || 0;
      if (p.health === 'Red') map[c].health = 'Red';
      else if (p.health === 'Yellow' && map[c].health !== 'Red') map[c].health = 'Yellow';
    });
    return Object.values(map).sort((a, b) => b.mrr - a.mrr);
  }, [filtered]);

  /* ── Normalize a region string that may be comma-separated or non-standard ── */
  const normalizeRegion = (r) => {
    if (!r) return 'la-south-2';
    // If comma-separated, take the first valid one
    const parts = r.split(',').map(s => s.trim());
    for (const p of parts) {
      if (regionMeta[p]) return p;
    }
    // Partial match
    for (const p of parts) {
      const match = Object.keys(regionMeta).find(k => k.includes(p) || p.includes(k));
      if (match) return match;
    }
    return 'la-south-2';
  };

  const regionalCoverage = useMemo(() => {
    const cov = {};
    Object.keys(regionMeta).forEach(r => { cov[r] = { customers: 0, projects: 0, mrr: 0, credsConfigured: false }; });
    countries.forEach(c => {
      const r = c.region;
      if (cov[r]) { cov[r].projects += c.projects.length; cov[r].mrr += c.mrr; }
    });
    (customers || []).forEach(cust => {
      const r = normalizeRegion(cust.region);
      if (cov[r]) {
        cov[r].customers++;
        cov[r].credsConfigured = cov[r].credsConfigured || !!(cust.ak && cust.sk);
      }
    });
    return cov;
  }, [countries, customers]);

  const stats = useMemo(() => ({
    totalMrr: filtered.reduce((s, p) => s + (Number(p.mrr) || 0), 0),
    projectCount: filtered.length,
    countryCount: countries.length,
    activeProjects: active.length,
  }), [filtered, countries, active]);

  /* ── map layer builders ── */

  const buildProjectLayer = useCallback(() => {
    const g = L.featureGroup();
    countries.forEach(c => {
      const radius = Math.max(8, Math.min(30, 6 + c.projects.length * 2.5));
      const colors = { Green: '#10b981', Yellow: '#f59e0b', Red: '#ef4444' };
      const color = colors[c.health] || '#6b7280';
      L.circleMarker(c.coords, {
        radius, color, fillColor: color, fillOpacity: 0.35, weight: 2, opacity: 0.8,
      }).bindTooltip(`<b>${c.name}</b><br/>${c.projects.length} projects · ${fm(c.mrr)}`, { direction: 'top', offset: [0, -radius] })
        .on('click', () => { setSelectedCountry(c); setRightOpen(true); })
        .addTo(g);
    });
    return g;
  }, [countries]);

  const buildRegionLayer = useCallback(() => {
    const g = L.featureGroup();
    Object.entries(regionMeta).forEach(([key, r]) => {
      const cov = regionalCoverage[key];
      L.circle(r.hub, {
        radius: 500000, color: r.color, fillColor: r.color, fillOpacity: 0.08, weight: 1.5, dashArray: '5 8',
      }).bindTooltip(`<b>${r.name}</b><br/>${cov.projects} projects · ${fm(cov.mrr)} · ${cov.customers} customers`, { direction: 'center' })
        .on('click', () => { setSelectedRegion({ key, ...r, ...cov }); setRightOpen(true); })
        .addTo(g);

      // availability zones
      const azs = {
        'la-north-2': [[20.0, -100.0], [19.4, -99.1]],
        'la-south-2': [[-33.0, -71.5], [-33.4, -70.6]],
        'sa-brazil-1': [[-23.0, -46.0], [-22.9, -43.2]],
      };
      (azs[key] || []).forEach(([lat, lng]) => {
        L.circleMarker([lat, lng], { radius: 3, color: r.color, fillColor: r.color, fillOpacity: 0.6, weight: 1 })
          .addTo(g);
      });
    });
    return g;
  }, [regionalCoverage]);

  const buildCustomerLayer = useCallback(() => {
    const g = L.featureGroup();
    (customers || []).forEach(cust => {
      const r = normalizeRegion(cust.region);
      const meta = regionMeta[r];
      if (!meta) return;
      const hasCreds = !!(cust.ak && cust.sk);
      L.circleMarker(meta.hub, {
        radius: 5, color: hasCreds ? '#10b981' : '#f59e0b',
        fillColor: hasCreds ? '#10b981' : '#f59e0b', fillOpacity: 0.5, weight: 1.5,
      }).bindTooltip(`<b>${cust.name}</b><br/>${r}<br/>${hasCreds ? '✅ Keys configured' : '⚠️ No keys'}`, { direction: 'top' })
        .addTo(g);
    });
    return g;
  }, [customers]);

  const buildArcLayer = useCallback(() => {
    const g = L.featureGroup();
    countries.forEach(c => {
      const targetRegion = c.region;
      const targetHub = regionMeta[targetRegion]?.hub;
      if (!targetHub) return;
      const pts = [c.coords, targetHub];
      L.polyline(pts, {
        color: regionMeta[targetRegion]?.color || '#6b7280', weight: Math.max(0.5, c.projects.length * 0.4),
        opacity: 0.3, dashArray: '3 6',
      }).bindTooltip(`<b>${c.name} → ${regionMeta[targetRegion]?.name}</b><br/>${c.projects.length} projects`).addTo(g);
    });
    return g;
  }, [countries]);

  /* ── map lifecycle ── */

  useEffect(() => {
    if (typeof L === 'undefined' || !mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, { zoomControl: false, attributionControl: true, minZoom: 2 }).setView([0, -70], 3);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community',
      }).addTo(mapInstance.current);
      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
      ['projects', 'regions', 'customers', 'arcs'].forEach(k => { layerGroups.current[k] = L.featureGroup().addTo(mapInstance.current); });
      setTimeout(() => mapInstance.current?.invalidateSize(), 300);
    }

    const builders = { projects: buildProjectLayer, regions: buildRegionLayer, customers: buildCustomerLayer, arcs: buildArcLayer };
    Object.entries(builders).forEach(([k, fn]) => {
      if (layerGroups.current[k]) {
        layerGroups.current[k].clearLayers();
        if (layers[k]) fn().getLayers().forEach(l => layerGroups.current[k].addLayer(l));
      }
    });
  }, [layers, countries, regionalCoverage, customers, buildProjectLayer, buildRegionLayer, buildCustomerLayer, buildArcLayer]);

  /* ── panel handlers ── */

  const jumpToProject = (id) => {
    window.location.hash = `#phase=home&proj=${id}`;
  };

  /* ── render ── */

  return (
    <div className="animate-fade-in h-[calc(100vh-100px)] min-h-[700px] flex bg-slate-950 overflow-hidden">
      
      {/* ═══ LEFT PANEL ═══ */}
      <div className={`${leftOpen ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden bg-slate-900 border-r border-slate-800 flex flex-col shrink-0`}>
        <div className="p-5 space-y-5 flex-1 overflow-y-auto">
          {/* brand */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <i className="fas fa-globe-americas text-white text-sm"></i>
            </div>
            <div>
              <div className="text-sm font-black text-white tracking-tight">Regional Ops</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">LATAM Control Plane</div>
            </div>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Total MRR', fm(stats.totalMrr), 'cyan'],
              ['Projects', stats.projectCount, 'blue'],
              ['Countries', stats.countryCount, 'emerald'],
              ['Pipeline', stats.activeProjects, 'purple'],
            ].map(([label, val, color]) => (
              <div key={label} className="bg-slate-800 rounded-xl p-3">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
                <div className={`text-lg font-black text-${color}-400`}>{val}</div>
              </div>
            ))}
          </div>

          {/* filters */}
          <div>
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Filter by Phase</div>
            <div className="flex flex-wrap gap-1.5">
              {['all','prospect','planning','execution','live'].map(ph => (
                <button key={ph} onClick={() => setFilterPhase(ph)}
                  className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition ${filterPhase === ph ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                  {ph === 'all' ? 'All' : ph}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Filter by Health</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                ['all','All'],
                ['green','Healthy'],
                ['yellow','At Risk'],
                ['red','Critical'],
              ].map(([k, label]) => (
                <button key={k} onClick={() => setFilterHealth(k)}
                  className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition flex items-center gap-1 ${filterHealth === k ? 'bg-slate-700 text-white ring-1 ring-slate-600' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                  {k === 'green' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                  {k === 'yellow' && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                  {k === 'red' && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* layer toggles */}
          <div>
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Map Layers</div>
            <div className="space-y-1.5">
              {[
                ['projects','Projects by Country'],
                ['regions','Cloud Region Coverage'],
                ['customers','Customer Credentials'],
                ['arcs','Migration Arcs'],
              ].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300 hover:text-white transition-colors">
                  <input type="checkbox" checked={layers[k]} onChange={() => setLayers(prev => ({ ...prev, [k]: !prev[k] }))}
                    className="rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500/30" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* legend */}
          <div>
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Health Legend</div>
            <div className="flex gap-3">
              {[['Green','Healthy','emerald'],['Yellow','At Risk','amber'],['Red','Critical','rose']].map(([level,label,color]) => (
                <div key={level} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full bg-${color}-500`}></span>
                  <span className="text-[9px] font-bold text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* toggle button */}
        <button onClick={() => setLeftOpen(!leftOpen)}
          className="p-2 border-t border-slate-800 text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors">
          <i className={`fas fa-chevron-${leftOpen ? 'left' : 'right'} mr-1`}></i>
          {leftOpen ? 'Collapse' : 'Panel'}
        </button>
      </div>

      {/* ═══ MAP ═══ */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="absolute inset-0 bg-slate-950"></div>

        {/* floating summary pill */}
        <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl px-4 py-2.5 flex items-center gap-4 text-white shadow-lg">
          <div className="text-[10px] font-black text-cyan-400">{fm(stats.totalMrr)} <span className="text-slate-500 font-normal">MRR</span></div>
          <div className="w-px h-4 bg-slate-700"></div>
          <div className="text-[10px] font-black text-blue-400">{stats.projectCount} <span className="text-slate-500 font-normal">Projects</span></div>
          <div className="w-px h-4 bg-slate-700"></div>
          <div className="text-[10px] font-black text-emerald-400">{stats.countryCount} <span className="text-slate-500 font-normal">Countries</span></div>
        </div>

        {/* right panel toggle */}
        {!rightOpen && (
          <button onClick={() => setRightOpen(true)}
            className="absolute top-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors shadow-lg">
            <i className="fas fa-info-circle mr-1.5"></i> Details
          </button>
        )}
      </div>

      {/* ═══ RIGHT PANEL (drill-down) ═══ */}
      {rightOpen && (
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 overflow-hidden animate-slide-left">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <div className="text-xs font-black text-white uppercase tracking-wider">
              {selectedCountry ? selectedCountry.name : selectedRegion ? regionMeta[selectedRegion.key]?.name : 'Detail'}
            </div>
            <button onClick={() => { setRightOpen(false); setSelectedCountry(null); setSelectedRegion(null); }}
              className="text-slate-500 hover:text-white"><i className="fas fa-times"></i></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedCountry ? (
              <>
                {/* country detail */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['MRR', fm(selectedCountry.mrr), 'cyan'],
                      ['Projects', selectedCountry.projects.length, 'blue'],
                      ['Region', selectedCountry.region, 'purple'],
                      ['BU', selectedCountry.bu, 'emerald'],
                    ].map(([label, val, color]) => (
                      <div key={label} className="bg-slate-800 rounded-lg p-2.5">
                        <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
                        <div className={`text-sm font-black text-${color}-400 truncate`}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* credential check */}
                  {(() => {
                    const regionCusts = (customers || []).filter(c => (c.region || 'la-south-2') === selectedCountry.region);
                    const withCreds = regionCusts.filter(c => c.ak && c.sk).length;
                    return (
                      <div className={`rounded-lg p-3 ${withCreds > 0 ? 'bg-emerald-400/5 border border-emerald-400/20' : 'bg-amber-400/5 border border-amber-400/20'}`}>
                        <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                          <i className={`fas fa-${withCreds > 0 ? 'check-circle text-emerald-400' : 'exclamation-triangle text-amber-400'}`}></i>
                          {withCreds > 0
                            ? `${withCreds} customer${withCreds!==1?'s':''} with keys for ${selectedCountry.region}`
                            : `No credentials configured for ${selectedCountry.region}`}
                        </div>
                      </div>
                    );
                  })()}

                  {/* project list */}
                  <div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      Projects ({selectedCountry.projects.length})
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {selectedCountry.projects.map(p => (
                        <button key={p.id} onClick={() => jumpToProject(p.id)}
                          className="w-full text-left bg-slate-800 hover:bg-slate-750 rounded-lg p-3 transition-colors group">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${p.health === 'Red' ? 'bg-rose-500' : p.health === 'Yellow' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                            <span className="text-xs font-bold text-white flex-1 truncate">{p.name}</span>
                            <span className="text-[9px] font-black text-blue-400">{fm(p.mrr)}</span>
                          </div>
                          <div className="flex gap-2 mt-1.5">
                            <span className="text-[8px] text-slate-500">{p.sa || '—'}</span>
                            <span className="text-[8px] text-slate-600">·</span>
                            <span className="text-[8px] text-slate-500">{p.progress || '0%'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : selectedRegion ? (
              <>
                {/* region detail */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['Projects', selectedRegion.projects, 'blue'],
                      ['MRR', fm(selectedRegion.mrr), 'cyan'],
                      ['Customers', selectedRegion.customers, 'emerald'],
                      ['Keys', selectedRegion.credsConfigured ? 'Active' : 'None', selectedRegion.credsConfigured ? 'emerald' : 'amber'],
                    ].map(([label, val, color]) => (
                      <div key={label} className="bg-slate-800 rounded-lg p-2.5">
                        <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
                        <div className={`text-sm font-black text-${color}-400`}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* customers in this region */}
                  <div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Customers</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {(customers || []).filter(c => (c.region || 'la-south-2') === selectedRegion.key).map(cust => (
                        <div key={cust.id} className="bg-slate-800 rounded-lg p-2.5 flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{cust.name}</span>
                          {cust.ak && cust.sk
                            ? <span className="text-[8px] font-black text-emerald-400 uppercase">Keys OK</span>
                            : <span className="text-[8px] font-black text-amber-400 uppercase">No keys</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <button onClick={() => { setRightOpen(false); setSelectedCountry(null); setSelectedRegion(null); }}
            className="p-2 border-t border-slate-800 text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors">
            <i className="fas fa-times mr-1"></i> Close
          </button>
        </div>
      )}
    </div>
  );
}
