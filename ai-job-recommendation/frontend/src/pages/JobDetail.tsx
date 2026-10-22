import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
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
  Avatar,
  Descriptions,
  Modal,
  Form,
  Select,
  Input,
  Progress,
  Divider,
  Alert,
  Tooltip,
} from 'antd'
import {
  ArrowLeftOutlined,
  ExportOutlined,
  BookOutlined,
  BookFilled,
  CheckCircleOutlined,
  CheckCircleFilled,
  WarningOutlined,
  ThunderboltFilled,
  EnvironmentOutlined,
  DollarOutlined,
  ScheduleOutlined,
  CompassOutlined,
  BankOutlined,
} from '@ant-design/icons'
import { get, api, errorMessage } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { safeApplicationUrl } from '../components/JobCard'
import { Skeleton, ErrorState } from '../components/UI'
import type { Job, Explanation } from '../types'

const { Title, Text, Paragraph } = Typography

export function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const navigate = useNavigate()
  const cache = useQueryClient()

  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [appStatus, setAppStatus] = useState<'Saved' | 'Applied' | 'Interview' | 'Offer' | 'Rejected'>('Applied')
  const [appNotes, setAppNotes] = useState('')

  // 1. Fetch Job Details
  const {
    data: job,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['/jobs', id],
    queryFn: () => get<Job>(`/jobs/${id}`),
    enabled: !!id,
  })

  // 2. Fetch AI Match Explanation if logged in
  const { data: explanationData } = useQuery<{ score: number; explanation: Explanation }>({
    queryKey: ['/recommendations', id, 'explanation'],
    queryFn: () => get<{ score: number; explanation: Explanation }>(`/recommendations/${id}/explanation`),
    enabled: !!session && !!id,
    retry: false,
  })

  // 3. Check if Job is Saved
  const { data: savedJobs } = useQuery<{ items: { job_id: string }[] }>({
    queryKey: ['/saved-jobs'],
    queryFn: () => get<{ items: { job_id: string }[] }>('/saved-jobs'),
    enabled: !!session,
  })
  const isSaved = savedJobs?.items?.some((item) => item.job_id === id)

  // 4. Mutation for Saving / Unsaving
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session) {
        navigate('/login')
        return
      }
      if (isSaved) {
        await api.delete(`/saved-jobs/${id}`)
      } else {
        await api.post('/saved-jobs', { job_id: id })
      }
    },
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ['/saved-jobs'] })
      toast.success(isSaved ? 'Removed from saved jobs' : 'Job saved successfully!')
    },
    onError: (err) => {
      toast.error(errorMessage(err))
    },
  })

  // 5. Mutation for Tracking Application
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!session) {
        navigate('/login')
        return
      }
      await api.post('/applications', {
        job_id: id,
        status: appStatus,
        notes: appNotes,
      })
    },
    onSuccess: () => {
      setNotesModalOpen(false)
      cache.invalidateQueries({ queryKey: ['/applications'] })
      toast.success(`Application marked as '${appStatus}'!`)
    },
    onError: (err) => {
      toast.error(errorMessage(err))
    },
  })

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 16px' }}>
        <Skeleton />
      </div>
    )
  }

  if (isError || !job) {
    return (
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 16px' }}>
        <ErrorState error={error || new Error('Job not found')} retry={() => void refetch()} />
      </div>
    )
  }

  const applyUrl = safeApplicationUrl(job.application_url)
  const initials = (job.company || '?')
    .split(/[ ,]+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()

  const exp = explanationData?.explanation

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 16px 48px' }}>
      {/* Back button */}
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/jobs')}
        style={{ padding: 0, marginBottom: 16, fontWeight: 600, color: '#64748b' }}
      >
        Back to explore jobs
      </Button>

      {/* Header Card */}
      <Card
        style={{
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
        bodyStyle={{ padding: 28 }}
      >
        <Row gutter={[24, 24]} align="middle" justify="space-between">
          <Col xs={24} md={16}>
            <Space align="start" size={20}>
              <Avatar
                shape="square"
                size={64}
                style={{
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  fontWeight: 800,
                  fontSize: 24,
                  borderRadius: 14,
                  border: '1px solid #bfdbfe',
                }}
              >
                {initials}
              </Avatar>

              <div>
                <Space wrap style={{ marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 16, color: '#475569' }}>
                    {job.company || 'Confidential'}
                  </Text>
                  {job.is_demo && <Tag color="warning">Practice Listing</Tag>}
                  {job.work_mode && <Tag color="blue">{job.work_mode}</Tag>}
                </Space>

                <Title level={2} style={{ margin: '4px 0 12px', fontWeight: 800, color: '#0f172a' }}>
                  {job.title}
                </Title>

                <Space wrap size={16} style={{ color: '#64748b', fontSize: 13 }}>
                  <span>
                    <EnvironmentOutlined style={{ marginRight: 6, color: '#94a3b8' }} />
                    {job.location || 'Location Not Specified'}
                  </span>
                  <span>
                    <BankOutlined style={{ marginRight: 6, color: '#94a3b8' }} />
                    {job.job_type || 'Full-time'}
                  </span>
                  <span>
                    <DollarOutlined style={{ marginRight: 6, color: '#94a3b8' }} />
                    {job.salary || 'Competitive / Unspecified'}
                  </span>
                  {job.posted_date && (
                    <span>
                      <ScheduleOutlined style={{ marginRight: 6, color: '#94a3b8' }} />
                      Posted {job.posted_date}
                    </span>
                  )}
                </Space>
              </div>
            </Space>
          </Col>

          {/* Action Buttons */}
          <Col xs={24} md={8} style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
            {applyUrl && (
              <Button
                type="primary"
                size="large"
                icon={<ExportOutlined />}
                href={applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ borderRadius: 10, height: 44, fontWeight: 600 }}
              >
                Apply at Source
              </Button>
            )}

            <Space.Compact style={{ width: '100%' }}>
              <Button
                size="large"
                icon={isSaved ? <BookFilled style={{ color: '#2563eb' }} /> : <BookOutlined />}
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                style={{ flex: 1, borderRadius: '10px 0 0 10px', height: 40 }}
              >
                {isSaved ? 'Saved' : 'Save Job'}
              </Button>

              <Button
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  if (!session) {
                    navigate('/login')
                    return
                  }
                  setNotesModalOpen(true)
                }}
                style={{ flex: 1, borderRadius: '0 10px 10px 0', height: 40 }}
              >
                Track Status
              </Button>
            </Space.Compact>
          </Col>
        </Row>
      </Card>

      {/* AI Match Explanation Card */}
      {exp && (
        <Card
          style={{
            borderRadius: 16,
            border: '1px solid #bfdbfe',
            marginBottom: 24,
            background: 'linear-gradient(135deg, #f0f7ff 0%, #f8fafc 100%)',
          }}
          bodyStyle={{ padding: 24 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <Space align="center">
              <Avatar
                size={36}
                icon={<ThunderboltFilled />}
                style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              />
              <div>
                <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#1e3a8a' }}>
                  AI Recommendation Insights
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>Calculated specifically for your candidate profile</Text>
              </div>
            </Space>

            <Tag color="success" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>
              ✦ {explanationData.score.toFixed(0)}% Match Score
            </Tag>
          </div>

          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Text strong style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Matching Skills ({exp.matching_skills?.length || 0})
              </Text>
              {exp.matching_skills && exp.matching_skills.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {exp.matching_skills.map((s) => (
                    <Tag key={s} color="cyan" icon={<CheckCircleFilled />}>
                      {s}
                    </Tag>
                  ))}
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
                  No direct skill matches detected.
                </Text>
              )}

              <Text strong style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Skills To Review ({exp.missing_skills?.length || 0})
              </Text>
              {exp.missing_skills && exp.missing_skills.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {exp.missing_skills.map((s) => (
                    <Tag key={s} color="warning" icon={<WarningOutlined />}>
                      {s}
                    </Tag>
                  ))}
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>You match all observed skill requirements!</Text>
              )}
            </Col>

            <Col xs={24} md={12}>
              <Card size="small" style={{ borderRadius: 12, border: '1px solid #dbeafe', background: '#ffffff' }}>
                <Text strong style={{ fontSize: 12, color: '#1e293b', display: 'block', marginBottom: 6 }}>
                  Recommendation Basis:
                </Text>
                <Paragraph style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginBottom: 12 }}>
                  {exp.reason}
                </Paragraph>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                  <Text strong style={{ fontSize: 12, color: '#64748b' }}>Eligibility Evaluation:</Text>
                  <Tag color={exp.eligibility === 'eligible' ? 'success' : exp.eligibility === 'ineligible' ? 'error' : 'default'}>
                    {exp.eligibility.toUpperCase()}
                  </Tag>
                </div>
                <Text type="secondary" italic style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                  {exp.disclaimer}
                </Text>
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* Main Grid: Description + Sidebar Info */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={<Title level={4} style={{ margin: 0 }}>Job Description</Title>}
            style={{ borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 24 }}
          >
            <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.8 }}>
              {job.description ? (
                job.description.split('\n\n').map((para, i) => (
                  <p key={i} style={{ marginBottom: 16 }}>{para}</p>
                ))
              ) : (
                <Text type="secondary" italic>No detailed description provided by source.</Text>
              )}
            </div>

            <Divider style={{ margin: '24px 0' }} />

            <Title level={5} style={{ marginBottom: 12 }}>Required & Relevant Skills</Title>
            {job.skills && job.skills.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {job.skills.map((s) => (
                  <Tag key={s} color="blue" style={{ fontSize: 13, padding: '4px 10px', borderRadius: 8 }}>
                    {s}
                  </Tag>
                ))}
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>Skills extracted dynamically from job context.</Text>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Space orientation="vertical" size={24} style={{ width: '100%' }}>
            {/* Overview Card */}
            <Card
              title={<Text strong style={{ fontSize: 14 }}>Role Overview</Text>}
              style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
            >
              <Descriptions column={1} size="small" layout="vertical">
                <Descriptions.Item label="Academic Department">
                  <Text strong>{job.department || 'General Technology'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Minimum Experience">
                  <Text strong>
                    {job.experience_min !== null && job.experience_min !== undefined
                      ? `${job.experience_min} Year(s)`
                      : job.experience || 'Fresher / Entry level'}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Qualification">
                  <Text strong>{job.qualification || 'Bachelor’s degree or relevant project experience'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Source Reference">
                  <Text ellipsis strong>{job.source}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Similar Jobs */}
            {job.similar_jobs && job.similar_jobs.length > 0 && (
              <Card
                title={<Text strong style={{ fontSize: 14 }}>Similar Opportunities</Text>}
                style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
              >
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  {job.similar_jobs.map((sJob) => (
                    <Link
                      key={sJob.id}
                      to={`/jobs/${sJob.id}`}
                      style={{
                        display: 'block',
                        padding: 12,
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Text strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>
                        {sJob.title}
                      </Text>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        <span>{sJob.company}</span>
                        <span>{sJob.location}</span>
                      </div>
                    </Link>
                  ))}
                </Space>
              </Card>
            )}
          </Space>
        </Col>
      </Row>

      {/* Track Application Modal */}
      <Modal
        title="Track Job Application"
        open={notesModalOpen}
        onCancel={() => setNotesModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setNotesModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={applyMutation.isPending}
            onClick={() => applyMutation.mutate()}
          >
            Save to Tracker
          </Button>,
        ]}
      >
        <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
          Add this position to your candidate tracker to monitor interview stages and store personal application notes.
        </Paragraph>

        <Form layout="vertical">
          <Form.Item label="Application Stage">
            <Select
              value={appStatus}
              onChange={(val) => setAppStatus(val)}
              options={[
                { label: 'Saved', value: 'Saved' },
                { label: 'Applied', value: 'Applied' },
                { label: 'Interview', value: 'Interview' },
                { label: 'Offer', value: 'Offer' },
                { label: 'Rejected', value: 'Rejected' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Notes & Follow-up Details">
            <Input.TextArea
              rows={3}
              value={appNotes}
              onChange={(e) => setAppNotes(e.target.value)}
              placeholder="e.g. Applied via official portal. Follow up on tech interview next Tuesday."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default JobDetail
