import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Card, Collapse, Space, Statistic, Badge, Progress, Table, Descriptions,
  Alert, Button, Tag, Typography, Divider, Row, Col, Tooltip,
  Empty, Spin, Timeline, Tabs, Drawer
} from 'antd';
import {
  RobotOutlined, PlayCircleOutlined, PauseCircleOutlined,
  StopOutlined, RedoOutlined, DownOutlined, UpOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined,
  ClockCircleOutlined, ThunderboltOutlined, RocketOutlined,
  CloudServerOutlined, ClearOutlined, DeploymentUnitOutlined,
  BarChartOutlined, SettingOutlined, GlobalOutlined,
  CopyOutlined, CheckOutlined, ArrowRightOutlined,
  DatabaseOutlined, DesktopOutlined, WifiOutlined,
  SwapOutlined, SafetyCertificateOutlined, FileTextOutlined,
  ExperimentOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

/* ── Utility: safely coerce any value to a string for JSX rendering ── */
const S = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    if (Array.isArray(v)) return v.map(S).join(', ');
    if (v.cmd && v.desc) return v.cmd + ' — ' + v.desc;
    if (v.cmd) return v.cmd;
    if (v.desc) return v.desc;
    if (v.message) return v.message;
    try { return JSON.stringify(v); } catch(e) { return '[object]'; }
  }
  return String(v);
};

/* ── Sub-component: Copy-to-clipboard button ── */
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
      <Button
        type="text"
        size="small"
        icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
        onClick={handleCopy}
        style={{ fontSize: 10 }}
      />
    </Tooltip>
  );
};

/* ── Sub-component: Status badge (PASS / FAIL / BLOCKED / WARN) ── */
const StatusBadge = ({ result, outcome, isDryRun }) => {
  let status = (result || outcome || '').toLowerCase();
  const raw = (result || outcome || '');
  const isHypothetical = raw === 'hypothetical_path_displayed';
  const isSimulated = raw === 'simulated_cleanup' || raw === 'simulated_complete';
  const isBlocked = raw.startsWith('BLOCKED') || status.includes('blocked');
  const isSuccess = (status.includes('success') || status === 'capacity_ok' || status === 'registered' || status.startsWith('simulated')) && !isBlocked;
  const isWarn = status.includes('warn') || status.includes('retry');
  const isFail = (status.includes('error') || status.includes('failed')) && !isBlocked;
  
  if (isHypothetical) {
    return <Tag icon={<ExperimentOutlined />} color="cyan">HYPOTHETICAL</Tag>;
  }
  if (isSimulated) {
    return <Tag icon={<CheckCircleOutlined />} style={{ color: '#52c41a', borderColor: '#d9f7be', background: '#f6ffed' }}>SIMULATED (dry-run)</Tag>;
  }
  if (isBlocked) {
    return <Tag icon={<CloseCircleOutlined />} style={{ color: '#fa8c16', borderColor: '#ffe7ba', background: '#fff7e6' }}>BLOCKED</Tag>;
  }
  if (isSuccess) {
    return <Tag icon={<CheckCircleOutlined />} color="success">OK</Tag>;
  } else if (isWarn) {
    return <Tag icon={<ExclamationCircleOutlined />} color="warning">WARN</Tag>;
  } else if (isFail) {
    return <Tag icon={<CloseCircleOutlined />} color="error">FAIL</Tag>;
  } else {
    return <Tag icon={<ClockCircleOutlined />}>{(result || outcome || 'pending').toUpperCase()}</Tag>;
  }
};

