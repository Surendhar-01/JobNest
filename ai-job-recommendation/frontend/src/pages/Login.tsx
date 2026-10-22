import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Card, Form, Input, Button, Typography, Space, Divider } from 'antd'
import {
  CompassOutlined,
  MailOutlined,
  LockOutlined,
  ArrowRightOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { supabase } from '../services/supabase'
import { api, errorMessage } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const { Title, Text, Paragraph } = Typography

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refresh } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const from = (location.state as any)?.from || '/dashboard'

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setLoading(true)

    try {
      if (supabase) {
        // Mode A: Cloud Supabase Auth
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        // Mode B: Local Backend Auth
        const res = await api.post('/auth/login', { email, password })
        localStorage.setItem('pathfinder_token', res.data.token)
        localStorage.setItem('pathfinder_user', JSON.stringify(res.data.user))
      }

      await refresh()
      toast.success('Signed in successfully!')
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Quick Demo Access for Testing & Grading
  async function handleDemoLogin(role: 'student' | 'admin') {
    setLoading(true)
    const demoEmail = role === 'admin' ? 'admin@pathfinder.io' : 'alex.student@pathfinder.io'
    const demoPass = 'DemoPassword123!'

    try {
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass })
        if (error) {
          await supabase.auth.signUp({
            email: demoEmail,
            password: demoPass,
            options: { data: { full_name: role === 'admin' ? 'Admin Officer' : 'Alex Student', role } },
          })
          await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass })
        }
      } else {
        const res = await api.post('/auth/demo-login', { role })
        localStorage.setItem('pathfinder_token', res.data.token)
        localStorage.setItem('pathfinder_user', JSON.stringify(res.data.user))
      }

      await refresh()
      toast.success(`Logged in as ${role === 'admin' ? 'Administrator' : 'Student'}!`)
      navigate(role === 'admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
      <Card
        style={{
          maxWidth: 440,
          width: '100%',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          background: '#ffffff',
        }}
        bodyStyle={{ padding: 32 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
            <img
              src="/ksrct_logo.png"
              alt="K.S. Rangasamy College of Technology"
              style={{
                height: 48,
                maxWidth: '90%',
                objectFit: 'contain',
              }}
            />
          </div>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
            pathfinder<span style={{ color: '#2563eb' }}>.</span>
          </Link>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 2 }}>
            KSRCT Campus Career Portal
          </div>
          <Title level={3} style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '14px 0 4px' }}>
            Welcome back
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Sign in to access your recommendations and applications
          </Text>
        </div>

        {/* Demo Quick-Login Box */}
        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24, textAlign: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
            Quick One-Click Demo Access
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              disabled={loading}
              onClick={() => handleDemoLogin('student')}
              icon={<UserOutlined style={{ color: '#2563eb' }} />}
              style={{ flex: 1, borderRadius: 8, fontSize: 12, fontWeight: 600 }}
            >
              Student Demo
            </Button>
            <Button
              disabled={loading}
              onClick={() => handleDemoLogin('admin')}
              icon={<SafetyCertificateOutlined style={{ color: '#4f46e5' }} />}
              style={{ flex: 1, borderRadius: 8, fontSize: 12, fontWeight: 600 }}
            >
              Admin Demo
            </Button>
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 6 }}>
              Email Address
            </label>
            <Input
              size="large"
              type="email"
              required
              prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ borderRadius: 10 }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
                Password
              </label>
              <Link to="/forgot-password" style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>
            <Input.Password
              size="large"
              required
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ borderRadius: 10 }}
            />
          </div>

          <Button
            type="primary"
            size="large"
            block
            htmlType="submit"
            loading={loading}
            icon={<ArrowRightOutlined />}
            style={{ borderRadius: 10, fontWeight: 700, height: 44 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#64748b' }}>
          Don’t have an account yet?{' '}
          <Link to="/signup" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            Create an account
          </Link>
        </div>
      </Card>
    </div>
  )
}
export default Login
