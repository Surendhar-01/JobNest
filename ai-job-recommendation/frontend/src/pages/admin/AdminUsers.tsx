import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Button, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import { SearchOutlined, UserOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { api, errorMessage, get } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import type { AdminUser, Page } from '../../types'
import {
  AdminPageHeader,
  AdminQueryState,
  formatAdminDate,
} from './AdminShared'

const { Text } = Typography

export function AdminUsers() {
  const { profile } = useAuth()
  const cache = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<string>()
  const [status, setStatus] = useState<string>()
  const [page, setPage] = useState(1)
  const pageSize = 20
  const params = {
    page,
    page_size: pageSize,
    ...(search.trim() ? { q: search.trim() } : {}),
    ...(role ? { role } : {}),
    ...(status ? { active: status === 'active' } : {}),
  }
  const usersQuery = useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => get<Page<AdminUser>>('/admin/users', params),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/admin/users/${id}`, { is_active }),
    onSuccess: async (_, variables) => {
      toast.success(variables.is_active ? 'Account activated' : 'Account deactivated')
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['admin-users'] }),
        cache.invalidateQueries({ queryKey: ['admin-dashboard'] }),
      ])
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  function confirmStatusChange(user: AdminUser) {
    const nextStatus = !user.is_active
    Modal.confirm({
      title: `${nextStatus ? 'Activate' : 'Deactivate'} this account?`,
      content: (
        <span>
          {nextStatus
            ? 'This user will be able to sign in and use their account again.'
            : 'This user will be prevented from accessing their account until reactivated.'}
          {' '}Account: <strong>{user.email}</strong>
        </span>
      ),
      okText: nextStatus ? 'Activate account' : 'Deactivate account',
      okButtonProps: { danger: !nextStatus, loading: statusMutation.isPending },
      cancelText: 'Cancel',
      onOk: () => statusMutation.mutateAsync({ id: user.id, is_active: nextStatus }),
    })
  }

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_: unknown, user: AdminUser) => (
        <Space>
          <Avatar icon={<UserOutlined />} className="admin-table-avatar">
            {user.full_name?.[0]?.toUpperCase()}
          </Avatar>
          <div className="admin-user-cell">
            <Text strong>{user.full_name || 'Unnamed user'}</Text>
            <Text type="secondary">{user.email}</Text>
          </div>
        </Space>
      ),
    },
    { title: 'Role', dataIndex: 'role', key: 'role', render: (value: string) => <Tag>{value}</Tag> },
    { title: 'Department', dataIndex: 'department', key: 'department', render: (value: string | null) => value || '—' },
    { title: 'Registered', dataIndex: 'created_at', key: 'created_at', render: (value: string) => formatAdminDate(value, false) },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => <Tag color={active ? 'success' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Account action',
      key: 'action',
      render: (_: unknown, user: AdminUser) => (
        <Button
          size="small"
          danger={user.is_active}
          disabled={user.id === profile?.id || statusMutation.isPending}
          onClick={() => confirmStatusChange(user)}
        >
          {user.is_active ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ]

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="User management"
        description="Search registered accounts, review roles and status, and control account access."
      />
      <div className="admin-toolbar">
        <Input
          allowClear
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1) }}
          prefix={<SearchOutlined />}
          placeholder="Search by name or email"
          className="admin-search"
        />
        <Select
          allowClear
          value={role}
          onChange={(value) => { setRole(value); setPage(1) }}
          placeholder="All roles"
          options={[{ label: 'Student', value: 'student' }, { label: 'Admin', value: 'admin' }]}
          className="admin-filter-select"
        />
        <Select
          allowClear
          value={status}
          onChange={(value) => { setStatus(value); setPage(1) }}
          placeholder="All statuses"
          options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]}
          className="admin-filter-select"
        />
      </div>
      <AdminQueryState loading={usersQuery.isPending} error={usersQuery.error} retry={() => void usersQuery.refetch()}>
        <div className="admin-panel admin-table-panel">
          <div className="admin-table-heading">
            <div>
              <Text strong>Registered accounts</Text>
              <Text type="secondary">{usersQuery.data?.total ?? 0} total users</Text>
            </div>
          </div>
          <Table<AdminUser>
            rowKey="id"
            columns={columns}
            dataSource={usersQuery.data?.items || []}
            loading={usersQuery.isFetching}
            scroll={{ x: 860 }}
            pagination={{
              current: page,
              pageSize,
              total: usersQuery.data?.total || 0,
              showSizeChanger: false,
              onChange: setPage,
            }}
            locale={{ emptyText: search ? 'No users match your search.' : 'No users found.' }}
          />
        </div>
      </AdminQueryState>
    </div>
  )
}
