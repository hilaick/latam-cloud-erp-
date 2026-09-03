import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Card, Collapse, Space, Statistic, Badge, Progress, Table, Descriptions,
  Alert, Button, Tag, Typography, Divider, Row, Col, Tooltip,
  Empty, Spin, Timeline, Tabs, Drawer, Checkbox
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
  ExperimentOutlined, FullscreenOutlined, CloseOutlined,
  UnorderedListOutlined
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

/* ═══════════════════════════════════════════════
   SIMULATION CONSTELLATION — Phase 3.4b
   Visual SVG showing simulation's deployed resources:
   servers, network, mig_worker, migration arrows.
   Parses trace + resource_usage from agenticDryRun.
   ═══════════════════════════════════════════════ */

/* ── Status → color map (green=success, amber=running, red=failed, blue=deployed) ── */
export const STATUS_COLORS = {
  success:  '#10b981', green: '#10b981', ok: '#10b981',
  running:  '#f59e0b', amber: '#f59e0b', active: '#f59e0b', in_progress: '#f59e0b',
  failed:   '#ef4444', red: '#ef4444', error: '#ef4444',
  deployed: '#3b82f6', blue: '#3b82f6',
  pending:  '#6b7280', gray: '#6b7280',
};

export function resolveStatusColor(step) {
  const r = ((step.result || step.outcome || '')).toLowerCase();
  if (r.includes('success') || r === 'capacity_ok' || r === 'registered' || r.startsWith('simulated')) return STATUS_COLORS.success;
  if (r === 'running' || r === 'in_progress' || r.includes('active') || r.includes('processing')) return STATUS_COLORS.running;
  if (r.includes('error') || r.includes('failed') || r.includes('blocked') || r === 'not_resolved') return STATUS_COLORS.failed;
  if (r.includes('deploy') || r.includes('create') || r.includes('register')) return STATUS_COLORS.deployed;
  return STATUS_COLORS.pending;
}

