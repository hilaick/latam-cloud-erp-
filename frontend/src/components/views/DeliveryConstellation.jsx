import React, { useState, useEffect, useRef, useMemo } from 'react';

/* ═══════════════════════════════════════════════
   DELIVERY CONSTELLATION — 5-phase methodology
   Dynamic: parses n8n workflow API response.
   Falls back to static PHASES if no workflow prop.
   ═══════════════════════════════════════════════ */

/* ─── Default icons for phases 1→5 ─── */
const PHASE_ICONS = ['fa-handshake','fa-drafting-compass','fa-tasks','fa-play-circle','fa-clipboard-check'];
const PHASE_COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#6366f1'];

/* ─── Static fallback (used when no workflow prop) — operational PM framework ─── */
const STATIC_PHASES = [
  { id:'phase_1', label:'ARB Handover',          summary:'ARB intake, SOW, and high-level project scoping',           color:PHASE_COLORS[0], icon:PHASE_ICONS[0], gates:['ARB Intake & SOW signed','High-Level WBS (Sales) approved'] },
  { id:'phase_2', label:'Architecture',           summary:'Source discovery, risk profiling, and target topology design', color:PHASE_COLORS[1], icon:PHASE_ICONS[1], gates:['Architecture Summary complete','Source Discovery (MgC) executed','ORA Risk Profile assessed','Target Topology Mapped','DTRB Governance approved'] },
  { id:'phase_3', label:'Planning',               summary:'Delivery physics, FinOps budgeting, and wave planning',       color:PHASE_COLORS[2], icon:PHASE_ICONS[2], gates:['WBS & RACI Matrix defined','Physics Engine calibrated','FinOps Budget & Burn approved','Strategic Tooling selected','Wave & Runbook planned'] },
  { id:'phase_4', label:'Execution',              summary:'Pipeline execution, engineering workbench, and TAM governance', color:PHASE_COLORS[3], icon:PHASE_ICONS[3], gates:['Readiness Gateway passed','Execution Pipeline active','Engineering Workbench online','Delivery Command Center staffed','TAM Service Governance running'] },
  { id:'phase_5', label:'Post-Live',              summary:'Infrastructure reconciliation, sign-off, and procurement handover', color:PHASE_COLORS[4], icon:PHASE_ICONS[4], gates:['3-Way Infrastructure Diff complete','Target Constellation verified','WAR Sign-Off obtained','Procurement & PO Handover executed'] },
];

/* ─── Parse n8n workflow JSON → phase array ─── */
function parseWorkflow(workflow) {
  if (!workflow || !workflow.nodes) return null;

  const phases = {};
  const nodes = workflow.nodes;

  // First pass: extract headers
  for (const n of nodes) {
    if (n.type === 'phase-header') {
      const p = n.data?.phase ?? parseInt(n.id.match(/\d+/)?.[0] ?? 0);
      if (!p) continue;
      phases[p] = {
        id: n.id,
        label: n.name.replace(/^Phase \d+:\s*/i, ''),
        summary: n.data?.summary ?? '',
        color: n.data?.color ?? PHASE_COLORS[(p-1)%5],
        icon: PHASE_ICONS[(p-1)%5],
        gates: [],
        phaseNum: p,
      };
    }
  }

  // Second pass: collect gates
  for (const n of nodes) {
    if (n.type !== 'phase-gate') continue;
    const p = n.data?.phase ?? parseInt(n.id.match(/\d+/)?.[0] ?? 0);
    if (!p || !phases[p]) continue;
    const gi = n.data?.gate_index ?? phases[p].gates.length;
    // Ensure array has room
    while (phases[p].gates.length <= gi) phases[p].gates.push('');
    phases[p].gates[gi] = n.name;
  }

  // Sort by phase number, return ordered array
  const result = Object.values(phases).filter(p=>p.gates.length>0);
  result.sort((a,b)=>a.phaseNum-b.phaseNum);
  return result.length>=2 ? result : null; // need at least 2 phases
}

/* ─── Spatial layout ─── */
const W=1200, H=750, CX=W/2, CY=H/2, RING_R=260, GATE_R=110;
const polar = (a,r,cx=CX,cy=CY)=>({x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r});

