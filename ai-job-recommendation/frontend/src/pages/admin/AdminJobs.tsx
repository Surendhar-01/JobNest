import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Drawer, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { api, errorMessage, get } from '../../services/api'
import type { Job, Page } from '../../types'
import {
  AdminPageHeader,
  AdminQueryState,
  formatAdminDate,
  sourceLabel,
  useAdminStats,
} from './AdminShared'

const { Text, Paragraph } = Typography

function isPotentiallyOutdated(postedDate: string | null) {
  if (!postedDate) return false
  const timestamp = new Date(postedDate).getTime()
  return Number.isFinite(timestamp) && Date.now() - timestamp > 60 * 24 * 60 * 60 * 1000
}

export function AdminJobs() {
  const cache = useQueryClient()
  const [form] = Form.useForm()
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState<string>()
  const [location, setLocation] = useState<string>()
  const [jobType, setJobType] = useState<string>()
  const [source, setSource] = useState<string>()
  const [page, setPage] = useState(1)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const pageSize = 20

  const statsQuery = useAdminStats()
  const params = {
    page,
    page_size: pageSize,
    ...(search.trim() ? { q: search.trim() } : {}),
    ...(department ? { department } : {}),
    ...(location ? { location } : {}),
    ...(jobType ? { job_type: jobType } : {}),
    ...(source ? { source } : {}),
  }
  const jobsQuery = useQuery({
    queryKey: ['admin-jobs', params],
    queryFn: () => get<Page<Job>>('/admin/jobs', params),
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/admin/jobs/${id}?active=${active}`),
    onSuccess: async (_, variables) => {
      toast.success(variables.active ? 'Job listing activated' : 'Job listing deactivated')
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['admin-jobs'] }),
        cache.invalidateQueries({ queryKey: ['admin-dashboard'] }),
      ])
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
  const importMutation = useMutation({
    mutationFn: (values: {
      title: string
      company?: string
      location?: string
      department?: string
      description?: string
      skills?: string
      source: string
      application_url: string
    }) => api.post('/admin/jobs/import', {
      ...values,
      company: values.company || null,
      location: values.location || null,
      department: values.department || null,
      description: values.description || null,
      skills: values.skills ? values.skills.split(',').map((skill) => skill.trim()).filter(Boolean) : [],
      is_demo: false,
    }),
    onSuccess: async () => {
      toast.success('Job imported successfully')
      setImportOpen(false)
      form.resetFields()
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['admin-jobs'] }),
        cache.invalidateQueries({ queryKey: ['admin-dashboard'] }),
      ])
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  function confirmJobStatus(job: Job) {
    const active = !job.is_active
    Modal.confirm({
      title: `${active ? 'Reactivate' : 'Deactivate'} this job listing?`,
      content: `${job.title || 'This job'}${job.company ? ` at ${job.company}` : ''}`,
      okText: active ? 'Reactivate listing' : 'Deactivate listing',
      okButtonProps: { danger: !active },
      onOk: () => statusMutation.mutateAsync({ id: job.id, active }),
    })
  }

  const columns = [
    {
      title: 'Job',
      key: 'job',
      render: (_: unknown, job: Job) => (
        <div className="admin-user-cell">
          <Text strong>{job.title || 'Untitled role'}</Text>
          <Text type="secondary">{job.company || 'Company not specified'}</Text>
        </div>
      ),
    },
    { title: 'Department', dataIndex: 'department', key: 'department', render: (value: string | null) => value || '—' },
    { title: 'Location', dataIndex: 'location', key: 'location', render: (value: string | null) => value || '—' },
    { title: 'Type', dataIndex: 'job_type', key: 'job_type', render: (value: string | null) => value || '—' },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (value: string) => <Text>{sourceLabel(value)}</Text>,
    },
    {
      title: 'Posting',
      dataIndex: 'posted_date',
      key: 'posted_date',
      render: (value: string | null) => isPotentiallyOutdated(value)
        ? <Tag color="warning">Potentially outdated</Tag>
        : formatAdminDate(value, false),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => <Tag color={active ? 'success' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, job: Job) => (
        <Space>
          <Button type="link" onClick={() => setSelectedJob(job)}>View details</Button>
          <Button
            type="link"
            danger={job.is_active}
            disabled={statusMutation.isPending}
            onClick={() => confirmJobStatus(job)}
          >
            {job.is_active ? 'Deactivate' : 'Reactivate'}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Job management"
        description="Review collected listings, their source and posting details, and find opportunities to inspect."
      >
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setImportOpen(true)}>
          Import a job
        </Button>
      </AdminPageHeader>
      <div className="admin-toolbar">
        <Input
          allowClear
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1) }}
          prefix={<SearchOutlined />}
          placeholder="Search job title or company"
          className="admin-search"
        />
        <Select
          allowClear
          value={department}
          onChange={(value) => { setDepartment(value); setPage(1) }}
          placeholder="All departments"
          options={Object.keys(statsQuery.data?.jobs_by_department || {}).map((value) => ({ value, label: value }))}
          className="admin-filter-select"
        />
        <Select
          allowClear
          value={location}
          onChange={(value) => { setLocation(value); setPage(1) }}
          placeholder="All locations"
          options={Object.keys(statsQuery.data?.jobs_by_location || {}).map((value) => ({ value, label: value }))}
          className="admin-filter-select"
        />
        <Select
          allowClear
          value={jobType}
          onChange={(value) => { setJobType(value); setPage(1) }}
          placeholder="All job types"
          options={Object.keys(statsQuery.data?.job_types || {}).map((value) => ({ value, label: value }))}
          className="admin-filter-select"
        />
        <Select
          allowClear
          value={source}
          onChange={(value) => { setSource(value); setPage(1) }}
          placeholder="All sources"
          options={Object.keys(statsQuery.data?.jobs_by_source || {}).map((value) => ({
            value,
            label: sourceLabel(value),
          }))}
          className="admin-filter-select"
        />
      </div>
      <AdminQueryState loading={jobsQuery.isPending} error={jobsQuery.error} retry={() => void jobsQuery.refetch()}>
        <div className="admin-panel admin-table-panel">
          <div className="admin-table-heading">
            <div>
              <Text strong>Collected job listings</Text>
              <Text type="secondary">{jobsQuery.data?.total ?? 0} total listings</Text>
            </div>
          </div>
          <Table<Job>
            rowKey="id"
            columns={columns}
            dataSource={jobsQuery.data?.items || []}
            loading={jobsQuery.isFetching}
            scroll={{ x: 1100 }}
            pagination={{
              current: page,
              pageSize,
              total: jobsQuery.data?.total || 0,
              showSizeChanger: false,
              onChange: setPage,
            }}
            locale={{ emptyText: 'No job listings match these filters.' }}
          />
        </div>
      </AdminQueryState>
      <Drawer
        title={selectedJob?.title || 'Job details'}
        open={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
        width={560}
      >
        {selectedJob && (
          <div className="admin-job-detail">
            <Text strong className="admin-job-company">{selectedJob.company || 'Company not specified'}</Text>
            <Space wrap>
              <Tag>{selectedJob.location || 'Location not specified'}</Tag>
              <Tag color="blue">{selectedJob.job_type || 'Type not specified'}</Tag>
              {selectedJob.department && <Tag>{selectedJob.department}</Tag>}
            </Space>
            <div className="admin-detail-block">
              <Text type="secondary">Source</Text>
              <div>{sourceLabel(selectedJob.source)}</div>
              {selectedJob.source && <a href={selectedJob.source} target="_blank" rel="noreferrer">{selectedJob.source}</a>}
            </div>
            <div className="admin-detail-block">
              <Text type="secondary">Posting information</Text>
              <div>Posted: {formatAdminDate(selectedJob.posted_date, false)}</div>
              <div>Collected: {formatAdminDate(selectedJob.collected_at)}</div>
              <div>Status: {selectedJob.is_active ? 'Active' : 'Inactive'}</div>
            </div>
            {selectedJob.application_url && (
              <div className="admin-detail-block">
                <Text type="secondary">Application link</Text>
                <div><a href={selectedJob.application_url} target="_blank" rel="noreferrer">{selectedJob.application_url}</a></div>
              </div>
            )}
            <div className="admin-detail-block">
              <Text type="secondary">Description</Text>
              <Paragraph className="admin-job-description">
                {selectedJob.description || 'No description was provided by the source.'}
              </Paragraph>
            </div>
          </div>
        )}
      </Drawer>
      <Modal
        title="Import a verified job listing"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={() => form.submit()}
        okText="Import job"
        confirmLoading={importMutation.isPending}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => importMutation.mutate(values)}
        >
          <Form.Item name="title" label="Job title" rules={[{ required: true, whitespace: true }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Space className="admin-form-row" align="start">
            <Form.Item name="company" label="Company" className="admin-form-field">
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item name="location" label="Location" className="admin-form-field">
              <Input maxLength={200} />
            </Form.Item>
          </Space>
          <Form.Item name="department" label="Department">
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item name="skills" label="Skills (comma-separated)">
            <Input placeholder="Python, SQL, React" />
          </Form.Item>
          <Form.Item name="source" label="Source URL" rules={[{ required: true, type: 'url' }]}>
            <Input placeholder="https://jobs.example.com" />
          </Form.Item>
          <Form.Item name="application_url" label="Application URL" rules={[{ required: true, type: 'url' }]}>
            <Input placeholder="https://jobs.example.com/apply" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} maxLength={30000} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
