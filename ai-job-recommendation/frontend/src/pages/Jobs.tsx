import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Row,
  Col,
  Card,
  Input,
  Select,
  Radio,
  Tag,
  Button,
  Pagination,
  Space,
  Typography,
  Drawer,
  Modal,
  Empty as AntEmpty,
  Skeleton as AntSkeleton,
  Badge,
  Tooltip,
} from 'antd'
import {
  SearchOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
  CompassOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  CheckCircleFilled,
  WarningFilled,
  ApartmentOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { get, api, errorMessage } from '../services/api'
import { JobCard } from '../components/JobCard'
import { ErrorState } from '../components/UI'
import type { Job, Page } from '../types'

const { Title, Text, Paragraph } = Typography

interface PortalStatusItem {
  platform: string
  status: string
  method: string
  real_jobs_collected: boolean
  notes: string
}

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Artificial Intelligence & Data Science',
  'Artificial Intelligence & Machine Learning',
  'Electronics & Communication',
  'Electrical & Electronics',
  'VLSI Design & Technology',
  'Mechanical Engineering',
  'Mechatronics Engineering',
  'Civil Engineering',
  'Biotechnology',
  'Food Technology',
  'Textile Technology',
  'Master of Business Administration',
  'Master of Computer Applications',
]

const DEPT_SHORT_LABELS: Record<string, string> = {
  'Computer Science & Engineering': 'CSE',
  'Information Technology': 'IT',
  'Artificial Intelligence & Data Science': 'AI & DS',
  'Artificial Intelligence & Machine Learning': 'AI & ML',
  'Electronics & Communication': 'ECE',
  'Electrical & Electronics': 'EEE',
  'VLSI Design & Technology': 'VLSI',
  'Mechanical Engineering': 'Mechanical',
  'Mechatronics Engineering': 'Mechatronics',
  'Civil Engineering': 'Civil',
  'Biotechnology': 'Biotech',
  'Food Technology': 'Food Tech',
  'Textile Technology': 'Textile',
  'Master of Business Administration': 'MBA',
  'Master of Computer Applications': 'MCA',
}

const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  internshala: 'Internshala',
  instahyre: 'Instahyre',
  arbeitnow: 'Arbeitnow',
  naukri: 'Naukri',
  remoteok: 'RemoteOK',
  jobicy: 'Jobicy',
  remotive: 'Remotive',
}

function sourceToken(raw: string): string {
  const lower = (raw || '').toLowerCase()
  const known = Object.keys(SOURCE_LABELS).find((key) => lower.includes(key))
  if (known) return known
  try {
    const host = new URL(lower).hostname.replace(/^www\./, '')
    return host.split('.')[0] || lower
  } catch {
    return lower
  }
}

function sourceLabel(token: string): string {
  return SOURCE_LABELS[token] || token.charAt(0).toUpperCase() + token.slice(1)
}

