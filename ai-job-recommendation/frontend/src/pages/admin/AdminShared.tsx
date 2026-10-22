import type { ReactNode } from 'react'
import { Button, Card, Result, Skeleton, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { get, errorMessage } from '../../services/api'
import type { AdminStats } from '../../types'

const { Text, Title } = Typography

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin-dashboard'],
    queryFn: () => get<AdminStats>('/admin/dashboard'),
    staleTime: 30000,
  })
}

export function AdminPageHeader({
  eyebrow = 'ADMIN CONSOLE',
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="admin-page-heading">
      <div>
        <Text className="admin-eyebrow">{eyebrow}</Text>
        <Title level={2}>{title}</Title>
        <Text className="admin-page-description">{description}</Text>
      </div>
      {children && <div className="admin-page-actions">{children}</div>}
    </div>
  )
}

export function AdminQueryState({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean
  error: unknown
  retry: () => void
  children: ReactNode
}) {
  if (loading) {
    return <Card className="admin-panel"><Skeleton active paragraph={{ rows: 5 }} /></Card>
  }
  if (error) {
    return (
      <Result
        status="error"
        title="Could not load admin data"
        subTitle={errorMessage(error)}
        extra={<Button icon={<ReloadOutlined />} onClick={retry}>Retry</Button>}
      />
    )
  }
  return <>{children}</>
}

export function AdminPanel({
  title,
  extra,
  children,
  className = '',
}: {
  title: string
  extra?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={`admin-panel ${className}`} title={title} extra={extra}>
      {children}
    </Card>
  )
}

export function formatAdminDate(value: string | null | undefined, includeTime = true) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date)
}

export function sourceLabel(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return value || 'Unknown source'
  }
}

export function chartEntries(value: Record<string, number> | undefined) {
  return Object.entries(value || {}).map(([name, count]) => ({ name, count }))
}
