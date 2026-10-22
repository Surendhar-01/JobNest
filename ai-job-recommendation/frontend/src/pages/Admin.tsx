import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Tabs,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Badge,
  Popconfirm,
} from 'antd'
import {
  SafetyCertificateOutlined,
  UserOutlined,
  BankOutlined,
  FileTextOutlined,
  SyncOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CompassOutlined,
} from '@ant-design/icons'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { get, api, errorMessage } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Skeleton, ErrorState } from '../components/UI'
import type { AdminStats, Source, ScrapeLog } from '../types'

const { Title, Text, Paragraph } = Typography

const COLORS = ['#2563eb', '#4f46e5', '#0d9488', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']

export function Admin() {
  const { profile } = useAuth()
  const cache = useQueryClient()

  const [activeTab, setActiveTab] = useState<string>('overview')
  const [importModalOpen, setImportModalOpen] = useState(false)

  // Manual Job Import State
  const [impTitle, setImpTitle] = useState('')
  const [impCompany, setImpCompany] = useState('')
  const [impLocation, setImpLocation] = useState('')
  const [impDesc, setImpDesc] = useState('')
  const [impSkills, setImpSkills] = useState('')
  const [impAppUrl, setImpAppUrl] = useState('')
  const [impSource, setImpSource] = useState('https://realpython.github.io/fake-jobs/')
  const [impDept, setImpDept] = useState('Computer Science')

  // 1. Fetch Admin Stats
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ['/admin/dashboard'],
    queryFn: () => get<AdminStats>('/admin/dashboard'),
  })

  // 2. Fetch Sources
  const { data: sourcesData } = useQuery<{ items: Source[] }>({
    queryKey: ['/admin/sources'],
    queryFn: () => get<{ items: Source[] }>('/admin/sources'),
  })

  // 3. Fetch Scraping Logs
  const { data: logsData, refetch: refetchLogs } = useQuery<{ items: ScrapeLog[]; total: number }>({
    queryKey: ['/admin/scraping/logs'],
    queryFn: () => get<{ items: ScrapeLog[]; total: number }>('/admin/scraping/logs'),
  })

  // 4. Fetch Users
  const { data: usersData, refetch: refetchUsers } = useQuery<{ items: any[]; total: number }>({
    queryKey: ['/admin/users'],
    queryFn: () => get<{ items: any[]; total: number }>('/admin/users'),
    enabled: activeTab === 'users',
  })

  // 5. Fetch Jobs
  const { data: jobsData, refetch: refetchJobs } = useQuery<{ items: any[]; total: number }>({
    queryKey: ['/admin/jobs'],
    queryFn: () => get<{ items: any[]; total: number }>('/admin/jobs'),
    enabled: activeTab === 'jobs',
  })

  // Scraping Trigger Mutation
  const triggerScrapeMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const res = await api.post('/admin/scraping/run', { source_id: sourceId })
      return res.data
    },
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ['/admin/scraping/logs'] })
      cache.invalidateQueries({ queryKey: ['/admin/dashboard'] })
      toast.success('Collection job dispatched to background worker!')
    },
    onError: (err) => {
      toast.error(errorMessage(err))
    },
  })

  // User Role Mutation
  const userRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'student' | 'admin' }) => {
      return api.patch(`/admin/users/${userId}`, { role: newRole })
    },
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ['/admin/users'] })
      cache.invalidateQueries({ queryKey: ['/admin/dashboard'] })
      toast.success('User role updated successfully!')
    },
    onError: (err) => {
      toast.error(errorMessage(err))
    },
  })

  // Job Active Toggle Mutation
  const jobToggleMutation = useMutation({
    mutationFn: async ({ jobId, active }: { jobId: string; active: boolean }) => {
      return api.patch(`/admin/jobs/${jobId}?active=${active}`)
    },
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ['/admin/jobs'] })
      cache.invalidateQueries({ queryKey: ['/admin/dashboard'] })
      toast.success('Job status updated!')
    },
    onError: (err) => {
      toast.error(errorMessage(err))
    },
  })

  // Manual Job Import Mutation
  const importJobMutation = useMutation({
    mutationFn: async () => {
      return api.post('/admin/jobs/import', {
        title: impTitle,
        company: impCompany || null,
        location: impLocation || null,
        description: impDesc || null,
        skills: impSkills ? impSkills.split(',').map((s) => s.trim()) : [],
        application_url: impAppUrl,
        source: impSource,
        department: impDept || null,
        is_demo: false,
      })
    },
    onSuccess: () => {
      setImportModalOpen(false)
      cache.invalidateQueries({ queryKey: ['/admin/jobs'] })
      cache.invalidateQueries({ queryKey: ['/admin/dashboard'] })
      toast.success('Job imported into verified repository!')
      setImpTitle('')
      setImpCompany('')
      setImpLocation('')
      setImpDesc('')
      setImpSkills('')
      setImpAppUrl('')
    },
    onError: (err) => {
      toast.error(errorMessage(err))
    },
  })

  if (statsLoading) {
    return (
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 16px' }}>
        <Skeleton />
      </div>
    )
  }

  if (statsError || !stats) {
    return (
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 16px' }}>
        <ErrorState error={statsError} retry={() => void refetchStats()} />
      </div>
    )
  }

  // Format chart data
  const deptData = Object.entries(stats.jobs_by_department || {}).map(([name, value]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    value,
  }))

  const sourceData = Object.entries(stats.jobs_by_source || {}).map(([name, value]) => {
    try {
      return { name: new URL(name).hostname, value }
    } catch {
      return { name, value }
    }
  })

  // Table Columns
  const logColumns = [
    {
      title: 'Source ID',
      dataIndex: 'source_id',
      key: 'source_id',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'success' ? 'success' : status === 'failed' ? 'error' : 'processing'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Jobs Collected',
      dataIndex: 'job_count',
      key: 'job_count',
      render: (count: number) => <Text strong>{count || 0}</Text>,
    },
    {
      title: 'Started At',
      dataIndex: 'started_at',
      key: 'started_at',
      render: (val: string) => <Text type="secondary">{new Date(val).toLocaleString()}</Text>,
    },
    {
      title: 'Finished At',
      dataIndex: 'finished_at',
      key: 'finished_at',
      render: (val: string) => (val ? <Text type="secondary">{new Date(val).toLocaleString()}</Text> : '—'),
    },
    {
      title: 'Error / Note',
      dataIndex: 'error',
      key: 'error',
      ellipsis: true,
      render: (val: string) => <Text type="secondary">{val || 'None'}</Text>,
    },
  ]

  const userColumns = [
    {
      title: 'Full Name',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (name: string) => <Text strong>{name || 'Anonymous'}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (d: string) => d || 'Not set',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'purple' : 'default'}>
          {role.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          onClick={() =>
            userRoleMutation.mutate({
              userId: record.id,
              newRole: record.role === 'admin' ? 'student' : 'admin',
            })
          }
        >
          Toggle to {record.role === 'admin' ? 'Student' : 'Admin'}
        </Button>
      ),
    },
  ]

  const jobColumns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string) => <Text strong>{title}</Text>,
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (d: string) => d || 'General',
    },
    {
      title: 'Active Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          danger={record.is_active}
          onClick={() =>
            jobToggleMutation.mutate({
              jobId: record.id,
              active: !record.is_active,
            })
          }
        >
          {record.is_active ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px 48px' }}>
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Text strong style={{ fontSize: 12, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: 1 }}>
            <SafetyCertificateOutlined style={{ marginRight: 6 }} /> System Administration
          </Text>
          <Title level={2} style={{ margin: '4px 0 0', fontWeight: 800, color: '#0f172a' }}>
            Admin Console & Analytics
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Monitor web scraping engines, verified job listings, system health, and candidate registrations.
          </Text>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => setImportModalOpen(true)}
          style={{ borderRadius: 10, fontWeight: 600 }}
        >
          Import Job Manually
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k)}
        items={[
          {
            key: 'overview',
            label: 'Platform Overview',
            children: (
              <Space orientation="vertical" size={24} style={{ width: '100%' }}>
                {/* 4 KPI Cards */}
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} lg={6}>
                    <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}>
                      <Statistic
                        title={<Text strong style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Total Users</Text>}
                        value={stats.users}
                        prefix={<UserOutlined style={{ color: '#2563eb', marginRight: 8 }} />}
                      />
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                        Registered candidate profiles
                      </Text>
                    </Card>
                  </Col>

                  <Col xs={24} sm={12} lg={6}>
                    <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}>
                      <Statistic
                        title={<Text strong style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Total Jobs</Text>}
                        value={stats.jobs}
                        prefix={<BankOutlined style={{ color: '#4f46e5', marginRight: 8 }} />}
                      />
                      <Text style={{ fontSize: 11, display: 'block', marginTop: 4, color: '#4f46e5', fontWeight: 600 }}>
                        {stats.active_jobs} active listings
                      </Text>
                    </Card>
                  </Col>

                  <Col xs={24} sm={12} lg={6}>
                    <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}>
                      <Statistic
                        title={<Text strong style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Resumes Parsed</Text>}
                        value={stats.resumes}
                        prefix={<FileTextOutlined style={{ color: '#0d9488', marginRight: 8 }} />}
                      />
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                        Processed with NLP engine
                      </Text>
                    </Card>
                  </Col>

                  <Col xs={24} sm={12} lg={6}>
                    <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}>
                      <Statistic
                        title={<Text strong style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Scrape Batches</Text>}
                        value={stats.collection_statuses?.success || 0}
                        prefix={<SyncOutlined style={{ color: '#10b981', marginRight: 8 }} />}
                      />
                      <Text style={{ fontSize: 11, display: 'block', marginTop: 4, color: '#10b981', fontWeight: 600 }}>
                        Successful updates
                      </Text>
                    </Card>
                  </Col>
                </Row>

                {/* Charts Row */}
                <Row gutter={[20, 20]}>
                  <Col xs={24} lg={12}>
                    <Card
                      title={<Text strong style={{ fontSize: 14 }}>Jobs by Academic Department</Text>}
                      style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
                    >
                      <div style={{ height: 260, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 10, fill: '#64748b' }}
                              angle={-25}
                              textAnchor="end"
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#ffffff',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                fontSize: '12px',
                              }}
                            />
                            <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </Col>

                  <Col xs={24} lg={12}>
                    <Card
                      title={<Text strong style={{ fontSize: 14 }}>Jobs by Verified Source</Text>}
                      style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
                    >
                      <div style={{ height: 260, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={sourceData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                              {sourceData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#ffffff',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                fontSize: '12px',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </Space>
            ),
          },
          {
            key: 'scraping',
            label: 'Web Scrapers & Logs',
            children: (
              <Space orientation="vertical" size={24} style={{ width: '100%' }}>
                {/* Approved Sources */}
                <Card
                  title={<Text strong style={{ fontSize: 14 }}>Approved Collection Sources</Text>}
                  extra={<Text type="secondary" style={{ fontSize: 12 }}>Strict adherence to permission terms & robots.txt</Text>}
                  style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
                >
                  <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                    {sourcesData?.items?.map((source) => (
                      <div
                        key={source.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: 16,
                          borderRadius: 12,
                          border: '1px solid #e2e8f0',
                          background: '#f8fafc',
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        <div>
                          <Space>
                            <Text strong style={{ fontSize: 14 }}>{source.name}</Text>
                            <Tag color="success">Permitted</Tag>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                            {source.url}
                          </Text>
                          {source.last_success && (
                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                              Last Success: {new Date(source.last_success).toLocaleString()}
                            </Text>
                          )}
                        </div>

                        <Button
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          loading={triggerScrapeMutation.isPending}
                          onClick={() => triggerScrapeMutation.mutate(source.id)}
                          style={{ borderRadius: 8 }}
                        >
                          Run Scraper Now
                        </Button>
                      </div>
                    ))}
                  </Space>
                </Card>

                {/* Scraping Logs */}
                <Card
                  title={<Text strong style={{ fontSize: 14 }}>Collection Audit Logs</Text>}
                  extra={
                    <Button
                      type="link"
                      icon={<ReloadOutlined />}
                      onClick={() => refetchLogs()}
                      style={{ padding: 0 }}
                    >
                      Refresh Logs
                    </Button>
                  }
                  style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
                >
                  <Table
                    columns={logColumns}
                    dataSource={logsData?.items || []}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    size="middle"
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: 'users',
            label: 'User Directory',
            children: (
              <Card
                title={<Text strong style={{ fontSize: 14 }}>Registered Candidate & Admin Accounts</Text>}
                extra={<Text type="secondary">{usersData?.total || 0} Total Profiles</Text>}
                style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
              >
                <Table
                  columns={userColumns}
                  dataSource={usersData?.items || []}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  size="middle"
                />
              </Card>
            ),
          },
          {
            key: 'jobs',
            label: 'Job Inventory',
            children: (
              <Card
                title={<Text strong style={{ fontSize: 14 }}>Collected Job Database</Text>}
                extra={<Text type="secondary">{jobsData?.total || 0} Total Listings</Text>}
                style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
              >
                <Table
                  columns={jobColumns}
                  dataSource={jobsData?.items || []}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  size="middle"
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Manual Job Import Modal */}
      <Modal
        title="Import Job Manually"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setImportModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={importJobMutation.isPending}
            onClick={() => importJobMutation.mutate()}
          >
            Save Job
          </Button>,
        ]}
      >
        <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
          Add a verified career opportunity to the persistent job repository.
        </Paragraph>

        <Form layout="vertical">
          <Form.Item label="Job Title *" required>
            <Input
              value={impTitle}
              onChange={(e) => setImpTitle(e.target.value)}
              placeholder="e.g. Associate Software Engineer"
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Company">
                <Input
                  value={impCompany}
                  onChange={(e) => setImpCompany(e.target.value)}
                  placeholder="e.g. Acme Tech Corp"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Location">
                <Input
                  value={impLocation}
                  onChange={(e) => setImpLocation(e.target.value)}
                  placeholder="e.g. Remote or Bangalore"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Department">
            <Select
              value={impDept}
              onChange={(val) => setImpDept(val)}
              options={[
                { label: 'Computer Science', value: 'Computer Science' },
                { label: 'Information Technology', value: 'Information Technology' },
                { label: 'Electrical Engineering', value: 'Electrical Engineering' },
                { label: 'Mechanical Engineering', value: 'Mechanical Engineering' },
                { label: 'Civil Engineering', value: 'Civil Engineering' },
                { label: 'Business Administration', value: 'Business Administration' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Required Skills (comma separated)">
            <Input
              value={impSkills}
              onChange={(e) => setImpSkills(e.target.value)}
              placeholder="Python, React, SQL, Git"
            />
          </Form.Item>

          <Form.Item label="Application URL *" required>
            <Input
              type="url"
              value={impAppUrl}
              onChange={(e) => setImpAppUrl(e.target.value)}
              placeholder="https://company.com/careers/job123"
            />
          </Form.Item>

          <Form.Item label="Job Description">
            <Input.TextArea
              rows={3}
              value={impDesc}
              onChange={(e) => setImpDesc(e.target.value)}
              placeholder="Paste role responsibilities and qualifications..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Admin