/* ── Sub-component: Dependency resolution display ── */
const DependencyBadge = ({ deps }) => {
  if (!deps || deps.length === 0) return null;
  return (
    <Space size={4} wrap>
      {deps.map((dep, i) => (
        <Tag
          key={i}
          icon={dep.status === 'ok' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
          color={dep.status === 'ok' ? 'success' : 'warning'}
        >
          {dep.name}
        </Tag>
      ))}
    </Space>
  );
};

/* ── Sub-component: Trace entry (one step) ── */
const TraceEntry = ({ step, isLast, isExpanded, onToggle }) => {
  const isRunning = step.result === 'running' || step.outcome === 'in_progress';
  const isSuccess = step.result === 'capacity_ok' || step.result === 'registered' || (step.result || '').includes('success');
  const isFail = (step.result || '').includes('error') || (step.result || '').includes('failed') || step.result === 'not_resolved';
  
  const iconColor = isRunning ? '#1890ff' : isSuccess ? '#52c41a' : isFail ? '#ff4d4f' : '#8c8c8c';
  const icon = isRunning ? 'fa-spinner fa-spin' : isSuccess ? 'fa-check' : isFail ? 'fa-times' : 'fa-circle';
  
  return (
    <div style={{ paddingLeft: 24, paddingRight: 16, paddingBottom: 8 }}>
      <div
        onClick={onToggle}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
      >
        {/* Status icon */}
        <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, background: iconColor + '15' }}>
          <i className={'fas ' + icon} style={{ color: iconColor, fontSize: 10 }}></i>
        </div>
        
        {/* Step info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Space size={8} wrap>
            <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              {step.action?.replace(/_/g, ' ')}
            </Text>
            {step.source_label && (
              <Tag color="purple" style={{ fontSize: 8, padding: '0 4px', margin: 0, lineHeight: '16px', borderRadius: 3 }}>
                {step.source_label}
              </Tag>
            )}
            <StatusBadge result={step.result} outcome={step.outcome} isDryRun={true} />
            {step.duration_ms && (
              <Text type="secondary" style={{ fontSize: 10 }}>{step.duration_ms}ms</Text>
            )}
          </Space>
          <Paragraph style={{ margin: '4px 0 0', fontSize: 12, color: '#595959', lineHeight: 1.5 }}>
            {step.message || step.description || step.decision?.message || ''}
          </Paragraph>
          <DependencyBadge deps={step.dependencies} />
        </div>
        
        {/* Expand indicator */}
        <i className={'fas fa-chevron-' + (isExpanded ? 'up' : 'down')} style={{ color: '#8c8c8c', fontSize: 10, flexShrink: 0, marginTop: 4 }}></i>
      </div>
      
      {/* Expanded body: commands, config, troubleshooting */}
      {isExpanded && (
        <div style={{ paddingLeft: 36, marginTop: 8 }}>
          {/* CLI Commands */}
          {step.commands && step.commands.length > 0 && (
            <div style={{ background: '#f5f5f5', borderRadius: 6, padding: 10, marginBottom: 8 }}>
              <Text strong style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#8c8c8c' }}>
                CLI / API Commands (SIMULATED — dry-run)
              </Text>
              <div style={{ marginTop: 6 }}>
                {step.commands.map((cmd, i) => {
                  const cmdStr = typeof cmd === 'object' && cmd !== null ? (cmd.cmd || cmd.command || JSON.stringify(cmd)) : cmd;
                  const descStr = typeof cmd === 'object' && cmd !== null ? (cmd.desc || cmd.description || '') : '';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 2 }}>
                      <span style={{ color: '#d9d9d9', flexShrink: 0 }}>SIMULATED $</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <code style={{ fontSize: 11, color: '#262626', wordBreak: 'break-all', fontStyle: 'italic' }}>{cmdStr}</code>
                        {descStr && <div style={{ fontSize: 9, color: '#8c8c8c' }}>{descStr}</div>}
                      </div>
                      <CopyButton text={cmdStr} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Resource Spec */}
          {step.decision?.resource_spec && (
            <Descriptions
              size="small"
              bordered
              column={2}
              title={<Text strong style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#8c8c8c' }}>Resource Specification</Text>}
            >
              {Object.entries(step.decision.resource_spec).map(([k, v]) => (
                <Descriptions.Item key={k} label={k.replace(/_/g, ' ')}>
                  <Text strong>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</Text>
                </Descriptions.Item>
              ))}
            </Descriptions>
          )}
          
          {/* Troubleshooting */}
          {step.troubleshooting && (
            <Alert
              message={<><ExclamationCircleOutlined /> Troubleshooting</>}
              description={step.troubleshooting}
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
            />
          )}
          
          {/* Dependencies detail */}
          {step.decision?.dependencies_detail && step.decision.dependencies_detail.length > 0 && (
            <div style={{ background: '#f0f5ff', borderRadius: 6, padding: 10, marginBottom: 8 }}>
              <Text strong style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#4a6cf7' }}>
                Dependencies
              </Text>
              <div style={{ marginTop: 4 }}>
                {step.decision.dependencies_detail.map((dep, i) => (
                  <Text key={i} style={{ color: '#2f54eb', fontSize: 12 }}>{dep}</Text>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Sub-component: Phase grouping header ── */
const PhaseHeader = ({ icon, label, color, count, isExpanded, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      background: isExpanded ? '#fff' : '#fafafa',
      borderBottom: '1px solid #f0f0f0',
      transition: 'background 0.2s'
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
    onMouseLeave={(e) => e.currentTarget.style.background = isExpanded ? '#fff' : '#fafafa'}
  >
    <div style={{ width: 36, height: 36, background: color, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <i className={'fas ' + icon} style={{ color: '#fff', fontSize: 16 }}></i>
    </div>
    <div style={{ flex: 1 }}>
      <Text strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: '#262626' }}>{label}</Text>
    </div>
    <Text type="secondary" style={{ fontSize: 11 }}>{count} steps</Text>
    <i className={'fas fa-chevron-' + (isExpanded ? 'up' : 'down')} style={{ color: '#8c8c8c', fontSize: 12 }}></i>
  </div>
);

/* ── Sub-component: Individual resource card ── */
const ResourceCard = ({ resource, status, isHighlighted }) => {
  const statusConfig = {
    pending: { icon: <ClockCircleOutlined />, color: '#d9d9d9', text: '#8c8c8c', bg: '#fafafa' },
    active: { icon: <ClockCircleOutlined />, color: '#1890ff', text: '#1890ff', bg: '#e6f7ff' },
    completed: { icon: <CheckCircleOutlined />, color: '#52c41a', text: '#52c41a', bg: '#f6ffed' },
    failed: { icon: <CloseCircleOutlined />, color: '#ff4d4f', text: '#ff4d4f', bg: '#fff2f0' },
    skipped: { icon: <ArrowRightOutlined />, color: '#faad14', text: '#faad14', bg: '#fffbe6' },
  };
  const cfg = statusConfig[status] || statusConfig.pending;
  
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
      borderRadius: 6, background: cfg.bg,
      transition: 'all 0.3s',
      border: isHighlighted ? '2px solid #722ed1' : '1px solid #f0f0f0',
      boxShadow: isHighlighted ? '0 2px 8px rgba(114,46,209,0.15)' : 'none',
      transform: isHighlighted ? 'scale(1.02)' : 'scale(1)'
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: cfg.color + '20' }}>
        <i className={'fas ' + (status === 'active' ? 'fa-spinner fa-spin' : status === 'completed' ? 'fa-check' : status === 'failed' ? 'fa-times' : status === 'skipped' ? 'fa-forward' : 'fa-clock')} style={{ color: cfg.color, fontSize: 12 }}></i>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {resource.name || resource.id || 'Unknown'}
        </Text>
        <Text type="secondary" style={{ fontSize: 9, textTransform: 'uppercase' }}>
          {resource.type || '?'}{resource.os ? ' · ' + resource.os : ''}
        </Text>
      </div>
      <Text style={{ fontSize: 9, textTransform: 'uppercase', color: cfg.text, flexShrink: 0, fontWeight: 700 }}>{status}</Text>
    </div>
  );
};

/* ── Sub-component: Resource Migration Tracker Panel ── */
const ResourceMigrationTracker = ({ resources, resourceStatus, activeResourceId, completedCount }) => {
  const progressPercent = resources.length > 0 ? Math.round((completedCount / resources.length) * 100) : 0;
  
  return (
    <Card
      size="small"
      title={
        <Space>
          <CloudServerOutlined style={{ color: '#4a6cf7' }} />
          <Text strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Resource Migration Tracker</Text>
        </Space>
      }
      extra={
        <Space size={8}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            <Text strong style={{ color: '#4a6cf7' }}>{completedCount}</Text>/{resources.length} completed
          </Text>
        </Space>
      }
      style={{ height: '100%' }}
      bodyStyle={{ padding: '12px' }}
    >
      <Progress
        percent={progressPercent}
        size="small"
        strokeColor={{ '0%': '#4a6cf7', '100%': '#722ed1' }}
        format={(p) => `${p}%`}
        style={{ marginBottom: 12 }}
      />
      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          {resources.map((r, i) => (
            <ResourceCard
              key={r.id || r.name || i}
              resource={r}
              status={resourceStatus[r.id] || resourceStatus[r.name] || 'pending'}
              isHighlighted={(r.id || r.name) === activeResourceId}
            />
          ))}
          {resources.length === 0 && (
            <Empty description="No resources loaded" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Space>
      </div>
    </Card>
  );
};

/* ── Sub-component: Replay controls ── */
const ReplayControls = ({ isPlaying, currentStep, totalSteps, onPlay, onPause, onStep, onReset, speed, onSpeedChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
    <Button size="small" icon={<RedoOutlined />} onClick={onReset} title="Reset" />
    <Button
      size="small"
      type="primary"
      icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
      onClick={isPlaying ? onPause : onPlay}
      style={{ background: isPlaying ? '#ff4d4f' : '#722ed1', borderColor: isPlaying ? '#ff4d4f' : '#722ed1' }}
    >
      {isPlaying ? 'Pause' : 'Play'}
    </Button>
    <Button size="small" icon={<ArrowRightOutlined />} onClick={onStep} disabled={isPlaying || currentStep >= totalSteps} title="Step Forward" />
    <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
      {currentStep}/{totalSteps}
    </Text>
    <div style={{ width: 1, height: 16, background: '#d9d9d9' }}></div>
    <select
      value={speed}
      onChange={(e) => onSpeedChange(Number(e.target.value))}
      style={{ background: '#fafafa', color: '#595959', fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px', border: '1px solid #d9d9d9' }}
    >
      <option value={2000}>0.5x</option>
      <option value={1000}>1x</option>
      <option value={500}>2x</option>
      <option value={150}>5x</option>
      <option value={50}>10x</option>
    </select>
  </div>
);

/* ── Sub-component: Live step indicator ── */
const LiveStepCard = ({ step }) => {
  if (!step) return null;
  const phaseLabel = (step.phase || '').replace('PHASE_', 'Φ') || '•';
  return (
    <Card
      size="small"
      style={{
        background: 'linear-gradient(135deg, #f9f0ff 0%, #e6f7ff 100%)',
        border: '2px solid #722ed1',
        borderRadius: 8
      }}
      bodyStyle={{ padding: 12 }}
    >
      <Space size={12} style={{ width: '100%' }}>
        <div style={{ width: 32, height: 32, background: '#722ed1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-bolt" style={{ color: '#fff', fontSize: 14 }}></i>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 10, color: '#722ed1', textTransform: 'uppercase', letterSpacing: 2 }}>
              {phaseLabel} · {step.action}
            </Text>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {step.message || S(step.description || (step.decision && step.decision.message) || step.result)}
            </Text>
        </div>
        <StatusBadge result={step.result} outcome={step.outcome} isDryRun={true} />
      </Space>
      {step.commands && step.commands.length > 0 && (
        <div style={{ marginTop: 8, background: '#262626', borderRadius: 6, padding: 8, fontFamily: 'monospace' }}>
          {step.commands.map((c, i) => {
            const cmdStr = typeof c === 'object' && c !== null ? (c.cmd || c.command || JSON.stringify(c)) : c;
            const descStr = typeof c === 'object' && c !== null ? (c.desc || c.description || '') : '';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 2 }}>
                <span style={{ color: '#8c8c8c', flexShrink: 0 }}>$</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: '#52c41a', fontSize: 10 }}>{cmdStr}</span>
                  {descStr && <div style={{ fontSize: 9, color: '#8c8c8c' }}>{descStr}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

/* ── Main Component ── */
export default function AgenticOrchestrationPanel({ project, onUpdateProject }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(project?.agenticDryRun || null);
  const [error, setError] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});
  const [expandedPhases, setExpandedPhases] = useState({
    'PHASE_4_0': true, 'PHASE_4_1': true, 'PHASE_4_2': true,
    'PHASE_4_2a': true, 'PHASE_4_2a_BLOCKED': true,
    'PHASE_4_2b': true, 'PHASE_4_2c': true, 'PHASE_4_2d': true,
    'PHASE_4_2e': true, 'PHASE_4_2f': true, 'PHASE_4_2f_POST': true,
    'PHASE_4_3': true, 'PHASE_4_4': true, 'PHASE_4_5': true,
    'PHASE_4_6': true, 'PHASE_4_7': true, 'PHASE_4_8': true,
  });
  const [showSummary, setShowSummary] = useState(true);

  // ── Replay state ──
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1000);

  // 🐛 FIX: Reset all local state when project changes (prevents stale simulation from previous project)
  const prevProjectId = useRef(project?.id);
  useEffect(() => {
    if (prevProjectId.current !== project?.id) {
      setResult(project?.agenticDryRun || null);
      setError(null);
      setExpandedSteps({});
      setExpandedPhases({
        'PHASE_4_0': true, 'PHASE_4_1': true, 'PHASE_4_2': true,
        'PHASE_4_2a': true, 'PHASE_4_2a_BLOCKED': true,
        'PHASE_4_2b': true, 'PHASE_4_2c': true, 'PHASE_4_2d': true,
        'PHASE_4_2e': true, 'PHASE_4_2f': true, 'PHASE_4_2f_POST': true,
        'PHASE_4_3': true, 'PHASE_4_4': true, 'PHASE_4_5': true,
        'PHASE_4_6': true, 'PHASE_4_7': true, 'PHASE_4_8': true,
      });
      setShowSummary(true);
      setReplayMode(false);
      setReplayIndex(0);
      setIsPlaying(false);
      prevProjectId.current = project?.id;
    }
  }, [project?.id]);
  const timerRef = useRef(null);

  const token = sessionStorage.getItem('hermes_access_token');

  // ── Extract resources from project data ──
  const resources = useMemo(() => {
    const topologyFilter = project?.topologyFilter || 'All';
    let nodes = project?.mapperNodes || [];
    if (topologyFilter === 'In SOW') {
      nodes = nodes.filter(n => n.status === 'Matched' || n.status === 'Quoted Only');
    } else if (topologyFilter === 'In Discovery') {
      nodes = nodes.filter(n => n.status === 'Matched' || n.status === 'Live Only');
    } else if (topologyFilter && topologyFilter !== 'All') {
      nodes = nodes.filter(n => n.status === topologyFilter);
    }
    return nodes.filter(n => {
      const type = (n.type || '').toUpperCase();
      return type === 'ECS' || type === 'COMPUTE' || type === 'RDS' || type === 'DATABASE' || type === 'STORAGE' || type === 'OBS';
    });
  }, [project?.mapperNodes, project?.topologyFilter]);

  // ── Compute resource status from trace up to replayIndex ──
  const resourceStatus = useMemo(() => {
    if (!result?.trace || resources.length === 0) return {};
    const status = {};
    resources.forEach(r => { status[r.id || r.name] = 'pending'; });

    const visibleTrace = replayMode ? result.trace.slice(0, replayIndex + 1) : result.trace;
    
    visibleTrace.forEach(step => {
      const serverId = step.server_id || (step.decision && step.decision.server_id) || (step.decision && step.decision.server_name) || '';
      const serverName = (step.decision && step.decision.server_name) || '';
      const matched = resources.find(r =>
        (r.id && (r.id === serverId || r.id === serverName)) ||
        (r.name && (r.name === serverId || r.name === serverName))
      );

      if (matched) {
        const key = matched.id || matched.name;
        const resultOutcome = (step.result || step.outcome || '').toLowerCase();
        const isSuccess = resultOutcome.includes('success') || resultOutcome === 'capacity_ok' || resultOutcome === 'registered';
        const isFail = resultOutcome.includes('error') || resultOutcome.includes('failed') || resultOutcome.includes('blocked') || resultOutcome === 'not_resolved';
        const isComplete = step.action === 'WAVE_COMPLETE' || step.action === 'SERVER_COMPLETE' || step.action === 'HANDOFF';

        if (isComplete || isSuccess) { status[key] = 'completed'; }
        else if (isFail) { status[key] = 'failed'; }
        else if (step.action !== 'WAVE_START') { status[key] = 'active'; }
      }
    });
    return status;
  }, [result, replayIndex, replayMode, resources]);

  // ── Active resource and completed count ──
  const activeResourceId = useMemo(() => {
    if (!replayMode || !result?.trace) return null;
    const step = result.trace[replayIndex];
    if (!step) return null;
    const sid = step.server_id || (step.decision && step.decision.server_id) || (step.decision && step.decision.server_name) || '';
    const matched = resources.find(r => r.id === sid || r.name === sid);
    return matched ? (matched.id || matched.name) : null;
  }, [replayMode, replayIndex, result, resources]);

  const completedCount = useMemo(() => {
    return Object.values(resourceStatus).filter(s => s === 'completed').length;
  }, [resourceStatus]);

  // ── Replay timer effect ──
  useEffect(() => {
    if (!isPlaying || !replayMode || !result?.trace) return;
    if (replayIndex >= result.trace.length - 1) {
      setIsPlaying(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      setReplayIndex(prev => Math.min(prev + 1, result.trace.length - 1));
    }, replaySpeed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, replayIndex, replayMode, replaySpeed, result]);

  // ── Replay control callbacks ──
  const startReplay = useCallback(() => {
    setReplayMode(true);
    setReplayIndex(0);
    setIsPlaying(true);
  }, []);

  const pauseReplay = useCallback(() => setIsPlaying(false), []);
  const resumeReplay = useCallback(() => setIsPlaying(true), []);
  const stepForward = useCallback(() => {
    if (!result?.trace) return;
    setReplayIndex(prev => Math.min(prev + 1, result.trace.length - 1));
  }, [result]);
  const resetReplay = useCallback(() => {
    setIsPlaying(false);
    setReplayIndex(0);
  }, []);
  const stopReplay = useCallback(() => {
    setIsPlaying(false);
    setReplayMode(false);
    setReplayIndex(0);
  }, []);

  const toggleStep = (stepId) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const togglePhase = (phaseKey) => {
    setExpandedPhases(prev => ({ ...prev, [phaseKey]: !prev[phaseKey] }));
  };

  const handleDryRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/agentic-dry-run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      setResult(data);
      setReplayMode(false);
      setReplayIndex(0);
      setIsPlaying(false);
      if (onUpdateProject) {
        onUpdateProject(project.id, { agenticDryRun: data });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResult(null);
    setReplayMode(false);
    setReplayIndex(0);
    setIsPlaying(false);
    if (onUpdateProject) {
      onUpdateProject(project.id, { agenticDryRun: null });
    }
  };

  // ── Derived metadata ──
  const builtProjectName = project?.name || project?.projectName || 'UNNAMED';
  
  const dataSourceLabel = useMemo(() => {
    if (!result) return null;
    if (project?.targetTopology?.mapperNodes?.length > 0) {
      return 'Using Saved Architecture';
    }
    if (project?.mapperNodes?.length > 0) {
      return 'Using Filtered Discovery Data (Save & Proceed from Step 2.4 first)';
    }
    if (project?.blueprintData) {
      return 'Using SOW/Quote Data';
    }
    return 'No Data Source Available';
  }, [result, project]);

  const inScopeCount = useMemo(() => {
    const savedNodes = project?.targetTopology?.mapperNodes;
    if (savedNodes && savedNodes.length > 0) return savedNodes.length;
    const topologyFilter = project?.topologyFilter || 'All';
    const allNodes = project?.mapperNodes || [];
    if (topologyFilter === 'In SOW') {
      return allNodes.filter(n => n.status === 'Matched' || n.status === 'Quoted Only').length;
    } else if (topologyFilter === 'In Discovery') {
      return allNodes.filter(n => n.status === 'Matched' || n.status === 'Live Only').length;
    } else if (topologyFilter && topologyFilter !== 'All') {
      return allNodes.filter(n => n.status === topologyFilter).length;
    }
    return allNodes.length;
  }, [project]);

  const allNodesCount = useMemo(() => {
    return (project?.mapperNodes || []).length;
  }, [project]);

  // ── Trace analysis ──
  const { totalSteps, phaseGroups, waveGroups } = useMemo(() => {
    const trace = result?.trace || [];
    const groups = {};
    trace.forEach(step => {
      const phase = step.phase || 'UNKNOWN';
      if (!groups[phase]) groups[phase] = [];
      groups[phase].push(step);
    });

    const waves = [];
    const wSteps = groups['PHASE_4_2'] || [];
    let currentWave = null;
    wSteps.forEach(step => {
      if (step.action === 'WAVE_START') {
        currentWave = {
          name: 'Wave ' + (step.wave_index || step.wave_number || (waves.length + 1)),
          servers: step.server_count || 0,
          steps: [step]
        };
        waves.push(currentWave);
      } else if (currentWave) {
        currentWave.steps.push(step);
        if (step.action === 'WAVE_COMPLETE') currentWave = null;
      }
    });

    return {
      totalSteps: trace.length,
      phaseGroups: groups,
      waveGroups: waves
    };
  }, [result]);

  const summary = result?.summary;

  // ── Phase configuration ──
  // ── Phase configuration — dynamic for any phase key ──
  const getPhaseConfig = (phaseKey) => {
    const known = {
      'PHASE_4_0': { icon: 'fa-rocket', label: 'Phase 4.0 — Initialisation', color: '#faad14' },
      'PHASE_4_1': { icon: 'fa-network-wired', label: 'Phase 4.1 — Network Fabric', color: '#1890ff' },
      'PHASE_4_2': { icon: 'fa-server', label: 'Phase 4.2 — Wave Processing', color: '#722ed1' },
      'PHASE_4_7': { icon: 'fa-broom', label: 'Phase 4.7 — Cleanup & Handoff', color: '#52c41a' },
      'PHASE_4_8': { icon: 'fa-flag-checkered', label: 'Phase 4.8 — Finalize & Handoff', color: '#13c2c2' },
    };
    if (known[phaseKey]) return known[phaseKey];
    const clean = phaseKey.replace('PHASE_', '');
    const parts = clean.split('_');
    const phaseNum = (parts[0] || '').replace(/_/g, '.');
    const actionLabel = parts.slice(1).join(' ').replace(/_/g, ' ') || 'Sub-step';
    return { icon: 'fa-cogs', label: `Phase ${phaseNum} — ${actionLabel}`, color: '#8c8c8c' };
  };

  // ── Build phase collapse items — iterate ALL dynamic phase groups ──
  const phaseItems = Object.entries(phaseGroups)
    .filter(([key, steps]) => steps && steps.length > 0)
    .map(([key, steps]) => {
      const cfg = getPhaseConfig(key);
      return {
        key,
        label: (
          <Space>
            <i className={'fas ' + cfg.icon} style={{ color: cfg.color }}></i>
            <Text strong style={{ fontSize: 13 }}>{cfg.label}</Text>
            <Tag color="default">{steps.length} steps</Tag>
          </Space>
        ),
        children: (
          <div>
            {key === 'PHASE_4_2' && waveGroups.length > 0 ? (
              waveGroups.map((wave, wi) => (
                <div key={wi} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 10px', background: '#f9f0ff', borderRadius: 6 }}>
                    <i className="fas fa-play-circle" style={{ color: '#722ed1', fontSize: 12 }}></i>
                    <Text strong style={{ fontSize: 12, color: '#722ed1', textTransform: 'uppercase', letterSpacing: 1 }}>
                      {wave.name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      {wave.servers} servers • {wave.steps.filter(s => s.action !== 'WAVE_START' && s.action !== 'WAVE_COMPLETE' && s.action !== 'HANDOFF').length} operations
                    </Text>
                  </div>
                  <div>
                    {wave.steps.map((step, idx) => (
                      <TraceEntry
                        key={step.id}
                        step={step}
                        isLast={idx === wave.steps.length - 1 && wi === waveGroups.length - 1}
                        isExpanded={expandedSteps[step.id] || false}
                        onToggle={() => toggleStep(step.id)}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              steps.map((step, idx) => (
                <TraceEntry
                  key={step.id}
                  step={step}
                  isLast={idx === steps.length - 1}
                  isExpanded={expandedSteps[step.id] || false}
                  onToggle={() => toggleStep(step.id)}
                />
              ))
            )}
          </div>
        ),
      };
    });

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* Trigger panel */}
      <Card
        styles={{ body: { padding: '20px 24px' } }}
      >
        <Row gutter={[24, 16]} align="middle">
          <Col flex="1" xs={24}>
            <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <RobotOutlined style={{ color: '#722ed1' }} />
              Agentic Orchestration — Dry-Run Simulation
            </Title>
            <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
              Simulate how Hermes would autonomously process all waves for this project. No cloud resources are provisioned or modified. Each step shows the exact CLI/API commands, resource specs, dependencies, and troubleshooting paths.
            </Text>
          </Col>
          <Col>
            <Space size={8}>
              <Button
                type="primary"
                icon={loading ? <Spin size="small" /> : <PlayCircleOutlined />}
                loading={loading}
                onClick={handleDryRun}
                disabled={loading}
                style={{ background: '#722ed1', borderColor: '#722ed1' }}
              >
                {loading ? 'Simulating...' : result ? 'Re-run Simulation' : 'Run Simulation'}
              </Button>
              {result && (
                <Button onClick={clearResults}>Clear Results</Button>
              )}
            </Space>
          </Col>
        </Row>
        
        {/* Data source badge */}
        {dataSourceLabel && (
          <Row gutter={12} style={{ marginTop: 12 }}>
            <Col>
              <Text type="secondary">
                Resources in Target Architecture:
              </Text>
            </Col>
            <Col>
              <Tag color="processing">{inScopeCount} / {allNodesCount}</Tag>
            </Col>
            <Col>
              <Tag color={project?.targetTopology?.mapperNodes?.length > 0 ? 'success' : 'warning'}>
                {dataSourceLabel}
              </Tag>
            </Col>
          </Row>
        )}
        
        {error && (
          <Alert
            message="Simulation Error"
            description={error}
            type="error"
            showIcon
            closable
            style={{ marginTop: 12 }}
          />
        )}
      </Card>

      {result && (
        <>
          {/* Summary */}
          <Card
            title={
              <Space>
                <BarChartOutlined style={{ color: '#1890ff' }} />
                <Text strong style={{ fontSize: 14 }}>Simulation Summary</Text>
              </Space>
            }
            extra={
              <Button
                type="link"
                icon={showSummary ? <UpOutlined /> : <DownOutlined />}
                onClick={() => setShowSummary(!showSummary)}
              >
                {showSummary ? 'Collapse' : 'Expand'}
              </Button>
            }
            collapsible={showSummary ? 'icon' : undefined}
          >
            {showSummary && summary && (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {/* Top-line stats */}
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8} lg={4}>
                    <Statistic title="Servers" value={summary.servers_processed} valueStyle={{ fontSize: 24 }} />
                  </Col>
                  <Col xs={24} sm={12} md={8} lg={4}>
                    <Statistic title="Waves" value={summary.total_waves} valueStyle={{ fontSize: 24 }} />
                  </Col>
                  <Col xs={24} sm={12} md={8} lg={4}>
                    <Statistic title="Peak Agents" value={summary.peak_parallel_agents} valueStyle={{ fontSize: 24, color: '#1890ff' }} />
                  </Col>
                  <Col xs={24} sm={12} md={8} lg={4}>
                    <Statistic
                      title="Est. Duration"
                      value={`${summary.estimated_wall_clock_days}d`}
                      valueStyle={{ fontSize: 24, color: summary.cost_efficiency === 'UNDER_BUDGET' ? '#52c41a' : '#ff4d4f' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={8} lg={4}>
                    <Statistic
                      title="Cost Efficiency"
                      value={summary.cost_efficiency === 'UNDER_BUDGET' ? 'Under Budget' : 'Over Budget'}
                      valueStyle={{ fontSize: 14, color: summary.cost_efficiency === 'UNDER_BUDGET' ? '#52c41a' : '#ff4d4f' }}
                    />
                  </Col>
                </Row>

                <Divider style={{ margin: 0 }} />

                {/* Budget details */}
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Throughput</Text>
                    <Text strong style={{ fontSize: 14 }}>{summary.effective_throughput_mbps} Mbps</Text>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Est. Cost</Text>
                    <Text strong style={{ fontSize: 14 }}>${summary.cost_estimate_usd?.toLocaleString()}</Text>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Budget</Text>
                    <Text strong style={{ fontSize: 14 }}>${summary.budget_usd?.toLocaleString()}</Text>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    {summary.cost_efficiency === 'UNDER_BUDGET' ? (
                      <Tag icon={<CheckCircleOutlined />} color="success">✅ Under Budget</Tag>
                    ) : (
                      <Tag icon={<ExclamationCircleOutlined />} color="error">⚠️ Over Budget</Tag>
                    )}
                  </Col>
                </Row>
              </Space>
            )}
          </Card>

          {/* Learning System Stats */}
          {summary?.learning_system && (
            <Card
              title={
                <Space>
                  <ExperimentOutlined style={{ color: '#4a6cf7' }} />
                  <Text strong style={{ fontSize: 14 }}>Self-Learning Engine</Text>
                </Space>
              }
              styles={{ body: { background: 'linear-gradient(135deg, #f0f5ff 0%, #f9f0ff 100%)', borderRadius: 8 } }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8} lg={4}>
                  <Statistic title="History Records" value={summary.learning_system.total_history_records} valueStyle={{ fontSize: 20, color: '#4a6cf7' }} />
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                  <Statistic title="Success Rate" value={summary.learning_system.success_rate} valueStyle={{ fontSize: 20, color: '#4a6cf7' }} />
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                  <Statistic title="Projects Learned" value={summary.learning_system.unique_projects} valueStyle={{ fontSize: 20, color: '#4a6cf7' }} />
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                  <Statistic title="Records Ingested" value={summary.learning_system.records_ingested} valueStyle={{ fontSize: 20, color: '#4a6cf7' }} />
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                  <Statistic
                    title="Strategies Known"
                    value={Object.keys(summary.learning_system.strategy_distribution || {}).length}
                    valueStyle={{ fontSize: 20, color: '#4a6cf7' }}
                  />
                </Col>
              </Row>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8, opacity: 0.7 }}>
                {summary.learning_system.note}
              </Text>
            </Card>
          )}

          {/* Resource Usage */}
          {summary?.resource_usage && (
            <Card
              title={
                <Space>
                  <CloudServerOutlined style={{ color: '#4a6cf7' }} />
                  <Text strong style={{ fontSize: 14 }}>Simulated Resource Footprint</Text>
                </Space>
              }
            >
              <Row gutter={[12, 12]}>
                {Object.entries(summary.resource_usage).map(([key, val]) => (
                  key !== 'peak_parallel_agents' && (
                    <Col key={key} xs={24} sm={12} md={8} lg={4}>
                      <Card size="small" styles={{ body: { textAlign: 'center', padding: 12 } }}>
                        <Statistic
                          value={val}
                          valueStyle={{ fontSize: 18, fontWeight: 700 }}
                        />
                        <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                          {key.replace(/_/g, ' ')}
                        </Text>
                      </Card>
                    </Col>
                  )
                ))}
              </Row>
            </Card>
          )}

          {/* ── Resource Migration Comparison Board ── */}
          {resources.length > 0 && (
            <Card
              title={
                <Space>
                  <i className="fas fa-balance-scale" style={{ color: '#722ed1' }}></i>
                  <Text strong style={{ fontSize: 14 }}>Migration Comparison Board</Text>
                </Space>
              }
              extra={
                <Space>
                  {!replayMode ? (
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={startReplay}
                      style={{ background: '#722ed1', borderColor: '#722ed1' }}
                    >
                      Replay Simulation
                    </Button>
                  ) : (
                    <Button
                      icon={<StopOutlined />}
                      onClick={stopReplay}
                    >
                      Exit Replay
                    </Button>
                  )}
                </Space>
              }
            >
              {replayMode && (
                <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 8 }}>
                  <ReplayControls
                    isPlaying={isPlaying}
                    currentStep={replayIndex + 1}
                    totalSteps={result?.trace?.length || 0}
                    onPlay={resumeReplay}
                    onPause={pauseReplay}
                    onStep={stepForward}
                    onReset={resetReplay}
                    speed={replaySpeed}
                    onSpeedChange={setReplaySpeed}
                  />
                  {result?.trace && <LiveStepCard step={result.trace[replayIndex]} />}
                </Space>
              )}

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={replayMode ? 12 : 24}>
                  <ResourceMigrationTracker
                    resources={resources}
                    resourceStatus={resourceStatus}
                    activeResourceId={activeResourceId}
                    completedCount={completedCount}
                  />
                </Col>
                {replayMode && (
                  <Col xs={24} lg={12}>
                    <Card
                      size="small"
                      title={
                        <Space>
                          <FileTextOutlined style={{ color: '#8c8c8c' }} />
                          <Text strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Cumulative Task Log</Text>
                        </Space>
                      }
                      styles={{ body: { maxHeight: 500, overflowY: 'auto', padding: 8 } }}
                    >
                      <Timeline
                        items={(result.trace || []).slice(0, replayIndex + 1).map((step, i) => ({
                          color: step.result?.includes('success') || step.result === 'capacity_ok' || step.result === 'registered' ? 'green' :
                                 step.result?.includes('error') || step.result?.includes('failed') ? 'red' :
                                 step.result === 'running' || step.outcome === 'in_progress' ? 'blue' : 'gray',
                          children: (
                            <div>
                              <Space size={8} style={{ marginBottom: 4 }}>
                                <Text type="secondary" style={{ fontSize: 9, fontFamily: 'monospace' }}>{i + 1}</Text>
                                <Text type="secondary" style={{ fontSize: 9, textTransform: 'uppercase' }}>
                                  {(step.phase || '').replace('PHASE_', 'Φ') || '•'}
                                </Text>
                                <Text style={{ fontSize: 11, fontWeight: 600 }}>
                                  {(step.action || '').replace(/_/g, ' ')}
                                </Text>
                                {step.source_label && (
                                  <Tag color="purple" style={{ fontSize: 8, padding: '0 4px', margin: 0, lineHeight: '16px' }}>
                                    {step.source_label}
                                  </Tag>
                                )}
                                <StatusBadge result={step.result} outcome={step.outcome} isDryRun={true} />
                              </Space>
                              {step.commands && step.commands.length > 0 && (
                                <div style={{ marginLeft: 32, background: '#fafafa', borderRadius: 4, padding: 4, fontFamily: 'monospace' }}>
                                  {step.commands.map((c, ci) => {
                                    const cmdStr = typeof c === 'object' && c !== null ? (c.cmd || c.command || JSON.stringify(c)) : c;
                                    return <div key={ci} style={{ fontSize: 9, color: '#52c41a' }}>SIMULATED $ {cmdStr}</div>;
                                  })}
                                </div>
                              )}
                            </div>
                          ),
                        }))}
                      />
                      {replayIndex < 0 && (
                        <Empty description="No steps executed yet — press Play to begin" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      )}
                    </Card>
                  </Col>
                )}
              </Row>
            </Card>
          )}

          {/* ── Execution Trace — Grouped by Phase ── */}
          <Card
            title={
              <Space>
                <FileTextOutlined style={{ color: '#722ed1' }} />
                <Text strong style={{ fontSize: 14 }}>Execution Trace ({totalSteps} steps)</Text>
              </Space>
            }
            extra={
              <Space>
                <Button
                  size="small"
                  type="link"
                  onClick={() => setExpandedSteps(Object.fromEntries((result.trace || []).map(s => [s.id, true])))}
                >
                  Expand All
                </Button>
                <Button
                  size="small"
                  type="link"
                  onClick={() => setExpandedSteps({})}
                >
                  Collapse All
                </Button>
              </Space>
            }
          >
            <Collapse
              activeKey={Object.entries(expandedPhases).filter(([k, v]) => v).map(([k]) => k)}
              onChange={(keys) => {
                const arr = Array.isArray(keys) ? keys : (keys ? [keys] : []);
                const next = {};
                arr.forEach(k => { next[k] = true; });
                setExpandedPhases(next);
              }}
              items={phaseItems}
            />
          </Card>

          {/* Comparison Toggle */}
          <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Button
              type="link"
              size="small"
              onClick={() => window.dispatchEvent(new CustomEvent('hermes:show-standard-view'))}
            >
              <i className="fas fa-project-diagram"></i> Switch to Standard Methodology View
            </Button>
            <Divider type="vertical" />
            <Space>
              <SafetyCertificateOutlined style={{ fontSize: 10 }} />
              <Text type="secondary" style={{ fontSize: 11 }}>
                DRY-RUN — No cloud resources were provisioned or modified.
              </Text>
            </Space>
          </div>
        </>
      )}
    </Space>
  );
}