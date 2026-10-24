import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Modal, Select, Space, Switch, Table, Tag, Typography } from 'antd'
import { toast } from 'sonner'
import { api, errorMessage, get } from '../../services/api'
import type { Source } from '../../types'
import {
  AdminPageHeader,
  AdminQueryState,
  formatAdminDate,
} from './AdminShared'

const { Text } = Typography

const intervals = [
  { label: 'Every hour', value: 3600 },
  { label: 'Every 6 hours', value: 21600 },
  { label: 'Every 12 hours', value: 43200 },
  { label: 'Every 24 hours', value: 86400 },
  { label: 'Every 7 days', value: 604800 },
]

export function AdminSources() {
  const cache = useQueryClient()
  const sourcesQuery = useQuery({
    queryKey: ['admin-sources'],
    queryFn: () => get<{ items: Source[] }>('/admin/sources'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: { enabled?: boolean; interval_seconds?: number } }) =>
      api.patch(`/admin/sources/${id}`, values),
    onSuccess: async () => {
      toast.success('Source settings updated')
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['admin-sources'] }),
        cache.invalidateQueries({ queryKey: ['admin-dashboard'] }),
      ])
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const columns = [
    {
      title: 'Source',
      key: 'source',
      render: (_: unknown, source: Source) => (
        <div className="admin-user-cell">
          <Text strong>{source.name}</Text>
          <Text type="secondary">{source.url}</Text>
        </div>
      ),
    },
    {
      title: 'Availability',
      key: 'availability',
      render: (_: unknown, source: Source) => (
        <Space orientation="vertical" size={4}>
          <Tag color={source.enabled && source.permitted && !source.access_denied ? 'success' : 'default'}>
            {source.enabled && source.permitted && !source.access_denied ? 'Active' : 'Inactive'}
          </Tag>
          {source.access_denied && <Tag color="error">Access blocked</Tag>}
        </Space>
      ),
    },
    {
      title: 'Configuration',
      dataIndex: 'configuration_status',
      key: 'configuration_status',
      render: (value: string) => <Text>{value}</Text>,
    },
    {
      title: 'Refresh interval',
      dataIndex: 'interval_seconds',
      key: 'interval_seconds',
      render: (value: number, source: Source) => (
        <Select
          value={value}
          options={intervals}
          disabled={updateMutation.isPending}
          onChange={(interval_seconds) => updateMutation.mutate({ id: source.id, values: { interval_seconds } })}
          style={{ minWidth: 150 }}
        />
      ),
    },
    {
      title: 'Last attempt',
      dataIndex: 'last_attempt',
      key: 'last_attempt',
      render: (value: string | null) => formatAdminDate(value),
    },
    {
      title: 'Last run',
      key: 'last_run',
      render: (_: unknown, source: Source) => {
        if (!source.latest_status) return <Text type="secondary">No runs yet</Text>
        return (
          <Space orientation="vertical" size={2}>
            <Tag color={source.latest_status === 'success' ? 'success' : source.latest_status === 'failed' ? 'error' : 'processing'}>
              {source.latest_status}
            </Tag>
            {source.latest_error && <Text type="danger">{source.latest_error}</Text>}
            <Text type="secondary">{formatAdminDate(source.last_attempt)}</Text>
          </Space>
        )
      },
    },
    {
      title: 'Enabled',
      key: 'enabled',
      render: (_: unknown, source: Source) => (
        <Switch
          checked={source.enabled}
          checkedChildren="On"
          unCheckedChildren="Off"
          loading={updateMutation.isPending}
          onChange={(enabled) => {
            Modal.confirm({
              title: `${enabled ? 'Enable' : 'Disable'} ${source.name}?`,
              content: enabled
                ? 'This source will be eligible for scheduled and manual collections, subject to its permission and access status.'
                : 'Scheduled collections will skip this source until it is enabled again.',
              okText: enabled ? 'Enable source' : 'Disable source',
              okButtonProps: { danger: !enabled },
              onOk: () => updateMutation.mutateAsync({ id: source.id, values: { enabled } }),
            })
          }}
        />
      ),
    },
  ]

  const loadError = sourcesQuery.error
  const retry = () => void sourcesQuery.refetch()

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Job source management"
        description="Review approved source status, safe configuration indicators, and refresh cadence."
        children={<Button onClick={retry}>Refresh sources</Button>}
      />
      <AdminQueryState
        loading={sourcesQuery.isPending}
        error={loadError}
        retry={retry}
      >
        <div className="admin-panel admin-table-panel">
          <div className="admin-table-heading">
            <div>
              <Text strong>Configured sources</Text>
              <Text type="secondary">Credentials and source configuration values are never displayed here.</Text>
            </div>
          </div>
          <Table<Source>
            rowKey="id"
            columns={columns}
            dataSource={sourcesQuery.data?.items || []}
            loading={sourcesQuery.isFetching}
            scroll={{ x: 1050 }}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            locale={{ emptyText: 'No job sources are configured.' }}
          />
        </div>
      </AdminQueryState>
    </div>
  )
}
