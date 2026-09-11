import { Menu, Moon, Sun, Bell, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'


export function Navbar() {
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUIStore()
  const { user } = useAuthStore()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold text-primary hidden sm:inline-block">SEHHA</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
          </Button>

          <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900">
                {user ? user.name : 'Invité'}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role || 'Patient'}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}