function computeLayout(phases) {
  const count = phases.length;
  const hubs = phases.map((p,i)=>{
    const a = -Math.PI/2 + 2*Math.PI*i/count;
    const pos = polar(a, RING_R);
    return {...p, x:pos.x, y:pos.y, angle:a, index:i};
  });

  const allNodes = [], allEdges = [];
  let globalIdx = 0;

  hubs.forEach((hub)=>{
    hub.gates.forEach((gateName, gi)=>{
      const gc = hub.gates.length, start = hub.angle-0.5, arc=1.0;
      const step = gc>1 ? arc/(gc-1) : 0;
      const gAngle = start + step*gi;
      const pos = polar(gAngle, GATE_R, hub.x, hub.y);

      const node = {
        id:`${hub.id}_g${gi}`, label:gateName, phaseId:hub.id, phaseLabel:hub.label,
        phaseIndex:hub.index, gateIndex:gi, isLast:gi===gc-1,
        color:hub.color, icon:hub.icon,
        x:pos.x, y:pos.y, globalIndex:globalIdx++
      };
      allNodes.push(node);

      if(gi===0){
        allEdges.push({id:`${hub.id}_h2g0`, from:{x:hub.x,y:hub.y}, to:{x:pos.x,y:pos.y}, color:hub.color, type:'internal'});
      }else{
        const prev = allNodes.find(n=>n.phaseId===hub.id && n.gateIndex===gi-1);
        if(prev) allEdges.push({id:`${hub.id}_g${gi-1}2g${gi}`, from:{x:prev.x,y:prev.y}, to:{x:pos.x,y:pos.y}, color:hub.color, type:'internal'});
      }
    });

    const nextHub = hubs[(hub.index+1)%hubs.length];
    const lastGate = allNodes.find(n=>n.phaseId===hub.id && n.isLast);
    if(lastGate) allEdges.push({id:`${hub.id}_2_${nextHub.id}`, from:{x:lastGate.x,y:lastGate.y}, to:{x:nextHub.x,y:nextHub.y}, color:hub.color, type:'cross'});
  });

  return {hubs, allNodes, allEdges};
}

