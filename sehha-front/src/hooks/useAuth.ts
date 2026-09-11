import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { authApi } from '@/lib/auth'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/stores/authStore'

function redirectPathForRole(role: User['role']): string {
  if (role === 'patient') return '/triage'
  if (role === 'admin' || role === 'super_admin') return '/admin/users'
  return '/dashboard'
}

export function useAuth() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { login: storeLogin, logout: storeLogout, user } = useAuthStore()

  const redirectByRole = useCallback(
    (role: User['role']) => navigate(redirectPathForRole(role), { replace: true }),
    [navigate]
  )

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response, variables) => {
      const data = response.data

      // Soignant : OTP requis. Le backend renvoie maintenant l'email du compte
      // (indispensable si l'utilisateur s'est connecté par CIN).
      if (data.otp_required) {
        const email = data.email || variables.email
        if (email) sessionStorage.setItem('otp_email', email)
        navigate('/otp', { state: { requiresOTP: true, email } })
        return
      }

      // Patient : token direct
      if (data.user && data.token) {
        storeLogin(data.user, data.token)
        queryClient.setQueryData(['auth', 'me'], data.user)
        redirectByRole(data.user.role)
      }
    },
  })

  const verifyOTPMutation = useMutation({
    mutationFn: authApi.verifyOTP,
    onSuccess: (response) => {
      const data = response.data
      sessionStorage.removeItem('otp_email')
      storeLogin(data.user, data.token)
      queryClient.setQueryData(['auth', 'me'], data.user)
      redirectByRole(data.user.role)
    },
  })

  const resendOTPMutation = useMutation({
    mutationFn: (email: string) => authApi.requestOTP(email),
  })

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (response) => {
      navigate('/login', {
        state: { registered: true, userUuid: response.data.user_uuid },
      })
    },
  })

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      /* ignorer */
    }
    storeLogout()
    queryClient.clear()
    navigate('/login')
  }, [navigate, queryClient, storeLogout])

  return {
    user,
    isLoading: loginMutation.isPending || verifyOTPMutation.isPending,
    login: loginMutation.mutateAsync,
    verifyOTP: verifyOTPMutation.mutateAsync,
    resendOTP: resendOTPMutation.mutateAsync,
    isResendingOTP: resendOTPMutation.isPending,
    register: registerMutation.mutateAsync,
    logout,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    otpError: verifyOTPMutation.error,
  }
}
