import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface RoleGuardProps {
  allowedRoles: Array<'patient' | 'medecin' | 'infirmier' | 'admin' | 'super_admin'>
  fallback?: string
}

export function RoleGuard({ allowedRoles, fallback = '/dashboard' }: RoleGuardProps) {
  const { user, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Garde anti-boucle : si le fallback est la page courante, on affiche un
    // message plutôt que de rediriger indéfiniment.
    if (location.pathname === fallback) {
      return (
        <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-center">
          <p className="text-lg font-semibold text-gray-900">Accès refusé</p>
          <p className="text-sm text-gray-500">
            Votre rôle ({user?.role ?? 'inconnu'}) n'a pas accès à cette page.
          </p>
        </div>
      )
    }
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
