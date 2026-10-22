import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Row,
  Col,
  Card,
  Input,
  Button,
  Tag,
  Typography,
  Space,
  Collapse,
  Badge,
  Progress,
  Divider,
  Avatar,
} from 'antd'
import {
  SearchOutlined,
  EnvironmentOutlined,
  UploadOutlined,
  ArrowRightOutlined,
  ThunderboltFilled,
  CodeOutlined,
  ApiOutlined,
  RocketOutlined,
  ToolOutlined,
  BankOutlined,
  TeamOutlined,
  CheckCircleFilled,
  CompassOutlined,
  StarFilled,
} from '@ant-design/icons'
import { get } from '../services/api'
import { JobCard } from '../components/JobCard'
import { Skeleton } from '../components/UI'
import type { Job, Page } from '../types'

const { Title, Text, Paragraph } = Typography

const departments = [
  { name: 'Computer Science', count: '45+ roles', icon: CodeOutlined, desc: 'Full-stack, frontend, backend & systems software' },
  { name: 'Information Technology', count: '30+ roles', icon: ApiOutlined, desc: 'Cloud infrastructure, DevOps, cybersecurity & DB' },
  { name: 'Electrical & Electronics', count: '20+ roles', icon: ThunderboltFilled, desc: 'Embedded systems, IoT, firmware & hardware' },
  { name: 'Mechanical Engineering', count: '15+ roles', icon: ToolOutlined, desc: 'Design, robotics, CAD modeling & operations' },
  { name: 'Civil Engineering', count: '12+ roles', icon: BankOutlined, desc: 'Structural engineering, planning & infrastructure' },
  { name: 'Business Administration', count: '25+ roles', icon: TeamOutlined, desc: 'Product management, analytics & business operations' },
]

const faqs = [
  {
    key: '1',
    label: 'How does the AI recommendation engine work?',
    children:
      'Our engine extracts observed technical skills, degree qualifications, and experience from your resume and profile. It uses Sentence Transformers and TF-IDF semantic vector similarity to compare candidate text with job descriptions, applying a weighted scoring model (45% semantic, 25% skills, 10% qualifications, 10% experience, 5% location, 5% job type).',
  },
  {
    key: '2',
    label: 'Can college students with no prior experience get recommendations?',
    children:
      'Yes! The engine identifies your coursework, academic projects, technical skills, and degree department, matching you with junior, fresher, and internship listings suited for entry-level candidates.',
  },
  {
    key: '3',
    label: 'Is the match score a guarantee of getting hired?',
    children:
      'No. The match percentage is an automated, system-generated relevance score reflecting how closely your profile aligns with stated job criteria. It is designed to guide your discovery, not predict hiring decisions.',
  },
  {
    key: '4',
    label: 'Where do the job opportunities come from?',
    children:
      'All listings are gathered from approved, authorized sources and practice datasets with proper attribution. Apply buttons connect you directly to the original source application pages.',
  },
  {
    key: '5',
    label: 'Are my resume and personal details secure?',
    children:
      'Yes. The system utilizes Supabase Row Level Security and authenticated storage, ensuring that only you can access your uploaded resumes, extracted data, and saved applications.',
  },
]