/* ─── Main component ─── */
export default function DeliveryConstellation({ workflow, compact }) {
  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({x:0,y:0});
  const [drag, setDrag] = useState(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Compute phases: dynamic from workflow, else static fallback
  const phases = useMemo(()=>{
    const parsed = parseWorkflow(workflow);
    return parsed ?? STATIC_PHASES;
  }, [workflow]);

  const {hubs, allNodes, allEdges} = useMemo(()=>computeLayout(phases), [phases]);
  const total = allNodes.length;
  const current = step>0 ? allNodes[Math.min(step-1, total-1)] : null;

  // Pan
  const onMD = e=>setDrag({sx:e.clientX-pan.x, sy:e.clientY-pan.y});
  const onMM = e=>{if(drag)setPan({x:e.clientX-drag.sx, y:e.clientY-drag.sy})};
  const onMU = ()=>setDrag(null);

  // Playback
  useEffect(()=>{
    if(!playing||step>=total){if(step>=total)setPlaying(false);return;}
    const t=setTimeout(()=>setStep(s=>s+1), 400);
    return ()=>clearTimeout(t);
  },[playing,step,total]);

  // ESC to exit fullscreen
  useEffect(()=>{
    const esc = e=>{if(e.key==='Escape')setFullscreen(false);};
    if(fullscreen) window.addEventListener('keydown',esc);
    return ()=>window.removeEventListener('keydown',esc);
  },[fullscreen]);

  const baseH = compact ? '58vh' : '78vh';
  const containerH = fullscreen ? '100vh' : baseH;

  const content = (
    <div
      style={{
        width:'100%', height:containerH,
        background:'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1a 100%)',
        borderRadius: fullscreen ? 0 : 24,
        overflow:'hidden', position:'relative',
        cursor:drag?'grabbing':'grab', userSelect:'none',
      }}
      onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
    >
      {/* ─── Controls bar ─── */}
      <div style={{position:'absolute',top:16,left:16,zIndex:30,display:'flex',gap:8,flexWrap:'wrap'}}>
        <button onClick={()=>{setStep(0);setPlaying(true);}} disabled={playing}
          style={btnStyle(playing?'#374151':'#4f46e5','white',playing?0.6:1,playing)}>
          <i className="fas fa-play mr-1.5"/>{playing ? 'Playing…' : 'Play Guided Tour'}
        </button>
        {playing && (
          <button onClick={()=>setPlaying(false)}
            style={btnStyle('#f59e0b','#111827',1)}>
            <i className="fas fa-pause mr-1.5"/>Pause
          </button>
        )}
        <button onClick={()=>{setPlaying(false); setStep(s=>Math.min(total,s+1));}}
          style={btnStyle('#1f2937','#d1d5db',1)}>
          <i className="fas fa-step-forward mr-1.5"/>Step
        </button>
        <button onClick={()=>{setStep(total);setPlaying(false);}}
          style={btnStyle('#1f2937','#d1d5db',1)}>
          <i className="fas fa-eye mr-1.5"/>Show All
        </button>
        <button onClick={()=>{setStep(0);setPlaying(false);}}
          style={btnStyle('#1f2937','#d1d5db',1)}>
          <i className="fas fa-undo mr-1.5"/>Reset
        </button>
        <button onClick={()=>setFullscreen(f=>!f)}
          style={btnStyle(fullscreen?'#4f46e5':'#1f2937',fullscreen?'white':'#d1d5db',1)}>
          <i className={`fas fa-${fullscreen?'compress':'expand'} mr-1.5`}/>
          {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>

      {/* ─── Zoom ─── */}
      <div style={{position:'absolute',bottom:16,right:16,zIndex:30,display:'flex',gap:4}}>
        <button onClick={()=>setZoom(z=>Math.max(0.3,z-0.15))} style={zBtn}>−</button>
        <div style={zLbl}>{Math.round(zoom*100)}%</div>
        <button onClick={()=>setZoom(z=>Math.min(3,z+0.15))} style={zBtn}>+</button>
        <button onClick={()=>{setZoom(0.75);setPan({x:0,y:0});}} style={{...zBtn,width:36}}>
          <i className="fas fa-sync-alt"/>
        </button>
      </div>

      {/* ─── Step indicator ─── */}
      <div style={{position:'absolute',bottom:16,left:16,zIndex:30}}>
        <div style={{fontSize:10,fontWeight:800,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>
          Step {step}/{total}
        </div>
        <div style={{width:200,height:4,background:'#1f2937',borderRadius:2,overflow:'hidden'}}>
          <div style={{width:`${(step/total)*100}%`,height:'100%',background:'#6366f1',transition:'width 0.3s'}}/>
        </div>
        {current && (
          <div style={{
            marginTop:10, background:'#111827ee', backdropFilter:'blur(8px)',
            border:'1px solid #374151', borderRadius:12, padding:'8px 14px', maxWidth:260,
          }}>
            <div style={{fontSize:8,fontWeight:800,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em'}}>
              Phase {current.phaseIndex+1} — {current.phaseLabel}
            </div>
            <div style={{fontSize:11,fontWeight:800,color:current.color,marginTop:2}}>
              Step #{current.globalIndex+1}: {current.label}
            </div>
          </div>
        )}
      </div>

      {/* ─── Constellation stage ─── */}
      <div style={{
        position:'absolute',inset:0,
        transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
        transformOrigin:'center center',
        transition:drag?'none':'transform 0.25s ease-out',
      }}>
        <div style={{width:W,height:H,position:'relative',margin:'auto'}}>

          {/* SVG edges */}
          <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}
            style={{position:'absolute',inset:0,overflow:'visible',pointerEvents:'none'}}>

            <polygon points={hubs.map(h=>`${h.x},${h.y}`).join(' ')}
              fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="6 4" opacity="0.25"/>

            {allEdges.map(edge=>{
              if(edge.type==='cross'){
                const srcGate = allNodes.find(n=>n.phaseId===edge.id.split('_2_')[0] && n.isLast);
                if(!srcGate || allNodes.indexOf(srcGate)>=step) return null;
              }else{
                const parts = edge.id.match(/_g(\d+)2g(\d+)$/);
                if(parts){
                  const phaseId = edge.id.split('_g')[0];
                  const targetGate = allNodes.find(n=>n.phaseId===phaseId && n.gateIndex===parseInt(parts[2]));
                  if(targetGate && allNodes.indexOf(targetGate)>=step) return null;
                }
              }
              return <line key={edge.id} x1={edge.from.x} y1={edge.from.y} x2={edge.to.x} y2={edge.to.y}
                stroke={edge.color} strokeWidth={edge.type==='cross'?2.5:1.5}
                strokeDasharray={edge.type==='cross'?'5 3':undefined}
                opacity={edge.type==='cross'?0.6:0.4}
                style={{filter:`drop-shadow(0 0 6px ${edge.color}40)`}}/>;
            })}

            {current && (
              <circle cx={current.x} cy={current.y} r={14} fill="none"
                stroke={current.color} strokeWidth="1.5" opacity="0.6"
                style={{animation:'pulse-ring 1.2s ease-out infinite'}}/>
            )}
          </svg>

          {/* Phase hubs */}
          {hubs.map(hub=>{
            const revealed = step>0;
            const active = current && current.phaseId===hub.id;
            return (
              <div key={hub.id} style={{
                position:'absolute', left:hub.x-50, top:hub.y-50, width:100, height:100,
                borderRadius:28, background:`${hub.color}18`,
                border:`2px solid ${active?hub.color:`${hub.color}50`}`,
                boxShadow:active?`0 0 35px ${hub.color}40, inset 0 0 20px ${hub.color}15`
                  :revealed?`0 0 20px ${hub.color}20`:'none',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3,
                opacity:revealed?1:0.25, transition:'opacity 0.4s, box-shadow 0.4s, border-color 0.3s',
                zIndex:10, pointerEvents:'auto', cursor:'default',
              }}>
                <div style={{
                  position:'absolute', top:-8, right:-8,
                  width:22, height:22, borderRadius:11,
                  background:hub.color, color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:900,
                  boxShadow:`0 0 10px ${hub.color}60`,
                  opacity:revealed?1:0, transition:'opacity 0.4s',
                }}>
                  {hub.index+1}
                </div>
                <i className={`fas ${hub.icon}`} style={{fontSize:20,color:hub.color}}/>
                <span style={{fontSize:7,fontWeight:900,color:hub.color,textTransform:'uppercase',
                  letterSpacing:'0.05em',textAlign:'center',lineHeight:1.2,maxWidth:85}}>
                  {hub.label}
                </span>
              </div>
            );
          })}

          {/* Central core */}
          {step>0 && (
            <div style={{
              position:'absolute', left:CX-35, top:CY-35, width:70, height:70,
              borderRadius:22, background:'rgba(99,102,241,0.12)',
              border:'2px solid rgba(99,102,241,0.5)',
              boxShadow:'0 0 40px rgba(99,102,241,0.25)',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
              zIndex:15,
            }}>
              <i className="fas fa-cloud" style={{fontSize:18,color:'#818cf8'}}/>
              <span style={{fontSize:7,fontWeight:900,color:'#a5b4fc',textTransform:'uppercase',letterSpacing:'0.04em'}}>
                LATAM ERP
              </span>
            </div>
          )}

          {/* Sub-gate nodes — tooltip shows only step info */}
          {allNodes.map((node,i)=>{
            if(i>=step) return null;
            const isCurrent = i===step-1;
            const r = isCurrent ? 10 : 7;
            return (
              <div key={node.id} style={{
                position:'absolute', left:node.x-r, top:node.y-r,
                width:r*2, height:r*2, borderRadius:'50%',
                background:node.color,
                boxShadow:isCurrent?`0 0 18px ${node.color}90, 0 0 35px ${node.color}30`:`0 0 10px ${node.color}50`,
                zIndex:isCurrent?25:20,
                cursor:'pointer',
                transition:'all 0.2s',
                animation:isCurrent?'node-pulse 0.8s ease-out':undefined,
              }}
                title={`Step #${node.globalIndex+1}: ${node.label}`}
                onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.9)';}}
                onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';}}>

                {/* Step number */}
                <div style={{
                  position:'absolute', top:-18, left:'50%', transform:'translateX(-50%)',
                  fontSize:isCurrent?9:7, fontWeight:900, color:node.color,
                  textShadow:`0 0 6px ${node.color}80`,
                  pointerEvents:'none', whiteSpace:'nowrap',
                }}>
                  #{i+1}
                </div>

                {/* Hover tooltip — step only */}
                <div className="gate-tooltip" style={{
                  position:'absolute', top:20, left:'50%', transform:'translateX(-50%)',
                  background:'#1f2937ee', backdropFilter:'blur(8px)',
                  border:`1px solid ${node.color}40`, borderRadius:12,
                  padding:'8px 12px', whiteSpace:'nowrap',
                  pointerEvents:'none', opacity:0, transition:'opacity 0.2s',
                  zIndex:50,
                }}>
                  <div style={{fontSize:10,fontWeight:800,color:node.color}}>
                    Step #{node.globalIndex+1}
                  </div>
                  <div style={{fontSize:9,fontWeight:600,color:'#9ca3af',marginTop:2}}>
                    {node.label}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Cross-phase edge labels */}
          {allEdges.filter(e=>e.type==='cross').map(edge=>{
            const [fromId] = edge.id.split('_2_');
            const srcGate = allNodes.find(n=>n.phaseId===fromId && n.isLast);
            if(!srcGate || allNodes.indexOf(srcGate)>=step) return null;
            const mx=(edge.from.x+edge.to.x)/2, my=(edge.from.y+edge.to.y)/2;
            return (
              <div key={`lbl-${edge.id}`} style={{
                position:'absolute', left:mx-20, top:my-9,
                fontSize:7, fontWeight:900, color:edge.color,
                textTransform:'uppercase', letterSpacing:'0.05em',
                background:'#0f0f1a99', padding:'1px 6px', borderRadius:6,
                border:`1px solid ${edge.color}30`, pointerEvents:'none', zIndex:5,
              }}>→ next</div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { r: 8px; opacity: 0.8; }
          100% { r: 24px; opacity: 0; }
        }
        @keyframes node-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.6); }
          100% { transform: scale(1); }
        }
        .gate-tooltip { opacity: 0 !important; }
        *:hover > .gate-tooltip { opacity: 1 !important; }
      `}</style>
    </div>
  );

  if(fullscreen) return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'#0a0a12',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <button
        onClick={()=>setFullscreen(false)}
        style={{
          position:'fixed', top:20, right:20, zIndex:10001,
          background:'#dc2626', color:'white',
          border:'none', borderRadius:12,
          width:44, height:44, fontSize:20,
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer',
          boxShadow:'0 4px 20px rgba(0,0,0,0.5)',
        }}
        title="Exit Fullscreen (Esc)"
      >
        <i className="fas fa-times"></i>
      </button>
      {content}
    </div>
  );

  return content;
}

/* ─── Reusable styles ─── */
const btnStyle = (bg,color,opacity=1,disabled=false)=>({
  background:bg, color, border: bg==='#1f2937' ? '1px solid #374151' : 'none', borderRadius:14,
  padding:'10px 16px', fontWeight:800, fontSize:11,
  textTransform:'uppercase', letterSpacing:'0.07em',
  cursor:disabled?'default':'pointer', opacity,
  display:'inline-flex', alignItems:'center',
  transition:'all 0.15s',
});

const zBtn = {
  background:'#1f2937', color:'#9ca3af', border:'1px solid #374151',
  borderRadius:10, width:36, height:36, fontSize:16, fontWeight:800, cursor:'pointer',
};

const zLbl = {
  background:'#111827', color:'#d1d5db', border:'1px solid #374151',
  borderRadius:10, padding:'0 12px', display:'flex', alignItems:'center',
  fontSize:10, fontWeight:800, letterSpacing:'0.05em',
};
