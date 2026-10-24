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
import { AdminLayout } from './layouts/AdminLayout'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminJobs } from './pages/admin/AdminJobs'
import { AdminSources } from './pages/admin/AdminSources'
import { AdminCollections } from './pages/admin/AdminCollections'
import { AdminAnalytics } from './pages/admin/AdminAnalytics'
import { AdminAudit } from './pages/admin/AdminAudit'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Explore Jobs Route */}
        <Route element={<Protected allowAdmin />}>
          <Route path="/jobs" element={<Jobs />} />
        </Route>

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
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Admin />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="sources" element={<AdminSources />} />
            <Route path="collections" element={<AdminCollections />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="audit" element={<AdminAudit />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
export default App
