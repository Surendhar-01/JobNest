import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Card,
  Row,
  Col,
  Typography,
  Upload,
  Button,
  Tag,
  Space,
  Progress,
  Input,
  Alert,
  Descriptions,
} from 'antd'
import {
  InboxOutlined,
  FilePdfOutlined,
  ThunderboltFilled,
  CheckCircleFilled,
  EditOutlined,
  SaveOutlined,
  BookOutlined,
  CompassOutlined,
  UserOutlined,
  BankOutlined,
  LinkedinOutlined,
  GithubOutlined,
  GlobalOutlined,
  MailOutlined,
  PhoneOutlined,
  TrophyOutlined,
  SafetyCertificateOutlined,
  ProjectOutlined,
  CalendarOutlined,
  LaptopOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { get, api, errorMessage } from '../services/api'
import type { Resume as ResumeType } from '../types'

const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload

export function Resume() {
  const navigate = useNavigate()
  const cache = useQueryClient()

  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [editingAnalysis, setEditingAnalysis] = useState(false)

  // Editable state
  const [editFullName, setEditFullName] = useState('')
  const [editCollege, setEditCollege] = useState('')
  const [editCurrentYear, setEditCurrentYear] = useState('')
  const [editDepartment, setEditDepartment] = useState('')
  const [editGraduationYear, setEditGraduationYear] = useState('')
  const [editCgpa, setEditCgpa] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLinkedin, setEditLinkedin] = useState('')
  const [editGithub, setEditGithub] = useState('')
  const [editPortfolio, setEditPortfolio] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editTechSkills, setEditTechSkills] = useState<string[]>([])
  const [newTechSkill, setNewTechSkill] = useState('')
  const [editSoftSkills, setEditSoftSkills] = useState<string[]>([])
  const [newSoftSkill, setNewSoftSkill] = useState('')

  // 1. Fetch Latest Resume Analysis
  const { data: resume, refetch } = useQuery<ResumeType>({
    queryKey: ['/resumes/analysis'],
    queryFn: () => get<ResumeType>('/resumes/analysis'),
    retry: false,
  })

  // 2. Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds the 10 MB limit')
      }
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!['pdf', 'docx'].includes(ext || '')) {
        throw new Error('Only PDF and DOCX files are supported')
      }

      const formData = new FormData()
      formData.append('file', file)

      setUploadProgress(25)
      const res = await api.post<ResumeType>('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 80) / progressEvent.total))
          }
        },
      })

      // Trigger automatic AI analysis
      setUploadProgress(90)
      const analyzed = await api.post<ResumeType>('/resumes/analyze', { resume_id: res.data.id })
      setUploadProgress(100)
      return analyzed.data
    },
    onSuccess: (data) => {
      setUploadProgress(null)
      cache.invalidateQueries({ queryKey: ['/resumes/analysis'] })
      cache.invalidateQueries({ queryKey: ['/users/me/dashboard'] })
      toast.success('Resume analyzed with complete candidate profile!')
      if (data.analysis) {
        populateEditState(data.analysis)
      }
    },
    onError: (err) => {
      setUploadProgress(null)
      toast.error(errorMessage(err))
    },
  })

  function populateEditState(a: NonNullable<ResumeType['analysis']>) {
    setEditFullName(a.full_name || 'Not provided')
    setEditCollege(a.college || 'Not provided')
    setEditCurrentYear(a.current_year || 'Not provided')
    setEditDepartment(a.department || 'Not provided')
    setEditGraduationYear(a.graduation_year || 'Not provided')
    setEditCgpa(a.cgpa || 'Not provided')
    setEditEmail(a.email || 'Not provided')
    setEditPhone(a.phone || 'Not provided')
    setEditLinkedin(a.linkedin_url || 'Not provided')
    setEditGithub(a.github_url || 'Not provided')
    setEditPortfolio(a.portfolio_url || 'Not provided')
    setEditSummary(a.summary || '')
    setEditTechSkills(a.technical_skills || a.skills || [])
    setEditSoftSkills(a.soft_skills || [])
  }

  // 3. Review & Correct Mutation
  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!resume) return
      return api.put('/resumes/analysis', {
        resume_id: resume.id,
        full_name: editFullName,
        college: editCollege,
        current_year: editCurrentYear,
        department: editDepartment,
        graduation_year: editGraduationYear,
        cgpa: editCgpa,
        email: editEmail,
        phone: editPhone,
        linkedin_url: editLinkedin,
        github_url: editGithub,
        portfolio_url: editPortfolio,
        technical_skills: editTechSkills,
        soft_skills: editSoftSkills,
        skills: Array.from(new Set([...editTechSkills, ...editSoftSkills])),
        summary: editSummary,
        educational_qualifications: resume.analysis?.educational_qualifications || resume.analysis?.education || [],
        education: resume.analysis?.educational_qualifications || resume.analysis?.education || [],
        work_experience: resume.analysis?.work_experience || [],
        internships: resume.analysis?.internships || [],
        experience: resume.analysis?.experience || [],
        projects: resume.analysis?.projects || [],
        certifications: resume.analysis?.certifications || [],
        achievements: resume.analysis?.achievements || [],
      })
    },
    onSuccess: () => {
      setEditingAnalysis(false)
      cache.invalidateQueries({ queryKey: ['/resumes/analysis'] })
      cache.invalidateQueries({ queryKey: ['/recommendations'] })
      toast.success('Resume details reviewed and saved!')
    },
    onError: (err) => {
      toast.error(errorMessage(err))
    },
  })

  function startEditing() {
    if (resume?.analysis) {
      populateEditState(resume.analysis)
      setEditingAnalysis(true)
    }
  }

  const analysis = resume?.analysis

  const renderVal = (v: string | undefined | null) => {
    if (!v || v === 'Not provided' || v.toLowerCase() === 'not provided') {
      return (
        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>
          Not provided
        </span>
      )
    }
    return <span style={{ color: '#0f172a', fontWeight: 600, fontSize: 13 }}>{v}</span>
  }

  const renderLink = (url: string | undefined | null, icon: React.ReactNode) => {
    if (!url || url === 'Not provided' || url.toLowerCase() === 'not provided') {
      return (
        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>
          Not provided
        </span>
      )
    }
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`
    return (
      <a
        href={cleanUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
      >
        {icon} {url}
      </a>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 48px' }}>
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Text strong style={{ fontSize: 12, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1 }}>
            Automated Candidate Profile Extraction
          </Text>
          <Title level={2} style={{ margin: '4px 0 0', fontWeight: 800, color: '#0f172a' }}>
            AI Resume Analyzer & Complete Information Parser
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Deep Groq LLM extraction for candidate demographics, academic qualifications, skills, experience, projects, and credentials.
          </Text>
        </div>

        {analysis && (
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltFilled />}
            onClick={() => navigate('/recommendations')}
            style={{ borderRadius: 10, fontWeight: 600 }}
          >
            Generate Job Matches →
          </Button>
        )}
      </div>

      <Space orientation="vertical" size={24} style={{ width: '100%' }}>
        {/* Ant Design Dragger Upload */}
        <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0' }} styles={{ body: { padding: 24 } }}>
          <Dragger
            name="file"
            multiple={false}
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            showUploadList={false}
            beforeUpload={(file) => {
              uploadMutation.mutate(file)
              return false
            }}
            disabled={uploadMutation.isPending}
            style={{
              padding: '24px 16px',
              borderRadius: 14,
              borderColor: '#93c5fd',
              background: '#f8fafc',
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#2563eb', fontSize: 48 }} />
            </p>
            <Title level={4} style={{ margin: '8px 0 4px', fontWeight: 700 }}>
              {uploadMutation.isPending ? 'Extracting Resume Intelligence...' : 'Click or drag resume file to upload'}
            </Title>
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
              Supports official PDF and DOCX formats (Max limit: 10 MB). Groq AI automatically extracts all candidate details with zero data loss.
            </Paragraph>

            {uploadProgress !== null ? (
              <div style={{ maxWidth: 320, margin: '16px auto 0' }}>
                <Progress percent={uploadProgress} status="active" strokeColor="#2563eb" />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {uploadProgress < 85 ? 'Uploading resume file...' : 'Running high-precision AI extraction...'}
                </Text>
              </div>
            ) : (
              <Button type="default" icon={<FilePdfOutlined />} style={{ borderRadius: 8, marginTop: 8 }}>
                Select Resume File
              </Button>
            )}
          </Dragger>
        </Card>

        {/* Results View */}
        {analysis && (
          <Space orientation="vertical" size={20} style={{ width: '100%' }}>
            {/* Header with edit button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <Space>
                <CheckCircleFilled style={{ color: '#10b981', fontSize: 20 }} />
                <div>
                  <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
                    Extracted Profile: {analysis.full_name && analysis.full_name !== 'Not provided' ? analysis.full_name : resume.file_name}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Source file: {resume.file_name} • {analysis.provenance || 'AI Extracted'}
                  </Text>
                </div>
              </Space>

              {!editingAnalysis ? (
                <Button icon={<EditOutlined />} onClick={startEditing} style={{ borderRadius: 8 }}>
                  Review & Edit Profile
                </Button>
              ) : (
                <Space>
                  <Button onClick={() => setEditingAnalysis(false)} style={{ borderRadius: 8 }}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate()}
                    style={{ borderRadius: 8 }}
                  >
                    Save Corrections
                  </Button>
                </Space>
              )}
            </div>

            {/* Suggested Roles Card */}
            {analysis.suggested_roles && analysis.suggested_roles.length > 0 && (
              <Alert
                title={
                  <div>
                    <Text strong style={{ fontSize: 12, color: '#1e40af', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      AI Suggested Career Roles:
                    </Text>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {analysis.suggested_roles.map((role) => (
                        <Tag key={role} color="blue" style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>
                          ✦ {role}
                        </Tag>
                      ))}
                    </div>
                  </div>
                }
                type="info"
                showIcon
                style={{ borderRadius: 12, border: '1px solid #bfdbfe', background: '#eff6ff' }}
              />
            )}

            {/* 1. Candidate Demographics & Academics Card */}
            <Card
              title={
                <Space>
                  <UserOutlined style={{ color: '#2563eb' }} />
                  <span>Candidate Identity & Academic Credentials</span>
                </Space>
              }
              style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
            >
              {editingAnalysis ? (
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ fontSize: 12, color: '#475569' }}>Full Name</Text>
                    <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} style={{ marginTop: 4 }} />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ fontSize: 12, color: '#475569' }}>College / University</Text>
                    <Input value={editCollege} onChange={(e) => setEditCollege(e.target.value)} style={{ marginTop: 4 }} />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ fontSize: 12, color: '#475569' }}>Department / Major</Text>
                    <Input value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} style={{ marginTop: 4 }} />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ fontSize: 12, color: '#475569' }}>Current Year of Study</Text>
                    <Input value={editCurrentYear} onChange={(e) => setEditCurrentYear(e.target.value)} style={{ marginTop: 4 }} />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ fontSize: 12, color: '#475569' }}>Graduation Year</Text>
                    <Input value={editGraduationYear} onChange={(e) => setEditGraduationYear(e.target.value)} style={{ marginTop: 4 }} />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ fontSize: 12, color: '#475569' }}>CGPA / GPA</Text>
                    <Input value={editCgpa} onChange={(e) => setEditCgpa(e.target.value)} style={{ marginTop: 4 }} />
                  </Col>
                </Row>
              ) : (
                <Descriptions
                  bordered
                  size="small"
                  column={{ xs: 1, sm: 2, md: 3 }}
                  style={{ background: '#ffffff', borderRadius: 8 }}
                >
                  <Descriptions.Item label={<Space><UserOutlined style={{ color: '#64748b' }} /> Full Name</Space>}>
                    {renderVal(analysis.full_name)}
                  </Descriptions.Item>
                  <Descriptions.Item label={<Space><BankOutlined style={{ color: '#64748b' }} /> College / Institution</Space>}>
                    {renderVal(analysis.college)}
                  </Descriptions.Item>
                  <Descriptions.Item label={<Space><BookOutlined style={{ color: '#64748b' }} /> Department / Branch</Space>}>
                    {renderVal(analysis.department)}
                  </Descriptions.Item>
                  <Descriptions.Item label={<Space><CalendarOutlined style={{ color: '#64748b' }} /> Current Year</Space>}>
                    {renderVal(analysis.current_year)}
                  </Descriptions.Item>
                  <Descriptions.Item label={<Space><CalendarOutlined style={{ color: '#64748b' }} /> Graduation Year</Space>}>
                    {renderVal(analysis.graduation_year)}
                  </Descriptions.Item>
                  <Descriptions.Item label={<Space><TrophyOutlined style={{ color: '#64748b' }} /> CGPA / Percentage</Space>}>
                    {renderVal(analysis.cgpa)}
                  </Descriptions.Item>
                </Descriptions>
              )}
            </Card>

            {/* 2. Contact Information & Online Presence Card */}
            <Card
              title={
                <Space>
                  <MailOutlined style={{ color: '#0d9488' }} />
                  <span>Contact Information & Professional Profiles</span>
                </Space>
              }
              style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
            >
              {editingAnalysis ? (
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ fontSize: 12, color: '#475569' }}>Email Address</Text>
                    <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={{ marginTop: 4 }} />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ fontSize: 12, color: '#475569' }}>Phone Number</Text>
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} style={{ marginTop: 4 }} />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ fontSize: 12, color: '#475569' }}>LinkedIn URL</Text>
                    <Input value={editLinkedin} onChange={(e) => setEditLinkedin(e.target.value)} style={{ marginTop: 4 }} />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ fontSize: 12, color: '#475569' }}>GitHub URL</Text>
                    <Input value={editGithub} onChange={(e) => setEditGithub(e.target.value)} style={{ marginTop: 4 }} />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ fontSize: 12, color: '#475569' }}>Portfolio / Website</Text>
                    <Input value={editPortfolio} onChange={(e) => setEditPortfolio(e.target.value)} style={{ marginTop: 4 }} />
                  </Col>
                </Row>
              ) : (
                <Descriptions
                  bordered
                  size="small"
                  column={{ xs: 1, sm: 2, md: 3 }}
                  style={{ background: '#ffffff', borderRadius: 8 }}
                >
                  <Descriptions.Item label={<Space><MailOutlined style={{ color: '#64748b' }} /> Email</Space>}>
                    {renderVal(analysis.email)}
                  </Descriptions.Item>
                  <Descriptions.Item label={<Space><PhoneOutlined style={{ color: '#64748b' }} /> Phone</Space>}>
                    {renderVal(analysis.phone)}
                  </Descriptions.Item>
                  <Descriptions.Item label={<Space><CompassOutlined style={{ color: '#64748b' }} /> Location</Space>}>
                    {renderVal(analysis.location)}
                  </Descriptions.Item>
                  <Descriptions.Item label={<Space><LinkedinOutlined style={{ color: '#0077b5' }} /> LinkedIn</Space>}>
                    {renderLink(analysis.linkedin_url, <LinkedinOutlined />)}
                  </Descriptions.Item>
                  <Descriptions.Item label={<Space><GithubOutlined style={{ color: '#24292e' }} /> GitHub</Space>}>
                    {renderLink(analysis.github_url, <GithubOutlined />)}
                  </Descriptions.Item>
                  <Descriptions.Item label={<Space><GlobalOutlined style={{ color: '#2563eb' }} /> Portfolio</Space>}>
                    {renderLink(analysis.portfolio_url, <GlobalOutlined />)}
                  </Descriptions.Item>
                </Descriptions>
              )}
            </Card>

            {/* 3. Skills Row: Technical Skills & Soft Skills */}
            <Row gutter={[20, 20]}>
              <Col xs={24} md={12}>
                <Card
                  title={
                    <Space>
                      <LaptopOutlined style={{ color: '#2563eb' }} />
                      <span>Technical Skills ({(analysis.technical_skills || analysis.skills || []).length})</span>
                    </Space>
                  }
                  style={{ borderRadius: 16, border: '1px solid #e2e8f0', height: '100%' }}
                >
                  {editingAnalysis ? (
                    <div>
                      <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
                        <Input
                          value={newTechSkill}
                          onChange={(e) => setNewTechSkill(e.target.value)}
                          onPressEnter={(e) => {
                            e.preventDefault()
                            if (newTechSkill.trim() && !editTechSkills.includes(newTechSkill.trim())) {
                              setEditTechSkills([...editTechSkills, newTechSkill.trim()])
                              setNewTechSkill('')
                            }
                          }}
                          placeholder="Add technical skill..."
                        />
                        <Button
                          type="primary"
                          onClick={() => {
                            if (newTechSkill.trim() && !editTechSkills.includes(newTechSkill.trim())) {
                              setEditTechSkills([...editTechSkills, newTechSkill.trim()])
                              setNewTechSkill('')
                            }
                          }}
                        >
                          Add
                        </Button>
                      </Space.Compact>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {editTechSkills.map((s) => (
                          <Tag
                            key={s}
                            color="blue"
                            closable
                            onClose={() => setEditTechSkills(editTechSkills.filter((item) => item !== s))}
                          >
                            {s}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {(analysis.technical_skills || analysis.skills || []).length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(analysis.technical_skills || analysis.skills || []).map((s) => (
                            <Tag key={s} color="blue" style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6 }}>
                              {s}
                            </Tag>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>Not provided</span>
                      )}
                    </div>
                  )}
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card
                  title={
                    <Space>
                      <TeamOutlined style={{ color: '#0d9488' }} />
                      <span>Soft Skills ({(analysis.soft_skills || []).length})</span>
                    </Space>
                  }
                  style={{ borderRadius: 16, border: '1px solid #e2e8f0', height: '100%' }}
                >
                  {editingAnalysis ? (
                    <div>
                      <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
                        <Input
                          value={newSoftSkill}
                          onChange={(e) => setNewSoftSkill(e.target.value)}
                          onPressEnter={(e) => {
                            e.preventDefault()
                            if (newSoftSkill.trim() && !editSoftSkills.includes(newSoftSkill.trim())) {
                              setEditSoftSkills([...editSoftSkills, newSoftSkill.trim()])
                              setNewSoftSkill('')
                            }
                          }}
                          placeholder="Add soft skill..."
                        />
                        <Button
                          type="primary"
                          onClick={() => {
                            if (newSoftSkill.trim() && !editSoftSkills.includes(newSoftSkill.trim())) {
                              setEditSoftSkills([...editSoftSkills, newSoftSkill.trim()])
                              setNewSoftSkill('')
                            }
                          }}
                        >
                          Add
                        </Button>
                      </Space.Compact>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {editSoftSkills.map((s) => (
                          <Tag
                            key={s}
                            color="cyan"
                            closable
                            onClose={() => setEditSoftSkills(editSoftSkills.filter((item) => item !== s))}
                          >
                            {s}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {(analysis.soft_skills || []).length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {analysis.soft_skills?.map((s) => (
                            <Tag key={s} color="cyan" style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6 }}>
                              {s}
                            </Tag>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>Not provided</span>
                      )}
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            {/* 4. Executive Summary Card */}
            <Card
              title={
                <Space>
                  <BookOutlined style={{ color: '#4f46e5' }} />
                  <span>Profile Summary / Abstract</span>
                </Space>
              }
              style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
            >
              {editingAnalysis ? (
                <Input.TextArea
                  rows={4}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="Profile summary..."
                />
              ) : (
                <Paragraph italic style={{ fontSize: 13, color: '#334155', background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', margin: 0 }}>
                  "{analysis.summary || 'Not provided'}"
                </Paragraph>
              )}
            </Card>

            {/* 5. Educational Qualifications & Work Experience */}
            <Row gutter={[20, 20]}>
              <Col xs={24} md={12}>
                <Card
                  title={
                    <Space>
                      <BookOutlined style={{ color: '#2563eb' }} />
                      <span>Educational Qualifications</span>
                    </Space>
                  }
                  style={{ borderRadius: 16, border: '1px solid #e2e8f0', height: '100%' }}
                >
                  {(analysis.educational_qualifications || analysis.education || []).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(analysis.educational_qualifications || analysis.education || []).map((item, idx) => (
                        <div key={idx} style={{ fontSize: 13, color: '#334155', padding: '6px 0', borderBottom: idx !== (analysis.educational_qualifications || analysis.education || []).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          • {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>Not provided</span>
                  )}
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card
                  title={
                    <Space>
                      <CompassOutlined style={{ color: '#0d9488' }} />
                      <span>Work Experience</span>
                    </Space>
                  }
                  style={{ borderRadius: 16, border: '1px solid #e2e8f0', height: '100%' }}
                >
                  {(analysis.work_experience || []).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(analysis.work_experience || []).map((item, idx) => (
                        <div key={idx} style={{ fontSize: 13, color: '#334155', padding: '6px 0', borderBottom: idx !== (analysis.work_experience || []).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          • {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>Not provided</span>
                  )}
                </Card>
              </Col>
            </Row>

            {/* 6. Internships & Projects */}
            <Row gutter={[20, 20]}>
              <Col xs={24} md={12}>
                <Card
                  title={
                    <Space>
                      <LaptopOutlined style={{ color: '#4f46e5' }} />
                      <span>Internships</span>
                    </Space>
                  }
                  style={{ borderRadius: 16, border: '1px solid #e2e8f0', height: '100%' }}
                >
                  {(analysis.internships || []).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(analysis.internships || []).map((item, idx) => (
                        <div key={idx} style={{ fontSize: 13, color: '#334155', padding: '6px 0', borderBottom: idx !== (analysis.internships || []).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          • {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>Not provided</span>
                  )}
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card
                  title={
                    <Space>
                      <ProjectOutlined style={{ color: '#2563eb' }} />
                      <span>Projects</span>
                    </Space>
                  }
                  style={{ borderRadius: 16, border: '1px solid #e2e8f0', height: '100%' }}
                >
                  {(analysis.projects || []).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(analysis.projects || []).map((item, idx) => (
                        <div key={idx} style={{ fontSize: 13, color: '#334155', padding: '6px 0', borderBottom: idx !== (analysis.projects || []).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          • {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>Not provided</span>
                  )}
                </Card>
              </Col>
            </Row>

            {/* 7. Certifications & Achievements */}
            <Row gutter={[20, 20]}>
              <Col xs={24} md={12}>
                <Card
                  title={
                    <Space>
                      <SafetyCertificateOutlined style={{ color: '#10b981' }} />
                      <span>Certifications</span>
                    </Space>
                  }
                  style={{ borderRadius: 16, border: '1px solid #e2e8f0', height: '100%' }}
                >
                  {(analysis.certifications || []).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(analysis.certifications || []).map((item, idx) => (
                        <div key={idx} style={{ fontSize: 13, color: '#334155', padding: '6px 0', borderBottom: idx !== (analysis.certifications || []).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          • {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>Not provided</span>
                  )}
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card
                  title={
                    <Space>
                      <TrophyOutlined style={{ color: '#f59e0b' }} />
                      <span>Achievements & Recognitions</span>
                    </Space>
                  }
                  style={{ borderRadius: 16, border: '1px solid #e2e8f0', height: '100%' }}
                >
                  {(analysis.achievements || []).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(analysis.achievements || []).map((item, idx) => (
                        <div key={idx} style={{ fontSize: 13, color: '#334155', padding: '6px 0', borderBottom: idx !== (analysis.achievements || []).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          • {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>Not provided</span>
                  )}
                </Card>
              </Col>
            </Row>
          </Space>
        )}
      </Space>
    </div>
  )
}

export default Resume
