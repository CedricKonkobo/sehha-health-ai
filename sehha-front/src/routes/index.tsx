// src/routes/index.tsx
import { lazy } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleGuard } from './RoleGuard'

const TriageHistoryPage  = lazy(() => import('@/pages/triage/TriageHistory'))
const AdminDashboardPage  = lazy(() => import('@/pages/admin/AdminDashboard'))
const LoginPage           = lazy(() => import('@/pages/auth/Login'))
const RegisterPage        = lazy(() => import('@/pages/auth/Register'))
const OTPPage             = lazy(() => import('@/pages/auth/OTP'))
const DashboardPage       = lazy(() => import('@/pages/dashboard/Dashboard'))
const TriagePage          = lazy(() => import('@/pages/triage/Triage'))
const TriageQueuePage     = lazy(() => import('@/pages/queue/TriageQueuePage'))
const AppointmentsPage    = lazy(() => import('@/pages/appointments/Appointments'))
const DMEPage             = lazy(() => import('@/pages/dme/DME'))
const SettingsPage        = lazy(() => import('@/pages/settings/Settings'))
const NotFoundPage        = lazy(() => import('@/pages/NotFound'))

const routes: RouteObject[] = [
  { path: '/login',    element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/otp',      element: <OTPPage /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          // Commun à tous les rôles authentifiés
          { path: '/',             element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard',    element: <DashboardPage /> }, // switch interne par rôle
          { path: '/appointments', element: <AppointmentsPage /> },
          { path: '/settings',     element: <SettingsPage /> },

          // Patient
          {
            element: <RoleGuard allowedRoles={['patient']} fallback="/dashboard" />,
            children: [
              { path: '/triage',         element: <TriagePage /> },
              { path: '/triage/history', element: <TriageHistoryPage /> },
              { path: '/dme',            element: <DMEPage /> },
            ],
          },

          // Soignants — file de triage
          {
            element: <RoleGuard allowedRoles={['medecin', 'infirmier', 'admin', 'super_admin']} fallback="/dashboard" />,
            children: [
              { path: '/queue', element: <TriageQueuePage /> },
            ],
          },

          // Admin
          {
            element: <RoleGuard allowedRoles={['admin', 'super_admin']} fallback="/dashboard" />,
            children: [
              { path: '/admin/kpis', element: <AdminDashboardPage /> },
              { path: '/admin/users', element: <AdminDashboardPage /> },
              { path: '/admin/audit', element: <AdminDashboardPage /> },
              { path: '/admin/stocks', element: <AdminDashboardPage /> },
            ],
          },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)
