import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input, Table, Tag, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { get } from '../../services/api'
import type { Page } from '../../types'
import { AdminPageHeader, AdminQueryState, formatAdminDate } from './AdminShared'

const { Text } = Typography

interface AuditEntry {
  id: string
  admin_id: string
  admin_name: string | null
  admin_email: string | null
  action: string
  details: Record<string, unknown> | string
  created_at: string
}

function entityInfo(details: AuditEntry['details']) {
  let values: Record<string, unknown> = {}
  if (details && typeof details === 'object') values = details
  else if (typeof details === 'string') {
    try {
      const parsed: unknown = JSON.parse(details)
      if (parsed && typeof parsed === 'object') values = parsed as Record<string, unknown>
    } catch {
      return { type: '—', id: '—' }
    }
  }
  const entry = Object.entries(values).find(([key]) => key.endsWith('_id'))
  return entry
    ? { type: entry[0].slice(0, -3).replaceAll('_', ' '), id: String(entry[1]) }
    : { type: '—', id: '—' }
}

function detailText(details: AuditEntry['details']) {
  if (typeof details === 'string') return details
  return Object.entries(details || {})
    .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`)
    .join(' · ') || '—'
}

export function AdminAudit() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const params = { page, page_size: pageSize, ...(search.trim() ? { q: search.trim() } : {}) }
  const auditQuery = useQuery({
    queryKey: ['admin-audit', params],
    queryFn: () => get<Page<AuditEntry>>('/admin/audit-logs', params),
  })

  const columns = [
    {
      title: 'Administrator',
      key: 'admin',
      render: (_: unknown, record: AuditEntry) => (
        <div className="admin-user-cell">
          <Text strong>{record.admin_name || 'Administrator'}</Text>
          <Text type="secondary">{record.admin_email || 'Email unavailable'}</Text>
        </div>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (value: string) => <Tag color="blue">{value.replaceAll('_', ' ')}</Tag>,
    },
    {
      title: 'Entity',
      key: 'entity',
      render: (_: unknown, record: AuditEntry) => entityInfo(record.details).type,
    },
    {
      title: 'Entity ID',
      key: 'entity_id',
      render: (_: unknown, record: AuditEntry) => (
        <Text code>{entityInfo(record.details).id}</Text>
      ),
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      render: (value: AuditEntry['details']) => <Text>{detailText(value)}</Text>,
    },
    {
      title: 'Timestamp',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => formatAdminDate(value),
    },
  ]

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Audit logs"
        description="Read-only history of administrative actions and their recorded details."
      />
      <div className="admin-toolbar">
        <Input
          allowClear
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1) }}
          prefix={<SearchOutlined />}
          placeholder="Search action, administrator, or details"
          className="admin-search"
        />
      </div>
      <AdminQueryState loading={auditQuery.isPending} error={auditQuery.error} retry={() => void auditQuery.refetch()}>
        <div className="admin-panel admin-table-panel">
          <div className="admin-table-heading">
            <div>
              <Text strong>Administrative activity</Text>
              <Text type="secondary">{auditQuery.data?.total ?? 0} audit records</Text>
            </div>
            <Text type="secondary">IP addresses are not recorded by the current audit schema.</Text>
          </div>
          <Table<AuditEntry>
            rowKey="id"
            columns={columns}
            dataSource={auditQuery.data?.items || []}
            loading={auditQuery.isFetching}
            scroll={{ x: 950 }}
            pagination={{
              current: page,
              pageSize,
              total: auditQuery.data?.total || 0,
              showSizeChanger: false,
              onChange: setPage,
            }}
            locale={{ emptyText: 'No administrative activity has been logged.' }}
          />
        </div>
      </AdminQueryState>
    </div>
  )
}
