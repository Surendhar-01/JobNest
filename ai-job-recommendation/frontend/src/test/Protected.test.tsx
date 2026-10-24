import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Protected } from '../routes/Protected'
import { useAuth } from '../contexts/AuthContext'
import type { Profile } from '../types'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

function CurrentLocation() {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  return <div>{location.pathname} from={from}</div>
}

function renderJobsRoute() {
  return render(
    <MemoryRouter initialEntries={['/jobs?q=python']}>
      <Routes>
        <Route element={<Protected allowAdmin />}>
          <Route path="/jobs" element={<div>Explore Jobs</div>} />
        </Route>
        <Route path="/login" element={<CurrentLocation />} />
      </Routes>
    </MemoryRouter>
  )
}

function createProfile(role: Profile['role']): Profile {
  return {
    id: 'user-id',
    full_name: 'Test User',
    email: 'test@example.com',
    role,
    phone: null,
    photo_url: null,
    department: null,
    degree: null,
    college: null,
    graduation_year: null,
    current_location: null,
    preferred_location: null,
    preferred_job_type: null,
    expected_salary: null,
    technical_skills: [],
    soft_skills: [],
    certifications: [],
    projects: [],
    internship_experience: null,
    work_experience: null,
    experience_years: null,
  }
}

describe('Explore Jobs route authentication', () => {
  it('redirects logged-out users to Login and retains the requested search', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      profile: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
      logout: vi.fn(),
    })

    renderJobsRoute()

    expect(screen.getByText('/login from=/jobs?q=python')).toBeInTheDocument()
  })

  it.each(['student', 'admin'] as const)('allows authenticated %s users to explore jobs', (role) => {
    vi.mocked(useAuth).mockReturnValue({
      session: { user: { id: 'user-id' } },
      profile: createProfile(role),
      loading: false,
      error: null,
      refresh: vi.fn(),
      logout: vi.fn(),
    })

    renderJobsRoute()

    expect(screen.getByText('Explore Jobs')).toBeInTheDocument()
  })
})
