1|import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
2|import {
3|  Card, Collapse, Space, Statistic, Badge, Progress, Table, Descriptions,
4|  Alert, Button, Tag, Typography, Divider, Row, Col, Tooltip,
5|  Empty, Spin, Timeline, Tabs, Drawer
6|} from 'antd';
7|import {
8|  RobotOutlined, PlayCircleOutlined, PauseCircleOutlined,
9|  StopOutlined, RedoOutlined, DownOutlined, UpOutlined,
10|  CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined,
11|  ClockCircleOutlined, ThunderboltOutlined, RocketOutlined,
12|  CloudServerOutlined, ClearOutlined, DeploymentUnitOutlined,
13|  BarChartOutlined, SettingOutlined, GlobalOutlined,
14|  CopyOutlined, CheckOutlined, ArrowRightOutlined,
15|  DatabaseOutlined, DesktopOutlined, WifiOutlined,
16|  SwapOutlined, SafetyCertificateOutlined, FileTextOutlined,
17|  ExperimentOutlined, FullscreenOutlined, CloseOutlined
18|} from '@ant-design/icons';
19|
20|const { Title, Text, Paragraph } = Typography;
21|const { Panel } = Collapse;
22|
23|/* ── Utility: safely coerce any value to a string for JSX rendering ── */
24|const S = (v) => {
25|  if (v === null || v === undefined) return '';
26|  if (typeof v === 'string') return v;
27|  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
28|  if (typeof v === 'object') {
29|    if (Array.isArray(v)) return v.map(S).join(', ');
30|    if (v.cmd && v.desc) return v.cmd + ' — ' + v.desc;
31|    if (v.cmd) return v.cmd;
32|    if (v.desc) return v.desc;
33|    if (v.message) return v.message;
34|    try { return JSON.stringify(v); } catch(e) { return '[object]'; }
35|  }
36|  return String(v);
37|};
38|
39|/* ── Sub-component: Copy-to-clipboard button ── */
40|const CopyButton = ({ text }) => {
41|  const [copied, setCopied] = useState(false);
42|  const handleCopy = () => {
43|    navigator.clipboard.writeText(text).then(() => {
44|      setCopied(true);
45|      setTimeout(() => setCopied(false), 1500);
46|    });
47|  };
48|  return (
49|    <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
50|      <Button
51|        type="text"
52|        size="small"
53|        icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
54|        onClick={handleCopy}
55|        style={{ fontSize: 10 }}
56|      />
57|    </Tooltip>
58|  );
59|};
60|
61|/* ── Sub-component: Status badge (PASS / FAIL / BLOCKED / WARN) ── */
62|const StatusBadge = ({ result, outcome, isDryRun }) => {
63|  let status = (result || outcome || '').toLowerCase();
64|  const raw = (result || outcome || '');
65|  const isHypothetical = raw === 'hypothetical_path_displayed';
66|  const isSimulated = raw === 'simulated_cleanup' || raw === 'simulated_complete';
67|  const isBlocked = raw.startsWith('BLOCKED') || status.includes('blocked');
68|  const isSuccess = (status.includes('success') || status === 'capacity_ok' || status === 'registered' || status.startsWith('simulated')) && !isBlocked;
69|  const isWarn = status.includes('warn') || status.includes('retry');
70|  const isFail = (status.includes('error') || status.includes('failed')) && !isBlocked;
71|  
72|  if (isHypothetical) {
73|    return <Tag icon={<ExperimentOutlined />} color="cyan">HYPOTHETICAL</Tag>;
74|  }
75|  if (isSimulated) {
76|    return <Tag icon={<CheckCircleOutlined />} style={{ color: '#52c41a', borderColor: '#d9f7be', background: '#f6ffed' }}>SIMULATED (dry-run)</Tag>;
77|  }
78|  if (isBlocked) {
79|    return <Tag icon={<CloseCircleOutlined />} style={{ color: '#fa8c16', borderColor: '#ffe7ba', background: '#fff7e6' }}>BLOCKED</Tag>;
80|  }
81|  if (isSuccess) {
82|    return <Tag icon={<CheckCircleOutlined />} color="success">OK</Tag>;
83|  } else if (isWarn) {
84|    return <Tag icon={<ExclamationCircleOutlined />} color="warning">WARN</Tag>;
85|  } else if (isFail) {
86|    return <Tag icon={<CloseCircleOutlined />} color="error">FAIL</Tag>;
87|  } else {
88|    return <Tag icon={<ClockCircleOutlined />}>{(result || outcome || 'pending').toUpperCase()}</Tag>;
89|  }
90|};
91|
92|/* ── Sub-component: Dependency resolution display ── */
93|const DependencyBadge = ({ deps }) => {
94|  if (!deps || deps.length === 0) return null;
95|  return (
96|    <Space size={4} wrap>
97|      {deps.map((dep, i) => (
98|        <Tag
99|          key={i}
100|          icon={dep.status === 'ok' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
101|          color={dep.status === 'ok' ? 'success' : 'warning'}
102|        >
103|          {dep.name}
104|        </Tag>
105|      ))}
106|    </Space>
107|  );
108|};
109|
110|/* ── Sub-component: Trace entry (one step) ── */
111|const TraceEntry = ({ step, isLast, isExpanded, onToggle }) => {
112|  const isRunning = step.result === 'running' || step.outcome === 'in_progress';
113|  const isSuccess = step.result === 'capacity_ok' || step.result === 'registered' || (step.result || '').includes('success');
114|  const isFail = (step.result || '').includes('error') || (step.result || '').includes('failed') || step.result === 'not_resolved';
115|  
116|  const iconColor = isRunning ? '#1890ff' : isSuccess ? '#52c41a' : isFail ? '#ff4d4f' : '#8c8c8c';
117|  const icon = isRunning ? 'fa-spinner fa-spin' : isSuccess ? 'fa-check' : isFail ? 'fa-times' : 'fa-circle';
118|  
119|  return (
120|    <div style={{ paddingLeft: 24, paddingRight: 16, paddingBottom: 8 }}>
121|      <div
122|        onClick={onToggle}
123|        style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
124|      >
125|        {/* Status icon */}
126|        <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, background: iconColor + '15' }}>
127|          <i className={'fas ' + icon} style={{ color: iconColor, fontSize: 10 }}></i>
128|        </div>
129|        
130|        {/* Step info */}
131|        <div style={{ flex: 1, minWidth: 0 }}>
132|          <Space size={8} wrap>
133|            <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
134|              {step.action?.replace(/_/g, ' ')}
135|            </Text>
136|            {step.source_label && (
137|              <Tag color="purple" style={{ fontSize: 8, padding: '0 4px', margin: 0, lineHeight: '16px', borderRadius: 3 }}>
138|                {step.source_label}
139|              </Tag>
140|            )}
141|            <StatusBadge result={step.result} outcome={step.outcome} isDryRun={true} />
142|            {step.duration_ms && (
143|              <Text type="secondary" style={{ fontSize: 10 }}>{step.duration_ms}ms</Text>
144|            )}
145|          </Space>
146|          <Paragraph style={{ margin: '4px 0 0', fontSize: 12, color: '#595959', lineHeight: 1.5 }}>
147|            {step.message || step.description || step.decision?.message || ''}
148|          </Paragraph>
149|          <DependencyBadge deps={step.dependencies} />
150|        </div>
151|        
152|        {/* Expand indicator */}
153|        <i className={'fas fa-chevron-' + (isExpanded ? 'up' : 'down')} style={{ color: '#8c8c8c', fontSize: 10, flexShrink: 0, marginTop: 4 }}></i>
154|      </div>
155|      
156|      {/* Expanded body: commands, config, troubleshooting */}
157|      {isExpanded && (
158|        <div style={{ paddingLeft: 36, marginTop: 8 }}>
159|          {/* CLI Commands */}
160|          {step.commands && step.commands.length > 0 && (
161|            <div style={{ background: '#f5f5f5', borderRadius: 6, padding: 10, marginBottom: 8 }}>
162|              <Text strong style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#8c8c8c' }}>
163|                CLI / API Commands (SIMULATED — dry-run)
164|              </Text>
165|              <div style={{ marginTop: 6 }}>
166|                {step.commands.map((cmd, i) => {
167|                  const cmdStr = typeof cmd === 'object' && cmd !== null ? (cmd.cmd || cmd.command || JSON.stringify(cmd)) : cmd;
168|                  const descStr = typeof cmd === 'object' && cmd !== null ? (cmd.desc || cmd.description || '') : '';
169|                  return (
170|                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 2 }}>
171|                      <span style={{ color: '#d9d9d9', flexShrink: 0 }}>SIMULATED $</span>
172|                      <div style={{ flex: 1, minWidth: 0 }}>
173|                        <code style={{ fontSize: 11, color: '#262626', wordBreak: 'break-all', fontStyle: 'italic' }}>{cmdStr}</code>
174|                        {descStr && <div style={{ fontSize: 9, color: '#8c8c8c' }}>{descStr}</div>}
175|                      </div>
176|                      <CopyButton text={cmdStr} />
177|                    </div>
178|                  );
179|                })}
180|              </div>
181|            </div>
182|          )}
183|          
184|          {/* Resource Spec */}
185|          {step.decision?.resource_spec && (
186|            <Descriptions
187|              size="small"
188|              bordered
189|              column={2}
190|              title={<Text strong style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#8c8c8c' }}>Resource Specification</Text>}
191|            >
192|              {Object.entries(step.decision.resource_spec).map(([k, v]) => (
193|                <Descriptions.Item key={k} label={k.replace(/_/g, ' ')}>
194|                  <Text strong>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</Text>
195|                </Descriptions.Item>
196|              ))}
197|            </Descriptions>
198|          )}
199|          
200|          {/* Troubleshooting */}
201|          {step.troubleshooting && (
202|            <Alert
203|              message={<><ExclamationCircleOutlined /> Troubleshooting</>}
204|              description={step.troubleshooting}
205|              type="warning"
206|              showIcon
207|              style={{ marginBottom: 8 }}
208|            />
209|          )}
210|          
211|          {/* Dependencies detail */}
212|          {step.decision?.dependencies_detail && step.decision.dependencies_detail.length > 0 && (
213|            <div style={{ background: '#f0f5ff', borderRadius: 6, padding: 10, marginBottom: 8 }}>
214|              <Text strong style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#4a6cf7' }}>
215|                Dependencies
216|              </Text>
217|              <div style={{ marginTop: 4 }}>
218|                {step.decision.dependencies_detail.map((dep, i) => (
219|                  <Text key={i} style={{ color: '#2f54eb', fontSize: 12 }}>{dep}</Text>
220|                ))}
221|              </div>
222|            </div>
223|          )}
224|        </div>
225|      )}
226|    </div>
227|  );
228|};
229|
230|/* ── Sub-component: Phase grouping header ── */
231|const PhaseHeader = ({ icon, label, color, count, isExpanded, onToggle }) => (
232|  <div
233|    onClick={onToggle}
234|    style={{
235|      cursor: 'pointer',
236|      display: 'flex',
237|      alignItems: 'center',
238|      gap: 12,
239|      padding: '12px 16px',
240|      background: isExpanded ? '#fff' : '#fafafa',
241|      borderBottom: '1px solid #f0f0f0',
242|      transition: 'background 0.2s'
243|    }}
244|    onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
245|    onMouseLeave={(e) => e.currentTarget.style.background = isExpanded ? '#fff' : '#fafafa'}
246|  >
247|    <div style={{ width: 36, height: 36, background: color, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
248|      <i className={'fas ' + icon} style={{ color: '#fff', fontSize: 16 }}></i>
249|    </div>
250|    <div style={{ flex: 1 }}>
251|      <Text strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: '#262626' }}>{label}</Text>
252|    </div>
253|    <Text type="secondary" style={{ fontSize: 11 }}>{count} steps</Text>
254|    <i className={'fas fa-chevron-' + (isExpanded ? 'up' : 'down')} style={{ color: '#8c8c8c', fontSize: 12 }}></i>
255|  </div>
256|);
257|
258|/* ── Sub-component: Individual resource card ── */
259|const ResourceCard = ({ resource, status, isHighlighted }) => {
260|  const statusConfig = {
261|    pending: { icon: <ClockCircleOutlined />, color: '#d9d9d9', text: '#8c8c8c', bg: '#fafafa' },
262|    active: { icon: <ClockCircleOutlined />, color: '#1890ff', text: '#1890ff', bg: '#e6f7ff' },
263|    completed: { icon: <CheckCircleOutlined />, color: '#52c41a', text: '#52c41a', bg: '#f6ffed' },
264|    failed: { icon: <CloseCircleOutlined />, color: '#ff4d4f', text: '#ff4d4f', bg: '#fff2f0' },
265|    skipped: { icon: <ArrowRightOutlined />, color: '#faad14', text: '#faad14', bg: '#fffbe6' },
266|  };
267|  const cfg = statusConfig[status] || statusConfig.pending;
268|  
269|  return (
270|    <div style={{
271|      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
272|      borderRadius: 6, background: cfg.bg,
273|      transition: 'all 0.3s',
274|      border: isHighlighted ? '2px solid #722ed1' : '1px solid #f0f0f0',
275|      boxShadow: isHighlighted ? '0 2px 8px rgba(114,46,209,0.15)' : 'none',
276|      transform: isHighlighted ? 'scale(1.02)' : 'scale(1)'
277|    }}>
278|      <div style={{ width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: cfg.color + '20' }}>
279|        <i className={'fas ' + (status === 'active' ? 'fa-spinner fa-spin' : status === 'completed' ? 'fa-check' : status === 'failed' ? 'fa-times' : status === 'skipped' ? 'fa-forward' : 'fa-clock')} style={{ color: cfg.color, fontSize: 12 }}></i>
280|      </div>
281|      <div style={{ flex: 1, minWidth: 0 }}>
282|        <Text strong style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
283|          {resource.name || resource.id || 'Unknown'}
284|        </Text>
285|        <Text type="secondary" style={{ fontSize: 9, textTransform: 'uppercase' }}>
286|          {resource.type || '?'}{resource.os ? ' · ' + resource.os : ''}
287|        </Text>
288|      </div>
289|      <Text style={{ fontSize: 9, textTransform: 'uppercase', color: cfg.text, flexShrink: 0, fontWeight: 700 }}>{status}</Text>
290|    </div>
291|  );
292|};
293|
294|/* ── Sub-component: Resource Migration Tracker Panel ── */
295|const ResourceMigrationTracker = ({ resources, resourceStatus, activeResourceId, completedCount }) => {
296|  const progressPercent = resources.length > 0 ? Math.round((completedCount / resources.length) * 100) : 0;
297|  
298|  return (
299|    <Card
300|      size="small"
301|      title={
302|        <Space>
303|          <CloudServerOutlined style={{ color: '#4a6cf7' }} />
304|          <Text strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Resource Migration Tracker</Text>
305|        </Space>
306|      }
307|      extra={
308|        <Space size={8}>
309|          <Text type="secondary" style={{ fontSize: 11 }}>
310|            <Text strong style={{ color: '#4a6cf7' }}>{completedCount}</Text>/{resources.length} completed
311|          </Text>
312|        </Space>
313|      }
314|      style={{ height: '100%' }}
315|      bodyStyle={{ padding: '12px' }}
316|    >
317|      <Progress
318|        percent={progressPercent}
319|        size="small"
320|        strokeColor={{ '0%': '#4a6cf7', '100%': '#722ed1' }}
321|        format={(p) => `${p}%`}
322|        style={{ marginBottom: 12 }}
323|      />
324|      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
325|        <Space direction="vertical" size={6} style={{ width: '100%' }}>
326|          {resources.map((r, i) => (
327|            <ResourceCard
328|              key={r.id || r.name || i}
329|              resource={r}
330|              status={resourceStatus[r.id] || resourceStatus[r.name] || 'pending'}
331|              isHighlighted={(r.id || r.name) === activeResourceId}
332|            />
333|          ))}
334|          {resources.length === 0 && (
335|            <Empty description="No resources loaded" image={Empty.PRESENTED_IMAGE_SIMPLE} />
336|          )}
337|        </Space>
338|      </div>
339|    </Card>
340|  );
341|};
342|
343|/* ── Sub-component: Replay controls ── */
344|const ReplayControls = ({ isPlaying, currentStep, totalSteps, onPlay, onPause, onStep, onReset, speed, onSpeedChange }) => (
345|  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
346|    <Button size="small" icon={<RedoOutlined />} onClick={onReset} title="Reset" />
347|    <Button
348|      size="small"
349|      type="primary"
350|      icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
351|      onClick={isPlaying ? onPause : onPlay}
352|      style={{ background: isPlaying ? '#ff4d4f' : '#722ed1', borderColor: isPlaying ? '#ff4d4f' : '#722ed1' }}
353|    >
354|      {isPlaying ? 'Pause' : 'Play'}
355|    </Button>
356|    <Button size="small" icon={<ArrowRightOutlined />} onClick={onStep} disabled={isPlaying || currentStep >= totalSteps} title="Step Forward" />
357|    <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
358|      {currentStep}/{totalSteps}
359|    </Text>
360|    <div style={{ width: 1, height: 16, background: '#d9d9d9' }}></div>
361|    <select
362|      value={speed}
363|      onChange={(e) => onSpeedChange(Number(e.target.value))}
364|      style={{ background: '#fafafa', color: '#595959', fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px', border: '1px solid #d9d9d9' }}
365|    >
366|      <option value={2000}>0.5x</option>
367|      <option value={1000}>1x</option>
368|      <option value={500}>2x</option>
369|      <option value={150}>5x</option>
370|      <option value={50}>10x</option>
371|    </select>
372|  </div>
373|);
374|
375|/* ── Sub-component: Live step indicator ── */
376|const LiveStepCard = ({ step }) => {
377|  if (!step) return null;
378|  const phaseLabel = (step.phase || '').replace('PHASE_', 'Φ') || '•';
379|  return (
380|    <Card
381|      size="small"
382|      style={{
383|        background: 'linear-gradient(135deg, #f9f0ff 0%, #e6f7ff 100%)',
384|        border: '2px solid #722ed1',
385|        borderRadius: 8
386|      }}
387|      bodyStyle={{ padding: 12 }}
388|    >
389|      <Space size={12} style={{ width: '100%' }}>
390|        <div style={{ width: 32, height: 32, background: '#722ed1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
391|          <i className="fas fa-bolt" style={{ color: '#fff', fontSize: 14 }}></i>
392|        </div>
393|        <div style={{ flex: 1, minWidth: 0 }}>
394|            <Text strong style={{ fontSize: 10, color: '#722ed1', textTransform: 'uppercase', letterSpacing: 2 }}>
395|              {phaseLabel} · {step.action}
396|            </Text>
397|            <Text type="secondary" style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
398|              {step.message || S(step.description || (step.decision && step.decision.message) || step.result)}
399|            </Text>
400|        </div>
401|        <StatusBadge result={step.result} outcome={step.outcome} isDryRun={true} />
402|      </Space>
403|      {step.commands && step.commands.length > 0 && (
404|        <div style={{ marginTop: 8, background: '#262626', borderRadius: 6, padding: 8, fontFamily: 'monospace' }}>
405|          {step.commands.map((c, i) => {
406|            const cmdStr = typeof c === 'object' && c !== null ? (c.cmd || c.command || JSON.stringify(c)) : c;
407|            const descStr = typeof c === 'object' && c !== null ? (c.desc || c.description || '') : '';
408|            return (
409|              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 2 }}>
410|                <span style={{ color: '#8c8c8c', flexShrink: 0 }}>$</span>
411|                <div style={{ flex: 1, minWidth: 0 }}>
412|                  <span style={{ color: '#52c41a', fontSize: 10 }}>{cmdStr}</span>
413|                  {descStr && <div style={{ fontSize: 9, color: '#8c8c8c' }}>{descStr}</div>}
414|                </div>
415|              </div>
416|            );
417|          })}
418|        </div>
419|      )}
420|    </Card>
421|  );
422|};
423|
424|/* ═══════════════════════════════════════════════
425|   SIMULATION CONSTELLATION — Phase 3.4b
426|   Visual SVG showing simulation's deployed resources:
427|   servers, network, mig_worker, migration arrows.
428|   Parses trace + resource_usage from agenticDryRun.
429|   ═══════════════════════════════════════════════ */
430|
431|/* ── Status → color map (green=success, amber=running, red=failed, blue=deployed) ── */
432|const STATUS_COLORS = {
433|  success:  '#10b981', green: '#10b981', ok: '#10b981',
434|  running:  '#f59e0b', amber: '#f59e0b', active: '#f59e0b', in_progress: '#f59e0b',
435|  failed:   '#ef4444', red: '#ef4444', error: '#ef4444',
436|  deployed: '#3b82f6', blue: '#3b82f6',
437|  pending:  '#6b7280', gray: '#6b7280',
438|};
439|
440|function resolveStatusColor(step) {
441|  const r = ((step.result || step.outcome || '')).toLowerCase();
442|  if (r.includes('success') || r === 'capacity_ok' || r === 'registered' || r.startsWith('simulated')) return STATUS_COLORS.success;
443|  if (r === 'running' || r === 'in_progress' || r.includes('active') || r.includes('processing')) return STATUS_COLORS.running;
444|  if (r.includes('error') || r.includes('failed') || r.includes('blocked') || r === 'not_resolved') return STATUS_COLORS.failed;
445|  if (r.includes('deploy') || r.includes('create') || r.includes('register')) return STATUS_COLORS.deployed;
446|  return STATUS_COLORS.pending;
447|}
448|
449|/* ── Build constellation nodes from trace ── */
450|function buildConstellationData(trace, resourceUsage, resources) {
451|  const servers = [];       // { id, name, status, color, source_label, commands_count }
452|  const networkNodes = [];  // { id, name, type, status, color }
453|  const seenServerIds = new Set();
454|  const seenNetIds = new Set();
455|
456|  // Track mig_worker
457|  let migWorker = null;
458|
459|  trace.forEach((step) => {
460|    const serverId = step.server_id || (step.decision && step.decision.server_id) || '';
461|    const serverName = (step.decision && step.decision.server_name) || serverId || '';
462|    const action = step.action || '';
463|
464|    // Detect mig_worker
465|    if (action.includes('MIG_WORKER') || action === 'WORKER_REGISTER' || action === 'WORKER_DEPLOY' ||
466|        (step.message || '').toLowerCase().includes('mig_worker') ||
467|        (step.description || '').toLowerCase().includes('mig_worker')) {
468|      if (!migWorker) {
469|        migWorker = {
470|          id: 'mig_worker',
471|          name: 'mig_worker',
472|          status: resolveStatusColor(step) === STATUS_COLORS.success ? 'active' : 'deployed',
473|          color: resolveStatusColor(step) === STATUS_COLORS.success ? STATUS_COLORS.success : STATUS_COLORS.deployed,
474|          source_label: step.source_label || null,
475|          commands_count: (step.commands || []).length,
476|          stepAction: action,
477|        };
478|      } else if (resolveStatusColor(step) === STATUS_COLORS.success) {
479|        migWorker.status = 'active';
480|        migWorker.color = STATUS_COLORS.success;
481|      }
482|    }
483|
484|    // Detect servers (migration steps)
485|    if (serverId && !seenServerIds.has(serverId)) {
486|      seenServerIds.add(serverId);
487|      const resource = resources.find(r => r.id === serverId || r.name === serverId || r.name === serverName);
488|      const displayName = serverName || (resource ? (resource.name || resource.id) : serverId);
489|      servers.push({
490|        id: serverId,
491|        name: displayName,
492|        resourceType: resource ? (resource.type || 'ECS') : 'ECS',
493|        status: resolveStatusColor(step),
494|        color: resolveStatusColor(step),
495|        source_label: step.source_label || null,
496|        commands_count: (step.commands || []).length,
497|        stepAction: action,
498|      });
499|    }
500|
501|    // Detect network resources
502|    const netTypes = ['VPC', 'SUBNET', 'SG', 'SECURITY_GROUP', 'EIP', 'NAT', 'VPN', 'VPC_CREATE', 'SUBNET_CREATE', 'SG_CREATE'];
503|    if ((action.includes('VPC') || action.includes('SUBNET') || action.includes('SG') ||
504|         action.includes('SECURITY') || action.includes('EIP') || action.includes('NAT') ||
505|         action.includes('NETWORK')) && !seenNetIds.has(action)) {
506|      seenNetIds.add(action);
507|      let netType = 'NET';
508|      let netName = action.replace(/_/g, ' ');
509|      if (action.includes('VPC')) { netType = 'VPC'; netName = action.includes('CREATE') ? 'VPC' : netName; }
510|      else if (action.includes('SUBNET')) { netType = 'SUBNET'; netName = action.includes('CREATE') ? 'Subnet' : netName; }
511|      else if (action.includes('SG') || action.includes('SECURITY')) { netType = 'SG'; netName = 'Security Group'; }
512|      else if (action.includes('EIP')) { netType = 'EIP'; netName = 'EIP'; }
513|      else if (action.includes('NAT')) { netType = 'NAT'; netName = 'NAT Gateway'; }
514|
515|      networkNodes.push({
516|        id: action,
517|        name: netName,
518|        type: netType,
519|        status: resolveStatusColor(step),
520|        color: resolveStatusColor(step),
521|        source_label: step.source_label || null,
522|      });
523|    }
524|
525|    // Update server status from later steps in the trace
526|    if (serverId && seenServerIds.has(serverId)) {
527|      const existing = servers.find(s => s.id === serverId);
528|      if (existing) {
529|        const newColor = resolveStatusColor(step);
530|        if (newColor === STATUS_COLORS.success || newColor === STATUS_COLORS.failed) {
531|          existing.status = newColor === STATUS_COLORS.success ? 'success' : 'failed';
532|          existing.color = newColor;
533|        } else if (newColor === STATUS_COLORS.running && existing.color === STATUS_COLORS.pending) {
534|          existing.status = 'running';
535|          existing.color = newColor;
536|        }
537|      }
538|    }
539|  });
540|
541|  // Detect source/target cloud from PRESALES_TRIAGE step
542|  let sourceCloud = 'Huawei Cloud';
543|  let targetCloud = 'Huawei Cloud';
544|  const triageStep = trace.find(s => s.action === 'PRESALES_TRIAGE_ANALYSIS');
545|  if (triageStep && triageStep.message) {
546|    const msg = triageStep.message;
547|    const srcMatch = msg.match(/Source Env:?\s*\[?([^\].]+)/);
548|    if (srcMatch) sourceCloud = srcMatch[1].trim();
549|    const tgtMatch = msg.match(/Cross-Region:?\s*(YES|NO)/);
550|    if (tgtMatch && tgtMatch[1] === 'YES') {
551|      targetCloud = 'Huawei Cloud';
552|    }
553|  }
554|
555|  // Resource counts from resource_usage
556|  const counts = {
557|    ecs: resourceUsage?.ecs_instances || resourceUsage?.ecs || servers.length,
558|    eip: resourceUsage?.eip_addresses || resourceUsage?.eip || 0,
559|    sgRules: resourceUsage?.sg_rules || resourceUsage?.security_group_rules || 0,
560|    smsTasks: resourceUsage?.sms_tasks || resourceUsage?.sms || servers.length,
561|    vpcs: resourceUsage?.vpc || resourceUsage?.vpcs || 1,
562|    subnets: resourceUsage?.subnet || resourceUsage?.subnets || 1,
563|  };
564|
565|  return { servers, networkNodes, migWorker, counts, sourceCloud, targetCloud };
566|}
567|
568|/* ── SVG layout constants ── */
569|const CON_W = 900, CON_H = 600, CON_CX = CON_W / 2, CON_CY = CON_H / 2;
570|
571|function computeConstellationLayout(data) {
572|  const { servers, networkNodes, migWorker, counts } = data;
573|  const allNodes = [];
574|  const allEdges = [];
575|
576|  // Determine source cloud label from data
577|  const sourceLabel = data.sourceCloud || 'Huawei Cloud';
578|  const targetLabel = data.targetCloud || 'Huawei Cloud';
579|
580|  // ── Source cloud (left side) ──
581|  const sourceX = 120, sourceY = CON_CY;
582|  allNodes.push({
583|    id: 'source_cloud', type: 'cloud', label: `SOURCE\n${sourceLabel}`, x: sourceX, y: sourceY,
584|    color: '#6b7280', icon: 'fa-cloud', size: 'lg',
585|  });
586|
587|  // ── Target cloud (right side) ──
588|  const targetX = CON_W - 120, targetY = CON_CY;
589|  allNodes.push({
590|    id: 'target_cloud', type: 'cloud', label: `TARGET\n${targetLabel}`, x: targetX, y: targetY,
591|    color: '#3b82f6', icon: 'fa-cloud', size: 'lg',
592|  });
593|
594|  // ── Servers: arrange in a vertical column between source and target, staggered left→right ──
595|  const serverCount = servers.length;
596|  const serverCols = Math.min(serverCount, 3);
597|  const serverRows = Math.ceil(serverCount / serverCols);
598|  const serverStartX = 240;
599|  const serverEndX = CON_W - 240;
600|  const serverStartY = 100;
601|  const serverEndY = CON_H - 100;
602|
603|  servers.forEach((srv, i) => {
604|    const col = i % serverCols;
605|    const row = Math.floor(i / serverCols);
606|    const xRange = serverEndX - serverStartX;
607|    const colStep = serverCols > 1 ? xRange / (serverCols - 1) : xRange / 2;
608|    const yRange = serverEndY - serverStartY;
609|    const rowStep = serverRows > 1 ? yRange / (serverRows - 1) : 0;
610|
611|    const x = serverStartX + col * colStep;
612|    const y = serverStartY + row * rowStep;
613|
614|    allNodes.push({
615|      id: srv.id, type: 'server', label: srv.name, x, y,
616|      color: srv.color, source_label: srv.source_label,
617|      resourceType: srv.resourceType, stepAction: srv.stepAction,
618|    });
619|
620|    // Source → server edge
621|    allEdges.push({
622|      id: `src2${srv.id}`, from: { x: sourceX, y: sourceY }, to: { x, y },
623|      color: srv.color, dashed: true,
624|    });
625|    // Server → target edge
626|    allEdges.push({
627|      id: `${srv.id}2tgt`, from: { x, y }, to: { x: targetX, y: targetY },
628|      color: srv.color, dashed: false,
629|    });
630|  });
631|
632|  // ── Network nodes: VPC, Subnet, SG — place above/below the server rows ──
633|  const netStartY = serverStartY - 80;
634|  const netXStart = 200;
635|  const netXEnd = CON_W - 200;
636|  networkNodes.forEach((net, i) => {
637|    const netCount = networkNodes.length;
638|    const xStep = netCount > 1 ? (netXEnd - netXStart) / (netCount - 1) : 0;
639|    const x = netXStart + i * xStep;
640|    const y = netStartY;
641|
642|    allNodes.push({
643|      id: net.id, type: 'network', label: net.name, x, y,
644|      color: net.color, netType: net.type, source_label: net.source_label,
645|    });
646|    // Connect network nodes to source/target
647|    allEdges.push({
648|      id: `net_${net.id}_src`, from: { x: sourceX, y: sourceY }, to: { x, y },
649|      color: net.color, dashed: true,
650|    });
651|    allEdges.push({
652|      id: `net_${net.id}_tgt`, from: { x, y }, to: { x: targetX, y: targetY },
653|      color: net.color, dashed: true,
654|    });
655|  });
656|
657|  // ── mig_worker: special node at top right ──
658|  if (migWorker) {
659|    const workerX = targetX + 60;
660|    const workerY = 80;
661|    allNodes.push({
662|      id: 'mig_worker', type: 'worker', label: 'mig_worker', x: workerX, y: workerY,
663|      color: migWorker.color, source_label: migWorker.source_label, stepAction: migWorker.stepAction,
664|    });
665|    // Edge from target cloud to mig_worker
666|    allEdges.push({
667|      id: 'tgt2worker', from: { x: targetX, y: targetY }, to: { x: workerX, y: workerY },
668|      color: migWorker.color, dashed: false, thick: true,
669|    });
670|  }
671|
672|  // ── Resource count label (bottom center) ──
673|  allNodes.push({
674|    id: 'counts', type: 'counts', label: '', x: CON_CX, y: CON_H - 40,
675|    color: '#6b7280', counts,
676|  });
677|
678|  return { allNodes, allEdges, counts, sourceLabel, targetLabel };
679|}
680|
681|/* SimulationConstellation moved to SimulationConstellation3D.jsx (Three.js 3D) */
910|import SimulationConstellation from './SimulationConstellation3D.jsx';
911|
912|/* ── Main Component ── */
913|export default function AgenticOrchestrationPanel({ project, onUpdateProject }) {
914|  const [loading, setLoading] = useState(false);
915|  const [result, setResult] = useState(project?.agenticDryRun || null);
916|  const [error, setError] = useState(null);
917|  const [expandedSteps, setExpandedSteps] = useState({});
918|  const [expandedPhases, setExpandedPhases] = useState({
919|    'PHASE_4_0': true, 'PHASE_4_1': true, 'PHASE_4_2': true,
920|    'PHASE_4_2a': true, 'PHASE_4_2a_BLOCKED': true,
921|    'PHASE_4_2b': true, 'PHASE_4_2c': true, 'PHASE_4_2d': true,
922|    'PHASE_4_2e': true, 'PHASE_4_2f': true, 'PHASE_4_2f_POST': true,
923|    'PHASE_4_3': true, 'PHASE_4_4': true, 'PHASE_4_5': true,
924|    'PHASE_4_6': true, 'PHASE_4_7': true, 'PHASE_4_8': true,
925|  });
926|  const [showSummary, setShowSummary] = useState(true);
927|  const [showConstellation, setShowConstellation] = useState(false);
928|  const [constellationFullscreen, setConstellationFullscreen] = useState(false);
929|
930|  // ── Replay state ──
931|  const [replayMode, setReplayMode] = useState(false);
932|  const [replayIndex, setReplayIndex] = useState(0);
933|  const [isPlaying, setIsPlaying] = useState(false);
934|  const [replaySpeed, setReplaySpeed] = useState(1000);
935|
936|  // 🐛 FIX: Reset all local state when project changes (prevents stale simulation from previous project)
937|  const prevProjectId = useRef(project?.id);
938|  useEffect(() => {
939|    if (prevProjectId.current !== project?.id) {
940|      setResult(project?.agenticDryRun || null);
941|      setError(null);
942|      setExpandedSteps({});
943|      setExpandedPhases({
944|        'PHASE_4_0': true, 'PHASE_4_1': true, 'PHASE_4_2': true,
945|        'PHASE_4_2a': true, 'PHASE_4_2a_BLOCKED': true,
946|        'PHASE_4_2b': true, 'PHASE_4_2c': true, 'PHASE_4_2d': true,
947|        'PHASE_4_2e': true, 'PHASE_4_2f': true, 'PHASE_4_2f_POST': true,
948|        'PHASE_4_3': true, 'PHASE_4_4': true, 'PHASE_4_5': true,
949|        'PHASE_4_6': true, 'PHASE_4_7': true, 'PHASE_4_8': true,
950|      });
951|      setShowSummary(true);
952|      setReplayMode(false);
953|      setReplayIndex(0);
954|      setIsPlaying(false);
955|      prevProjectId.current = project?.id;
956|    }
957|  }, [project?.id]);
958|  const timerRef = useRef(null);
959|
960|  const token = sessionStorage.getItem('hermes_access_token');
961|
962|  // ── Extract resources from project data ──
963|  const resources = useMemo(() => {
964|    const topologyFilter = project?.topologyFilter || 'All';
965|    let nodes = project?.mapperNodes || [];
966|    if (topologyFilter === 'In SOW') {
967|      nodes = nodes.filter(n => n.status === 'Matched' || n.status === 'Quoted Only');
968|    } else if (topologyFilter === 'In Discovery') {
969|      nodes = nodes.filter(n => n.status === 'Matched' || n.status === 'Live Only');
970|    } else if (topologyFilter && topologyFilter !== 'All') {
971|      nodes = nodes.filter(n => n.status === topologyFilter);
972|    }
973|    return nodes.filter(n => {
974|      const type = (n.type || '').toUpperCase();
975|      return type === 'ECS' || type === 'COMPUTE' || type === 'RDS' || type === 'DATABASE' || type === 'STORAGE' || type === 'OBS';
976|    });
977|  }, [project?.mapperNodes, project?.topologyFilter]);
978|
979|  // ── Compute resource status from trace up to replayIndex ──
980|  const resourceStatus = useMemo(() => {
981|    if (!result?.trace || resources.length === 0) return {};
982|    const status = {};
983|    resources.forEach(r => { status[r.id || r.name] = 'pending'; });
984|
985|    const visibleTrace = replayMode ? result.trace.slice(0, replayIndex + 1) : result.trace;
986|    
987|    visibleTrace.forEach(step => {
988|      const serverId = step.server_id || (step.decision && step.decision.server_id) || (step.decision && step.decision.server_name) || '';
989|      const serverName = (step.decision && step.decision.server_name) || '';
990|      const matched = resources.find(r =>
991|        (r.id && (r.id === serverId || r.id === serverName)) ||
992|        (r.name && (r.name === serverId || r.name === serverName))
993|      );
994|
995|      if (matched) {
996|        const key = matched.id || matched.name;
997|        const resultOutcome = (step.result || step.outcome || '').toLowerCase();
998|        const isSuccess = resultOutcome.includes('success') || resultOutcome === 'capacity_ok' || resultOutcome === 'registered';
999|        const isFail = resultOutcome.includes('error') || resultOutcome.includes('failed') || resultOutcome.includes('blocked') || resultOutcome === 'not_resolved';
1000|        const isComplete = step.action === 'WAVE_COMPLETE' || step.action === 'SERVER_COMPLETE' || step.action === 'HANDOFF';
1001|
1002|        if (isComplete || isSuccess) { status[key] = 'completed'; }
1003|        else if (isFail) { status[key] = 'failed'; }
1004|        else if (step.action !== 'WAVE_START') { status[key] = 'active'; }
1005|      }
1006|    });
1007|    return status;
1008|  }, [result, replayIndex, replayMode, resources]);
1009|
1010|  // ── Active resource and completed count ──
1011|  const activeResourceId = useMemo(() => {
1012|    if (!replayMode || !result?.trace) return null;
1013|    const step = result.trace[replayIndex];
1014|    if (!step) return null;
1015|    const sid = step.server_id || (step.decision && step.decision.server_id) || (step.decision && step.decision.server_name) || '';
1016|    const matched = resources.find(r => r.id === sid || r.name === sid);
1017|    return matched ? (matched.id || matched.name) : null;
1018|  }, [replayMode, replayIndex, result, resources]);
1019|
1020|  const completedCount = useMemo(() => {
1021|    return Object.values(resourceStatus).filter(s => s === 'completed').length;
1022|  }, [resourceStatus]);
1023|
1024|  // ── Replay timer effect ──
1025|  useEffect(() => {
1026|    if (!isPlaying || !replayMode || !result?.trace) return;
1027|    if (replayIndex >= result.trace.length - 1) {
1028|      setIsPlaying(false);
1029|      return;
1030|    }
1031|    timerRef.current = setTimeout(() => {
1032|      setReplayIndex(prev => Math.min(prev + 1, result.trace.length - 1));
1033|    }, replaySpeed);
1034|    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
1035|  }, [isPlaying, replayIndex, replayMode, replaySpeed, result]);
1036|
1037|  // ── Replay control callbacks ──
1038|  const startReplay = useCallback(() => {
1039|    setReplayMode(true);
1040|    setReplayIndex(0);
1041|    setIsPlaying(true);
1042|  }, []);
1043|
1044|  const pauseReplay = useCallback(() => setIsPlaying(false), []);
1045|  const resumeReplay = useCallback(() => setIsPlaying(true), []);
1046|  const stepForward = useCallback(() => {
1047|    if (!result?.trace) return;
1048|    setReplayIndex(prev => Math.min(prev + 1, result.trace.length - 1));
1049|  }, [result]);
1050|  const resetReplay = useCallback(() => {
1051|    setIsPlaying(false);
1052|    setReplayIndex(0);
1053|  }, []);
1054|  const stopReplay = useCallback(() => {
1055|    setIsPlaying(false);
1056|    setReplayMode(false);
1057|    setReplayIndex(0);
1058|  }, []);
1059|
1060|  const toggleStep = (stepId) => {
1061|    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
1062|  };
1063|
1064|  const togglePhase = (phaseKey) => {
1065|    setExpandedPhases(prev => ({ ...prev, [phaseKey]: !prev[phaseKey] }));
1066|  };
1067|
1068|  const handleDryRun = async () => {
1069|    setLoading(true);
1070|    setError(null);
1071|    try {
1072|      const res = await fetch(`/api/projects/${project.id}/agentic-dry-run`, {
1073|        method: 'POST',
1074|        headers: {
1075|          'Content-Type': 'application/json',
1076|          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
1077|        }
1078|      });
1079|      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
1080|      const data = await res.json();
1081|      setResult(data);
1082|      setReplayMode(false);
1083|      setReplayIndex(0);
1084|      setIsPlaying(false);
1085|      if (onUpdateProject) {
1086|        onUpdateProject(project.id, { agenticDryRun: data });
1087|      }
1088|    } catch (err) {
1089|      setError(err.message);
1090|    } finally {
1091|      setLoading(false);
1092|    }
1093|  };
1094|
1095|  const clearResults = () => {
1096|    setResult(null);
1097|    setReplayMode(false);
1098|    setReplayIndex(0);
1099|    setIsPlaying(false);
1100|    if (onUpdateProject) {
1101|      onUpdateProject(project.id, { agenticDryRun: null });
1102|    }
1103|  };
1104|
1105|  // ── Derived metadata ──
1106|  const builtProjectName = project?.name || project?.projectName || 'UNNAMED';
1107|  
1108|  const dataSourceLabel = useMemo(() => {
1109|    if (!result) return null;
1110|    if (project?.targetTopology?.mapperNodes?.length > 0) {
1111|      return 'Using Saved Architecture';
1112|    }
1113|    if (project?.mapperNodes?.length > 0) {
1114|      return 'Using Filtered Discovery Data (Save & Proceed from Step 2.4 first)';
1115|    }
1116|    if (project?.blueprintData) {
1117|      return 'Using SOW/Quote Data';
1118|    }
1119|    return 'No Data Source Available';
1120|  }, [result, project]);
1121|
1122|  const inScopeCount = useMemo(() => {
1123|    const savedNodes = project?.targetTopology?.mapperNodes;
1124|    if (savedNodes && savedNodes.length > 0) return savedNodes.length;
1125|    const topologyFilter = project?.topologyFilter || 'All';
1126|    const allNodes = project?.mapperNodes || [];
1127|    if (topologyFilter === 'In SOW') {
1128|      return allNodes.filter(n => n.status === 'Matched' || n.status === 'Quoted Only').length;
1129|    } else if (topologyFilter === 'In Discovery') {
1130|      return allNodes.filter(n => n.status === 'Matched' || n.status === 'Live Only').length;
1131|    } else if (topologyFilter && topologyFilter !== 'All') {
1132|      return allNodes.filter(n => n.status === topologyFilter).length;
1133|    }
1134|    return allNodes.length;
1135|  }, [project]);
1136|
1137|  const allNodesCount = useMemo(() => {
1138|    return (project?.mapperNodes || []).length;
1139|  }, [project]);
1140|
1141|  // ── Trace analysis ──
1142|  const { totalSteps, phaseGroups, waveGroups } = useMemo(() => {
1143|    const trace = result?.trace || [];
1144|    const groups = {};
1145|    trace.forEach(step => {
1146|      const phase = step.phase || 'UNKNOWN';
1147|      if (!groups[phase]) groups[phase] = [];
1148|      groups[phase].push(step);
1149|    });
1150|
1151|    const waves = [];
1152|    const wSteps = groups['PHASE_4_2'] || [];
1153|    let currentWave = null;
1154|    wSteps.forEach(step => {
1155|      if (step.action === 'WAVE_START') {
1156|        currentWave = {
1157|          name: 'Wave ' + (step.wave_index || step.wave_number || (waves.length + 1)),
1158|          servers: step.server_count || 0,
1159|          steps: [step]
1160|        };
1161|        waves.push(currentWave);
1162|      } else if (currentWave) {
1163|        currentWave.steps.push(step);
1164|        if (step.action === 'WAVE_COMPLETE') currentWave = null;
1165|      }
1166|    });
1167|
1168|    return {
1169|      totalSteps: trace.length,
1170|      phaseGroups: groups,
1171|      waveGroups: waves
1172|    };
1173|  }, [result]);
1174|
1175|  const summary = result?.summary;
1176|
1177|  // ── Phase configuration ──
1178|  // ── Phase configuration — dynamic for any phase key ──
1179|  const getPhaseConfig = (phaseKey) => {
1180|    const known = {
1181|      'PHASE_4_0': { icon: 'fa-rocket', label: 'Phase 4.0 — Initialisation', color: '#faad14' },
1182|      'PHASE_4_1': { icon: 'fa-network-wired', label: 'Phase 4.1 — Network Fabric', color: '#1890ff' },
1183|      'PHASE_4_2': { icon: 'fa-server', label: 'Phase 4.2 — Wave Processing', color: '#722ed1' },
1184|      'PHASE_4_7': { icon: 'fa-broom', label: 'Phase 4.7 — Cleanup & Handoff', color: '#52c41a' },
1185|      'PHASE_4_8': { icon: 'fa-flag-checkered', label: 'Phase 4.8 — Finalize & Handoff', color: '#13c2c2' },
1186|    };
1187|    if (known[phaseKey]) return known[phaseKey];
1188|    const clean = phaseKey.replace('PHASE_', '');
1189|    const parts = clean.split('_');
1190|    const phaseNum = (parts[0] || '').replace(/_/g, '.');
1191|    const actionLabel = parts.slice(1).join(' ').replace(/_/g, ' ') || 'Sub-step';
1192|    return { icon: 'fa-cogs', label: `Phase ${phaseNum} — ${actionLabel}`, color: '#8c8c8c' };
1193|  };
1194|
1195|  // ── Build phase collapse items — iterate ALL dynamic phase groups ──
1196|  const phaseItems = Object.entries(phaseGroups)
1197|    .filter(([key, steps]) => steps && steps.length > 0)
1198|    .map(([key, steps]) => {
1199|      const cfg = getPhaseConfig(key);
1200|      return {
1201|        key,
1202|        label: (
1203|          <Space>
1204|            <i className={'fas ' + cfg.icon} style={{ color: cfg.color }}></i>
1205|            <Text strong style={{ fontSize: 13 }}>{cfg.label}</Text>
1206|            <Tag color="default">{steps.length} steps</Tag>
1207|          </Space>
1208|        ),
1209|        children: (
1210|          <div>
1211|            {key === 'PHASE_4_2' && waveGroups.length > 0 ? (
1212|              waveGroups.map((wave, wi) => (
1213|                <div key={wi} style={{ marginBottom: 12 }}>
1214|                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 10px', background: '#f9f0ff', borderRadius: 6 }}>
1215|                    <i className="fas fa-play-circle" style={{ color: '#722ed1', fontSize: 12 }}></i>
1216|                    <Text strong style={{ fontSize: 12, color: '#722ed1', textTransform: 'uppercase', letterSpacing: 1 }}>
1217|                      {wave.name}
1218|                    </Text>
1219|                    <Text type="secondary" style={{ fontSize: 10 }}>
1220|                      {wave.servers} servers • {wave.steps.filter(s => s.action !== 'WAVE_START' && s.action !== 'WAVE_COMPLETE' && s.action !== 'HANDOFF').length} operations
1221|                    </Text>
1222|                  </div>
1223|                  <div>
1224|                    {wave.steps.map((step, idx) => (
1225|                      <TraceEntry
1226|                        key={step.id}
1227|                        step={step}
1228|                        isLast={idx === wave.steps.length - 1 && wi === waveGroups.length - 1}
1229|                        isExpanded={expandedSteps[step.id] || false}
1230|                        onToggle={() => toggleStep(step.id)}
1231|                      />
1232|                    ))}
1233|                  </div>
1234|                </div>
1235|              ))
1236|            ) : (
1237|              steps.map((step, idx) => (
1238|                <TraceEntry
1239|                  key={step.id}
1240|                  step={step}
1241|                  isLast={idx === steps.length - 1}
1242|                  isExpanded={expandedSteps[step.id] || false}
1243|                  onToggle={() => toggleStep(step.id)}
1244|                />
1245|              ))
1246|            )}
1247|          </div>
1248|        ),
1249|      };
1250|    });
1251|
1252|  return (
1253|    <Space direction="vertical" size={16} style={{ width: '100%' }}>
1254|      {/* Trigger panel */}
1255|      <Card
1256|        styles={{ body: { padding: '20px 24px' } }}
1257|      >
1258|        <Row gutter={[24, 16]} align="middle">
1259|          <Col flex="1" xs={24}>
1260|            <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
1261|              <RobotOutlined style={{ color: '#722ed1' }} />
1262|              Agentic Orchestration — Dry-Run Simulation
1263|            </Title>
1264|            <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
1265|              Simulate how Hermes would autonomously process all waves for this project. No cloud resources are provisioned or modified. Each step shows the exact CLI/API commands, resource specs, dependencies, and troubleshooting paths.
1266|            </Text>
1267|          </Col>
1268|          <Col>
1269|            <Space size={8}>
1270|              <Button
1271|                type="primary"
1272|                icon={loading ? <Spin size="small" /> : <PlayCircleOutlined />}
1273|                loading={loading}
1274|                onClick={handleDryRun}
1275|                disabled={loading}
1276|                style={{ background: '#722ed1', borderColor: '#722ed1' }}
1277|              >
1278|                {loading ? 'Simulating...' : result ? 'Re-run Simulation' : 'Run Simulation'}
1279|              </Button>
1280|              {result && (
1281|                <Button onClick={clearResults}>Clear Results</Button>
1282|              )}
1283|            </Space>
1284|          </Col>
1285|        </Row>
1286|        
1287|        {/* Data source badge */}
1288|        {dataSourceLabel && (
1289|          <Row gutter={12} style={{ marginTop: 12 }}>
1290|            <Col>
1291|              <Text type="secondary">
1292|                Resources in Target Architecture:
1293|              </Text>
1294|            </Col>
1295|            <Col>
1296|              <Tag color="processing">{inScopeCount} / {allNodesCount}</Tag>
1297|            </Col>
1298|            <Col>
1299|              <Tag color={project?.targetTopology?.mapperNodes?.length > 0 ? 'success' : 'warning'}>
1300|                {dataSourceLabel}
1301|              </Tag>
1302|            </Col>
1303|          </Row>
1304|        )}
1305|        
1306|        {error && (
1307|          <Alert
1308|            message="Simulation Error"
1309|            description={error}
1310|            type="error"
1311|            showIcon
1312|            closable
1313|            style={{ marginTop: 12 }}
1314|          />
1315|        )}
1316|      </Card>
1317|
1318|      {result && (
1319|        <>
1320|          {/* Summary */}
1321|          <Card
1322|            title={
1323|              <Space>
1324|                <BarChartOutlined style={{ color: '#1890ff' }} />
1325|                <Text strong style={{ fontSize: 14 }}>Simulation Summary</Text>
1326|              </Space>
1327|            }
1328|            extra={
1329|              <Button
1330|                type="link"
1331|                icon={showSummary ? <UpOutlined /> : <DownOutlined />}
1332|                onClick={() => setShowSummary(!showSummary)}
1333|              >
1334|                {showSummary ? 'Collapse' : 'Expand'}
1335|              </Button>
1336|            }
1337|            collapsible={showSummary ? 'icon' : undefined}
1338|          >
1339|            {showSummary && summary && (
1340|              <Space direction="vertical" size={16} style={{ width: '100%' }}>
1341|                {/* Top-line stats */}
1342|                <Row gutter={[16, 16]}>
1343|                  <Col xs={24} sm={12} md={8} lg={4}>
1344|                    <Statistic title="Servers" value={summary.servers_processed} valueStyle={{ fontSize: 24 }} />
1345|                  </Col>
1346|                  <Col xs={24} sm={12} md={8} lg={4}>
1347|                    <Statistic title="Waves" value={summary.total_waves} valueStyle={{ fontSize: 24 }} />
1348|                  </Col>
1349|                  <Col xs={24} sm={12} md={8} lg={4}>
1350|                    <Statistic title="Peak Agents" value={summary.peak_parallel_agents} valueStyle={{ fontSize: 24, color: '#1890ff' }} />
1351|                  </Col>
1352|                  <Col xs={24} sm={12} md={8} lg={4}>
1353|                    <Statistic
1354|                      title="Est. Duration"
1355|                      value={`${summary.estimated_wall_clock_days}d`}
1356|                      valueStyle={{ fontSize: 24, color: summary.cost_efficiency === 'UNDER_BUDGET' ? '#52c41a' : '#ff4d4f' }}
1357|                    />
1358|                  </Col>
1359|                  <Col xs={24} sm={12} md={8} lg={4}>
1360|                    <Statistic
1361|                      title="Cost Efficiency"
1362|                      value={summary.cost_efficiency === 'UNDER_BUDGET' ? 'Under Budget' : 'Over Budget'}
1363|                      valueStyle={{ fontSize: 14, color: summary.cost_efficiency === 'UNDER_BUDGET' ? '#52c41a' : '#ff4d4f' }}
1364|                    />
1365|                  </Col>
1366|                </Row>
1367|
1368|                <Divider style={{ margin: 0 }} />
1369|
1370|                {/* Budget details */}
1371|                <Row gutter={[16, 16]}>
1372|                  <Col xs={24} sm={12} md={6}>
1373|                    <Text type="secondary" style={{ fontSize: 11 }}>Throughput</Text>
1374|                    <Text strong style={{ fontSize: 14 }}>{summary.effective_throughput_mbps} Mbps</Text>
1375|                  </Col>
1376|                  <Col xs={24} sm={12} md={6}>
1377|                    <Text type="secondary" style={{ fontSize: 11 }}>Est. Cost</Text>
1378|                    <Text strong style={{ fontSize: 14 }}>${summary.cost_estimate_usd?.toLocaleString()}</Text>
1379|                  </Col>
1380|                  <Col xs={24} sm={12} md={6}>
1381|                    <Text type="secondary" style={{ fontSize: 11 }}>Budget</Text>
1382|                    <Text strong style={{ fontSize: 14 }}>${summary.budget_usd?.toLocaleString()}</Text>
1383|                  </Col>
1384|                  <Col xs={24} sm={12} md={6}>
1385|                    {summary.cost_efficiency === 'UNDER_BUDGET' ? (
1386|                      <Tag icon={<CheckCircleOutlined />} color="success">✅ Under Budget</Tag>
1387|                    ) : (
1388|                      <Tag icon={<ExclamationCircleOutlined />} color="error">⚠️ Over Budget</Tag>
1389|                    )}
1390|                  </Col>
1391|                </Row>
1392|              </Space>
1393|            )}
1394|          </Card>
1395|
1396|          {/* Learning System Stats */}
1397|          {summary?.learning_system && (
1398|            <Card
1399|              title={
1400|                <Space>
1401|                  <ExperimentOutlined style={{ color: '#4a6cf7' }} />
1402|                  <Text strong style={{ fontSize: 14 }}>Self-Learning Engine</Text>
1403|                </Space>
1404|              }
1405|              styles={{ body: { background: 'linear-gradient(135deg, #f0f5ff 0%, #f9f0ff 100%)', borderRadius: 8 } }}
1406|            >
1407|              <Row gutter={[16, 16]}>
1408|                <Col xs={24} sm={12} md={8} lg={4}>
1409|                  <Statistic title="History Records" value={summary.learning_system.total_history_records} valueStyle={{ fontSize: 20, color: '#4a6cf7' }} />
1410|                </Col>
1411|                <Col xs={24} sm={12} md={8} lg={4}>
1412|                  <Statistic title="Success Rate" value={summary.learning_system.success_rate} valueStyle={{ fontSize: 20, color: '#4a6cf7' }} />
1413|                </Col>
1414|                <Col xs={24} sm={12} md={8} lg={4}>
1415|                  <Statistic title="Projects Learned" value={summary.learning_system.unique_projects} valueStyle={{ fontSize: 20, color: '#4a6cf7' }} />
1416|                </Col>
1417|                <Col xs={24} sm={12} md={8} lg={4}>
1418|                  <Statistic title="Records Ingested" value={summary.learning_system.records_ingested} valueStyle={{ fontSize: 20, color: '#4a6cf7' }} />
1419|                </Col>
1420|                <Col xs={24} sm={12} md={8} lg={4}>
1421|                  <Statistic
1422|                    title="Strategies Known"
1423|                    value={Object.keys(summary.learning_system.strategy_distribution || {}).length}
1424|                    valueStyle={{ fontSize: 20, color: '#4a6cf7' }}
1425|                  />
1426|                </Col>
1427|              </Row>
1428|              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8, opacity: 0.7 }}>
1429|                {summary.learning_system.note}
1430|              </Text>
1431|            </Card>
1432|          )}
1433|
1434|          {/* Resource Usage */}
1435|          {summary?.resource_usage && (
1436|            <Card
1437|              title={
1438|                <Space>
1439|                  <CloudServerOutlined style={{ color: '#4a6cf7' }} />
1440|                  <Text strong style={{ fontSize: 14 }}>Simulated Resource Footprint</Text>
1441|                </Space>
1442|              }
1443|            >
1444|              <Row gutter={[12, 12]}>
1445|                {Object.entries(summary.resource_usage).map(([key, val]) => (
1446|                  key !== 'peak_parallel_agents' && (
1447|                    <Col key={key} xs={24} sm={12} md={8} lg={4}>
1448|                      <Card size="small" styles={{ body: { textAlign: 'center', padding: 12 } }}>
1449|                        <Statistic
1450|                          value={val}
1451|                          valueStyle={{ fontSize: 18, fontWeight: 700 }}
1452|                        />
1453|                        <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
1454|                          {key.replace(/_/g, ' ')}
1455|                        </Text>
1456|                      </Card>
1457|                    </Col>
1458|                  )
1459|                ))}
1460|              </Row>
1461|            </Card>
1462|          )}
1463|
1464|          {/* ── Resource Migration Comparison Board ── */}
1465|          {resources.length > 0 && (
1466|            <Card
1467|              title={
1468|                <Space>
1469|                  <i className="fas fa-balance-scale" style={{ color: '#722ed1' }}></i>
1470|                  <Text strong style={{ fontSize: 14 }}>Migration Comparison Board</Text>
1471|                </Space>
1472|              }
1473|              extra={
1474|                <Space>
1475|                  {!replayMode ? (
1476|                    <Button
1477|                      type="primary"
1478|                      icon={<PlayCircleOutlined />}
1479|                      onClick={startReplay}
1480|                      style={{ background: '#722ed1', borderColor: '#722ed1' }}
1481|                    >
1482|                      Replay Simulation
1483|                    </Button>
1484|                  ) : (
1485|                    <Button
1486|                      icon={<StopOutlined />}
1487|                      onClick={stopReplay}
1488|                    >
1489|                      Exit Replay
1490|                    </Button>
1491|                  )}
1492|                </Space>
1493|              }
1494|            >
1495|              {replayMode && (
1496|                <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 8 }}>
1497|                  <ReplayControls
1498|                    isPlaying={isPlaying}
1499|                    currentStep={replayIndex + 1}
1500|                    totalSteps={result?.trace?.length || 0}
1501|                    onPlay={resumeReplay}
1502|                    onPause={pauseReplay}
1503|                    onStep={stepForward}
1504|                    onReset={resetReplay}
1505|                    speed={replaySpeed}
1506|                    onSpeedChange={setReplaySpeed}
1507|                  />
1508|                  {result?.trace && <LiveStepCard step={result.trace[replayIndex]} />}
1509|                </Space>
1510|              )}
1511|
1512|              <Row gutter={[16, 16]}>
1513|                <Col xs={24} lg={replayMode ? 12 : 24}>
1514|                  <ResourceMigrationTracker
1515|                    resources={resources}
1516|                    resourceStatus={resourceStatus}
1517|                    activeResourceId={activeResourceId}
1518|                    completedCount={completedCount}
1519|                  />
1520|                </Col>
1521|                {replayMode && (
1522|                  <Col xs={24} lg={12}>
1523|                    <Card
1524|                      size="small"
1525|                      title={
1526|                        <Space>
1527|                          <FileTextOutlined style={{ color: '#8c8c8c' }} />
1528|                          <Text strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Cumulative Task Log</Text>
1529|                        </Space>
1530|                      }
1531|                      styles={{ body: { maxHeight: 500, overflowY: 'auto', padding: 8 } }}
1532|                    >
1533|                      <Timeline
1534|                        items={(result.trace || []).slice(0, replayIndex + 1).map((step, i) => ({
1535|                          color: step.result?.includes('success') || step.result === 'capacity_ok' || step.result === 'registered' ? 'green' :
1536|                                 step.result?.includes('error') || step.result?.includes('failed') ? 'red' :
1537|                                 step.result === 'running' || step.outcome === 'in_progress' ? 'blue' : 'gray',
1538|                          children: (
1539|                            <div>
1540|                              <Space size={8} style={{ marginBottom: 4 }}>
1541|                                <Text type="secondary" style={{ fontSize: 9, fontFamily: 'monospace' }}>{i + 1}</Text>
1542|                                <Text type="secondary" style={{ fontSize: 9, textTransform: 'uppercase' }}>
1543|                                  {(step.phase || '').replace('PHASE_', 'Φ') || '•'}
1544|                                </Text>
1545|                                <Text style={{ fontSize: 11, fontWeight: 600 }}>
1546|                                  {(step.action || '').replace(/_/g, ' ')}
1547|                                </Text>
1548|                                {step.source_label && (
1549|                                  <Tag color="purple" style={{ fontSize: 8, padding: '0 4px', margin: 0, lineHeight: '16px' }}>
1550|                                    {step.source_label}
1551|                                  </Tag>
1552|                                )}
1553|                                <StatusBadge result={step.result} outcome={step.outcome} isDryRun={true} />
1554|                              </Space>
1555|                              {step.commands && step.commands.length > 0 && (
1556|                                <div style={{ marginLeft: 32, background: '#fafafa', borderRadius: 4, padding: 4, fontFamily: 'monospace' }}>
1557|                                  {step.commands.map((c, ci) => {
1558|                                    const cmdStr = typeof c === 'object' && c !== null ? (c.cmd || c.command || JSON.stringify(c)) : c;
1559|                                    return <div key={ci} style={{ fontSize: 9, color: '#52c41a' }}>SIMULATED $ {cmdStr}</div>;
1560|                                  })}
1561|                                </div>
1562|                              )}
1563|                            </div>
1564|                          ),
1565|                        }))}
1566|                      />
1567|                      {replayIndex < 0 && (
1568|                        <Empty description="No steps executed yet — press Play to begin" image={Empty.PRESENTED_IMAGE_SIMPLE} />
1569|                      )}
1570|                    </Card>
1571|                  </Col>
1572|                )}
1573|              </Row>
1574|            </Card>
1575|          )}
1576|
1577|          {/* ── Execution Trace — Grouped by Phase ── */}
1578|          <Card
1579|            title={
1580|              <Space>
1581|                <FileTextOutlined style={{ color: '#722ed1' }} />
1582|                <Text strong style={{ fontSize: 14 }}>Execution Trace ({totalSteps} steps)</Text>
1583|              </Space>
1584|            }
1585|            extra={
1586|              <Space>
1587|                <Button
1588|                  size="small"
1589|                  type="link"
1590|                  onClick={() => setExpandedSteps(Object.fromEntries((result.trace || []).map(s => [s.id, true])))}
1591|                >
1592|                  Expand All
1593|                </Button>
1594|                <Button
1595|                  size="small"
1596|                  type="link"
1597|                  onClick={() => setExpandedSteps({})}
1598|                >
1599|                  Collapse All
1600|                </Button>
1601|              </Space>
1602|            }
1603|          >
1604|            <Collapse
1605|              activeKey={Object.entries(expandedPhases).filter(([k, v]) => v).map(([k]) => k)}
1606|              onChange={(keys) => {
1607|                const arr = Array.isArray(keys) ? keys : (keys ? [keys] : []);
1608|                const next = {};
1609|                arr.forEach(k => { next[k] = true; });
1610|                setExpandedPhases(next);
1611|              }}
1612|              items={phaseItems}
1613|            />
1614|          </Card>
1615|
1616|          {/* ── Simulation Constellation (at end, with button + fullscreen) ── */}
1617|          <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 8 }}>
1618|            <Button
1619|              type={showConstellation ? 'primary' : 'default'}
1620|              icon={<i className="fas fa-project-diagram" />}
1621|              onClick={() => setShowConstellation(!showConstellation)}
1622|            >
1623|              {showConstellation ? 'Hide' : 'View'} Simulation Constellation
1624|            </Button>
1625|            {showConstellation && (
1626|              <Button
1627|                type="link"
1628|                icon={<FullscreenOutlined />}
1629|                onClick={() => setConstellationFullscreen(true)}
1630|                style={{ marginLeft: 8 }}
1631|              >
1632|                Fullscreen
1633|              </Button>
1634|            )}
1635|          </div>
1636|          {showConstellation && (
1637|            <SimulationConstellation
1638|              trace={result?.trace || []}
1639|              resourceUsage={summary?.resource_usage || {}}
1640|              resources={resources}
1641|            />
1642|          )}
1643|
1644|          {/* Fullscreen constellation modal */}
1645|          {constellationFullscreen && (
1646|            <div
1647|              style={{
1648|                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
1649|                background: '#0f0f1a', zIndex: 9999, padding: 24,
1650|                overflow: 'auto',
1651|              }}
1652|            >
1653|              <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10000 }}>
1654|                <Button
1655|                  type="primary"
1656|                  danger
1657|                  icon={<CloseOutlined />}
1658|                  onClick={() => setConstellationFullscreen(false)}
1659|                >
1660|                  Close Fullscreen
1661|                </Button>
1662|              </div>
1663|              <SimulationConstellation
1664|                trace={result?.trace || []}
1665|                resourceUsage={summary?.resource_usage || {}}
1666|                resources={resources}
1667|              />
1668|            </div>
1669|          )}
1670|
1671|          {/* Comparison Toggle */}
1672|          <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
1673|            <Button
1674|              type="link"
1675|              size="small"
1676|              onClick={() => window.dispatchEvent(new CustomEvent('hermes:show-standard-view'))}
1677|            >
1678|              <i className="fas fa-project-diagram"></i> Switch to Standard Methodology View
1679|            </Button>
1680|            <Divider type="vertical" />
1681|            <Space>
1682|              <SafetyCertificateOutlined style={{ fontSize: 10 }} />
1683|              <Text type="secondary" style={{ fontSize: 11 }}>
1684|                DRY-RUN — No cloud resources were provisioned or modified.
1685|              </Text>
1686|            </Space>
1687|          </div>
1688|        </>
1689|      )}
1690|    </Space>
1691|  );
1692|}