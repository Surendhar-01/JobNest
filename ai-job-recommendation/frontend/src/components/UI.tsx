import type { ReactNode } from 'react'
import { Spin, Skeleton as AntSkeleton, Result, Button, Empty as AntEmpty, Tag, Alert } from 'antd'
import { LoadingOutlined, ReloadOutlined } from '@ant-design/icons'
import { errorMessage } from '../services/api'

export function Spinner({ tip = 'Loading your next opportunity...' }: { tip?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12 }}>
      <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: '#2563eb' }} spin />} />
      <span style={{ color: '#64748b', fontSize: 14 }}>{tip}</span>
    </div>
  )
}

export function Skeleton() {
  return (
    <div style={{ background: '#ffffff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 16 }}>
      <AntSkeleton active avatar paragraph={{ rows: 3 }} />
    </div>
  )
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <Result
      status="error"
      title="We couldn't load this information"
      subTitle={errorMessage(error)}
      extra={
        retry && (
          <Button type="primary" icon={<ReloadOutlined />} onClick={retry}>
            Try again
          </Button>
        )
      }
    />
  )
}

export function Empty({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
      <AntEmpty
        image={AntEmpty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            <h3 style={{ margin: '8px 0 4px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{title}</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>{description}</p>
          </div>
        }
      >
        {children}
      </AntEmpty>
    </div>
  )
}

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2563eb' }}>
          {eyebrow}
        </span>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '4px 0 6px', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14, maxWidth: 650 }}>{description}</p>
      </div>
      {children && <div>{children}</div>}
    </div>
  )
}

export function Pagination({
  page,
  total,
  size,
  onChange,
}: {
  page: number
  total: number
  size: number
  onChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / size))
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid #e2e8f0' }}>
      <span style={{ color: '#64748b', fontSize: 13 }}>
        {total} results · Page {page} of {pages}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button size="small" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button size="small" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}

export function Tags({ items }: { items: string[] | null | undefined }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
      {items.map((s, i) => (
        <Tag key={s + i} color="blue" style={{ borderRadius: 6, margin: 0, fontSize: 12 }}>
          {s}
        </Tag>
      ))}
    </div>
  )
}

export function ConfigurationNotice() {
  return (
    <Alert
      message="Account Setup Required"
      description="Configure the Supabase variables in frontend/.env and backend/.env, run database/schema.sql, and restart both servers. You can explore the labeled practice jobs now."
      type="info"
      showIcon
      style={{ marginBottom: 20 }}
    />
  )
}
