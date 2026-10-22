import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Tag, Button, Tooltip, Avatar, Space, Typography } from 'antd'
import {
  BookOutlined,
  BookFilled,
  EnvironmentOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  ThunderboltFilled,
  LinkOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import type { Job } from '../types'

const { Text, Title } = Typography

export function safeApplicationUrl(value: string | null | undefined) {
  try {
    const url = new URL(value || '')
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

export function JobCard({
  job,
  score,
  saved = false,
  onRemove,
}: {
  job: Job
  score?: number
  saved?: boolean
  onRemove?: () => void
}) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const cache = useQueryClient()
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!session) {
      navigate('/login')
      return
    }
    setBusy(true)
    try {
      if (saved) {
        await api.delete('/saved-jobs/' + job.id)
        onRemove?.()
        toast.success('Job removed')
      } else {
        await api.post('/saved-jobs', { job_id: job.id })
        toast.success('Job saved')
      }
      await cache.invalidateQueries({ queryKey: ['/saved-jobs'] })
      await cache.invalidateQueries({ queryKey: ['/users/me/dashboard'] })
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const initials = (job.company || '?')
    .split(/[ ,]+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()

  const url = safeApplicationUrl(job.application_url)

  return (
    <Card
      hoverable
      className="job-card"
      style={{
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        background: '#ffffff',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
      styles={{
        body: { display: 'flex', flexDirection: 'column', height: '100%', padding: 20 }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <Space align="center" size={12}>
          <Avatar
            style={{
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              fontWeight: 700,
              fontSize: 14,
              border: '1px solid #bfdbfe',
            }}
            shape="square"
            size={42}
          >
            {initials}
          </Avatar>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text strong style={{ fontSize: 13, color: '#475569' }} className="company-name">
                {job.company || 'Company not specified'}
              </Text>
              {job.is_demo && (
                <Tag color="orange" style={{ margin: 0, fontSize: 10, lineHeight: '18px', padding: '0 6px', borderRadius: 4 }} className="demo-label">
                  Practice listing
                </Tag>
              )}
            </div>
            {job.department && (
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {job.department}
              </span>
            )}
          </div>
        </Space>

        <Button
          type="text"
          shape="circle"
          disabled={busy}
          onClick={save}
          aria-label={saved ? 'Remove saved job' : 'Save job'}
          icon={saved ? <BookFilled style={{ color: '#2563eb', fontSize: 18 }} /> : <BookOutlined style={{ color: '#64748b', fontSize: 18 }} />}
          className={saved ? 'icon-button is-saved' : 'icon-button'}
        />
      </div>

      <div style={{ marginBottom: 8 }}>
        <Link to={'/jobs/' + job.id} className="job-title" style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', textDecoration: 'none', lineHeight: 1.3 }}>
          {job.title || 'Untitled opportunity'}
        </Link>
      </div>

      <Space wrap size={[12, 4]} style={{ marginBottom: 12, fontSize: 13, color: '#64748b' }} className="job-meta">
        <span>
          <EnvironmentOutlined style={{ marginRight: 4, color: '#94a3b8' }} />
          {job.location || 'Location not specified'}
        </span>
        <span>
          <ClockCircleOutlined style={{ marginRight: 4, color: '#94a3b8' }} />
          {job.job_type || 'Type not specified'}
        </span>
      </Space>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {job.skills?.slice(0, 4).map((skill, idx) => (
          <Tag key={skill + idx} color="blue" style={{ borderRadius: 6, margin: 0, fontSize: 11, border: 'none', background: '#eff6ff', color: '#1d4ed8' }}>
            {skill}
          </Tag>
        ))}
      </div>

      <div className="job-note" style={{ fontSize: 12, color: '#64748b', marginBottom: 12, marginTop: 'auto', background: '#f8fafc', padding: '6px 10px', borderRadius: 8 }}>
        <span>{job.salary || 'Salary not published'}</span> · <span>{job.experience || 'Experience not specified'}</span>
      </div>

      {score !== undefined && (
        <div
          className="match-indicator"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 100%)',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            fontSize: 12,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <ThunderboltFilled style={{ color: '#0d9488' }} />
          <span>{score.toFixed(0)}% relevance</span>
        </div>
      )}

      <div className="card-bottom" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 4 }}>
        {(() => {
          const src = (job.source || '').toLowerCase()
          let label = 'Live Portal'
          let color = '#64748b'
          let bg = '#f1f5f9'

          if (src.includes('linkedin')) {
            label = 'LinkedIn'
            color = '#0077b5'
            bg = '#e0f2fe'
          } else if (src.includes('internshala')) {
            label = 'Internshala'
            color = '#0284c7'
            bg = '#e0f2fe'
          } else if (src.includes('instahyre')) {
            label = 'Instahyre'
            color = '#0f766e'
            bg = '#ccfbf1'
          } else if (src.includes('arbeitnow')) {
            label = 'Arbeitnow'
            color = '#4f46e5'
            bg = '#e0e7ff'
          } else if (src.includes('naukri')) {
            label = 'Naukri'
            color = '#ea580c'
            bg = '#ffedd5'
          } else if (src.includes('indeed')) {
            label = 'Indeed'
            color = '#2563eb'
            bg = '#dbeafe'
          } else if (src.includes('foundit')) {
            label = 'Foundit'
            color = '#7c3aed'
            bg = '#ede9fe'
          }

          return (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color,
                backgroundColor: bg,
                padding: '2px 8px',
                borderRadius: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ● {label}
            </span>
          )
        })()}
        <Link to={'/jobs/' + job.id} style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          View details <ArrowRightOutlined style={{ fontSize: 10 }} />
        </Link>
      </div>

      {url && (
        <div style={{ marginTop: 8 }}>
          <Button
            type="primary"
            block
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="apply-link"
            icon={<LinkOutlined />}
            style={{ borderRadius: 8, height: 36, fontWeight: 600 }}
          >
            Apply on {(() => {
              const src = (job.source || '').toLowerCase()
              if (src.includes('linkedin')) return 'LinkedIn'
              if (src.includes('internshala')) return 'Internshala'
              if (src.includes('instahyre')) return 'Instahyre'
              if (src.includes('arbeitnow')) return 'Arbeitnow'
              return 'Recruitment Website'
            })()}
          </Button>
        </div>
      )}
    </Card>
  )
}