/* ── Build constellation nodes from trace ── */
export function buildConstellationData(trace, resourceUsage, resources) {
  const servers = [];       // { id, name, status, color, source_label, commands_count }
  const networkNodes = [];  // { id, name, type, status, color }
  const seenServerIds = new Set();
  const seenNetIds = new Set();

  // Track mig_worker
  let migWorker = null;

  trace.forEach((step) => {
    const serverId = step.server_id || (step.decision && step.decision.server_id) || '';
    const serverName = (step.decision && step.decision.server_name) || serverId || '';
    const action = step.action || '';

    // Detect mig_worker
    if (action.includes('MIG_WORKER') || action === 'WORKER_REGISTER' || action === 'WORKER_DEPLOY' ||
        (step.message || '').toLowerCase().includes('mig_worker') ||
        (step.description || '').toLowerCase().includes('mig_worker')) {
      if (!migWorker) {
        migWorker = {
          id: 'mig_worker',
          name: 'mig_worker',
          status: resolveStatusColor(step) === STATUS_COLORS.success ? 'active' : 'deployed',
          color: resolveStatusColor(step) === STATUS_COLORS.success ? STATUS_COLORS.success : STATUS_COLORS.deployed,
          source_label: step.source_label || null,
          commands_count: (step.commands || []).length,
          stepAction: action,
        };
      } else if (resolveStatusColor(step) === STATUS_COLORS.success) {
        migWorker.status = 'active';
        migWorker.color = STATUS_COLORS.success;
      }
    }

    // Detect servers (migration steps)
    if (serverId && !seenServerIds.has(serverId)) {
      seenServerIds.add(serverId);
      const resource = resources.find(r => r.id === serverId || r.name === serverId || r.name === serverName);
      const displayName = serverName || (resource ? (resource.name || resource.id) : serverId);
      servers.push({
        id: serverId,
        name: displayName,
        resourceType: resource ? (resource.type || 'ECS') : 'ECS',
        status: resolveStatusColor(step),
        color: resolveStatusColor(step),
        source_label: step.source_label || null,
        commands_count: (step.commands || []).length,
        stepAction: action,
      });
    }

    // Detect network resources
    const netTypes = ['VPC', 'SUBNET', 'SG', 'SECURITY_GROUP', 'EIP', 'NAT', 'VPN', 'VPC_CREATE', 'SUBNET_CREATE', 'SG_CREATE'];
    if ((action.includes('VPC') || action.includes('SUBNET') || action.includes('SG') ||
         action.includes('SECURITY') || action.includes('EIP') || action.includes('NAT') ||
         action.includes('NETWORK')) && !seenNetIds.has(action)) {
      seenNetIds.add(action);
      let netType = 'NET';
      let netName = action.replace(/_/g, ' ');
      if (action.includes('VPC')) { netType = 'VPC'; netName = action.includes('CREATE') ? 'VPC' : netName; }
      else if (action.includes('SUBNET')) { netType = 'SUBNET'; netName = action.includes('CREATE') ? 'Subnet' : netName; }
      else if (action.includes('SG') || action.includes('SECURITY')) { netType = 'SG'; netName = 'Security Group'; }
      else if (action.includes('EIP')) { netType = 'EIP'; netName = 'EIP'; }
      else if (action.includes('NAT')) { netType = 'NAT'; netName = 'NAT Gateway'; }

      networkNodes.push({
        id: action,
        name: netName,
        type: netType,
        status: resolveStatusColor(step),
        color: resolveStatusColor(step),
        source_label: step.source_label || null,
      });
    }

    // Update server status from later steps in the trace
    if (serverId && seenServerIds.has(serverId)) {
      const existing = servers.find(s => s.id === serverId);
      if (existing) {
        const newColor = resolveStatusColor(step);
        if (newColor === STATUS_COLORS.success || newColor === STATUS_COLORS.failed) {
          existing.status = newColor === STATUS_COLORS.success ? 'success' : 'failed';
          existing.color = newColor;
        } else if (newColor === STATUS_COLORS.running && existing.color === STATUS_COLORS.pending) {
          existing.status = 'running';
          existing.color = newColor;
        }
      }
    }
  });

  // Detect source/target cloud from PRESALES_TRIAGE step
  let sourceCloud = 'Huawei Cloud';
  let targetCloud = 'Huawei Cloud';
  const triageStep = trace.find(s => s.action === 'PRESALES_TRIAGE_ANALYSIS');
  if (triageStep && triageStep.message) {
    const msg = triageStep.message;
    const srcMatch = msg.match(/Source Env:?\s*\[?([^\].]+)/);
    if (srcMatch) sourceCloud = srcMatch[1].trim();
    const tgtMatch = msg.match(/Cross-Region:?\s*(YES|NO)/);
    if (tgtMatch && tgtMatch[1] === 'YES') {
      targetCloud = 'Huawei Cloud';
    }
  }

  // Resource counts from resource_usage
  const counts = {
    ecs: resourceUsage?.ecs_instances || resourceUsage?.ecs || servers.length,
    eip: resourceUsage?.eip_addresses || resourceUsage?.eip || 0,
    sgRules: resourceUsage?.sg_rules || resourceUsage?.security_group_rules || 0,
    smsTasks: resourceUsage?.sms_tasks || resourceUsage?.sms || servers.length,
    vpcs: resourceUsage?.vpc || resourceUsage?.vpcs || 1,
    subnets: resourceUsage?.subnet || resourceUsage?.subnets || 1,
  };

  return { servers, networkNodes, migWorker, counts, sourceCloud, targetCloud };
}

/* ── SVG layout constants ── */
const CON_W = 900, CON_H = 600, CON_CX = CON_W / 2, CON_CY = CON_H / 2;

