import { Button, Col, Row, Statistic, Table, Tag, Typography } from 'antd'
import {
  ArrowRightOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ScrapeLog } from '../types'
import {
  AdminPageHeader,
  AdminPanel,
  AdminQueryState,
  chartEntries,
  formatAdminDate,
  sourceLabel,
  useAdminStats,
} from './admin/AdminShared'

const { Text } = Typography
const chartColors = ['#2563eb', '#4f46e5', '#0d9488', '#f59e0b', '#8b5cf6', '#ec4899', '#0891b2']

export function Admin() {
  const navigate = useNavigate()
  const statsQuery = useAdminStats()
  const stats = statsQuery.data
  const departments = chartEntries(stats?.jobs_by_department)
  const sources = chartEntries(stats?.jobs_by_source).map((item) => ({
    ...item,
    name: sourceLabel(item.name),
  }))
  const skills = chartEntries(stats?.frequently_requested_skills)
  const logs = stats?.recent_logs || []
  const errors = stats?.recent_errors || []

  const logColumns = [
    {
      title: 'Source',
      dataIndex: 'source_id',
      key: 'source_id',
      render: (value: string) => <Text strong>{value || 'Unknown'}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <Tag color={value === 'success' ? 'success' : value === 'failed' ? 'error' : 'processing'}>
          {value}
        </Tag>
      ),
    },
    { title: 'Collected', dataIndex: 'job_count', key: 'job_count' },
    { title: 'Inserted', dataIndex: 'inserted_count', key: 'inserted_count', render: (n?: number) => n ?? '—' },
    { title: 'Updated', dataIndex: 'updated_count', key: 'updated_count', render: (n?: number) => n ?? '—' },
    {
      title: 'Started',
      dataIndex: 'started_at',
      key: 'started_at',
      render: (value: string) => formatAdminDate(value),
    },
  ]

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Platform overview"
        description="A live snapshot of users, job inventory, source health, and collection activity."
      >
        <Button icon={<ReloadOutlined />} onClick={() => void statsQuery.refetch()} loading={statsQuery.isFetching}>
          Refresh data
        </Button>
        <Button type="primary" icon={<SyncOutlined />} onClick={() => navigate('/admin/collections')}>
          Manage collections
        </Button>
      </AdminPageHeader>

      <AdminQueryState loading={statsQuery.isPending} error={statsQuery.error} retry={() => void statsQuery.refetch()}>
        {stats && (
          <>
            <Row gutter={[16, 16]} className="admin-kpi-grid">
              <Col xs={24} sm={12} xl={6}>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-icon blue"><UserOutlined /></div>
                  <Statistic title="Total registered users" value={stats.users} />
                  <Text type="secondary">All user profiles</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} xl={6}>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-icon purple"><DatabaseOutlined /></div>
                  <Statistic title="Total jobs" value={stats.jobs} />
                  <Text type="secondary">{stats.active_jobs} currently active</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} xl={6}>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-icon teal"><SafetyCertificateOutlined /></div>
                  <Statistic title="Active job sources" value={stats.active_sources} />
                  <Text type="secondary">Enabled and permitted</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} xl={6}>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-icon amber"><SyncOutlined /></div>
                  <Statistic title="Jobs in latest run" value={stats.jobs_collected_latest_run} />
                  <Text type="secondary">Latest collection activity</Text>
                </div>
              </Col>
            </Row>

            <Row gutter={[18, 18]}>
              <Col xs={24} xl={12}>
                <AdminPanel title="Jobs by department">
                  {departments.length ? (
                    <div className="admin-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={departments} margin={{ top: 8, right: 12, left: -16, bottom: 48 }}>
                          <CartesianGrid stroke="#edf1f7" vertical={false} />
                          <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={62} tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" name="Jobs" fill="#3478f6" radius={[5, 5, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="admin-empty">No department data available.</div>}
                </AdminPanel>
              </Col>
              <Col xs={24} xl={12}>
                <AdminPanel title="Jobs by source">
                  {sources.length ? (
                    <div className="admin-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sources} dataKey="count" nameKey="name" innerRadius={60} outerRadius={104} paddingAngle={3}>
                            {sources.map((item, index) => (
                              <Cell key={item.name} fill={chartColors[index % chartColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="admin-empty">No source data available.</div>}
                  <div className="admin-chart-legend">
                    {sources.map((item, index) => (
                      <span key={item.name}>
                        <i style={{ background: chartColors[index % chartColors.length] }} />
                        {item.name}<b>{item.count}</b>
                      </span>
                    ))}
                  </div>
                </AdminPanel>
              </Col>
              <Col xs={24} xl={12}>
                <AdminPanel title="Most frequently requested skills">
                  {skills.length ? (
                    <div className="admin-chart admin-chart-short">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={skills} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                          <CartesianGrid stroke="#edf1f7" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" name="Job listings" fill="#12a594" radius={[0, 5, 5, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="admin-empty">No skill data available.</div>}
                </AdminPanel>
              </Col>
              <Col xs={24} xl={12}>
                <AdminPanel title="Data refresh status">
                  <div className="admin-refresh-status">
                    <div className="admin-refresh-indicator"><SyncOutlined /></div>
                    <div>
                      <Text type="secondary">Last successful data refresh</Text>
                      <div className="admin-refresh-date">{formatAdminDate(stats.latest_successful_refresh)}</div>
                    </div>
                  </div>
                  <div className="admin-refresh-meta">
                    <Text type="secondary">Scheduled refresh</Text>
                    <Tag color={stats.scheduled_refresh?.enabled ? 'success' : 'default'}>
                      {stats.scheduled_refresh?.enabled
                        ? `Enabled · every ${Math.round((stats.scheduled_refresh.interval_seconds || 300) / 60)} min`
                        : 'Not enabled'}
                    </Tag>
                  </div>
                  <Button type="link" icon={<ArrowRightOutlined />} onClick={() => navigate('/admin/collections')}>
                    View collection history
                  </Button>
                </AdminPanel>
              </Col>
              <Col xs={24}>
                <AdminPanel title="Recent job collection activity" extra={<Button type="link" onClick={() => navigate('/admin/collections')}>View all</Button>}>
                  <Table<ScrapeLog>
                    rowKey="id"
                    columns={logColumns}
                    dataSource={logs}
                    pagination={false}
                    size="middle"
                    scroll={{ x: 720 }}
                    locale={{ emptyText: 'No collection runs have been recorded.' }}
                  />
                </AdminPanel>
              </Col>
              {errors.length > 0 && (
                <Col xs={24}>
                  <AdminPanel title="Recent system errors">
                    <div className="admin-error-list">
                      {errors.map((run) => (
                        <div className="admin-error-row" key={run.id}>
                          <Tag color="error">FAILED</Tag>
                          <Text strong>{run.source_id || 'Unknown source'}</Text>
                          <Text type="secondary">{run.error || 'No error detail recorded'}</Text>
                          <Text type="secondary">{formatAdminDate(run.started_at)}</Text>
                        </div>
                      ))}
                    </div>
                  </AdminPanel>
                </Col>
              )}
            </Row>
          </>
        )}
      </AdminQueryState>
    </div>
  )
}
