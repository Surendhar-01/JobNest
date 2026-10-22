import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Select, Space, Table, Tag, Typography } from 'antd'
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { api, errorMessage, get } from '../../services/api'
import type { Page, ScrapeLog, Source } from '../../types'
import {
  AdminPageHeader,
  AdminQueryState,
  formatAdminDate,
  useAdminStats,
} from './AdminShared'

const { Text } = Typography

export function AdminCollections() {
  const cache = useQueryClient()
  const [sourceId, setSourceId] = useState<string>()
  const [page, setPage] = useState(1)
  const pageSize = 20
  const logsQuery = useQuery({
    queryKey: ['admin-collection-logs', page, pageSize],
    queryFn: () => get<Page<ScrapeLog>>('/admin/scraping/logs', { page, page_size: pageSize }),
    refetchInterval: 5000,
  })
  const sourcesQuery = useQuery({
    queryKey: ['admin-sources'],
    queryFn: () => get<{ items: Source[] }>('/admin/sources'),
  })
  const statsQuery = useAdminStats()
  const activeSources = (sourcesQuery.data?.items || []).filter(
    (source) => source.enabled && source.permitted && !source.access_denied
  )
  const isRunning = (logsQuery.data?.items || []).some((log) => log.status === 'running')

  const triggerMutation = useMutation({
    mutationFn: async () => {
      if (!sourceId) throw new Error('Choose an active source first')
      return (await api.post<{ log_id: string; status: string }>('/admin/scraping/run', { source_id: sourceId })).data
    },
    onSuccess: async (result) => {
      toast.success(`Collection started (${result.log_id})`)
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['admin-collection-logs'] }),
        cache.invalidateQueries({ queryKey: ['admin-dashboard'] }),
        cache.invalidateQueries({ queryKey: ['admin-sources'] }),
      ])
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const columns = [
    { title: 'Source', dataIndex: 'source_id', key: 'source_id', render: (value: string) => <Text strong>{value || 'Unknown source'}</Text> },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <Tag color={value === 'success' ? 'success' : value === 'failed' ? 'error' : 'processing'}>
          {value === 'running' ? 'Running' : value === 'success' ? 'Success' : value === 'failed' ? 'Failed' : value}
        </Tag>
      ),
    },
    { title: 'Collected', dataIndex: 'job_count', key: 'job_count' },
    { title: 'Inserted', dataIndex: 'inserted_count', key: 'inserted_count', render: (value?: number) => value ?? '—' },
    { title: 'Updated', dataIndex: 'updated_count', key: 'updated_count', render: (value?: number) => value ?? '—' },
    { title: 'Started', dataIndex: 'started_at', key: 'started_at', render: (value: string) => formatAdminDate(value) },
    { title: 'Completed', dataIndex: 'finished_at', key: 'finished_at', render: (value: string | null) => formatAdminDate(value) },
    {
      title: 'Error details',
      dataIndex: 'error',
      key: 'error',
      render: (value: string | null) => value
        ? <Text type="danger">{value}</Text>
        : <Text type="secondary">—</Text>,
    },
  ]

  const error = logsQuery.error || sourcesQuery.error || statsQuery.error
  const retry = () => {
    void logsQuery.refetch()
    void sourcesQuery.refetch()
    void statsQuery.refetch()
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Collection monitoring"
        description="Trigger approved source refreshes and monitor run outcomes, counts, timings, and errors."
      >
        <Button icon={<ReloadOutlined />} onClick={retry}>Refresh history</Button>
      </AdminPageHeader>

      <AdminQueryState
        loading={logsQuery.isPending || sourcesQuery.isPending || statsQuery.isPending}
        error={error}
        retry={retry}
      >
        <div className="admin-collection-control admin-panel">
          <div className="admin-collection-copy">
            <div className="admin-collection-icon"><PlayCircleOutlined /></div>
            <div>
              <Text strong>Run a manual collection</Text>
              <Text type="secondary">Only approved, enabled, and unblocked sources can be refreshed.</Text>
            </div>
          </div>
          <Space wrap>
            <Select
              value={sourceId}
              onChange={setSourceId}
              placeholder="Select an active source"
              options={activeSources.map((source) => ({ value: source.id, label: source.name }))}
              style={{ minWidth: 240 }}
              disabled={isRunning || triggerMutation.isPending}
            />
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={triggerMutation.isPending}
              disabled={isRunning || !sourceId || !activeSources.some((source) => source.id === sourceId)}
              onClick={() => triggerMutation.mutate()}
            >
              {isRunning ? 'Collection running' : 'Start collection'}
            </Button>
          </Space>
        </div>
        {isRunning && (
          <Alert
            className="admin-running-alert"
            type="info"
            showIcon
            message="A collection is already running. Another run can be started after it finishes."
          />
        )}

        <div className="admin-schedule-card admin-panel">
          <div>
            <Text strong>Scheduled refresh</Text>
            <Text type="secondary">The scheduler is controlled by the backend deployment configuration.</Text>
          </div>
          <Tag color={statsQuery.data?.scheduled_refresh?.enabled ? 'success' : 'default'}>
            {statsQuery.data?.scheduled_refresh?.enabled
              ? `Enabled · checks every ${Math.round((statsQuery.data.scheduled_refresh.interval_seconds || 300) / 60)} min`
              : 'Not enabled'}
          </Tag>
        </div>

        <div className="admin-panel admin-table-panel">
          <div className="admin-table-heading">
            <div>
              <Text strong>Collection history</Text>
              <Text type="secondary">{logsQuery.data?.total ?? 0} recorded runs</Text>
            </div>
          </div>
          <Table<ScrapeLog>
            rowKey="id"
            columns={columns}
            dataSource={logsQuery.data?.items || []}
            loading={logsQuery.isFetching}
            scroll={{ x: 1050 }}
            pagination={{
              current: page,
              pageSize,
              total: logsQuery.data?.total || 0,
              showSizeChanger: false,
              onChange: setPage,
            }}
            locale={{ emptyText: 'No collection activity has been recorded.' }}
          />
        </div>
      </AdminQueryState>
    </div>
  )
}