export function computeConstellationLayout(data) {
  const { servers, networkNodes, migWorker, counts } = data;
  const allNodes = [];
  const allEdges = [];

  // Determine source cloud label from data
  const sourceLabel = data.sourceCloud || 'Huawei Cloud';
  const targetLabel = data.targetCloud || 'Huawei Cloud';

  // ── Source cloud (left side) ──
  const sourceX = 120, sourceY = CON_CY;
  allNodes.push({
    id: 'source_cloud', type: 'cloud', label: `SOURCE\n${sourceLabel}`, x: sourceX, y: sourceY,
    color: '#6b7280', icon: 'fa-cloud', size: 'lg',
  });

  // ── Target cloud (right side) ──
  const targetX = CON_W - 120, targetY = CON_CY;
  allNodes.push({
    id: 'target_cloud', type: 'cloud', label: `TARGET\n${targetLabel}`, x: targetX, y: targetY,
    color: '#3b82f6', icon: 'fa-cloud', size: 'lg',
  });

  // ── Servers: arrange in a vertical column between source and target, staggered left→right ──
  const serverCount = servers.length;
  const serverCols = Math.min(serverCount, 3);
  const serverRows = Math.ceil(serverCount / serverCols);
  const serverStartX = 240;
  const serverEndX = CON_W - 240;
  const serverStartY = 100;
  const serverEndY = CON_H - 100;

  servers.forEach((srv, i) => {
    const col = i % serverCols;
    const row = Math.floor(i / serverCols);
    const xRange = serverEndX - serverStartX;
    const colStep = serverCols > 1 ? xRange / (serverCols - 1) : xRange / 2;
    const yRange = serverEndY - serverStartY;
    const rowStep = serverRows > 1 ? yRange / (serverRows - 1) : 0;

    const x = serverStartX + col * colStep;
    const y = serverStartY + row * rowStep;

    allNodes.push({
      id: srv.id, type: 'server', label: srv.name, x, y,
      color: srv.color, source_label: srv.source_label,
      resourceType: srv.resourceType, stepAction: srv.stepAction,
    });

    // Source → server edge
    allEdges.push({
      id: `src2${srv.id}`, from: { x: sourceX, y: sourceY }, to: { x, y },
      color: srv.color, dashed: true,
    });
    // Server → target edge
    allEdges.push({
      id: `${srv.id}2tgt`, from: { x, y }, to: { x: targetX, y: targetY },
      color: srv.color, dashed: false,
    });
  });

  // ── Network nodes: VPC, Subnet, SG — place above/below the server rows ──
  const netStartY = serverStartY - 80;
  const netXStart = 200;
  const netXEnd = CON_W - 200;
  networkNodes.forEach((net, i) => {
    const netCount = networkNodes.length;
    const xStep = netCount > 1 ? (netXEnd - netXStart) / (netCount - 1) : 0;
    const x = netXStart + i * xStep;
    const y = netStartY;

    allNodes.push({
      id: net.id, type: 'network', label: net.name, x, y,
      color: net.color, netType: net.type, source_label: net.source_label,
    });
    // Connect network nodes to source/target
    allEdges.push({
      id: `net_${net.id}_src`, from: { x: sourceX, y: sourceY }, to: { x, y },
      color: net.color, dashed: true,
    });
    allEdges.push({
      id: `net_${net.id}_tgt`, from: { x, y }, to: { x: targetX, y: targetY },
      color: net.color, dashed: true,
    });
  });

  // ── mig_worker: special node at top right ──
  if (migWorker) {
    const workerX = targetX + 60;
    const workerY = 80;
    allNodes.push({
      id: 'mig_worker', type: 'worker', label: 'mig_worker', x: workerX, y: workerY,
      color: migWorker.color, source_label: migWorker.source_label, stepAction: migWorker.stepAction,
    });
    // Edge from target cloud to mig_worker
    allEdges.push({
      id: 'tgt2worker', from: { x: targetX, y: targetY }, to: { x: workerX, y: workerY },
      color: migWorker.color, dashed: false, thick: true,
    });
  }

  // ── Resource count label (bottom center) ──
  allNodes.push({
    id: 'counts', type: 'counts', label: '', x: CON_CX, y: CON_H - 40,
    color: '#6b7280', counts,
  });

  return { allNodes, allEdges, counts, sourceLabel, targetLabel };
}

