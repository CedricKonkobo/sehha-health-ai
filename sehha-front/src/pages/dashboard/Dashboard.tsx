// src/pages/dashboard/Dashboard.tsx
// Aiguillage pur par rôle — chaque vue possède ses propres hooks.
import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const DoctorDashboard = lazy(() => import('./DoctorDashboard'))
const NurseDashboard = lazy(() =>
  import('@/components/nurse/NurseDashboard').then((m) => ({ default: m.NurseDashboard }))
)

export default function DashboardPage() {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><LoadingSpinner size="lg" /></div>
  }

  switch (user?.role) {
    case 'patient':
      return <Navigate to="/triage" replace />
    case 'infirmier':
      return <NurseDashboard />
    case 'admin':
    case 'super_admin':
      return <Navigate to="/admin/users" replace />
    case 'medecin':
      return <DoctorDashboard />
    default:
      return <Navigate to="/login" replace />
  }
}
