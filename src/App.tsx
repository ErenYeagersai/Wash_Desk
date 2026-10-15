import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ToastContainer } from '@/components/ui'
import { Spinner } from '@/components/ui'
import type { UserRole } from '@/types'

// Auth pages
import Landing  from '@/pages/auth/Landing'
import Login    from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'

// Student pages
import Dashboard     from '@/pages/student/Dashboard'
import SubmitLaundry from '@/pages/student/SubmitLaundry'
import CurrentLaundry from '@/pages/student/CurrentLaundry'
import OrderDetail   from '@/pages/student/OrderDetail'
import History       from '@/pages/student/History'
import Notifications from '@/pages/student/Notifications'
import Profile       from '@/pages/student/Profile'
import MyBagQR       from '@/pages/student/MyBagQR'

// Staff
import StaffDashboard    from '@/pages/staff/StaffDashboard'
import ScanBag           from '@/pages/staff/ScanBag'
import StaffOrderDetail  from '@/pages/staff/StaffOrderDetail'

// Admin
import AdminDashboard   from '@/pages/admin/AdminDashboard'
import AdminOrders      from '@/pages/admin/AdminOrders'
import AdminOrderDetail from '@/pages/admin/AdminOrderDetail'
import AdminUsers       from '@/pages/admin/AdminUsers'
import AdminAuditLogs   from '@/pages/admin/AdminAuditLogs'
import AdminDelayed     from '@/pages/admin/AdminDelayed'
import AdminSettings    from '@/pages/admin/AdminSettings'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: UserRole[]
}

function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="page-loader">
        <Spinner size="lg" className="text-primary" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (roles && profile && !roles.includes(profile.role)) {
    // Redirect to the correct home for their actual role
    const home: Record<UserRole, string> = {
      student: '/dashboard',
      staff:   '/staff',
      admin:   '/admin',
    }
    return <Navigate to={home[profile.role] ?? '/login'} replace />
  }

  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="page-loader">
        <Spinner size="lg" className="text-primary" />
      </div>
    )
  }

  if (session && profile) {
    const home: Record<UserRole, string> = {
      student: '/dashboard',
      staff:   '/staff',
      admin:   '/admin',
    }
    return <Navigate to={home[profile.role] ?? '/dashboard'} replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

      {/* Student */}
      <Route path="/dashboard" element={<ProtectedRoute roles={['student']}><Dashboard /></ProtectedRoute>} />
      <Route path="/submit"    element={<ProtectedRoute roles={['student']}><SubmitLaundry /></ProtectedRoute>} />
      <Route path="/current"   element={<ProtectedRoute roles={['student']}><CurrentLaundry /></ProtectedRoute>} />
      <Route path="/orders/:id" element={<ProtectedRoute roles={['student']}><OrderDetail /></ProtectedRoute>} />
      <Route path="/history"   element={<ProtectedRoute roles={['student']}><History /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute roles={['student']}><Notifications /></ProtectedRoute>} />
      <Route path="/profile"   element={<ProtectedRoute roles={['student']}><Profile /></ProtectedRoute>} />
      <Route path="/my-bag"    element={<ProtectedRoute roles={['student']}><MyBagQR /></ProtectedRoute>} />

      {/* Staff */}
      <Route path="/staff"          element={<ProtectedRoute roles={['staff', 'admin']}><StaffDashboard /></ProtectedRoute>} />
      <Route path="/staff/scan"     element={<ProtectedRoute roles={['staff', 'admin']}><ScanBag /></ProtectedRoute>} />
      <Route path="/staff/orders/:id" element={<ProtectedRoute roles={['staff', 'admin']}><StaffOrderDetail /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin"                element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/orders"         element={<ProtectedRoute roles={['admin']}><AdminOrders /></ProtectedRoute>} />
      <Route path="/admin/orders/:id"     element={<ProtectedRoute roles={['admin']}><AdminOrderDetail /></ProtectedRoute>} />
      <Route path="/admin/users"          element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/logs"           element={<ProtectedRoute roles={['admin']}><AdminAuditLogs /></ProtectedRoute>} />
      <Route path="/admin/delayed"        element={<ProtectedRoute roles={['admin']}><AdminDelayed /></ProtectedRoute>} />
      <Route path="/admin/settings"       element={<ProtectedRoute roles={['admin']}><AdminSettings /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function NotFound() {
  return (
    <div className="page-loader flex-col gap-4 text-center">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <p className="text-gray-500">Page not found.</p>
      <a href="/" className="text-primary font-medium hover:underline">Go home</a>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
