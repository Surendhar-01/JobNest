import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Avatar,
  Button,
  Layout as AntLayout,
  Menu,
  Space,
  Tooltip,
  Typography,
} from 'antd'
import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'

const { Header, Sider, Content } = AntLayout
const { Text } = Typography

const items = [
  { key: '/admin', label: 'Overview', icon: <AppstoreOutlined /> },
  { key: '/admin/users', label: 'User Management', icon: <UserOutlined /> },
  { key: '/admin/jobs', label: 'Job Management', icon: <DatabaseOutlined /> },
  { key: '/admin/sources', label: 'Job Source Management', icon: <SafetyCertificateOutlined /> },
  { key: '/admin/collections', label: 'Collection Monitoring', icon: <SyncOutlined /> },
  { key: '/admin/analytics', label: 'Analytics & Reports', icon: <BarChartOutlined /> },
  { key: '/admin/audit', label: 'Audit Logs', icon: <AuditOutlined /> },
]

const titles: Record<string, string> = Object.fromEntries(
  items.map(({ key, label }) => [key, label])
)

export function AdminLayout() {
  const { profile, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const activeKey = location.pathname === '/admin' ? '/admin' : `/${location.pathname.split('/').slice(1, 3).join('/')}`
  const title = titles[activeKey] || 'Admin Console'

  async function handleLogout() {
    await logout()
    toast.success('You have been signed out')
    navigate('/login', { replace: true })
  }

  return (
    <AntLayout className="admin-shell">
      <Sider
        className="admin-sidebar"
        width={264}
        collapsedWidth={76}
        collapsed={collapsed}
        collapsible
        trigger={null}
        breakpoint="lg"
        onCollapse={setCollapsed}
      >
        <div className={`admin-brand ${collapsed ? 'is-collapsed' : ''}`}>
          <img src="/ksrct_emblem.png" alt="" />
          {!collapsed && (
            <div>
              <div className="admin-brand-name">JobNest<span>.</span></div>
              <div className="admin-brand-caption">ADMIN CONSOLE</div>
            </div>
          )}
          <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <Button
              type="text"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((value) => !value)}
              className="admin-collapse-button"
            />
          </Tooltip>
        </div>

        <div className="admin-menu-label">{!collapsed && 'WORKSPACE'}</div>
        <Menu
          className="admin-menu"
          mode="inline"
          selectedKeys={[activeKey]}
          inlineCollapsed={collapsed}
          items={items}
          onClick={({ key }) => navigate(key)}
        />

        <div className={`admin-user ${collapsed ? 'is-collapsed' : ''}`}>
          <Avatar icon={<UserOutlined />} className="admin-user-avatar" />
          {!collapsed && (
            <div className="admin-user-copy">
              <Text strong ellipsis>{profile?.full_name || 'Administrator'}</Text>
              <Text type="secondary">Administrator</Text>
            </div>
          )}
          <Tooltip title="Logout">
            <Button
              type="text"
              danger
              aria-label="Logout"
              icon={<LogoutOutlined />}
              onClick={() => void handleLogout()}
              className="admin-logout-button"
            >
              {!collapsed && 'Logout'}
            </Button>
          </Tooltip>
        </div>
      </Sider>

      <AntLayout className="admin-main">
        <Header className="admin-topbar">
          <Space size={12}>
            <div className="admin-topbar-mark"><SafetyCertificateOutlined /></div>
            <div>
              <Text className="admin-topbar-overline">JOBNEST / ADMIN</Text>
              <div className="admin-topbar-title">{title}</div>
            </div>
          </Space>
          <Text className="admin-topbar-date">
            {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date())}
          </Text>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
