import React, { useContext, useState, useEffect, useCallback } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { formatShortDate } from '../../utils/helpers';
import {
  Card, Table, Tag, Statistic, Button, Badge, Spin, Alert,
  Row, Col, Space, Typography, Divider, Tooltip, Empty,
  Descriptions, Collapse
} from 'antd';
import {
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MinusCircleOutlined,
  FileOutlined,
  FireOutlined,
  FileTextOutlined,
  CloudServerOutlined,
  ThunderboltOutlined,
  ThunderboltFilled,
  WarningOutlined,
  DollarOutlined,
  LineChartOutlined,
  CalendarOutlined,
  TrophyOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

export default function FinOpsDashboard() {
  const { projects } = useContext(ERPContext);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const fm = (num) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      num || 0
    );

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('hermes_access_token');
      if (!token) {
        setError('AUTH_REQUIRED');
        return;
      }
      const resp = await fetch('/api/finops/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.status === 401 || resp.status === 422) {
        const body = await resp.json().catch(() => ({}));
        if (body.msg && (body.msg.includes('expired') || body.msg.includes('Signature') || body.msg.includes('segments'))) {
          sessionStorage.removeItem('hermes_access_token');
          setError('SESSION_EXPIRED');
          return;
        }
        setError('AUTH_ERROR');
        return;
      }
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      const data = await resp.json();
      if (data.success) {
        setDashboardData(data);
        setLastSyncTime(new Date());
      } else {
        setError(data.error || 'API returned failure');
      }
    } catch (err) {
      console.error('FinOps Dashboard fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const activeProjects = (Array.isArray(projects) ? projects : []).filter(
    (p) => p && !p.isWaiting && p.lifecycleState !== '6_completed'
  );

  let totalQuotedBudget = 0;
  let totalBilledToDate = 0;
  let totalProjectedOverrun = 0;
  let projectsWithLiveData = 0;

  const enrichedProjects = activeProjects.map((project) => {
    const mrr = parseFloat(project.mrr) || 0;
    totalQuotedBudget += mrr;

    const liveProject =
      (Array.isArray(dashboardData?.projects) ? dashboardData.projects : []).find(
        (lp) => lp.id === project.id || lp.name === project.name
      ) || null;

    if (liveProject?.live_data_fetched) {
      projectsWithLiveData++;
      if (liveProject.billedToDate) totalBilledToDate += liveProject.billedToDate;
      if (liveProject.overrun) totalProjectedOverrun += liveProject.overrun;
      return {
        ...project,
        ...liveProject,
        isLive: true,
      };
    }

    const start = new Date(project.kickoff);
    const end = new Date(project.date);
    let daysTotal = 30;
    let daysElapsed = 0;
    let daysDelayed = 0;

    if (!isNaN(start) && !isNaN(end)) {
      daysTotal = Math.max((end - start) / (1000 * 60 * 60 * 24), 1);
      daysElapsed = Math.max((currentTime - start) / (1000 * 60 * 60 * 24), 0);
      if (currentTime > end) {
        daysDelayed = Math.floor((currentTime - end) / (1000 * 60 * 60 * 24));
      }
    }

    return {
      ...project,
      daysTotal,
      daysElapsed: Math.floor(daysElapsed),
      daysDelayed,
      dailyBurnRate: null,
      billedToDate: null,
      overrun: null,
      isAtRisk: null,
      isLive: false,
      dataAvailable: false,
    };
  });

  const liveSummary = dashboardData?.summary || null;
  const summary = {
    totalQuotedBudget: liveSummary?.total_quoted_budget ?? totalQuotedBudget,
    totalBilledToDate: liveSummary?.total_billed_to_date ?? totalBilledToDate,
    totalProjectedOverrun: liveSummary?.total_projected_overrun ?? totalProjectedOverrun,
    activeCoupons: liveSummary?.active_coupons ?? 25000,
  };
  const remainingCoupons = summary.activeCoupons - summary.totalBilledToDate;

  const liveDataAvailable = dashboardData?.live_data_available || false;
  const totalProjectsWithLive = dashboardData?.projects_with_live_data ?? projectsWithLiveData;

  if (!Array.isArray(projects)) {
    return (
      <Card style={{ borderRadius: 12 }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 14 }}>Loading project data...</Text>
        </div>
      </Card>
    );
  }

  // Table columns
  const columns = [
    {
      title: 'Project & Identity',
      dataIndex: 'name',
      key: 'project',
      width: 280,
      render: (name, record) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{name || 'Unnamed Project'}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.customerName || record.customerId || 'No Customer'}
            </Text>
          </div>
          {record.liveDataError && (
            <Tooltip title={record.liveDataError}>
              <Text type="danger" style={{ fontSize: 10, display: 'block', marginTop: 4 }}>
                <ExclamationCircleOutlined /> {record.liveDataError.substring(0, 40)}...
              </Text>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'SOW Budget',
      dataIndex: 'mrr',
      key: 'budget',
      width: 140,
      render: (mrr) => (
        <div>
          <Text strong style={{ color: '#52c41a', fontSize: 14 }}>{fm(mrr)}</Text>
          <Text type="secondary" style={{ fontSize: 10 }}>Limit</Text>
        </div>
      ),
    },
    {
      title: 'Schedule & Variance',
      key: 'schedule',
      width: 200,
      render: (_, record) => (
        <div>
          <Text style={{ fontSize: 13 }}>
            {formatShortDate(record.kickoff)} — {formatShortDate(record.date)}
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.daysElapsed} days elapsed
            </Text>
            {record.daysDelayed > 0 && (
              <Text type="danger" style={{ fontSize: 11, fontWeight: 600 }}>
                {' '}(+{record.daysDelayed} delayed)
              </Text>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Billed to Date',
      dataIndex: 'billedToDate',
      key: 'billed',
      width: 160,
      render: (billed, record) => (
        <div>
          <Text style={{ fontSize: 14 }}>{fm(billed)}</Text>
          {record.overrun > 0 && (
            <Text type="danger" style={{ fontSize: 10, fontWeight: 600, display: 'block', marginTop: 2 }}>
              {fm(record.overrun)} Delay Overrun
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Daily Burn Rate',
      dataIndex: 'dailyBurnRate',
      key: 'burn',
      width: 140,
      render: (burn) => burn ? (
        <div>
          <Text strong style={{ color: '#faad14', fontSize: 14 }}>{fm(burn)}</Text>
          <Text type="secondary" style={{ fontSize: 10 }}>/ day</Text>
        </div>
      ) : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'COC Health',
      dataIndex: 'isAtRisk',
      key: 'health',
      width: 130,
      render: (isAtRisk, record) => (
        <Tag
          color={
            isAtRisk === null ? 'default' :
            isAtRisk ? 'error' : 'success'
          }
          icon={
            isAtRisk === null ? <MinusCircleOutlined /> :
            isAtRisk ? <ExclamationCircleOutlined /> :
            <CheckCircleOutlined />
          }
        >
          {isAtRisk === null ? 'Unknown' :
           isAtRisk ? 'Budget Risk' : 'On Budget'}
        </Tag>
      ),
    },
    {
      title: 'Data Source',
      dataIndex: 'isLive',
      key: 'source',
      width: 120,
      render: (isLive, record) => (
        isLive ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            <Text style={{ fontSize: 10, fontWeight: 600 }}>COC Live</Text>
          </Tag>
        ) : record.liveDataError ? (
          <Tag color="error">Error</Tag>
        ) : (
          <Tag color="default">
            <Text style={{ fontSize: 10, color: '#8c8c8c' }}>No Data</Text>
          </Tag>
        )
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: 24 }}>
      {/* Header Card */}
      <Card
        styles={{ body: { padding: '28px 32px' } }}
        style={{ borderRadius: 12, marginBottom: 24 }}
      >
        <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                <CloudServerOutlined style={{ color: '#ff4d4f' }} />
                Huawei COC FinOps Center
              </Title>
              <Text type="secondary" style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
                Live Customer Operations Capability (COC) Budget & Run-Rate Analysis
              </Text>
            </div>
            <Space size={12} wrap>
              {liveDataAvailable ? (
                <Badge
                  status="success"
                  text={
                    <Text style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#52c41a' }}>
                      LIVE · {totalProjectsWithLive}/{summary.totalQuotedBudget > 0 ? enrichedProjects.length : dashboardData?.total_projects ?? 0} Projects
                    </Text>
                  }
                />
              ) : loading ? (
                <Tag icon={<SyncOutlined spin />} color="warning">
                  <Text style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Connecting...</Text>
                </Tag>
              ) : error === 'SESSION_EXPIRED' || error === 'AUTH_REQUIRED' ? (
                <Tag color="warning" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/login'}>
                  <ThunderboltOutlined style={{ marginRight: 4 }} /> Session Expired — Click to Login
                </Tag>
              ) : error === 'AUTH_ERROR' ? (
                <Tag color="error">
                  <ExclamationCircleOutlined style={{ marginRight: 4 }} /> Authentication Error
                </Tag>
              ) : error ? (
                <Tag color="error">
                  <ExclamationCircleOutlined style={{ marginRight: 4 }} /> Unavailable
                </Tag>
              ) : (
                <Tag color="default">
                  <Text style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8c8c8c' }}>No Live Data</Text>
                </Tag>
              )}

              <Button
                onClick={fetchDashboard}
                loading={loading}
                icon={<SyncOutlined spin={loading} />}
                type="primary"
                style={{ background: '#ff4d4f', borderColor: '#ff4d4f' }}
              >
                {loading ? 'Syncing...' : 'Sync COC APIs'}
              </Button>
            </Space>
          </div>
        </div>

        {/* KPI Cards */}
        <Row gutter={[20, 20]}>
          <Col xs={24} sm={12} md={6}>
            <Card
              styles={{ body: { padding: '20px 24px' } }}
              style={{ borderRadius: 10, background: '#f6ffed', border: '1px solid #b7eb8f' }}
            >
              <Statistic
                title={
                  <Space>
                    <FileTextOutlined style={{ color: '#52c41a' }} />
                    <Text style={{ fontSize: 12, fontWeight: 600 }}>Total Quoted SOW Budget</Text>
                  </Space>
                }
                value={summary.totalQuotedBudget}
                prefix="$"
                precision={0}
                valueStyle={{ color: '#262626', fontSize: 28, fontWeight: 700 }}
                suffix={
                  <Text type="secondary" style={{ fontSize: 10, fontWeight: 600 }}>
                    {activeProjects.length} Active Projects
                  </Text>
                }
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card
              styles={{ body: { padding: '20px 24px' } }}
              style={{ borderRadius: 10, background: '#fff2f0', border: '1px solid #ffccc7' }}
            >
              <Statistic
                title={
                  <Space>
                    <FileOutlined style={{ color: '#ff4d4f' }} />
                    <Text style={{ fontSize: 12, fontWeight: 600 }}>Billed to Date</Text>
                    {liveDataAvailable && <Text type="success" style={{ fontSize: 10 }}>(COC Live)</Text>}
                  </Space>
                }
                value={summary.totalBilledToDate}
                prefix="$"
                precision={0}
                valueStyle={{ color: '#ff4d4f', fontSize: 28, fontWeight: 700 }}
                suffix={
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {liveDataAvailable ? 'Live from COC BSS' : 'Live data unavailable'}
                  </Text>
                }
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card
              styles={{ body: { padding: '20px 24px', position: 'relative' } }}
              style={{ borderRadius: 10, background: '#fff7e6', border: '1px solid #ffd591' }}
            >
              <WarningOutlined style={{ position: 'absolute', right: 20, bottom: 10, fontSize: 36, color: '#ff4d4f', opacity: 0.1 }} />
              <Statistic
                title={
                  <Space>
                    <FireOutlined style={{ color: '#ff4d4f' }} />
                    <Text style={{ fontSize: 12, fontWeight: 600 }}>Projected Delay Overrun</Text>
                  </Space>
                }
                value={summary.totalProjectedOverrun}
                prefix="$"
                precision={0}
                valueStyle={{
                  color: summary.totalProjectedOverrun > 0 ? '#ff4d4f' : '#8c8c8c',
                  fontSize: 28,
                  fontWeight: 700
                }}
                suffix={<Text type="secondary" style={{ fontSize: 10 }}>Cost of extended timelines</Text>}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card
              styles={{ body: { padding: '20px 24px' } }}
              style={{ borderRadius: 10, background: '#fffbe6', border: '1px solid #ffe58f' }}
            >
              <Statistic
                title={
                  <Space>
                    <ThunderboltFilled style={{ color: '#faad14' }} />
                    <Text style={{ fontSize: 12, fontWeight: 600 }}>Huawei Migration Coupons</Text>
                  </Space>
                }
                value={remainingCoupons}
                prefix="$"
                precision={0}
                valueStyle={{
                  color: remainingCoupons >= 0 ? '#faad14' : '#ff4d4f',
                  fontSize: 28,
                  fontWeight: 700
                }}
                suffix={<Text type="secondary" style={{ fontSize: 10 }}>Balance remaining</Text>}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Project Table */}
      <Card
        styles={{ body: { padding: 0 } }}
        style={{ borderRadius: 12 }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
          <Row gutter={[16, 8]} align="middle">
            <Col flex="auto">
              <Title level={5} style={{ margin: 0 }}>Timeline Impact & Run-Rate</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {liveDataAvailable
                  ? 'Live billing data from Huawei COC BSS APIs — actual consumption tracked per project.'
                  : 'Monitoring dual-run infrastructure costs caused by partners pushing end dates.'}
              </Text>
            </Col>
            {lastSyncTime && (
              <Col>
                <Text type="secondary" style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Last synced: {lastSyncTime.toLocaleTimeString()}
                </Text>
              </Col>
            )}
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={enrichedProjects}
          rowKey={(record) => record.id}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Total ${total} projects` }}
          size="middle"
          scroll={{ y: 500 }}
          locale={{ emptyText: <Empty description="No active projects in the pipeline." /> }}
          rowClassName={(record) => record.isLive ? 'live-project-row' : ''}
        />
      </Card>
    </div>
  );
}