/* SimulationConstellation moved to SimulationConstellation3D.jsx (Three.js 3D) */
import SimulationConstellation from './SimulationConstellation3D.jsx';
import SpawnTreeVisualizer from './SpawnTreeVisualizer.jsx';

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
  const [showConstellation, setShowConstellation] = useState(false);
  const [constellationFullscreen, setConstellationFullscreen] = useState(false);
  const [showLearning, setShowLearning] = useState(false);
  const [showResourceFootprint, setShowResourceFootprint] = useState(false);
  const [showComparison, setShowComparison] = useState(true);
  const [showTrace, setShowTrace] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [retroLoading, setRetroLoading] = useState(false);
  const [manualMigWorker, setManualMigWorker] = useState(project?.manualMigWorker || false);
  const [showServerSelect, setShowServerSelect] = useState(false);

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

  // ── Extract resources from project data — merge mapperNodes + targetArchitecture ──
  const resources = useMemo(() => {
    const topologyFilter = project?.topologyFilter || 'All';
    let nodes = [...(project?.mapperNodes || [])];

    // Also include resources from target architecture (VPC, subnet, SG, EIP, etc.)
    // Normalize entries: targetArchitecture uses source_name instead of name, and may lack type
    const targetArch = project?.targetArchitecture || {};
    const normalizeTA = (n, fallbackType) => ({
      ...n,
      name: n.name || n.source_name || n.id || '',
      type: n.type || fallbackType,
    });
    if (targetArch.network && Array.isArray(targetArch.network)) {
      targetArch.network.forEach(n => {
        const norm = normalizeTA(n, 'VPC');
        if (norm.name && !nodes.find(x => x.name === norm.name)) nodes.push(norm);
      });
    }
    if (targetArch.compute && Array.isArray(targetArch.compute)) {
      targetArch.compute.forEach(n => {
        const norm = normalizeTA(n, 'ECS');
        if (norm.name && !nodes.find(x => x.name === norm.name)) nodes.push(norm);
      });
    }
    if (targetArch.storage && Array.isArray(targetArch.storage)) {
      targetArch.storage.forEach(n => {
        const norm = normalizeTA(n, 'EVS');
        if (norm.name && !nodes.find(x => x.name === norm.name)) nodes.push(norm);
      });
    }
    if (targetArch.database && Array.isArray(targetArch.database)) {
      targetArch.database.forEach(n => {
        const norm = normalizeTA(n, 'RDS');
        if (norm.name && !nodes.find(x => x.name === norm.name)) nodes.push(norm);
      });
    }

    if (topologyFilter === 'In SOW') {
      nodes = nodes.filter(n => n.status === 'Matched' || n.status === 'Quoted Only');
    } else if (topologyFilter === 'In Discovery') {
      nodes = nodes.filter(n => n.status === 'Matched' || n.status === 'Live Only');
    } else if (topologyFilter && topologyFilter !== 'All') {
      nodes = nodes.filter(n => n.status === topologyFilter);
    }
    // Include ALL resource types (not just ECS/RDS/STORAGE) — VPC, SG, EIP, Subnet needed for constellation
    return nodes;
  }, [project?.mapperNodes, project?.topologyFilter, project?.targetArchitecture]);

  // ── Server selection — compute resources only (ECS/COMPUTE/DB) ──
  const serverList = useMemo(() => {
    return resources.filter(r => {
      const t = (r.type || '').toUpperCase();
      return t === 'ECS' || t === 'COMPUTE' || t === 'APP' || t === 'WEB' ||
             t === 'RDS' || t === 'DATABASE' || t === 'DB' || t === 'DCS';
    }).map(r => r.name || r.id).filter(Boolean);
  }, [resources]);

  const [excludedServers, setExcludedServers] = useState(new Set());

  const selectedServers = useMemo(() => {
    return serverList.filter(name => !excludedServers.has(name));
  }, [serverList, excludedServers]);

  const toggleServer = (name) => {
    setExcludedServers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Resources filtered by server selection — used for constellation animation
  const constellationResources = useMemo(() => {
    if (excludedServers.size === 0) return resources;
    return resources.filter(r => {
      const name = r.name || r.id || '';
      const t = (r.type || '').toUpperCase();
      const isServer = t === 'ECS' || t === 'COMPUTE' || t === 'APP' || t === 'WEB' ||
                       t === 'RDS' || t === 'DATABASE' || t === 'DB' || t === 'DCS';
      if (isServer && excludedServers.has(name)) return false;
      return true;
    });
  }, [resources, excludedServers]);

  // ── Compute resource status from trace up to replayIndex ──
  const resourceStatus = useMemo(() => {
    if (!result?.trace || resources.length === 0) return {};
    const status = {};
    // Build a map of all possible resource keys (id, name, source_name)
    const resourceKeyMap = {};
    resources.forEach(r => {
      const key = r.id || r.name;
      status[key] = 'pending';
      // Map all possible identifiers to this key
      if (r.id) resourceKeyMap[r.id] = key;
      if (r.name) resourceKeyMap[r.name] = key;
      if (r.source_name) resourceKeyMap[r.source_name] = key;
    });

    const visibleTrace = replayMode ? result.trace.slice(0, replayIndex + 1) : result.trace;

    // Track which servers have been seen in non-start steps
    const seenServers = new Set();
    // Track completed waves — when a wave completes, mark all its servers as completed
    const waveServerMap = {}; // wave name → [server keys]

    visibleTrace.forEach(step => {
      const serverId = step.server_id || (step.decision && step.decision.server_id) || '';
      const serverName = (step.decision && step.decision.server_name) || '';
      const target = step.target || '';
      const message = step.message || '';

      // Resolve to resource key using the map
      let matchedKey = null;
      if (serverId && resourceKeyMap[serverId]) matchedKey = resourceKeyMap[serverId];
      if (!matchedKey && serverName && resourceKeyMap[serverName]) matchedKey = resourceKeyMap[serverName];
      if (!matchedKey && target && resourceKeyMap[target]) matchedKey = resourceKeyMap[target];

      // Also match by scanning the message text for resource names (for non-server resources like VPC, EIP, EVS)
      if (!matchedKey) {
        resources.forEach(r => {
          const rKey = r.id || r.name;
          const rName = r.name || r.source_name || '';
          if (rName && rName !== 'default' && message.includes(rName) && status[rKey] === 'pending') {
            // Found this resource mentioned in the trace message
            matchedKey = rKey;
          }
        });
      }

      if (matchedKey) {
        seenServers.add(matchedKey);
        const resultOutcome = (step.result || step.outcome || '').toLowerCase();
        const action = (step.action || '').toUpperCase();

        // Broadened success detection
        const isSuccess = resultOutcome.includes('success') || resultOutcome.includes('ok') ||
                          resultOutcome.includes('registered') || resultOutcome.includes('provisioned') ||
                          resultOutcome.includes('complete') || resultOutcome.includes('done') ||
                          action === 'SMOKE_TESTS' || action === 'SERVER_COMPLETE' ||
                          action === 'WAVE_COMPLETE' || action === 'HANDOFF';

        const isFail = resultOutcome.includes('error') || resultOutcome.includes('failed') ||
                       resultOutcome.includes('blocked') || resultOutcome === 'not_resolved';

        // Track wave→server mapping for WAVE_COMPLETE
        if (action === 'WAVE_START' && step.decision?.server_names) {
          const wname = step.decision?.wave_name || step.target || '';
          if (wname) {
            waveServerMap[wname] = step.decision.server_names
              .map(n => resourceKeyMap[n])
              .filter(Boolean);
          }
        }

        if (isSuccess) {
          status[matchedKey] = 'completed';
          // Also mark all servers in the same wave as completed on WAVE_COMPLETE
          if (action === 'WAVE_COMPLETE') {
            Object.values(waveServerMap).forEach(servers => {
              servers.forEach(sk => { status[sk] = 'completed'; });
            });
          }
        } else if (isFail) {
          status[matchedKey] = 'failed';
        } else if (action !== 'WAVE_START' && action !== 'INIT') {
          if (status[matchedKey] === 'pending') {
            status[matchedKey] = 'active';
          }
        }
      }
    });

    // If not in replay mode and the trace is complete, mark ALL resources as completed
    // (both servers and non-server resources like VPC, EIP, EVS)
    if (!replayMode && result?.trace) {
      resources.forEach(r => {
        const key = r.id || r.name;
        if (status[key] === 'active' || status[key] === 'pending') {
          // Mark as completed if the simulation finished — all resources were provisioned
          status[key] = 'completed';
        }
      });
    }

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
        },
        body: JSON.stringify({ selectedServers: selectedServers.length < serverList.length ? selectedServers : undefined }),
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

  const handleRetroactiveSim = async () => {
    setRetroLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/retroactive-simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify({ retroactive: true }),
      });
      if (!res.ok) throw new Error('API ' + res.status + ': ' + await res.text());
      const data = await res.json();
      setResult(data);
      setReplayMode(true);
      setReplayIndex(0);
      setIsPlaying(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setRetroLoading(false);
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

  // Scroll-to-top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
              <Button
                type="dashed"
                icon={<i className="fas fa-history" style={{ fontSize: 12 }} />}
                onClick={handleRetroactiveSim}
                disabled={retroLoading}
                style={{ borderColor: '#08979c', color: '#08979c' }}
              >
                {retroLoading ? 'Loading...' : 'Retroactive Sim'}
              </Button>
              <Tooltip title="Force mig_worker deployment even if auto-triggers don't fire. Useful for cross-cloud, resilience, or manual agent install scenarios.">
                <Button
                  type={manualMigWorker ? 'primary' : 'default'}
                  icon={<i className="fas fa-cog" style={{ fontSize: 12 }} />}
                  onClick={() => {
                    const newVal = !manualMigWorker;
                    setManualMigWorker(newVal);
                    onUpdateProject(project.id, { manualMigWorker: newVal });
                  }}
                  style={manualMigWorker ? { background: '#fbbf24', borderColor: '#fbbf24', color: '#1f2937' } : {}}
                >
                  {manualMigWorker ? 'mig_worker: ON' : 'mig_worker: OFF'}
                </Button>
              </Tooltip>
              {serverList.length > 1 && (
                <Tooltip title="Select which servers to include in the simulation">
                  <Button
                    type={showServerSelect ? 'primary' : 'default'}
                    icon={<UnorderedListOutlined />}
                    onClick={() => setShowServerSelect(!showServerSelect)}
                    size="small"
                  >
                    Servers ({selectedServers.length}/{serverList.length})
                  </Button>
                </Tooltip>
              )}
              {result && (
                <Button onClick={clearResults}>Clear Results</Button>
              )}
            </Space>
          </Col>
        </Row>

        {/* Server selection panel */}
        {showServerSelect && serverList.length > 1 && (
          <Row style={{ marginTop: 12 }}>
            <Col span={24}>
              <div style={{
                background: '#f5f7fa', borderRadius: 8, padding: '12px 16px',
                border: '1px solid #e4e7ed',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 13 }}>
                    <UnorderedListOutlined style={{ marginRight: 6 }} />
                    Server Selection — {selectedServers.length} of {serverList.length} included
                  </Text>
                  <Space size={4}>
                    <Button size="small" type="link" onClick={() => setExcludedServers(new Set())}>Select All</Button>
                    <Button size="small" type="link" onClick={() => setExcludedServers(new Set(serverList))}>Deselect All</Button>
                  </Space>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                  {serverList.map(name => {
                    const included = !excludedServers.has(name);
                    const res = resources.find(r => (r.name || r.id) === name);
                    const t = (res?.type || '').toUpperCase();
                    const isDB = t === 'RDS' || t === 'DATABASE' || t === 'DB' || t === 'DCS';
                    return (
                      <Checkbox
                        key={name}
                        checked={included}
                        onChange={() => toggleServer(name)}
                        style={{ fontSize: 12 }}
                      >
                        <Tag color={isDB ? 'green' : 'blue'} style={{ fontSize: 10, marginRight: 4 }}>{isDB ? 'DB' : 'ECS'}</Tag>
                        {name}
                      </Checkbox>
                    );
                  })}
                </div>
                {excludedServers.size > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Alert
                      type="info" showIcon
                      message={`${excludedServers.size} server(s) excluded — simulation will only process the ${selectedServers.length} selected server(s).`}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                )}
              </div>
            </Col>
          </Row>
        )}
        
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
              extra={
                <Button
                  type="link"
                  icon={showLearning ? <UpOutlined /> : <DownOutlined />}
                  onClick={() => setShowLearning(!showLearning)}
                >
                  {showLearning ? 'Collapse' : 'Expand'}
                </Button>
              }
              styles={{ body: { background: showLearning ? 'linear-gradient(135deg, #f0f5ff 0%, #f9f0ff 100%)' : 'transparent', borderRadius: 8, display: showLearning ? 'block' : 'none' } }}
            >
              {showLearning && (
              <>
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
              </>
              )}
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
              extra={
                <Button
                  type="link"
                  icon={showResourceFootprint ? <UpOutlined /> : <DownOutlined />}
                  onClick={() => setShowResourceFootprint(!showResourceFootprint)}
                >
                  {showResourceFootprint ? 'Collapse' : 'Expand'}
                </Button>
              }
              styles={{ body: { display: showResourceFootprint ? 'block' : 'none' } }}
            >
              {showResourceFootprint && (
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
              )}
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
                  icon={showTrace ? <UpOutlined /> : <DownOutlined />}
                  onClick={() => setShowTrace(!showTrace)}
                >
                  {showTrace ? 'Collapse' : 'Expand'}
                </Button>
                {showTrace && (
                  <>
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
                  </>
                )}
              </Space>
            }
            styles={{ body: { display: showTrace ? 'block' : 'none' } }}
          >
            {showTrace && (
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
            )}
          </Card>

          {/* ── Simulation Constellation (at end, with button + fullscreen) ── */}
          <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 8 }}>
            <Button
              type={showConstellation ? 'primary' : 'default'}
              icon={<i className="fas fa-project-diagram" />}
              onClick={() => setShowConstellation(!showConstellation)}
            >
              {showConstellation ? 'Hide' : 'View'} Simulation Constellation
            </Button>
            {showConstellation && (
              <Button
                type="link"
                icon={<FullscreenOutlined />}
                onClick={() => setConstellationFullscreen(true)}
                style={{ marginLeft: 8 }}
              >
                Fullscreen
              </Button>
            )}
          </div>
          {showConstellation && (
            <SimulationConstellation
              trace={result?.trace || []}
              resourceUsage={summary?.resource_usage || {}}
              resources={constellationResources}
              replayMode={replayMode}
              replayIndex={replayIndex}
              onReplayStart={startReplay}
              onReplayStop={stopReplay}
              onReplayPlay={resumeReplay}
              onReplayPause={pauseReplay}
              onReplayStep={stepForward}
              onReplayReset={resetReplay}
              isPlaying={isPlaying}
              replaySpeed={replaySpeed}
              onReplaySpeedChange={setReplaySpeed}
            />
          )}

          {/* Agent Spawn Tree — shows during simulation and execution */}
          <div style={{ marginTop: '12px' }}>
            <SpawnTreeVisualizer
              projectId={project?.id}
              simulationTrace={result?.trace || []}
              isActive={!!result || isSimulating}
              mode={result ? 'simulation' : 'execution'}
            />
          </div>

          {/* Fullscreen constellation modal */}
          {constellationFullscreen && (
            <div
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: '#0f0f1a', zIndex: 9999, padding: 24,
                overflow: 'auto',
              }}
            >
              <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10000 }}>
                <Button
                  type="primary"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => setConstellationFullscreen(false)}
                >
                  Close Fullscreen
                </Button>
              </div>
              <SimulationConstellation
                trace={result?.trace || []}
                resourceUsage={summary?.resource_usage || {}}
                resources={constellationResources}
                replayMode={replayMode}
                replayIndex={replayIndex}
                onReplayStart={startReplay}
                onReplayStop={stopReplay}
                onReplayPlay={resumeReplay}
                onReplayPause={pauseReplay}
                onReplayStep={stepForward}
                onReplayReset={resetReplay}
                isPlaying={isPlaying}
                replaySpeed={replaySpeed}
                onReplaySpeedChange={setReplaySpeed}
                fullscreen
              />
            </div>
          )}

          {/* Dry-run disclaimer */}
          <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Space>
              <SafetyCertificateOutlined style={{ fontSize: 10 }} />
              <Text type="secondary" style={{ fontSize: 11 }}>
                DRY-RUN — No cloud resources were provisioned or modified.
              </Text>
            </Space>
          </div>
        </>
      )}

      {/* Scroll to top button */}
      {showScrollTop && (
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<UpOutlined />}
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        />
      )}
    </Space>
  );
}