import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Stethoscope,
  CalendarDays,
  FileText,
  Users,
  Settings,
  LogOut,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  roles: string[]
}

const navItems: NavItem[] = [
  { label: 'Tableau de bord', icon: LayoutDashboard, href: '/dashboard', roles: ['medecin', 'infirmier', 'admin', 'super_admin'] },
  { label: 'Triage IA', icon: Stethoscope, href: '/triage', roles: ['patient'] },
  { label: 'File d\'attente', icon: ClipboardList, href: '/queue', roles: ['medecin', 'infirmier'] },
  { label: 'Rendez-vous', icon: CalendarDays, href: '/appointments', roles: ['patient', 'medecin'] },
  { label: 'Mon DME', icon: FileText, href: '/dme', roles: ['patient'] },
  { label: 'Utilisateurs', icon: Users, href: '/admin/users', roles: ['admin', 'super_admin'] },
  { label: 'Journal d\'audit', icon: ClipboardList, href: '/admin/audit', roles: ['admin', 'super_admin'] },
  { label: 'Paramètres', icon: Settings, href: '/settings', roles: ['patient', 'medecin', 'infirmier', 'admin', 'super_admin'] },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  const userRole = user?.role || 'patient'
  const filteredNav = navItems.filter((item) => item.roles.includes(userRole))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 bg-white border-r border-gray-200 lg:translate-x-0 lg:static lg:h-[calc(100vh-4rem)]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        initial={false}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center px-6 lg:hidden">
            <span className="text-xl font-bold text-primary">SEHHA</span>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Navigation principale">
            {filteredNav.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href)
                    setSidebarOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-gray-400')} />
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="border-t border-gray-200 p-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  )
}