import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Card,
  Row,
  Col,
  Typography,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Tag,
  Space,
  Divider,
  Alert,
} from 'antd'
import {
  UserOutlined,
  SaveOutlined,
  BookOutlined,
  ThunderboltOutlined,
  CompassOutlined,
  PlusOutlined,
  BankOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'
import { get, api, errorMessage } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import type { Profile as ProfileType } from '../types'

const { Title, Text, Paragraph } = Typography

export function Profile() {
  const { profile, refresh } = useAuth()
  const cache = useQueryClient()

  // Form states
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [department, setDepartment] = useState('')
  const [degree, setDegree] = useState('')
  const [college, setCollege] = useState('')
  const [graduationYear, setGraduationYear] = useState<number | null>(null)
  const [currentLocation, setCurrentLocation] = useState('')
  const [preferredLocation, setPreferredLocation] = useState('')
  const [preferredJobType, setPreferredJobType] = useState('Full-time')
  const [expectedSalary, setExpectedSalary] = useState<number | null>(null)
  const [experienceYears, setExperienceYears] = useState<number | null>(null)
  const [internshipExperience, setInternshipExperience] = useState('')
  const [workExperience, setWorkExperience] = useState('')

  // Skills & Lists
  const [technicalSkills, setTechnicalSkills] = useState<string[]>([])
  const [newTechSkill, setNewTechSkill] = useState('')

  const [softSkills, setSoftSkills] = useState<string[]>([])
  const [newSoftSkill, setNewSoftSkill] = useState('')

  const [certifications, setCertifications] = useState<string[]>([])
  const [newCert, setNewCert] = useState('')

  const [projects, setProjects] = useState<string[]>([])
  const [newProject, setNewProject] = useState('')

  // Load profile data into form
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setPhone(profile.phone || '')
      setPhotoUrl(profile.photo_url || '')
      setDepartment(profile.department || 'Computer Science')
      setDegree(profile.degree || 'B.Tech')
      setCollege(profile.college || 'K S Rangasamy College of Technology (Autonomous)')
      setGraduationYear(profile.graduation_year || 2025)
      setCurrentLocation(profile.current_location || 'KSR Kalvi Nagar, Tiruchengode')
      setPreferredLocation(profile.preferred_location || '')
      setPreferredJobType(profile.preferred_job_type || 'Full-time')
      setExpectedSalary(profile.expected_salary || null)
      setExperienceYears(profile.experience_years !== null && profile.experience_years !== undefined ? profile.experience_years : 0)
      setInternshipExperience(profile.internship_experience || '')
      setWorkExperience(profile.work_experience || '')
      setTechnicalSkills(profile.technical_skills || [])
      setSoftSkills(profile.soft_skills || [])
      setCertifications(profile.certifications || [])
      setProjects(profile.projects || [])
    }
  }, [profile])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: fullName,
        phone: phone || null,
        photo_url: photoUrl || null,
        department: department || null,
        degree: degree || null,
        college: college || null,
        graduation_year: graduationYear ? Number(graduationYear) : null,
        current_location: currentLocation || null,
        preferred_location: preferredLocation || null,
        preferred_job_type: preferredJobType || null,
        expected_salary: expectedSalary !== null ? Number(expectedSalary) : null,
        experience_years: experienceYears !== null ? Number(experienceYears) : 0,
        technical_skills: technicalSkills,
        soft_skills: softSkills,
        certifications,
        projects,
        internship_experience: internshipExperience || null,
        work_experience: workExperience || null,
      }
      return api.put('/users/me', payload)
    },
    onSuccess: async () => {
      await refresh()
      await cache.invalidateQueries({ queryKey: ['/users/me/dashboard'] })
      await cache.invalidateQueries({ queryKey: ['/recommendations'] })
      toast.success('Profile updated successfully!')
    },
    onError: (err) => {
      toast.error(errorMessage(err))
    },
  })

  function addTechSkill() {
    if (newTechSkill.trim() && !technicalSkills.includes(newTechSkill.trim())) {
      setTechnicalSkills([...technicalSkills, newTechSkill.trim()])
      setNewTechSkill('')
    }
  }

  function removeTechSkill(item: string) {
    setTechnicalSkills(technicalSkills.filter((s) => s !== item))
  }

  function addSoftSkill() {
    if (newSoftSkill.trim() && !softSkills.includes(newSoftSkill.trim())) {
      setSoftSkills([...softSkills, newSoftSkill.trim()])
      setNewSoftSkill('')
    }
  }

  function removeSoftSkill(item: string) {
    setSoftSkills(softSkills.filter((s) => s !== item))
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 48px' }}>
      {/* Top Header */}
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
            Candidate Profile
          </Text>
          <Title level={2} style={{ margin: '4px 0 0', fontWeight: 800, color: '#0f172a' }}>
            Personal & Academic Information
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Keep your skills, degree, and career preferences updated for the best AI job recommendations.
          </Text>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<SaveOutlined />}
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
          style={{ borderRadius: 10, fontWeight: 600 }}
        >
          Save Profile
        </Button>
      </div>

      <Space orientation="vertical" size={24} style={{ width: '100%' }}>
        {/* Section 1: Basic & Contact */}
        <Card
          title={
            <Space>
              <UserOutlined style={{ color: '#2563eb' }} />
              <span>Basic & Contact Information</span>
            </Space>
          }
          style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Full Name *</Text>
              <Input
                size="large"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Candidate Full Name"
                style={{ borderRadius: 8 }}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Email Address (Verified)</Text>
              <Input
                size="large"
                disabled
                value={profile?.email || ''}
                style={{ borderRadius: 8, backgroundColor: '#f1f5f9' }}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Phone Number</Text>
              <Input
                size="large"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                style={{ borderRadius: 8 }}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Current City / Location</Text>
              <Input
                size="large"
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                placeholder="e.g. KSR Kalvi Nagar, Tiruchengode"
                style={{ borderRadius: 8 }}
              />
            </Col>
          </Row>
        </Card>

        {/* Section 2: Academics */}
        <Card
          title={
            <Space>
              <BankOutlined style={{ color: '#4f46e5' }} />
              <span>Academics & Department</span>
            </Space>
          }
          style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Academic Department *</Text>
              <Select
                size="large"
                value={department}
                onChange={(val) => setDepartment(val)}
                style={{ width: '100%', borderRadius: 8 }}
                options={[
                  { label: 'Computer Science', value: 'Computer Science' },
                  { label: 'Information Technology', value: 'Information Technology' },
                  { label: 'Electrical Engineering', value: 'Electrical Engineering' },
                  { label: 'Mechanical Engineering', value: 'Mechanical Engineering' },
                  { label: 'Civil Engineering', value: 'Civil Engineering' },
                  { label: 'Business Administration', value: 'Business Administration' },
                  { label: 'Data Science', value: 'Data Science' },
                  { label: 'Other', value: 'Other' },
                ]}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Degree / Qualification *</Text>
              <Input
                size="large"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.Tech in Information Technology"
                style={{ borderRadius: 8 }}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>College / Institution *</Text>
              <Input
                size="large"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="K S Rangasamy College of Technology (Autonomous)"
                style={{ borderRadius: 8 }}
              />
              <Tag color="blue" style={{ marginTop: 6 }}>
                Campus: KSR Kalvi Nagar, Tiruchengode
              </Tag>
            </Col>
            <Col xs={24} sm={12}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Graduation Year</Text>
              <InputNumber
                size="large"
                value={graduationYear}
                onChange={(val) => setGraduationYear(val)}
                style={{ width: '100%', borderRadius: 8 }}
                placeholder="2025"
              />
            </Col>
          </Row>
        </Card>

        {/* Section 3: Technical & Soft Skills */}
        <Card
          title={
            <Space>
              <ThunderboltOutlined style={{ color: '#0d9488' }} />
              <span>Technical & Soft Skills</span>
            </Space>
          }
          style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
        >
          {/* Tech Skills */}
          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Technical Skills</Text>
            <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
              <Input
                size="large"
                value={newTechSkill}
                onChange={(e) => setNewTechSkill(e.target.value)}
                onPressEnter={(e) => {
                  e.preventDefault()
                  addTechSkill()
                }}
                placeholder="Add technical skill (e.g. Python, React, SQL, FastAPI, AWS) and press Enter"
              />
              <Button size="large" type="primary" icon={<PlusOutlined />} onClick={addTechSkill}>
                Add
              </Button>
            </Space.Compact>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {technicalSkills.map((s) => (
                <Tag
                  key={s}
                  color="blue"
                  closable
                  onClose={() => removeTechSkill(s)}
                  style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6 }}
                >
                  {s}
                </Tag>
              ))}
            </div>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          {/* Soft Skills */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Soft Skills & Aptitude</Text>
            <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
              <Input
                size="large"
                value={newSoftSkill}
                onChange={(e) => setNewSoftSkill(e.target.value)}
                onPressEnter={(e) => {
                  e.preventDefault()
                  addSoftSkill()
                }}
                placeholder="Add soft skill (e.g. Problem Solving, Team Leadership, Communication)"
              />
              <Button size="large" icon={<PlusOutlined />} onClick={addSoftSkill}>
                Add
              </Button>
            </Space.Compact>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {softSkills.map((s) => (
                <Tag
                  key={s}
                  color="default"
                  closable
                  onClose={() => removeSoftSkill(s)}
                  style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6 }}
                >
                  {s}
                </Tag>
              ))}
            </div>
          </div>
        </Card>

        {/* Section 4: Preferences & Experience */}
        <Card
          title={
            <Space>
              <CompassOutlined style={{ color: '#2563eb' }} />
              <span>Career Preferences & Experience</span>
            </Space>
          }
          style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Preferred Job Type</Text>
              <Select
                size="large"
                value={preferredJobType}
                onChange={(val) => setPreferredJobType(val)}
                style={{ width: '100%', borderRadius: 8 }}
                options={[
                  { label: 'Full-time', value: 'Full-time' },
                  { label: 'Internship', value: 'Internship' },
                  { label: 'Part-time', value: 'Part-time' },
                  { label: 'Contract', value: 'Contract' },
                ]}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Preferred Job Location</Text>
              <Input
                size="large"
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                placeholder="e.g. Remote, Bangalore, Chennai"
                style={{ borderRadius: 8 }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Total Experience (Years)</Text>
              <InputNumber
                size="large"
                min={0}
                step={0.5}
                value={experienceYears}
                onChange={(val) => setExperienceYears(val)}
                style={{ width: '100%', borderRadius: 8 }}
                placeholder="0 for fresher"
              />
            </Col>

            <Col xs={24}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Work Experience & Projects Summary</Text>
              <Input.TextArea
                rows={3}
                value={workExperience}
                onChange={(e) => setWorkExperience(e.target.value)}
                placeholder="Highlight recent internships, capstone projects, hackathons, or freelance contributions..."
                style={{ borderRadius: 8 }}
              />
            </Col>
          </Row>
        </Card>

        {/* Bottom Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
            style={{ borderRadius: 10, height: 44, padding: '0 32px', fontWeight: 600 }}
          >
            Save All Changes
          </Button>
        </div>
      </Space>
    </div>
  )
}

export default Profile
