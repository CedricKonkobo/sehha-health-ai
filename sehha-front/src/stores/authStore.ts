import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Aligné sur AuthController::userResponse() :
 * { uuid, name, email, role, is_active, last_login_at }
 * Le backend utilise un seul champ "name" (pas first_name/last_name),
 * et les rôles réels sont en français.
 */
export interface User {
  uuid: string
  name: string
  email: string | null
  role: 'patient' | 'infirmier' | 'medecin' | 'admin' | 'super_admin'
  is_active?: boolean
  last_login_at?: string | null
  cin?: string
  phone?: string
  avatar_url?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean

  setUser: (user: User | null) => void
  login: (user: User, accessToken: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      login: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true, isLoading: false }),
      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'sehha-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // isAuthenticated est dérivé de la présence token+user (source de
          // vérité), pas seulement de la valeur persistée -> survit à F5.
          state.isAuthenticated = !!(state.user && state.accessToken)
          state.setLoading(false)
        }
      },
    }
  )
)
