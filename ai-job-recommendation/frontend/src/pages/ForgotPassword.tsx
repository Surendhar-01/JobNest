import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Input, Button, Typography, Result, Space } from 'antd'
import { CompassOutlined, MailOutlined, ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { supabase } from '../services/supabase'
import { api, errorMessage } from '../services/api'

const { Title, Text, Paragraph } = Typography

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setLoading(true)

    try {
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
      } else {
        await api.post('/auth/forgot-password', { email })
      }
      setSubmitted(true)
      toast.success('Password reset link has been dispatched to your email.')
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
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
            <CompassOutlined style={{ fontSize: 28, color: '#2563eb' }} />
            pathfinder<span style={{ color: '#2563eb' }}>.</span>
          </Link>
          <Title level={3} style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '16px 0 4px' }}>
            Reset your password
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Enter your registered email address to receive password recovery instructions.
          </Text>
        </div>

        {submitted ? (
          <Result
            status="success"
            title="Check your email"
            subTitle={`We've dispatched password recovery instructions to ${email}.`}
            extra={[
              <Button type="primary" key="login" icon={<ArrowLeftOutlined />}>
                <Link to="/login" style={{ color: '#ffffff', textDecoration: 'none' }}>
                  Back to Sign In
                </Link>
              </Button>,
            ]}
          />
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 6 }}>
                Email Address
              </label>
              <Input
                size="large"
                type="email"
                required
                prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                placeholder="alex@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              style={{ borderRadius: 10, fontWeight: 700, height: 44, marginBottom: 16 }}
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </Button>

            <div style={{ textAlign: 'center' }}>
              <Link to="/login" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ArrowLeftOutlined style={{ fontSize: 11 }} /> Return to Login
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
export default ForgotPassword
