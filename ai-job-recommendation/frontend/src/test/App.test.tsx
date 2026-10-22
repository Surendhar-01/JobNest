import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../contexts/AuthContext'
import { Landing } from '../pages/Landing'
import { Login } from '../pages/Login'
import { Signup } from '../pages/Signup'
import { JobCard } from '../components/JobCard'
import type { Job } from '../types'

function renderWithProviders(ui: React.ReactElement, { route = '/' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          {ui}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Frontend Application Test Suite', () => {
  it('renders Landing Page hero, search bar, and key headings', () => {
    renderWithProviders(<Landing />)

    // Heading and Subheading
    expect(screen.getByText(/Find Your Next Opportunity with/i)).toBeInTheDocument()
    expect(screen.getByText(/AI-Powered Career Intelligence/i)).toBeInTheDocument()

    // Search inputs and action button
    expect(
      screen.getByPlaceholderText(/Job title, technical skill, or company.../i)
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/City, State or Remote.../i)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Explore Jobs/i })).toBeInTheDocument()

    // How Pathfinder Works section
    expect(screen.getByText(/How Pathfinder Works/i)).toBeInTheDocument()
    expect(screen.getByText(/Intelligent Recommendation Engine/i)).toBeInTheDocument()

    // Frequently Asked Questions section
    expect(screen.getByText(/Frequently Asked Questions/i)).toBeInTheDocument()
    expect(screen.getByText(/How does the AI recommendation engine work\?/i)).toBeInTheDocument()
  })

  it('toggles FAQ accordion items on Landing Page', () => {
    renderWithProviders(<Landing />)

    const faqButton = screen.getByText(/How does the AI recommendation engine work\?/i)
    expect(faqButton).toBeInTheDocument()

    // Click to open FAQ answer
    fireEvent.click(faqButton)
    expect(
      screen.getByText(/Our engine extracts observed technical skills, degree qualifications, and experience/i)
    ).toBeInTheDocument()
  })

  it('renders Login Page with inputs and demo access pills', () => {
    renderWithProviders(<Login />, { route: '/login' })

    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/you@university\.edu/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument()

    // Quick demo buttons
    expect(screen.getByRole('button', { name: /Student Demo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Admin Demo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
  })

  it('renders Signup Page with required registration fields', () => {
    renderWithProviders(<Signup />, { route: '/signup' })

    expect(screen.getByText(/Create your Student Account/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Alex Morgan/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/alex@college\.edu/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/At least 8 chars/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Repeat password/i)).toBeInTheDocument()

    // Department & Qualification selectors
    expect(screen.getByDisplayValue('Computer Science')).toBeInTheDocument()
    expect(screen.getByDisplayValue('B.Tech / B.E.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2025')).toBeInTheDocument()

    // Terms agreement checkbox
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Complete Sign Up/i })).toBeInTheDocument()
  })

  it('renders JobCard component with company, title, skills, and links', () => {
    const mockJob: Job = {
      id: 'job-test-123',
      title: 'Junior Full-Stack Engineer',
      company: 'TechCorp Solutions',
      location: 'Remote, US',
      salary: '$75,000 - $95,000',
      job_type: 'Full-time',
      experience: '0-2 years',
      department: 'Computer Science',
      qualification: 'B.Tech',
      skills: ['React', 'TypeScript', 'Python', 'FastAPI'],
      description: 'Exciting opportunity for junior engineers.',
      application_url: 'https://example.com/apply/junior-engineer',
      source: 'https://example.com',
      posted_date: '2026-10-14',
      is_demo: false,
      is_active: true,
      collected_at: '2026-10-14T10:00:00Z',
    }

    renderWithProviders(<JobCard job={mockJob} score={88} />)

    expect(screen.getByText('TechCorp Solutions')).toBeInTheDocument()
    expect(screen.getByText('Junior Full-Stack Engineer')).toBeInTheDocument()
    expect(screen.getByText(/Remote, US/i)).toBeInTheDocument()
    expect(screen.getByText(/Full-time/i)).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText(/88% relevance/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View details/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Apply at source/i })).toBeInTheDocument()
  })
})
