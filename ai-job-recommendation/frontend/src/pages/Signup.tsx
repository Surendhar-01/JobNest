import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Input, Button, Select, Checkbox, Typography, Row, Col, Space, Tag } from 'antd'
import {
  CompassOutlined,
  UserOutlined,
  MailOutlined,
  LockOutlined,
  BankOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { supabase } from '../services/supabase'
import { api, errorMessage } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const { Title, Text } = Typography

const DEFAULT_COLLEGE = 'K S Rangasamy College of Technology (Autonomous)'
const DEFAULT_LOCATION = 'KSR Kalvi Nagar, Tiruchengode'

export function Signup() {
  const navigate = useNavigate()
  const { refresh } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [department, setDepartment] = useState('Computer Science')
  const [qualification, setQualification] = useState('B.Tech')
  const [graduationYear, setGraduationYear] = useState('2025')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSignup(e?: React.FormEvent) {
    if (e) e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    if (!termsAccepted) {
      toast.error('Please accept the Terms and Conditions to proceed')
      return
    }

    setLoading(true)

    try {
      if (supabase) {
        // Mode A: Supabase Auth
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              department,
              qualification,
              graduation_year: parseInt(graduationYear, 10),
              college: DEFAULT_COLLEGE,
              current_location: DEFAULT_LOCATION,
              role: 'student',
            },
          },
        })
        if (error) throw error
        toast.success('Registration successful! Please check your email or proceed to login.')
      } else {
        // Mode B: Local Backend Auth
        const res = await api.post('/auth/signup', {
          full_name: fullName,
          email,
          password,
          department,
          qualification,
          graduation_year: parseInt(graduationYear, 10),
          college: DEFAULT_COLLEGE,
          current_location: DEFAULT_LOCATION,
        })
        localStorage.setItem('pathfinder_token', res.data.token)
        localStorage.setItem('pathfinder_user', JSON.stringify(res.data.user))
        await refresh()
        toast.success('Account created successfully!')
      }

      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
      <Card
        style={{
          maxWidth: 520,
          width: '100%',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          background: '#ffffff',
        }}
        bodyStyle={{ padding: 32 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
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
            Create your Student Account
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Unlock AI-based job recommendations tailored to your profile
          </Text>
        </div>

        {/* Institutional Affiliation Badge */}
        <div
          style={{
            padding: '14px 16px',
            background: '#eff6ff',
            borderRadius: 12,
            border: '1px solid #bfdbfe',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BankOutlined style={{ color: '#2563eb' }} />
              College / Institution
            </span>
            <Tag color="blue" style={{ margin: 0, fontWeight: 700, fontSize: 10 }}>
              Autonomous
            </Tag>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
            {DEFAULT_COLLEGE}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <EnvironmentOutlined style={{ color: '#94a3b8' }} /> Campus: <span style={{ fontWeight: 600, color: '#334155' }}>{DEFAULT_LOCATION}</span>
          </div>
        </div>

        <form onSubmit={handleSignup}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 6 }}>
              Full Name *
            </label>
            <Input
              size="large"
              required
              prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ borderRadius: 10 }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 6 }}>
              Email Address *
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

          <Row gutter={12} style={{ marginBottom: 14 }}>
            <Col xs={24} sm={12}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 6 }}>
                Password *
              </label>
              <Input.Password
                size="large"
                required
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="At least 8 chars"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ borderRadius: 10 }}
              />
            </Col>
            <Col xs={24} sm={12}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 6 }}>
                Confirm Password *
              </label>
              <Input.Password
                size="large"
                required
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ borderRadius: 10 }}
              />
            </Col>
          </Row>

          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={9}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 6 }}>
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid #d9d9d9', padding: '0 8px', fontSize: 12, background: '#ffffff', color: '#0f172a' }}
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Tech</option>
                <option value="Electrical Engineering">Electrical Eng.</option>
                <option value="Mechanical Engineering">Mechanical Eng.</option>
                <option value="Civil Engineering">Civil Eng.</option>
                <option value="Business Administration">Business / Mgmt</option>
                <option value="Data Science">Data Science</option>
                <option value="Other">Other</option>
              </select>
            </Col>

            <Col xs={24} sm={9}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 6 }}>
                Qualification
              </label>
              <select
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid #d9d9d9', padding: '0 8px', fontSize: 12, background: '#ffffff', color: '#0f172a' }}
              >
                <option value="B.Tech">B.Tech / B.E.</option>
                <option value="B.Sc">B.Sc</option>
                <option value="BCA">BCA</option>
                <option value="M.Tech">M.Tech / M.E.</option>
                <option value="M.Sc">M.Sc</option>
                <option value="MCA">MCA</option>
                <option value="MBA">MBA</option>
                <option value="Diploma">Diploma</option>
                <option value="PhD">Ph.D</option>
              </select>
            </Col>

            <Col xs={24} sm={6}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginBottom: 6 }}>
                Grad Year
              </label>
              <input
                type="number"
                min="1990"
                max="2035"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid #d9d9d9', padding: '0 8px', fontSize: 12, background: '#ffffff', color: '#0f172a' }}
              />
            </Col>
          </Row>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span>
                I agree to the <span style={{ color: '#2563eb', textDecoration: 'underline' }}>Terms and Conditions</span> and acknowledge that match scores are system-generated career relevance metrics.
              </span>
            </label>
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
            {loading ? 'Creating Account...' : 'Complete Sign Up'}
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  )
}
export default Signup