export function Landing() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [locationTerm, setLocationTerm] = useState('')

  const { data: featured, isLoading } = useQuery({
    queryKey: ['/jobs', 'featured'],
    queryFn: () => get<Page<Job>>('/jobs', { page_size: 6, sort: 'date' }),
    staleTime: 60000,
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchTerm.trim()) params.set('q', searchTerm.trim())
    if (locationTerm.trim()) params.set('location', locationTerm.trim())
    navigate(`/jobs?${params.toString()}`)
  }

  return (
    <div style={{ background: '#f8fafc', width: '100%' }}>
      {/* Hero Section */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 64px', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto 36px' }}>
          <div style={{ marginBottom: 16 }}>
            <Tag color="processing" style={{ borderRadius: 16, padding: '4px 14px', fontSize: 12, fontWeight: 700 }}>
              AI-Powered Career Intelligence
            </Tag>
          </div>

          <Title level={1} style={{ fontSize: 48, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Find Your Next Opportunity with <span style={{ color: '#2563eb' }}>AI</span>
          </Title>

          <Paragraph style={{ fontSize: 18, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
            Personalized job recommendations built for college students, fresh graduates, and experienced job seekers. Match by department, skills, resume analysis, and career preferences.
          </Paragraph>

          <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 10, background: '#ffffff', padding: '6px 16px', borderRadius: 9999, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <img
              src="/ksrct_emblem.png"
              alt="KSRCT Logo"
              style={{
                height: 24,
                width: 'auto',
                objectFit: 'contain',
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>
              K.S. Rangasamy College of Technology (Autonomous)
            </span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#94a3b8' }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Campus Placement Portal
            </span>
          </div>
        </div>

        {/* Hero Interactive Search Bar */}
        <Card
          style={{
            maxWidth: 900,
            margin: '0 auto',
            borderRadius: 20,
            boxShadow: '0 10px 25px -5px rgba(37,99,235,0.08), 0 8px 10px -6px rgba(37,99,235,0.04)',
            border: '1px solid #e2e8f0',
          }}
          bodyStyle={{ padding: 16 }}
        >
          <form onSubmit={handleSearch}>
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} md={11}>
                <Input
                  size="large"
                  prefix={<SearchOutlined style={{ color: '#94a3b8', marginRight: 6 }} />}
                  placeholder="Job title, technical skill, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ borderRadius: 12, border: '1px solid #cbd5e1' }}
                />
              </Col>
              <Col xs={24} md={7}>
                <Input
                  size="large"
                  prefix={<EnvironmentOutlined style={{ color: '#94a3b8', marginRight: 6 }} />}
                  placeholder="City, State or Remote..."
                  value={locationTerm}
                  onChange={(e) => setLocationTerm(e.target.value)}
                  style={{ borderRadius: 12, border: '1px solid #cbd5e1' }}
                />
              </Col>
              <Col xs={24} md={6}>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    icon={<ArrowRightOutlined />}
                    style={{ borderRadius: 12, fontWeight: 700, padding: '0 20px' }}
                  >
                    Explore Jobs
                  </Button>
                  <Button
                    size="large"
                    icon={<UploadOutlined />}
                    onClick={() => navigate('/resume')}
                    style={{ borderRadius: 12, fontWeight: 600 }}
                  >
                    Upload Resume
                  </Button>
                </Space>
              </Col>
            </Row>
          </form>

          {/* Popular Tag Pills */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>Popular Searches:</span>
            {['Python Developer', 'React Frontend', 'Data Analyst', 'Machine Learning', 'Remote', 'Internship'].map((tag) => (
              <Button
                key={tag}
                type="text"
                size="small"
                onClick={() => {
                  setSearchTerm(tag)
                  navigate(`/jobs?q=${encodeURIComponent(tag)}`)
                }}
                style={{ borderRadius: 6, background: '#f1f5f9', color: '#475569', fontSize: 12 }}
              >
                {tag}
              </Button>
            ))}
          </div>
        </Card>

        {/* Value Highlights */}
        <Row gutter={[16, 16]} style={{ maxWidth: 900, margin: '40px auto 0' }}>
          {[
            { value: '100+', label: 'Curated Practice & Live Roles', color: '#2563eb' },
            { value: '40+', label: 'Identifiable Tech & Soft Skills', color: '#4f46e5' },
            { value: '6-Factor', label: 'Weighted AI Relevance Model', color: '#0d9488' },
            { value: '100%', label: 'Transparent Match Explanations', color: '#059669' },
          ].map((item, i) => (
            <Col xs={12} sm={6} key={i}>
              <Card style={{ borderRadius: 14, border: '1px solid #e2e8f0', background: '#ffffff', textAlign: 'center' }} bodyStyle={{ padding: 16 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 600 }}>{item.label}</div>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 650, margin: '0 auto 48px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2563eb' }}>
              PROCESS
            </span>
            <Title level={2} style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '6px 0 10px' }}>
              How Pathfinder Works
            </Title>
            <Paragraph style={{ color: '#64748b', fontSize: 15 }}>
              Three seamless steps bridging your qualifications directly to verified job opportunities.
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card style={{ borderRadius: 16, height: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }} bodyStyle={{ padding: 28 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, margin: '0 auto 20px' }}>
                  1
                </div>
                <Title level={4} style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                  Upload or Build Profile
                </Title>
                <Paragraph style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                  Upload your PDF or DOCX resume. Our NLP pipeline instantly parses your education, degree, projects, and observed technical skills.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card style={{ borderRadius: 16, height: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }} bodyStyle={{ padding: 28 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, margin: '0 auto 20px' }}>
                  2
                </div>
                <Title level={4} style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                  AI Semantic Matching
                </Title>
                <Paragraph style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                  Our model compares your candidate profile against verified job descriptions using semantic embeddings, qualification filters, and experience checks.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card style={{ borderRadius: 16, height: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }} bodyStyle={{ padding: 28 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ccfbf1', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, margin: '0 auto 20px' }}>
                  3
                </div>
                <Title level={4} style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                  Ranked Recommendations
                </Title>
                <Paragraph style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                  Discover matching positions ranked with clear relevance scores. Review matching skills, identify missing skills, and apply directly.
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>
      </section>

      {/* AI Features Section */}
      <section id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', maxWidth: 650, margin: '0 auto 48px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#4f46e5' }}>
            CAPABILITIES
          </span>
          <Title level={2} style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '6px 0 10px' }}>
            Intelligent Recommendation Engine
          </Title>
          <Paragraph style={{ color: '#64748b', fontSize: 15 }}>
            Engineered with modern NLP, strict provenance, and fair algorithmic ranking.
          </Paragraph>
        </div>

        <Row gutter={[20, 20]}>
          {[
            {
              title: 'Semantic Similarity',
              desc: 'Calculates cosine similarity over dense sentence embeddings, matching concepts even when exact keywords differ.',
              icon: <RocketOutlined style={{ fontSize: 24, color: '#2563eb' }} />,
            },
            {
              title: 'Skill Gap Analysis',
              desc: 'Every recommended job highlights your overlapping skills and pinpoints exact missing skills to guide your upskilling journey.',
              icon: <ThunderboltFilled style={{ fontSize: 24, color: '#4f46e5' }} />,
            },
            {
              title: 'Eligibility Verification',
              desc: 'Explicit checks for mandatory qualifications (B.Tech, M.Sc, etc.) and minimum experience ensure recommendations are actually achievable.',
              icon: <CheckCircleFilled style={{ fontSize: 24, color: '#0d9488' }} />,
            },
            {
              title: 'Fact-Based Extraction',
              desc: 'We never fabricate experience or qualifications. Candidates review and correct all parsed data before recommendations run.',
              icon: <StarFilled style={{ fontSize: 24, color: '#059669' }} />,
            },
          ].map((feat, i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card
                hoverable
                style={{ borderRadius: 16, height: '100%', border: '1px solid #e2e8f0', background: '#ffffff' }}
                bodyStyle={{ padding: 24 }}
              >
                <div style={{ marginBottom: 16 }}>{feat.icon}</div>
                <Title level={4} style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                  {feat.title}
                </Title>
                <Paragraph style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  {feat.desc}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* Department Opportunities */}
      <section style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 40 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0d9488' }}>
                DEPARTMENTS
              </span>
              <Title level={2} style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '6px 0 0' }}>
                Explore by Your Discipline
              </Title>
              <Paragraph style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
                Curated roles aligned with academic degrees and vocational majors at K S Rangasamy College of Technology.
              </Paragraph>
            </div>
            <Button type="link" onClick={() => navigate('/jobs')} style={{ padding: 0, fontWeight: 600 }}>
              View all listings <ArrowRightOutlined />
            </Button>
          </div>

          <Row gutter={[20, 20]}>
            {departments.map((dept) => {
              const Icon = dept.icon
              return (
                <Col xs={24} sm={12} lg={8} key={dept.name}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/jobs?department=${encodeURIComponent(dept.name)}`)}
                    style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#f8fafc', height: '100%', cursor: 'pointer' }}
                    bodyStyle={{ padding: 24 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <Avatar
                        size={44}
                        shape="square"
                        icon={<Icon />}
                        style={{ background: '#ffffff', color: '#2563eb', border: '1px solid #e2e8f0', borderRadius: 12 }}
                      />
                      <Tag color="blue" style={{ borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                        {dept.count}
                      </Tag>
                    </div>
                    <Title level={4} style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                      {dept.name}
                    </Title>
                    <Paragraph style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                      {dept.desc}
                    </Paragraph>
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Explore Opportunities &rarr;
                    </div>
                  </Card>
                </Col>
              )
            })}
          </Row>
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 36 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2563eb' }}>
              FEATURED LISTINGS
            </span>
            <Title level={2} style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '6px 0 0' }}>
              Latest Job Opportunities
            </Title>
            <Paragraph style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
              Verified software, data, and engineering positions ready for applications.
            </Paragraph>
          </div>
          <Button type="link" onClick={() => navigate('/jobs')} style={{ padding: 0, fontWeight: 600 }}>
            Explore all {featured?.total || 0} jobs <ArrowRightOutlined />
          </Button>
        </div>

        {isLoading ? (
          <Row gutter={[20, 20]}>
            <Col xs={24} md={8}><Skeleton /></Col>
            <Col xs={24} md={8}><Skeleton /></Col>
            <Col xs={24} md={8}><Skeleton /></Col>
          </Row>
        ) : (
          <Row gutter={[20, 20]}>
            {featured?.items?.map((job) => (
              <Col xs={24} sm={12} lg={8} key={job.id}>
                <JobCard job={job} />
              </Col>
            ))}
          </Row>
        )}
      </section>

      {/* Benefits for Freshers & Students */}
      <section style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', color: '#ffffff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={14}>
              <Tag color="cyan" style={{ borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                Student Friendly
              </Tag>
              <Title level={2} style={{ fontSize: 36, fontWeight: 800, color: '#ffffff', margin: '16px 0 20px', lineHeight: 1.2 }}>
                Launch Your Career Without Getting Lost in Generic Portals
              </Title>
              <Paragraph style={{ color: '#bfdbfe', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
                Traditional job portals overwhelm freshers with listings requiring 3–5 years of experience. Pathfinder is built specifically to value your degree, coursework, projects, and skills at K S Rangasamy College of Technology.
              </Paragraph>

              <Space size={16} style={{ width: '100%', marginBottom: 32, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <CheckCircleFilled style={{ color: '#2dd4bf', fontSize: 20, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#ffffff' }}>No Prior Corporate Experience Required</div>
                    <div style={{ color: '#93c5fd', fontSize: 13 }}>Projects and verified technical skills drive matching scores for entry-level roles.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <CheckCircleFilled style={{ color: '#2dd4bf', fontSize: 20, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#ffffff' }}>Actionable Skill Feedback</div>
                    <div style={{ color: '#93c5fd', fontSize: 13 }}>Know exactly which libraries, frameworks, or tools to learn to unlock higher-tier roles.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <CheckCircleFilled style={{ color: '#2dd4bf', fontSize: 20, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#ffffff' }}>Direct Application Links</div>
                    <div style={{ color: '#93c5fd', fontSize: 13 }}>Every position links directly to verified application forms without middleman paywalls.</div>
                  </div>
                </div>
              </Space>

              <Space size={16}>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/signup')}
                  style={{ background: '#0d9488', borderColor: '#0d9488', borderRadius: 10, fontWeight: 700 }}
                >
                  Create Student Account
                </Button>
                <Button
                  ghost
                  size="large"
                  onClick={() => navigate('/jobs')}
                  style={{ borderRadius: 10, fontWeight: 600 }}
                >
                  Browse All Jobs
                </Button>
              </Space>
            </Col>

            <Col xs={24} lg={10}>
              <Card
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 20,
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                }}
                bodyStyle={{ padding: 24 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(45,212,191,0.2)', color: '#2dd4bf', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                      AI
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#ffffff' }}>Match Breakdown Preview</div>
                      <div style={{ fontSize: 12, color: '#93c5fd' }}>Software Engineer (Entry Level)</div>
                    </div>
                  </div>
                  <Tag color="cyan" style={{ borderRadius: 8, fontWeight: 800 }}>
                    92% Match
                  </Tag>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#bfdbfe', marginBottom: 4 }}>
                      <span>Semantic Relevance (45%)</span>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>95%</span>
                    </div>
                    <Progress percent={95} strokeColor="#2dd4bf" showInfo={false} size={['100%', 8]} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#bfdbfe', marginBottom: 4 }}>
                      <span>Skill Overlap (25%)</span>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>88%</span>
                    </div>
                    <Progress percent={88} strokeColor="#38bdf8" showInfo={false} size={['100%', 8]} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#bfdbfe', marginBottom: 4 }}>
                      <span>Qualification Match (10%)</span>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>100%</span>
                    </div>
                    <Progress percent={100} strokeColor="#818cf8" showInfo={false} size={['100%', 8]} />
                  </div>
                </div>

                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <Tag color="cyan">Python ✓</Tag>
                  <Tag color="cyan">SQL ✓</Tag>
                  <Tag color="cyan">React ✓</Tag>
                  <Tag color="warning">Docker (Missing)</Tag>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section style={{ maxWidth: 850, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2563eb' }}>
            FAQ
          </span>
          <Title level={2} style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '6px 0 8px' }}>
            Frequently Asked Questions
          </Title>
          <Paragraph style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
            Common questions regarding our algorithms, privacy, and job sources.
          </Paragraph>
        </div>

        <Collapse
          items={faqs}
          defaultActiveKey={[]}
          style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0' }}
        />
      </section>

      {/* Call to Action Section */}
      <section style={{ background: '#f1f5f9', borderTop: '1px solid #e2e8f0', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <CompassOutlined style={{ fontSize: 40, color: '#2563eb', marginBottom: 16 }} />
          <Title level={2} style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
            Ready to Discover Your Best Job Matches?
          </Title>
          <Paragraph style={{ color: '#64748b', fontSize: 16, lineHeight: 1.6, margin: '0 0 28px' }}>
            Create your student account in under two minutes or analyze your resume right now to see ranked recommendations.
          </Paragraph>
          <Space size={16}>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/signup')}
              style={{ borderRadius: 10, fontWeight: 700, padding: '0 28px' }}
            >
              Get Started Free
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/jobs')}
              style={{ borderRadius: 10, fontWeight: 600, padding: '0 28px' }}
            >
              Explore Opportunities
            </Button>
          </Space>
        </div>
      </section>
    </div>
  )
}
export default Landing
