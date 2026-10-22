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
  Pagination,
  Empty as AntEmpty,
  Skeleton as AntSkeleton,
  Popconfirm,
} from 'antd'
import {
  BookFilled,
  DeleteOutlined,
  ExportOutlined,
  EnvironmentOutlined,
  BankOutlined,
  CompassOutlined,
} from '@ant-design/icons'
import { get, api, errorMessage } from '../services/api'
import { safeApplicationUrl } from '../components/JobCard'
import { ErrorState } from '../components/UI'
import type { Saved, Page } from '../types'

const { Title, Text, Paragraph } = Typography

export function SavedJobs() {
  const [page, setPage] = useState(1)
  const cache = useQueryClient()

  const { data, isLoading, isError, error, refetch } = useQuery<Page<Saved>>({
    queryKey: ['/saved-jobs', page],
    queryFn: () => get<Page<Saved>>('/saved-jobs', { page, page_size: 12 }),
  })

  const removeMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await api.delete(`/saved-jobs/${jobId}`)
    },
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ['/saved-jobs'] })
      cache.invalidateQueries({ queryKey: ['/users/me/dashboard'] })
      toast.success('Job removed from your saved list')
    },
    onError: (err) => {
      toast.error(errorMessage(err))
    },
  })

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px 48px' }}>
      {/* Top Header */}
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
            Bookmarked Positions
          </Text>
          <Title level={2} style={{ margin: '4px 0 0', fontWeight: 800, color: '#0f172a' }}>
            Saved Job Opportunities
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Positions you’ve flagged to review, track, or prepare applications for.
          </Text>
        </div>

        <Link to="/jobs">
          <Button
            type="default"
            icon={<CompassOutlined />}
            style={{ borderRadius: 8, fontWeight: 500 }}
          >
            Explore More Jobs →
          </Button>
        </Link>
      </div>

      {isLoading && (
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map((i) => (
            <Col xs={24} md={12} lg={8} key={i}>
              <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <AntSkeleton active paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {isError && <ErrorState error={error} retry={() => void refetch()} />}

      {!isLoading && !isError && (!data?.items || data.items.length === 0) && (
        <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 0', border: '1px solid #e2e8f0' }}>
          <AntEmpty
            description={
              <div>
                <Text strong style={{ fontSize: 16, display: 'block', color: '#1e293b' }}>
                  No saved jobs yet
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Click the bookmark icon on any job card to save it here for future reference.
                </Text>
              </div>
            }
          >
            <Link to="/jobs">
              <Button type="primary" style={{ borderRadius: 8, marginTop: 12 }}>
                Explore Job Listings
              </Button>
            </Link>
          </AntEmpty>
        </Card>
      )}

      {!isLoading && !isError && data?.items && data.items.length > 0 && (
        <>
          <Row gutter={[20, 20]}>
            {data.items.map((item) => {
              const job = item.job
              if (!job) return null
              const applyUrl = safeApplicationUrl(job.application_url)

              return (
                <Col xs={24} md={12} lg={8} key={item.id}>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text strong style={{ fontSize: 13, color: '#64748b' }}>
                          {job.company}
                        </Text>
                        <Popconfirm
                          title="Remove saved job"
                          description="Are you sure you want to remove this job from your bookmarks?"
                          onConfirm={() => removeMutation.mutate(job.id)}
                          okText="Yes, remove"
                          cancelText="Cancel"
                        >
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>
                      </div>

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

                      <Space wrap size={12} style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                        <span>
                          <EnvironmentOutlined style={{ marginRight: 4 }} />
                          {job.location || 'Remote'}
                        </span>
                        <span>
                          <BankOutlined style={{ marginRight: 4 }} />
                          {job.job_type || 'Full-time'}
                        </span>
                      </Space>

                      {job.skills && job.skills.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
                          {job.skills.slice(0, 4).map((skill) => (
                            <Tag key={skill} color="blue" style={{ fontSize: 11, margin: 0 }}>
                              {skill}
                            </Tag>
                          ))}
                        </div>
                      )}
                    </div>

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

export default SavedJobs
