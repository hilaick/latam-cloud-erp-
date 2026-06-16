import React, { useState, useEffect } from 'react';

// Identifiers for routing the Target Architecture nodes
const computeTypes = ['ECS', 'BMS', 'VM', 'CCE', 'SERVER'];
const dbTypes = ['RDS', 'GAUSSDB', 'DB', 'DATABASE', 'DCS'];
const storageTypes = ['OBS', 'SFS', 'EVS', 'CBR', 'STORAGE'];
const networkTypes = ['VPC', 'SUBNET', 'EIP', 'NAT', 'VPN', 'CGW', 'VPN-CONN', 'ELB', 'CDN'];

const ToolRecommendationView = ({ activeProject, onUpdateProject }) => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);
  const [wbsType, setWbsType] = useState('execution');
  const [showImportSuccess, setShowImportSuccess] = useState(false);

  // 🚨 NEW: Pull directly from the Finalized Target Architecture
  const targetArchitecture = activeProject?.mapperNodes || [];

  const importToWBS = () => {
    if (!recommendations?.wbs_tasks || recommendations.wbs_tasks.length === 0) {
      setError('No WBS tasks generated. Please generate recommendations first.');
      return;
    }

    const migrationPlanTasks = recommendations.wbs_tasks.map(task => ({
      id: task.id,
      name: task.name,
      prog: task.prog || '0%',
      resp: task.resp || 'Migration Engineer',
      start: task.start || '',
      end: task.end || '',
      isParent: task.isParent || false,
      notes: task.notes || '',
      ...(task.tool_id && { tool_id: task.tool_id }),
      ...(task.resource_type && { resource_type: task.resource_type }),
      ...(task.estimated_duration && { estimated_duration: task.estimated_duration })
    }));

    if (onUpdateProject && activeProject.id) {
      onUpdateProject(activeProject.id, 'migrationPlan', migrationPlanTasks);
      setShowImportSuccess(true);
      setTimeout(() => setShowImportSuccess(false), 3000);
    }
  };

  const fetchRecommendations = async () => {
    if (targetArchitecture.length === 0) {
      setError('No Target Architecture saved. Please complete Step 2.4 (Target Topology Mapper) and click "Save Architecture".');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('erp_jwt_token') || '';
      
      if (!token) {
        setError('Not authenticated. Please log in first.');
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/migration/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          // 🚨 Send the Target Architecture directly to the backend
          target_architecture: targetArchitecture,
          generate_wbs: true,
          wbs_type: wbsType
        })
      });

      if (response.status === 401) {
        localStorage.removeItem('erp_jwt_token');
        localStorage.removeItem('erp_user');
        window.location.reload();
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setRecommendations(data.recommendations);
        if (onUpdateProject && activeProject.id) {
          onUpdateProject(activeProject.id, 'toolRecommendations', data.recommendations);
        }
      } else {
        setError(data.error || 'Failed to get recommendations');
      }
    } catch (err) {
      setError(err.message || 'API call failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeProject?.toolRecommendations) {
      setRecommendations(activeProject.toolRecommendations);
    }
  }, [activeProject]);

  const getToolColor = (tool) => {
    const colors = {
      sms: 'bg-blue-100 text-blue-800 border-blue-300',
      mgc: 'bg-purple-100 text-purple-800 border-purple-300',
      ugo: 'bg-amber-100 text-amber-800 border-amber-300',
      drs: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      oms: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      cdm: 'bg-violet-100 text-violet-800 border-violet-300',
      des: 'bg-orange-100 text-orange-800 border-orange-300',
      manual: 'bg-gray-100 text-gray-800 border-gray-300',
      ssh_disk_copy: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[tool] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getComplexityColor = (complexity) => {
    switch(complexity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-6 pb-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-800"><i className="fas fa-tools text-amber-500 mr-2"></i> Intelligent Tool Recommendations</h2>
            <p className="text-slate-600 mt-1 font-bold text-xs uppercase tracking-widest">
              Evaluating {targetArchitecture.length} nodes from your Saved Target Architecture.
            </p>
          </div>
          <div className="flex gap-3">
            <select 
              value={wbsType}
              onChange={(e) => setWbsType(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-slate-50"
            >
              <option value="execution">Execution WBS</option>
              <option value="proposal">Proposal WBS</option>
            </select>
            <button
              onClick={fetchRecommendations}
              disabled={loading || targetArchitecture.length === 0}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg font-black uppercase tracking-widest text-xs hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-transform active:scale-95"
            >
              {loading ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Analyzing...</> : <><i className="fas fa-magic mr-2"></i> Generate Recommendations</>}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg mb-4 text-sm font-bold">
            <i className="fas fa-exclamation-circle mr-2"></i> {error}
          </div>
        )}

        {targetArchitecture.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm font-bold">
            <i className="fas fa-exclamation-triangle mr-2"></i> Your Target Architecture is empty. Go to Phase 2.4 to reconcile and save your blueprint.
          </div>
        )}
      </div>

      {recommendations && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Migration Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Resources</div>
                <div className="text-2xl font-black text-slate-800">{recommendations.summary?.total_resources || 0}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Primary Tool</div>
                <div className="text-2xl font-black text-slate-800 uppercase">{recommendations.summary?.primary_tool || 'N/A'}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Estimated Base Timeline</div>
                <div className="text-lg font-black text-slate-800 pt-1 leading-tight">{recommendations.summary?.estimated_timeline || 'Unknown'}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Risk & Complexity</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${getComplexityColor(recommendations.summary?.migration_complexity)}`}>
                    {recommendations.summary?.migration_complexity || 'Unknown'}
                  </span>
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${getComplexityColor(recommendations.summary?.risk_assessment)}`}>
                    {recommendations.summary?.risk_assessment || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-black text-xs text-slate-700 uppercase tracking-widest mb-3">Tool Distribution</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(recommendations.summary?.recommended_tools || {}).map(([tool, count]) => (
                  <div key={tool} className={`px-3 py-2 rounded-lg border ${getToolColor(tool)} shadow-sm`}>
                    <span className="font-black uppercase text-xs">{tool}</span>
                    <span className="ml-2 text-xs font-bold opacity-75 bg-white/50 px-1.5 py-0.5 rounded">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-black text-xs text-slate-700 uppercase tracking-widest mb-3">Huawei Cloud Best Practices</h4>
              <ul className="space-y-2">
                {(recommendations.summary?.huawei_best_practices || []).map((practice, idx) => (
                  <li key={idx} className="flex items-start text-sm font-medium">
                    <i className="fas fa-check-circle text-emerald-500 mr-2 mt-1"></i>
                    <span className="text-slate-700">{practice}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Resource-Specific Recommendations</h3>
            <div className="space-y-4">
              {recommendations.recommendations?.map((rec, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-800">{rec.resource_name}</span>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-black uppercase tracking-widest border border-slate-300">
                          {rec.resource_type}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs font-medium mt-2 leading-relaxed bg-white p-2 rounded border border-slate-100">{rec.primary_reason}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-widest shadow-sm ${getToolColor(rec.primary_tool)}`}>
                        {rec.primary_tool.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex items-center">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-emerald-500" style={{ width: `${rec.confidence * 100}%` }} />
                          </div>
                          <span className="ml-2 text-[10px] font-bold text-slate-600">{Math.round(rec.confidence * 100)}% Match</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {rec.fallback_tool && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-[10px] uppercase font-black text-slate-500">Fallback Plan: <span className="text-slate-800">{rec.fallback_tool.toUpperCase()}</span></div>
                      <p className="text-slate-500 text-xs mt-1 font-medium italic">{rec.fallback_reason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {recommendations.wbs_tasks && recommendations.wbs_tasks.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                    {wbsType === 'execution' ? 'Execution WBS (Migration Tasks)' : 'Proposal WBS (High-Level)'}
                  </h3>
                  <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-widest">
                    {wbsType === 'execution' ? 'Detailed tasks for engineering team' : 'High-level tasks for ARB PMO intake'}
                  </p>
                </div>
                <div className="flex gap-3 items-center">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 font-black text-xs rounded-full border border-slate-200 shadow-inner">
                    {recommendations.wbs_tasks.length} Generated Tasks
                  </span>
                  <button onClick={importToWBS} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-md active:scale-95">
                    <i className="fas fa-upload mr-2"></i> Import to WBS Matrix
                  </button>
                </div>
              </div>
              
              {showImportSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg shadow-sm animate-fade-in font-bold text-sm">
                  <i className="fas fa-check-circle mr-2"></i> WBS tasks imported successfully! Switch to the "WBS & RACI Matrix" tab to view.
                </div>
              )}
              
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100 text-[10px] uppercase tracking-widest text-slate-500 border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-black">Task ID</th>
                      <th className="py-3 px-4 font-black">Description</th>
                      <th className="py-3 px-4 font-black">Responsible</th>
                      <th className="py-3 px-4 font-black text-center">Tooling</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recommendations.wbs_tasks.map((task, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{task.id}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{task.name}</div>
                          {task.notes && <div className="text-[10px] text-slate-500 mt-1 whitespace-pre-wrap">{task.notes}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded font-black text-[9px] uppercase tracking-widest">{task.resp}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {task.tool_id ? (
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${getToolColor(task.tool_id)}`}>
                              {task.tool_id}
                            </span>
                          ) : <span className="text-slate-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ToolRecommendationView;
