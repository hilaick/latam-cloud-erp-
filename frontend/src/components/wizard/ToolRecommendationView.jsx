import React, { useState, useEffect } from 'react';

const ToolRecommendationView = ({ activeProject, onUpdateProject }) => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);
  const [wbsType, setWbsType] = useState('execution');
  const [showImportSuccess, setShowImportSuccess] = useState(false);

  const importToWBS = () => {
    if (!recommendations?.wbs_tasks || recommendations.wbs_tasks.length === 0) {
      setError('No WBS tasks generated. Please generate recommendations first.');
      return;
    }

    // Convert tool recommendation WBS tasks to migration plan format
    const migrationPlanTasks = recommendations.wbs_tasks.map(task => ({
      id: task.id,
      name: task.name,
      prog: task.prog || '0%',
      resp: task.resp || 'Migration Engineer',
      start: task.start || '',
      end: task.end || '',
      isParent: task.isParent || false,
      notes: task.notes || '',
      // Add tool_id as metadata for tracking
      ...(task.tool_id && { tool_id: task.tool_id }),
      ...(task.resource_type && { resource_type: task.resource_type }),
      ...(task.estimated_duration && { estimated_duration: task.estimated_duration })
    }));

    // Update project with new migration plan
    if (onUpdateProject && activeProject.id) {
      onUpdateProject(activeProject.id, {
        migrationPlan: migrationPlanTasks
      });
      setShowImportSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowImportSuccess(false), 3000);
    }
  };

  const fetchRecommendations = async () => {
    // Check for blueprint data first (approved DTRB Governance), fallback to discovery data
    const blueprintData = activeProject?.blueprintData?.topology;
    const discoveryData = activeProject?.mgcData?.raw_inventory;
    
    let sourceData = null;
    let sourceType = '';
    
    if (blueprintData && 
        (blueprintData.compute?.length > 0 ||
         blueprintData.databases?.length > 0 ||
         blueprintData.storage?.length > 0 ||
         blueprintData.network?.length > 0)) {
      // Use approved blueprint from DTRB Governance
      sourceData = blueprintData;
      sourceType = 'blueprint';
    } else if (discoveryData && 
               (discoveryData.compute?.length > 0 ||
                discoveryData.databases?.length > 0 ||
                discoveryData.storage?.length > 0 ||
                discoveryData.network?.length > 0)) {
      // Fallback to raw discovery data
      sourceData = discoveryData;
      sourceType = 'discovery';
    } else {
      setError('No blueprint or discovery data available. Please run DTRB Governance first to create an approved blueprint, or run discovery to get raw inventory.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Get JWT token from localStorage (same as other components)
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
          discovery_data: sourceData,
          generate_wbs: true,
          wbs_type: wbsType,
          source_type: sourceType  // Tell backend if it's blueprint or discovery
        })
      });

      // Handle 401 Unauthorized (token expired)
      if (response.status === 401) {
        localStorage.removeItem('erp_jwt_token');
        localStorage.removeItem('erp_user');
        window.location.reload();
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setRecommendations(data.recommendations);
        // Update project with recommendations
        if (onUpdateProject && activeProject.id) {
          onUpdateProject(activeProject.id, {
            toolRecommendations: data.recommendations
          });
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Intelligent Tool Recommendations</h2>
            <p className="text-slate-600 mt-1">
              Huawei Cloud migration tool selection based on discovered infrastructure
            </p>
          </div>
          <div className="flex gap-3">
            <select 
              value={wbsType}
              onChange={(e) => setWbsType(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="execution">Execution WBS</option>
              <option value="proposal">Proposal WBS</option>
            </select>
            <button
              onClick={fetchRecommendations}
              disabled={loading || 
                (!activeProject?.blueprintData?.topology && !activeProject?.mgcData?.raw_inventory) ||
                (activeProject?.blueprintData?.topology && 
                 !(activeProject.blueprintData.topology.compute?.length > 0 ||
                   activeProject.blueprintData.topology.databases?.length > 0 ||
                   activeProject.blueprintData.topology.storage?.length > 0 ||
                   activeProject.blueprintData.topology.network?.length > 0)) ||
                (activeProject?.mgcData?.raw_inventory && 
                 !(activeProject.mgcData.raw_inventory.compute?.length > 0 ||
                   activeProject.mgcData.raw_inventory.databases?.length > 0 ||
                   activeProject.mgcData.raw_inventory.storage?.length > 0 ||
                   activeProject.mgcData.raw_inventory.network?.length > 0))}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Analyzing...' : 'Generate Recommendations'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {!activeProject?.blueprintData?.topology && !activeProject?.mgcData?.raw_inventory && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg">
            No blueprint or discovery data available. Please run DTRB Governance first to create an approved blueprint, or run discovery to get raw inventory.
          </div>
        )}

        {activeProject?.blueprintData?.topology && 
         !(activeProject.blueprintData.topology.compute?.length > 0 ||
           activeProject.blueprintData.topology.databases?.length > 0 ||
           activeProject.blueprintData.topology.storage?.length > 0 ||
           activeProject.blueprintData.topology.network?.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg">
            Blueprint exists but is empty. Please add resources to the blueprint in DTRB Governance.
          </div>
        )}

        {activeProject?.mgcData?.raw_inventory && 
         !(activeProject.mgcData.raw_inventory.compute?.length > 0 ||
           activeProject.mgcData.raw_inventory.databases?.length > 0 ||
           activeProject.mgcData.raw_inventory.storage?.length > 0 ||
           activeProject.mgcData.raw_inventory.network?.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg">
            Discovery data is empty. Run discovery to find resources.
          </div>
        )}
      </div>

      {recommendations && (
        <>
          {/* Summary Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Migration Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600">Total Resources</div>
                <div className="text-2xl font-bold text-slate-800">{recommendations.summary?.total_resources || 0}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600">Primary Tool</div>
                <div className="text-2xl font-bold text-slate-800 uppercase">{recommendations.summary?.primary_tool || 'N/A'}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600">Timeline</div>
                <div className="text-2xl font-bold text-slate-800">{recommendations.summary?.estimated_timeline || 'Unknown'}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600">Risk & Complexity</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getComplexityColor(recommendations.summary?.migration_complexity)}`}>
                    {recommendations.summary?.migration_complexity || 'Unknown'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getComplexityColor(recommendations.summary?.risk_assessment)}`}>
                    {recommendations.summary?.risk_assessment || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tool Distribution */}
            <div className="mt-6">
              <h4 className="font-medium text-slate-700 mb-3">Tool Distribution</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(recommendations.summary?.recommended_tools || {}).map(([tool, count]) => (
                  <div key={tool} className={`px-3 py-2 rounded-lg border ${getToolColor(tool)}`}>
                    <span className="font-medium uppercase">{tool}</span>
                    <span className="ml-2 text-sm opacity-75">({count})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Huawei Best Practices */}
            <div className="mt-6">
              <h4 className="font-medium text-slate-700 mb-3">Huawei Cloud Best Practices</h4>
              <ul className="space-y-2">
                {(recommendations.summary?.huawei_best_practices || []).map((practice, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-slate-700">{practice}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Tool Recommendations */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Resource-Specific Recommendations</h3>
            <div className="space-y-4">
              {recommendations.recommendations?.map((rec, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">{rec.resource_name}</span>
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                          {rec.resource_type}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm mt-1">{rec.primary_reason}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getToolColor(rec.primary_tool)}`}>
                        {rec.primary_tool.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500"
                              style={{ width: `${rec.confidence * 100}%` }}
                            />
                          </div>
                          <span className="ml-2 text-xs text-slate-600">{Math.round(rec.confidence * 100)}% confidence</span>
                        </div>
                        <span className="text-sm text-slate-500">{rec.estimated_duration}</span>
                      </div>
                    </div>
                  </div>
                  
                  {rec.fallback_tool && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-sm text-slate-600">Fallback: <span className="font-medium">{rec.fallback_tool}</span></div>
                      <p className="text-slate-500 text-sm mt-1">{rec.fallback_reason}</p>
                    </div>
                  )}

                  {rec.prerequisites && rec.prerequisites.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-medium text-slate-700 mb-1">Prerequisites:</div>
                      <div className="flex flex-wrap gap-2">
                        {rec.prerequisites.map((preq, pIdx) => (
                          <span key={pIdx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                            {preq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* WBS Tasks */}
          {recommendations.wbs_tasks && recommendations.wbs_tasks.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {wbsType === 'execution' ? 'Execution WBS (Migration Tasks)' : 'Proposal WBS (High-Level)'}
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">
                    {wbsType === 'execution' 
                      ? 'Detailed migration execution tasks for engineers' 
                      : 'High-level proposal tasks for ARB intake'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                    {recommendations.wbs_tasks.length} tasks
                  </span>
                  <button
                    onClick={importToWBS}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    <i className="fas fa-upload mr-2"></i>
                    Import to WBS
                  </button>
                </div>
              </div>
              
              {showImportSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
                  <div className="flex items-center">
                    <i className="fas fa-check-circle mr-2"></i>
                    <span>WBS tasks imported successfully! Switch to "WBS & RACI Matrix" tab to view.</span>
                  </div>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Task</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Responsible</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Tool</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.wbs_tasks.map((task, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm font-medium text-slate-800">{task.id}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{task.name}</div>
                          {task.notes && (
                            <div className="text-sm text-slate-600 mt-1">{task.notes}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                            {task.resp}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {task.tool_id && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getToolColor(task.tool_id)}`}>
                              {task.tool_id.toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700">
                          {task.estimated_duration || 'TBD'}
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