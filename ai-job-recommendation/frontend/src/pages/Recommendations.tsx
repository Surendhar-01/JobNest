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
  Alert,
  Pagination,
  Empty as AntEmpty,
  Skeleton as AntSkeleton,
} from 'antd'
import {
  ThunderboltFilled,
  ReloadOutlined,
  EnvironmentOutlined,
  BankOutlined,
  DollarOutlined,
  ExportOutlined,
  InfoCircleOutlined,
  CheckCircleFilled,
  PlusCircleFilled,
} from '@ant-design/icons'
import { get, api, errorMessage } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { safeApplicationUrl } from '../components/JobCard'
import { ErrorState } from '../components/UI'
import type { Recommendation, Page } from '../types'

const { Title, Text, Paragraph } = Typography

export function Recommendations() {
  const { profile } = useAuth()
  const cache = useQueryClient()
  const [page, setPage] = useState(1)

  // 1. Fetch Recommendations
  const { data, isLoading, isError, error, refetch } = useQuery<Page<Recommendation>>({
    queryKey: ['/recommendations', page],
    queryFn: () => get<Page<Recommendation>>('/recommendations', { page, page_size: 12 }),
  })

  // 2. Generate Recommendations Mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/recommendations/generate')
      return res.data
    },
    onSuccess: (res) => {
      cache.invalidateQueries({ queryKey: ['/recommendations'] })
      cache.invalidateQueries({ queryKey: ['/users/me/dashboard'] })
      toast.success(`Generated ${res.total} AI job recommendations!`)
    },
    onError: (err) => {
      toast.error(errorMessage(err))
    },
  })

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
          <Text strong style={{ fontSize: 12, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1 }}>
            <ThunderboltFilled style={{ marginRight: 6 }} /> AI Matching Engine
          </Text>
          <Title level={2} style={{ margin: '4px 0 0', fontWeight: 800, color: '#0f172a' }}>
            Personalized Job Recommendations
          </Title>
          <Text type="secondary" style={{ fontSize: 13, maxWidth: 700, display: 'block', marginTop: 4 }}>
            Ranked by AI combining semantic vector similarity, observed skills, mandatory qualifications, experience limits, and your location preferences.
          </Text>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<ReloadOutlined spin={generateMutation.isPending} />}
          loading={generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
          style={{ borderRadius: 10, fontWeight: 600 }}
        >
          {generateMutation.isPending ? 'Analyzing Listings...' : 'Recalculate Matches'}
        </Button>
      </div>

      {/* Model Disclaimer */}
      <Alert
        message="Relevance Scoring Model Architecture"
        description="Weights are configured as 45% semantic relevance, 25% skill overlap, 10% qualification match, 10% experience compatibility, 5% location, and 5% employment type. The match score is an algorithmic ranking index calculated specifically for your candidate profile."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ borderRadius: 14, marginBottom: 24, border: '1px solid #bfdbfe', background: '#eff6ff' }}
      />

      {/* Loading Skeletons */}
      {isLoading && (
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map((i) => (
            <Col xs={24} md={12} lg={8} key={i}>
              <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <AntSkeleton active paragraph={{ rows: 4 }} />
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
                  No recommendations generated yet
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Click 'Recalculate Matches' to analyze your profile and resume against all verified job listings.
                </Text>
              </div>
            }
          >
            <Button
              type="primary"
              size="large"
              onClick={() => generateMutation.mutate()}
              loading={generateMutation.isPending}
              style={{ borderRadius: 8, marginTop: 12 }}
            >
              Run Recommendation Engine Now
            </Button>
          </AntEmpty>
        </Card>
      )}

      {/* Recommendations Cards Grid */}
      {!isLoading && !isError && data?.items && data.items.length > 0 && (
        <>
          <Row gutter={[20, 20]}>
            {data.items.map((rec) => {
              const job = rec.job
              if (!job) return null
              const applyUrl = safeApplicationUrl(job.application_url)
              const exp = rec.explanation

              return (
                <Col xs={24} md={12} lg={8} key={rec.id || job.id}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 16,
                      border: '1px solid #e2e8f0',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    bodyStyle={{
                      padding: 22,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      flex: 1,
                    }}
                  >
                    <div>
                      {/* Top bar with company & match score */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text strong style={{ fontSize: 13, color: '#64748b' }}>
                          {job.company || 'Company'}
                        </Text>
                        <Tag color="success" style={{ fontWeight: 700, borderRadius: 12, padding: '2px 8px' }}>
                          ✦ {rec.score.toFixed(0)}% Relevance
                        </Tag>
                      </div>

                      {/* Job Title */}
                      <Link
                        to={`/jobs/${job.id}`}
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          color: '#0f172a',
                          display: 'block',
                          marginBottom: 8,
                          lineHeight: 1.3,
                          textDecoration: 'none',
                        }}
                      >
                        {job.title}
                      </Link>

                      {/* Meta Information */}
                      <Space wrap size={12} style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                        <span>
                          <EnvironmentOutlined style={{ marginRight: 4 }} />
                          {job.location || 'Remote'}
                        </span>
                        <span>
                          <BankOutlined style={{ marginRight: 4 }} />
                          {job.job_type || 'Full-time'}
                        </span>
                        {job.salary && (
                          <span>
                            <DollarOutlined style={{ marginRight: 4 }} />
                            {job.salary}
                          </span>
                        )}
                      </Space>

                      {/* Matching & Missing Skills */}
                      <div style={{ paddingTop: 12, borderTop: '1px solid #f1f5f9', marginBottom: 14 }}>
                        {exp.matching_skills && exp.matching_skills.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <Text strong style={{ fontSize: 11, color: '#475569', display: 'block', marginBottom: 4 }}>
                              Matching Skills:
                            </Text>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {exp.matching_skills.slice(0, 4).map((s) => (
                                <Tag key={s} color="cyan" style={{ fontSize: 11, margin: 0 }}>
                                  ✓ {s}
                                </Tag>
                              ))}
                            </div>
                          </div>
                        )}

                        {exp.missing_skills && exp.missing_skills.length > 0 && (
                          <div>
                            <Text strong style={{ fontSize: 11, color: '#475569', display: 'block', marginBottom: 4 }}>
                              Recommended to Learn:
                            </Text>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {exp.missing_skills.slice(0, 3).map((s) => (
                                <Tag key={s} color="warning" style={{ fontSize: 11, margin: 0 }}>
                                  + {s}
                                </Tag>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Explanation Reason */}
                      <Paragraph
                        ellipsis={{ rows: 2 }}
                        style={{
                          fontSize: 12,
                          color: '#475569',
                          background: '#f8fafc',
                          padding: 10,
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          marginBottom: 16,
                        }}
                      >
                        {exp.reason}
                      </Paragraph>
                    </div>

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                      <Link to={`/jobs/${job.id}`} style={{ fontWeight: 600, fontSize: 13, color: '#2563eb' }}>
                        View Details →
                      </Link>

                      {applyUrl && (
                        <Button
                          type="link"
                          size="small"
                          icon={<ExportOutlined />}
                          href={applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ padding: 0, fontWeight: 600 }}
                        >
                          Apply
                        </Button>
                      )}
                    </div>
                  </Card>
                </Col>
              )
            })}
          </Row>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
            <Pagination
              current={page}
              total={data.total}
              pageSize={data.page_size}
              showSizeChanger={false}
              onChange={(nextPage) => setPage(nextPage)}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default Recommendations