export function Jobs() {
  const [params, setParams] = useSearchParams()
  const queryClient = useQueryClient()

  const q = params.get('q') || ''
  const location = params.get('location') || ''
  const department = params.get('department') || ''
  const source = params.get('source') || ''
  const jobType = params.get('job_type') || ''
  const workMode = params.get('work_mode') || ''
  const experience = params.get('experience') || ''
  const sort = params.get('sort') || 'date'
  const page = parseInt(params.get('page') || '1', 10)

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [statusModalOpen, setStatusModalOpen] = useState(false)

  // Fetch filter options dynamically
  const { data: filterOptions } = useQuery({
    queryKey: ['/jobs/filters'],
    queryFn: () => get<Record<string, string[]>>('/jobs/filters'),
    staleTime: 300000,
  })

  // Fetch portal scraping compliance statuses
  const { data: portalStatusData } = useQuery({
    queryKey: ['/scraping/sources-status'],
    queryFn: () => get<{ items: PortalStatusItem[] }>('/scraping/sources-status'),
    staleTime: 60000,
  })

  // Platform dropdown options: every known platform, plus any source present in the
  // live job data and every portal actively collecting real jobs.
  const sourceOptions = useMemo(() => {
    const tokens = new Set<string>()
    for (const raw of filterOptions?.source || []) {
      tokens.add(sourceToken(raw))
    }
    for (const item of portalStatusData?.items || []) {
      if (item.real_jobs_collected) tokens.add(sourceToken(item.platform))
    }
    const ordered = [
      ...Object.keys(SOURCE_LABELS).filter((token) => tokens.has(token)),
      ...Array.from(tokens).filter((token) => !(token in SOURCE_LABELS)).sort(),
    ]
    return [
      { label: 'All Platforms', value: '' },
      ...ordered.map((token) => ({ label: sourceLabel(token), value: token })),
    ]
  }, [filterOptions, portalStatusData])

  // Fetch jobs with active query params
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['/jobs', q, location, department, source, jobType, workMode, experience, sort, page],
    queryFn: () =>
      get<Page<Job>>('/jobs', {
        q: q || undefined,
        location: location || undefined,
        department: department || undefined,
        source: source || undefined,
        job_type: jobType || undefined,
        work_mode: workMode || undefined,
        experience: experience ? parseFloat(experience) : undefined,
        sort,
        page,
        page_size: 12,
      }),
  })

  // Live Refresh Mutation
  const refreshMutation = useMutation({
    mutationFn: () => api.post('/jobs/refresh'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['/jobs'] })
      queryClient.invalidateQueries({ queryKey: ['/jobs/filters'] })
      queryClient.invalidateQueries({ queryKey: ['/jobs/stats'] })
      toast.success(res.data?.message || 'Live web scraping completed with fresh listings!')
    },
    onError: (err) => {
      toast.error(errorMessage(err))
    },
  })

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    if (key !== 'page') {
      next.set('page', '1') // reset page on filter change
    }
    setParams(next)
  }

  function clearAllFilters() {
    setParams(new URLSearchParams())
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (q) count++
    if (location) count++
    if (department) count++
    if (source) count++
    if (jobType) count++
    if (workMode) count++
    if (experience) count++
    return count
  }, [q, location, department, source, jobType, workMode, experience])

  const filterSidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 14,
          borderBottom: '1px solid #f1f5f9',
          minHeight: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
          >
            <FilterOutlined />
          </div>
          <Text strong style={{ fontSize: 15, color: '#0f172a', lineHeight: 1.2 }}>
            Filters
          </Text>
          {activeFilterCount > 0 && (
            <Badge
              count={activeFilterCount}
              style={{
                backgroundColor: '#2563eb',
                fontSize: 11,
                boxShadow: 'none',
                height: 18,
                minWidth: 18,
                lineHeight: '18px',
              }}
            />
          )}
        </div>

        {activeFilterCount > 0 ? (
          <Button
            type="link"
            size="small"
            onClick={clearAllFilters}
            style={{
              padding: '0 4px',
              height: 24,
              fontSize: 12,
              fontWeight: 600,
              color: '#ef4444',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Reset All
          </Button>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            All Active
          </Text>
        )}
      </div>

      {/* Recruitment Source */}
      <div>
        <Text strong style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Recruitment Source
        </Text>
        <Select
          value={source || undefined}
          placeholder="All Platforms"
          allowClear
          showSearch
          optionFilterProp="label"
          onChange={(val) => updateParam('source', val || '')}
          style={{ width: '100%' }}
          options={sourceOptions}
        />
      </div>

      {/* Academic Department */}
      <div>
        <Text strong style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Academic Department
        </Text>
        <Select
          value={department || undefined}
          placeholder="All Departments"
          allowClear
          onChange={(val) => updateParam('department', val || '')}
          style={{ width: '100%' }}
          options={DEPARTMENTS.map((d) => ({ label: d, value: d }))}
        />
      </div>

      {/* Employment Type */}
      <div>
        <Text strong style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Employment Type
        </Text>
        <Select
          value={jobType || undefined}
          placeholder="All Types"
          allowClear
          onChange={(val) => updateParam('job_type', val || '')}
          style={{ width: '100%' }}
          options={[
            { label: 'Full-time', value: 'Full-time' },
            { label: 'Internship', value: 'Internship' },
            { label: 'Part-time', value: 'Part-time' },
            { label: 'Contract', value: 'Contract' },
          ]}
        />
      </div>

      {/* Work Mode */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong style={{ fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Work Mode
          </Text>
          {workMode && (
            <Button type="link" size="small" onClick={() => updateParam('work_mode', '')} style={{ padding: 0, fontSize: 11 }}>
              Clear
            </Button>
          )}
        </div>
        <Radio.Group
          value={workMode}
          onChange={(e) => updateParam('work_mode', e.target.value)}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {['On-site', 'Hybrid', 'Remote'].map((mode) => (
            <Radio key={mode} value={mode}>
              <Text style={{ fontSize: 13 }}>{mode}</Text>
            </Radio>
          ))}
        </Radio.Group>
      </div>

      {/* Experience Level */}
      <div>
        <Text strong style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Experience Level
        </Text>
        <Select
          value={experience || undefined}
          placeholder="Any Experience Level"
          allowClear
          onChange={(val) => updateParam('experience', val || '')}
          style={{ width: '100%' }}
          options={[
            { label: 'Fresher / Entry Level (0-1 yrs)', value: '0' },
            { label: '≤ 2 years', value: '2' },
            { label: '≤ 4 years', value: '4' },
          ]}
        />
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Banner & Control Card */}
      <Card
        style={{
          borderRadius: 16,
          marginBottom: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
        styles={{ body: { padding: 20 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
              Live Job Portal & Recruitment Explorer
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Directly scraped and aggregated from verified recruitment websites (LinkedIn, Internshala, Instahyre, Arbeitnow, Naukri).
            </Text>
          </div>

          <Space wrap>
            <Button
              type="default"
              icon={<InfoCircleOutlined />}
              onClick={() => setStatusModalOpen(true)}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Portals Status
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined spin={refreshMutation.isPending || isFetching} />}
              loading={refreshMutation.isPending}
              onClick={() => refreshMutation.mutate()}
              style={{
                borderRadius: 8,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              }}
            >
              Refresh Live Listings
            </Button>
          </Space>
        </div>

        {/* Search Bars */}
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={14}>
            <Input
              size="large"
              placeholder="Search by job title, company name, or skills (e.g. Python, AutoCAD, Civil, React)..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={q}
              allowClear
              onChange={(e) => updateParam('q', e.target.value)}
              style={{ borderRadius: 10 }}
            />
          </Col>
          <Col xs={24} sm={16} md={7}>
            <Input
              size="large"
              placeholder="City, State, or Location..."
              prefix={<EnvironmentOutlined style={{ color: '#94a3b8' }} />}
              value={location}
              allowClear
              onChange={(e) => updateParam('location', e.target.value)}
              style={{ borderRadius: 10 }}
            />
          </Col>
          <Col xs={24} sm={8} md={3}>
            <Button
              size="large"
              icon={<FilterOutlined />}
              onClick={() => setMobileFilterOpen(true)}
              style={{ width: '100%', borderRadius: 10 }}
              className="lg:hidden"
            >
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Button>
          </Col>
        </Row>

        {/* Department Quick Buttons */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Text strong style={{ fontSize: 12, color: '#64748b', marginRight: 4 }}>
            Department:
          </Text>
          <Button
            size="small"
            type={!department ? 'primary' : 'default'}
            onClick={() => updateParam('department', '')}
            style={{ borderRadius: 12, fontSize: 12 }}
          >
            All
          </Button>
          {DEPARTMENTS.map((dept) => {
            const isSelected = department.toLowerCase() === dept.toLowerCase()
            const shortLabel = DEPT_SHORT_LABELS[dept] || dept
            return (
              <Button
                key={dept}
                size="small"
                type={isSelected ? 'primary' : 'default'}
                onClick={() => updateParam('department', isSelected ? '' : dept)}
                style={{ borderRadius: 12, fontSize: 12 }}
              >
                {shortLabel}
              </Button>
            )
          })}
        </div>

        {/* Active Filter Pills */}
        {activeFilterCount > 0 && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text type="secondary" strong style={{ fontSize: 12 }}>Active Filters:</Text>
            {source && (
              <Tag color="cyan" closable onClose={() => updateParam('source', '')}>
                Source: {sourceLabel(sourceToken(source))}
              </Tag>
            )}
            {department && (
              <Tag color="blue" closable onClose={() => updateParam('department', '')}>
                Dept: {department}
              </Tag>
            )}
            {jobType && (
              <Tag color="purple" closable onClose={() => updateParam('job_type', '')}>
                Type: {jobType}
              </Tag>
            )}
            {workMode && (
              <Tag color="geekblue" closable onClose={() => updateParam('work_mode', '')}>
                Mode: {workMode}
              </Tag>
            )}
            {experience && (
              <Tag color="green" closable onClose={() => updateParam('experience', '')}>
                Exp ≤ {experience} yrs
              </Tag>
            )}
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined style={{ fontSize: 11 }} />}
              onClick={clearAllFilters}
              danger
              style={{ padding: '0 4px', fontSize: 12 }}
            >
              Clear all
            </Button>
          </div>
        )}
      </Card>

      {/* Main Content Layout */}
      <Row gutter={[24, 24]}>
        {/* Desktop Sidebar Filters */}
        <Col xs={0} lg={6}>
          <div
            style={{
              position: 'sticky',
              top: 76,
              zIndex: 10,
            }}
          >
            <Card
              style={{
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                background: '#ffffff',
                maxHeight: 'calc(100vh - 96px)',
                overflowY: 'auto',
              }}
              styles={{ body: { padding: '16px 18px 20px' } }}
              className="sticky-filter-card"
            >
              {filterSidebarContent}
            </Card>
          </div>
        </Col>

        {/* Mobile Filter Drawer */}
        <Drawer
          title="Filter Opportunities"
          placement="right"
          onClose={() => setMobileFilterOpen(false)}
          open={mobileFilterOpen}
        >
          {filterSidebarContent}
        </Drawer>

        {/* Real Openings Listing Column */}
        <Col xs={24} lg={18}>
          {/* Header Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
                {data ? `${data.total} Real Openings Available` : 'Collecting Live Openings...'}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                100% verified real job postings collected directly from recruitment websites.
              </Text>
            </div>

            <Space align="center">
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>Sort:</Text>
              <Select
                value={sort}
                onChange={(val) => updateParam('sort', val)}
                size="middle"
                style={{ width: 160 }}
                options={[
                  { label: 'Latest Posted', value: 'date' },
                  { label: 'Alphabetical (Title)', value: 'title' },
                ]}
              />
            </Space>
          </div>

          {/* Skeletons */}
          {isLoading && (
            <Row gutter={[16, 16]}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Col xs={24} md={12} key={i}>
                  <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}>
                    <AntSkeleton active avatar paragraph={{ rows: 3 }} />
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          {/* Error State */}
          {isError && <ErrorState error={error} retry={() => void refetch()} />}

          {/* Empty State */}
          {!isLoading && !isError && (!data?.items || data.items.length === 0) && (
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 0', border: '1px solid #e2e8f0' }}>
              <AntEmpty
                description={
                  <div>
                    <Text strong style={{ fontSize: 16, display: 'block', color: '#1e293b' }}>
                      No matching job listings found
                    </Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Try selecting another department or clicking 'Refresh Live Listings' to pull fresh openings.
                    </Text>
                  </div>
                }
              >
                <Space style={{ marginTop: 12 }}>
                  <Button type="primary" onClick={clearAllFilters} style={{ borderRadius: 8 }}>
                    Reset Filters
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => refreshMutation.mutate()}
                    style={{ borderRadius: 8 }}
                  >
                    Scrape Now
                  </Button>
                </Space>
              </AntEmpty>
            </Card>
          )}

          {/* Jobs Grid */}
          {!isLoading && !isError && data?.items && data.items.length > 0 && (
            <>
              <Row gutter={[16, 16]}>
                {data.items.map((job) => (
                  <Col xs={24} md={12} key={job.id}>
                    <JobCard job={job} />
                  </Col>
                ))}
              </Row>

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32, paddingBottom: 24 }}>
                <Pagination
                  current={page}
                  total={data.total}
                  pageSize={data.page_size}
                  showSizeChanger={false}
                  onChange={(nextPage) => updateParam('page', nextPage.toString())}
                />
              </div>
            </>
          )}
        </Col>
      </Row>

      {/* Portals Status Modal */}
      <Modal
        title={
          <Space>
            <GlobalOutlined style={{ color: '#2563eb' }} />
            <span>Recruitment Portals Live Status & Compliance</span>
          </Space>
        }
        open={statusModalOpen}
        onOk={() => setStatusModalOpen(false)}
        onCancel={() => setStatusModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setStatusModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={720}
      >
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
          In accordance with project compliance rules, data is collected solely through permitted public endpoints
          and official APIs. Platforms with active anti-bot protections (reCAPTCHA / Cloudflare) are reported transparently
          rather than fabricating fake jobs.
        </Paragraph>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {portalStatusData?.items?.map((item) => (
            <div
              key={item.platform}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                background: item.real_jobs_collected ? '#f8fafc' : '#fef2f2',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div>
                <Space align="center" size={8}>
                  {item.real_jobs_collected ? (
                    <CheckCircleFilled style={{ color: '#16a34a', fontSize: 16 }} />
                  ) : (
                    <WarningFilled style={{ color: '#dc2626', fontSize: 16 }} />
                  )}
                  <Text strong style={{ fontSize: 14 }}>{item.platform}</Text>
                  <Tag color={item.real_jobs_collected ? 'green' : 'red'}>
                    {item.real_jobs_collected ? 'Live & Scraping' : 'Restricted (Anti-Bot)'}
                  </Tag>
                </Space>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Method: {item.method}
                </div>
                <div style={{ fontSize: 12, color: item.real_jobs_collected ? '#334155' : '#991b1b', marginTop: 2 }}>
                  {item.notes}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}

export default Jobs
