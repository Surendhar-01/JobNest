import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './layouts/Layout'
import { Protected } from './routes/Protected'
import { Landing } from './pages/Landing'
import { Jobs } from './pages/Jobs'
import { JobDetail } from './pages/JobDetail'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { ForgotPassword } from './pages/ForgotPassword'
import { Dashboard } from './pages/Dashboard'
import { Profile } from './pages/Profile'
import { Resume } from './pages/Resume'
import { Recommendations } from './pages/Recommendations'
import { SavedJobs } from './pages/SavedJobs'
import { Applications } from './pages/Applications'
import { Admin } from './pages/Admin'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Student Routes */}
        <Route element={<Protected />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/saved" element={<SavedJobs />} />
          <Route path="/applications" element={<Applications />} />
        </Route>

        {/* Protected Admin Routes */}
        <Route element={<Protected admin />}>
          <Route path="/admin" element={<Admin />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
export default App
