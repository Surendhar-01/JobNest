import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Button,
  Space,
  Segmented,
  Modal,
  Form,
  Select,
  Input,
  Timeline,
  Empty as AntEmpty,
  Skeleton as AntSkeleton,
  Pagination,
} from 'antd'
import {
  EditOutlined,
  ExportOutlined,
  CompassOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import { get, api, errorMessage } from '../services/api'
import { safeApplicationUrl } from '../components/JobCard'
import { ErrorState } from '../components/UI'
import type { Application, ApplicationStatus, Page } from '../types'

const { Title, Text, Paragraph } = Typography

const STATUS_TAG_COLORS: Record<ApplicationStatus, string> = {
  Saved: 'default',
  Applied: 'blue',
  Interview: 'purple',
  Offer: 'success',
  Rejected: 'error',
}

const STATUSES: ApplicationStatus[] = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected']

export function Applications() {
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const cache = useQueryClient()

  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('Applied')
  const [newNotes, setNewNotes] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery<Page<Application>>({
    queryKey: ['/applications', page],
    queryFn: () => get<Page<Application>>('/applications', { page, page_size: 20 }),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingApp) return
      return api.patch(`/applications/${editingApp.id}`, {
        status: newStatus,
        notes: newNotes,
      })
    },
    onSuccess: () => {
      setEditingApp(null)
      cache.invalidateQueries({ queryKey: ['/applications'] })
      cache.invalidateQueries({ queryKey: ['/users/me/dashboard'] })
      toast.success('Application updated successfully!')
    },
    onError: (err) => {
      toast.error(errorMessage(err))
    },
  })

  function openEdit(app: Application) {
    setEditingApp(app)
    setNewStatus(app.status)
    setNewNotes(app.notes || '')
  }

  const filteredItems = (data?.items || []).filter((item) =>
    filterStatus === 'ALL' ? true : item.status === filterStatus
  )

  const segmentedOptions = [
    { label: `All (${data?.items?.length || 0})`, value: 'ALL' },
    ...STATUSES.map((status) => ({
      label: `${status} (${(data?.items || []).filter((i) => i.status === status).length})`,
      value: status,
    })),
  ]

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px 48px' }}>
      {/* Header */}
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
          <Text strong style={{ fontSize: 12, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1 }}>
            Candidate CRM
          </Text>
          <Title level={2} style={{ margin: '4px 0 0', fontWeight: 800, color: '#0f172a' }}>
            Job Application Tracker
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Manage your submissions, interview progression stages, and recruiter feedback.
          </Text>
        </div>

        <Link to="/jobs">
          <Button
            type="primary"
            icon={<CompassOutlined />}
            style={{ borderRadius: 8, fontWeight: 500 }}
          >
            Discover New Roles →
          </Button>
        </Link>
      </div>

      {/* Segmented Filter */}
      <div style={{ marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        <Segmented
          options={segmentedOptions}
          value={filterStatus}
          onChange={(val) => setFilterStatus(val as string)}
          size="middle"
        />
      </div>

      {isLoading && (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <AntSkeleton active paragraph={{ rows: 2 }} />
            </Card>
          ))}
        </Space>
      )}

      {isError && <ErrorState error={error} retry={() => void refetch()} />}

      {!isLoading && !isError && filteredItems.length === 0 && (
        <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 0', border: '1px solid #e2e8f0' }}>
          <AntEmpty
            description={
              <div>
                <Text strong style={{ fontSize: 16, display: 'block', color: '#1e293b' }}>
                  No applications in this category
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Track opportunities directly from the Job Details page as you submit your resume.
                </Text>
              </div>
            }
          >
            <Link to="/jobs">
              <Button type="primary" style={{ borderRadius: 8, marginTop: 12 }}>
                Explore Jobs & Track Applications
              </Button>
            </Link>
          </AntEmpty>
        </Card>
      )}

      {!isLoading && !isError && filteredItems.length > 0 && (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          {filteredItems.map((item) => {
            const job = item.job
            const applyUrl = job ? safeApplicationUrl(job.application_url) : null

            return (
              <Card
                key={item.id}
                hoverable
                style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
                styles={{ body: { padding: 20 } }}
              >
                <Row gutter={[20, 16]} align="middle" justify="space-between">
                  <Col xs={24} md={16}>
                    <Space size={6} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Space wrap align="center">
                        <Tag color={STATUS_TAG_COLORS[item.status]} style={{ fontWeight: 700, borderRadius: 12 }}>
                          {item.status}
                        </Tag>
                        <Text strong style={{ fontSize: 13, color: '#64748b' }}>
                          {job?.company || 'Company'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          • Updated {new Date(item.updated_at).toLocaleDateString()}
                        </Text>
                      </Space>

                      <Link
                        to={job ? `/jobs/${job.id}` : '#'}
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          color: '#0f172a',
                          display: 'block',
                          textDecoration: 'none',
                        }}
                      >
                        {job?.title || 'Unknown Opportunity'}
                      </Link>

                      {item.notes && (
                        <Paragraph italic style={{ fontSize: 12, color: '#475569', background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', margin: '4px 0' }}>
                          "{item.notes}"
                        </Paragraph>
                      )}

                      {/* Audit History Timeline */}
                      {item.history && item.history.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                          <HistoryOutlined />
                          <span>
                            Progress: {item.history.map((h) => `${h.status} (${new Date(h.at).toLocaleDateString()})`).join(' → ')}
                          </span>
                        </div>
                      )}
                    </Space>
                  </Col>

                  <Col xs={24} md={8} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => openEdit(item)}
                      style={{ borderRadius: 8 }}
                    >
                      Update Status
                    </Button>

                    {applyUrl && (
                      <Button
                        type="default"
                        icon={<ExportOutlined />}
                        href={applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ borderRadius: 8, color: '#2563eb', borderColor: '#bfdbfe' }}
                      >
                        Portal Link
                      </Button>
                    )}
                  </Col>
                </Row>
              </Card>
            )
          })}
        </Space>
      )}

      {/* Edit Modal */}
      <Modal
        title="Update Application Status"
        open={!!editingApp}
        onCancel={() => setEditingApp(null)}
        footer={[
          <Button key="cancel" onClick={() => setEditingApp(null)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            Save Status
          </Button>,
        ]}
      >
        <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
          {editingApp?.job?.title} at {editingApp?.job?.company}
        </Paragraph>

        <Form layout="vertical">
          <Form.Item label="Application Stage">
            <Select
              value={newStatus}
              onChange={(val) => setNewStatus(val as ApplicationStatus)}
              options={STATUSES.map((s) => ({ label: s, value: s }))}
            />
          </Form.Item>

          <Form.Item label="Candidate Notes & Progress Notes">
            <Input.TextArea
              rows={3}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. Completed technical round with engineering lead. Waiting for HR call."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Applications
