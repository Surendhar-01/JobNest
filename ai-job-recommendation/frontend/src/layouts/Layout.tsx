import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Layout as AntLayout,
  Menu,
  Button,
  Avatar,
  Space,
  Typography,
  Tag,
  Alert,
  Tooltip,
} from 'antd'
import {
  DashboardOutlined,
  SearchOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  BookOutlined,
  CheckCircleOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  LogoutOutlined,
  ArrowRightOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BankOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import type { Health } from '../types'

const { Header, Content, Sider, Footer } = AntLayout
const { Text } = Typography

export function Layout() {
  const { session, profile, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const health = useApi<Health>('/health')

  const isPublicPage = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/terms', '/privacy'].includes(
    location.pathname
  )

  // Primary navigation grouped logically
  const coreNavItems = [
    { key: '/dashboard', label: 'Overview', icon: <DashboardOutlined /> },
    { key: '/jobs', label: 'Explore jobs', icon: <SearchOutlined /> },
    { key: '/recommendations', label: 'For you', icon: <ThunderboltOutlined /> },
    { key: '/resume', label: 'Resume analyzer', icon: <FileTextOutlined /> },
  ]

  const trackerNavItems = [
    { key: '/saved', label: 'Saved jobs', icon: <BookOutlined /> },
    { key: '/applications', label: 'Applications', icon: <CheckCircleOutlined /> },
    { key: '/profile', label: 'My profile', icon: <UserOutlined /> },
    ...(profile?.role === 'admin'
      ? [{ key: '/admin', label: 'Admin console', icon: <SafetyCertificateOutlined /> }]
      : []),
  ]

  const allNavItems = [...coreNavItems, ...trackerNavItems]

  // Sidebar content component for desktop Sider
  const renderSidebarContent = () => {
    const isCompact = collapsed

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          background: '#ffffff',
        }}
      >
        {/* Sidebar Workspace Bar & Collapse Control */}
        <div
          style={{
            padding: isCompact ? '12px 6px' : '12px 14px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCompact ? 'center' : 'space-between',
            background: '#ffffff',
          }}
        >
          {!isCompact ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  color: session ? '#059669' : '#64748b',
                  background: session ? '#ecfdf5' : '#f8fafc',
                  border: `1px solid ${session ? '#a7f3d0' : '#e2e8f0'}`,
                  padding: '3px 8px',
                  borderRadius: 9999,
                  lineHeight: 1.2,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: session ? '#10b981' : '#94a3b8',
                    display: 'inline-block',
                  }}
                />
                {session ? 'Active Workspace' : 'Guest Mode'}
              </span>
            </div>
          ) : (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: session ? '#10b981' : '#94a3b8',
                display: 'inline-block',
              }}
              title={session ? 'Active Workspace' : 'Guest Mode'}
            />
          )}

          <Tooltip title={isCompact ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
            <Button
              type="text"
              size="small"
              onClick={() => setCollapsed(!collapsed)}
              icon={isCompact ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              style={{
                color: '#64748b',
                borderRadius: 6,
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </Tooltip>
        </div>

        {/* Navigation Section */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isCompact ? '12px 6px' : '12px 10px',
          }}
        >
          {/* Main Discovery Section */}
          {!isCompact && (
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', padding: '4px 10px 6px' }}>
              Discovery & Career
            </div>
          )}
          <Menu
            mode="inline"
            inlineCollapsed={isCompact}
            selectedKeys={[location.pathname]}
            style={{ border: 'none', background: 'transparent' }}
            onClick={({ key }) => {
              navigate(key)
            }}
            items={coreNavItems.map((item) => ({
              key: item.key,
              icon: item.icon,
              label: item.label,
              style: {
                borderRadius: 10,
                margin: '3px 0',
                fontWeight: 500,
                height: 40,
                lineHeight: '40px',
              },
            }))}
            className="modern-sidebar-menu"
          />

          {/* Tracking Section */}
          <div style={{ margin: '12px 0 6px', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
            {!isCompact && (
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', padding: '0 10px 6px' }}>
                Tracker & Account
              </div>
            )}
            <Menu
              mode="inline"
              inlineCollapsed={isCompact}
              selectedKeys={[location.pathname]}
              style={{ border: 'none', background: 'transparent' }}
              onClick={({ key }) => {
                navigate(key)
              }}
              items={trackerNavItems.map((item) => ({
                key: item.key,
                icon: item.icon,
                label: item.label,
                style: {
                  borderRadius: 10,
                  margin: '3px 0',
                  fontWeight: 500,
                  height: 40,
                  lineHeight: '40px',
                },
              }))}
              className="modern-sidebar-menu"
            />
          </div>

          {/* Institutional Banner Card in Expanded Mode */}
          {!isCompact && (
            <div
              style={{
                margin: '16px 4px 10px',
                padding: '12px 14px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                borderRadius: 14,
                border: '1px solid #dbeafe',
                boxShadow: '0 2px 6px rgba(37,99,235,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <BankOutlined style={{ color: '#2563eb', fontSize: 13 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Campus Affiliation
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                K.S. Rangasamy College of Technology
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Autonomous • Tiruchengode
              </div>
            </div>
          )}
        </div>

        {/* User Profile Footer Section */}
        <div
          style={{
            padding: isCompact ? '12px 6px' : '12px 14px',
            borderTop: '1px solid #f1f5f9',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCompact ? 'center' : 'space-between',
            gap: 10,
          }}
        >
          {session ? (
            <>
              <div
                onClick={() => {
                  navigate('/profile')
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minWidth: 0,
                  cursor: 'pointer',
                  flex: 1,
                  padding: '4px',
                  borderRadius: 8,
                  transition: 'background 0.15s ease',
                }}
                title={profile?.full_name || 'My Profile'}
              >
                <Avatar
                  style={{
                    backgroundColor: '#2563eb',
                    flexShrink: 0,
                    fontWeight: 700,
                  }}
                  icon={!profile?.full_name && <UserOutlined />}
                >
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                </Avatar>

                {!isCompact && (
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#0f172a',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {profile?.full_name || 'Student User'}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: '#64748b',
                        textTransform: 'capitalize',
                        lineHeight: 1.2,
                        marginTop: 2,
                      }}
                    >
                      {profile?.role === 'admin' ? 'Administrator' : 'Student'}
                    </span>
                  </div>
                )}
              </div>

              {!isCompact ? (
                <Tooltip title="Sign out" placement="top">
                  <Button
                    danger
                    type="text"
                    icon={<LogoutOutlined />}
                    onClick={() => void logout()}
                    style={{
                      borderRadius: 8,
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                </Tooltip>
              ) : (
                <Tooltip title="Sign out" placement="right">
                  <Button
                    danger
                    type="text"
                    size="small"
                    icon={<LogoutOutlined />}
                    onClick={() => void logout()}
                    style={{
                      borderRadius: 6,
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                </Tooltip>
              )}
            </>
          ) : (
            <div style={{ width: '100%', textAlign: 'center' }}>
              {!isCompact ? (
                <Button
                  type="primary"
                  block
                  icon={<UserOutlined />}
                  onClick={() => {
                    navigate('/login')
                  }}
                  style={{ borderRadius: 8, fontWeight: 600 }}
                >
                  Sign In
                </Button>
              ) : (
                <Tooltip title="Sign In" placement="right">
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<UserOutlined />}
                    onClick={() => {
                      navigate('/login')
                    }}
                  />
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <AntLayout style={{ minHeight: '100vh', background: '#f8fafc' }} className="app">
      {/* Top Navigation Bar */}
      <Header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 64,
        }}
        className="navbar"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, height: '100%' }}>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              lineHeight: 1,
            }}
            className="brand"
          >
            <img
              src="/ksrct_emblem.png"
              alt="KSRCT Logo"
              style={{
                height: 38,
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'inline-flex', alignItems: 'baseline', fontSize: 19, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                pathfinder<span style={{ color: '#2563eb' }}>.</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                KSRCT Autonomous
              </span>
            </div>
          </Link>

          <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <NavLink to="/" style={{ textDecoration: 'none', fontSize: 14, fontWeight: 500, color: '#475569' }}>
              Home
            </NavLink>
            <NavLink to="/jobs" style={{ textDecoration: 'none', fontSize: 14, fontWeight: 500, color: '#475569' }}>
              Explore jobs
            </NavLink>
            <a href="/#how-it-works" style={{ textDecoration: 'none', fontSize: 14, fontWeight: 500, color: '#475569' }}>
              How it works
            </a>
            <a href="/#features" style={{ textDecoration: 'none', fontSize: 14, fontWeight: 500, color: '#475569' }}>
              Features
            </a>
          </nav>
        </div>

        <Space size={12} className="nav-actions">
          {session ? (
            <Button
              type="primary"
              onClick={() => navigate('/dashboard')}
              icon={<ArrowRightOutlined />}
              style={{ borderRadius: 8, fontWeight: 600 }}
              className="button primary small"
            >
              My dashboard
            </Button>
          ) : (
            <>
              <Link to="/login" style={{ textDecoration: 'none', fontSize: 14, fontWeight: 600, color: '#475569', marginRight: 8 }} className="login-link">
                Log in
              </Link>
              <Button
                type="primary"
                onClick={() => navigate('/signup')}
                style={{ borderRadius: 8, fontWeight: 600 }}
                className="button primary small"
              >
                Get started <ArrowRightOutlined />
              </Button>
            </>
          )}

        </Space>
      </Header>

      {/* Educational Preview Banner */}
      {health.data?.practice_preview && (
        <Alert
          title="Educational Preview: Listings are fictional Real Python practice data with complete AI recommendation capabilities."
          type="info"
          banner
          closable
        />
      )}

      {/* Main Body Shell */}
      <AntLayout style={{ background: '#f8fafc' }} className={!isPublicPage ? 'portal-shell' : 'public-shell'}>
        {!isPublicPage && (
          <Sider
            width={260}
            collapsedWidth={76}
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            trigger={null}
            breakpoint="lg"
            style={{
              background: '#ffffff',
              borderRight: '1px solid #e2e8f0',
              position: 'sticky',
              top: 64,
              height: 'calc(100vh - 64px)',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              zIndex: 40,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {renderSidebarContent()}
          </Sider>
        )}

        <Content
          style={{
            padding: isPublicPage ? 0 : '24px 32px',
            minHeight: 'calc(100vh - 128px)',
            background: '#f8fafc',
            transition: 'all 0.2s ease',
          }}
          className={!isPublicPage ? 'portal-main' : 'public-main'}
        >
          <Outlet />
        </Content>
      </AntLayout>

      {/* Footer */}
      <Footer
        style={{
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '24px 32px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
        className="footer"
      >
        <Space size={8} align="center">
          <img src="/ksrct_emblem.png" alt="KSRCT" style={{ height: 22, width: 'auto' }} />
          <Text strong style={{ color: '#0f172a' }}>
            pathfinder.
          </Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            AI-Based Job Recommendation System · K.S. Rangasamy College of Technology (Autonomous)
          </Text>
        </Space>

        <Space size={16} separator={<span style={{ color: '#cbd5e1' }}>•</span>}>
          <Link to="/jobs" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>
            Explore jobs
          </Link>
          <Link to="/privacy" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>
            Privacy
          </Link>
          <Link to="/terms" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>
            Terms
          </Link>
        </Space>
      </Footer>
    </AntLayout>
  )
}

export default Layout
