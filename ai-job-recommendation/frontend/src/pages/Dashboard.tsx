import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Tag,
  Typography,
  Button,
  Space,
  Empty as AntEmpty,
  Badge,
} from 'antd'
import {
  ThunderboltFilled,
  BookOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
  BankOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleFilled,
} from '@ant-design/icons'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { get } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { JobCard } from '../components/JobCard'
import { Skeleton, ErrorState } from '../components/UI'
import type { Dashboard as DashboardType } from '../types'

const { Title, Text, Paragraph } = Typography

const STATUS_COLORS: Record<string, string> = {
  Saved: '#94a3b8',
  Applied: '#2563eb',
  Interview: '#7c3aed',
  Offer: '#059669',
  Rejected: '#dc2626',
}

export function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const { data, isLoading, isError, error, refetch } = useQuery<DashboardType>({
    queryKey: ['/users/me/dashboard'],
    queryFn: () => get<DashboardType>('/users/me/dashboard'),
  })

  if (isLoading) {
    return (
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} lg={6}><Skeleton /></Col>
        <Col xs={24} sm={12} lg={6}><Skeleton /></Col>
        <Col xs={24} sm={12} lg={6}><Skeleton /></Col>
        <Col xs={24} sm={12} lg={6}><Skeleton /></Col>
      </Row>
    )
  }

  if (isError || !data) {
    return <ErrorState error={error} retry={() => void refetch()} />
  }

  const completion = data.profile_completion || 0
  const appStatuses = data.application_statuses || {}
  const chartData = Object.entries(appStatuses).map(([name, value]) => ({
    name,
    count: value,
    color: STATUS_COLORS[name] || '#2563eb',
  }))

  const allSkills = [
    ...(data.profile?.technical_skills || []),
    ...(data.resume?.analysis?.skills || []),
  ]
  const uniqueSkills = Array.from(new Set(allSkills))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1200, margin: '0 auto' }}>
      {/* Welcome Institutional Banner */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #0d9488 100%)',
          borderRadius: 20,
          border: 'none',
          boxShadow: '0 10px 25px -5px rgba(37,99,235,0.2)',
          color: '#ffffff',
        }}
        bodyStyle={{ padding: 28 }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ maxWidth: 650, display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <div
              style={{
                background: '#ffffff',
                padding: '8px 12px',
                borderRadius: 14,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img
                src="/ksrct_logo.png"
                alt="K.S. Rangasamy College of Technology"
                style={{
                  height: 44,
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
            <div>
              <div style={{ marginBottom: 6 }}>
                <Tag color="cyan" style={{ borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  <BankOutlined style={{ marginRight: 4 }} />
                  {data.profile?.college || 'K.S. Rangasamy College of Technology (Autonomous)'} · {data.profile?.current_location || 'Tiruchengode'}
                </Tag>
              </div>
              <Title level={2} style={{ color: '#ffffff', fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>
                Welcome back, {data.profile?.full_name || 'Job Seeker'}!
              </Title>
              <Paragraph style={{ color: '#e0f2fe', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                {data.profile?.department
                  ? `Personalized AI recommendations active for ${data.profile.department}.`
                  : 'Complete your profile to tailor recommendations to your academic major.'}
              </Paragraph>
            </div>
          </div>

          {/* Profile Completion Circular Gauge */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(12px)',
              padding: '16px 20px',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <Progress
              type="circle"
              percent={completion}
              size={64}
              strokeColor="#2dd4bf"
              trailColor="rgba(255,255,255,0.2)"
              format={(p) => <span style={{ color: '#ffffff', fontWeight: 800, fontSize: 14 }}>{p}%</span>}
            />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>Profile Strength</div>
              <div style={{ fontSize: 11, color: '#bae6fd', marginTop: 2 }}>
                {completion === 100 ? 'All fields verified' : 'Add details to boost score'}
              </div>
              <Link to="/profile" style={{ fontSize: 11, fontWeight: 600, color: '#a7f3d0', textDecoration: 'none', display: 'block', marginTop: 4 }}>
                Update Profile &rarr;
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Metric Summary Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate('/recommendations')}
            style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer' }}
            bodyStyle={{ padding: 20 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                Matching Jobs
              </Text>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ThunderboltFilled style={{ fontSize: 18 }} />
              </div>
            </div>
            <Statistic value={data.matching_jobs} valueStyle={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              View AI Matches <ArrowRightOutlined style={{ fontSize: 10 }} />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate('/saved')}
            style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer' }}
            bodyStyle={{ padding: 20 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                Saved Jobs
              </Text>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOutlined style={{ fontSize: 18 }} />
              </div>
            </div>
            <Statistic value={data.saved_jobs} valueStyle={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: '#4f46e5', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              Bookmarked positions <ArrowRightOutlined style={{ fontSize: 10 }} />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate('/applications')}
            style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer' }}
            bodyStyle={{ padding: 20 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                Applications
              </Text>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ccfbf1', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircleOutlined style={{ fontSize: 18 }} />
              </div>
            </div>
            <Statistic value={data.applications} valueStyle={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0d9488', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              Track Pipeline <ArrowRightOutlined style={{ fontSize: 10 }} />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate('/resume')}
            style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer' }}
            bodyStyle={{ padding: 20 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                Resume Status
              </Text>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileTextOutlined style={{ fontSize: 18 }} />
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {data.resume ? data.resume.file_name : 'No Resume'}
            </div>
            <div style={{ fontSize: 12, marginTop: 8 }}>
              {data.resume?.status === 'analyzed' ? (
                <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircleFilled /> Analyzed & Verified
                </span>
              ) : data.resume?.status === 'analyzing' ? (
                <span style={{ color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ClockCircleOutlined /> Analyzing...
                </span>
              ) : (
                <span style={{ color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ExclamationCircleOutlined /> Upload Resume Now
                </span>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Grid: Application Pipeline & Skills Cloud */}
      <Row gutter={[20, 20]}>
        {/* Application Status Chart */}
        <Col xs={24} lg={16}>
          <Card
            style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', height: '100%' }}
            bodyStyle={{ padding: 24 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div>
                <Title level={4} style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Application Tracker Pipeline
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Real-time status of your active submissions
                </Text>
              </div>
              <Button type="link" onClick={() => navigate('/applications')} style={{ padding: 0, fontWeight: 600 }}>
                Full tracker <ArrowRightOutlined />
              </Button>
            </div>

            {chartData.length > 0 ? (
              <div style={{ height: 260, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <AntEmpty description="No applications tracked yet. Mark opportunities as applied from job details!" />
            )}
          </Card>
        </Col>

        {/* Identified Skills Card */}
        <Col xs={24} lg={8}>
          <Card
            style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div>
                <Title level={4} style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Identified Skills
                </Title>
              </div>
              <Tag color="blue" style={{ borderRadius: 10, fontWeight: 600 }}>
                {uniqueSkills.length} Total
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 12, marginBottom: 16, display: 'block' }}>
              Technical abilities extracted from your uploaded resume and candidate profile.
            </Text>

            {uniqueSkills.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {uniqueSkills.map((s) => (
                  <Tag key={s} color="blue" style={{ borderRadius: 6, margin: 0, fontSize: 12, padding: '3px 8px' }}>
                    {s}
                  </Tag>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 12 }}>
                No skills logged yet. Upload your resume or edit your profile.
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
              <Button type="link" onClick={() => navigate('/profile')} style={{ padding: 0, fontSize: 12, fontWeight: 600 }}>
                Add more skills &rarr;
              </Button>
              <Button type="link" onClick={() => navigate('/recommendations')} style={{ padding: 0, fontSize: 12, fontWeight: 600, color: '#0d9488' }}>
                View matches &rarr;
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recommended Jobs Preview */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
          <div>
            <Title level={3} style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Recommended for You
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Top-scoring opportunities ranked by your skills and background
            </Text>
          </div>
          <Button type="link" onClick={() => navigate('/recommendations')} style={{ fontWeight: 600 }}>
            All recommendations <ArrowRightOutlined />
          </Button>
        </div>

        {data.recommendations && data.recommendations.length > 0 ? (
          <Row gutter={[20, 20]}>
            {data.recommendations.map((rec) =>
              rec.job ? (
                <Col xs={24} sm={12} lg={6} key={rec.job.id}>
                  <JobCard job={rec.job} score={rec.score} />
                </Col>
              ) : null
            )}
          </Row>
        ) : (
          <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0', textAlign: 'center', padding: 24 }}>
            <ThunderboltFilled style={{ fontSize: 32, color: '#2563eb', marginBottom: 12 }} />
            <Title level={4} style={{ margin: '0 0 6px' }}>Generate Your Recommendations</Title>
            <Paragraph style={{ color: '#64748b', fontSize: 14, maxWidth: 450, margin: '0 auto 16px' }}>
              Our AI engine matches your resume or profile against all available listings.
            </Paragraph>
            <Button type="primary" onClick={() => navigate('/recommendations')} style={{ borderRadius: 8, fontWeight: 600 }}>
              Run AI Recommendation Engine
            </Button>
          </Card>
        )}
      </div>

      {/* Department-Specific Opportunities */}
      {data.department_jobs && data.department_jobs.length > 0 && (
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <div>
              <Title level={3} style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Opportunities in {data.profile?.department || 'Your Department'}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Directly aligned with your academic qualification
              </Text>
            </div>
            <Button
              type="link"
              onClick={() => navigate(`/jobs?department=${encodeURIComponent(data.profile?.department || '')}`)}
              style={{ fontWeight: 600 }}
            >
              Browse all {data.profile?.department} jobs <ArrowRightOutlined />
            </Button>
          </div>

          <Row gutter={[20, 20]}>
            {data.department_jobs.map((job) => (
              <Col xs={24} sm={12} lg={6} key={job.id}>
                <JobCard job={job} />
              </Col>
            ))}
          </Row>
        </div>
      )}
    </div>
  )
}
export default Dashboard
