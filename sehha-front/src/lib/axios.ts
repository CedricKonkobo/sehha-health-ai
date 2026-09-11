import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/stores/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000,
})

// ============ REQUEST INTERCEPTOR ============
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      // Optionnel : si vous voulez supprimer l'Authorization si pas de token
      delete config.headers.Authorization
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ============ RESPONSE INTERCEPTOR ============
api.interceptors.response.use(
  (response) => {
    // Ne pas normaliser les réponses blob (ex: téléchargement de PDF)
    if (response.config.responseType === 'blob') {
      return response
    }

    const data = response.data

    // Si la réponse est au format standard { success, data, message, meta }
    if (
      data &&
      typeof data === 'object' &&
      'success' in data &&
      'data' in data &&
      data.data !== null &&
      typeof data.data === 'object'
    ) {
      // Si success est false, on rejette avec le message du backend
      if (data.success === false) {
        const error = new Error(data.message || 'Erreur inconnue')
        // On peut attacher les détails pour le debug
        ;(error as any).originalResponse = data
        return Promise.reject(error)
      }

      // Sinon, on extrait data.data
      response.data = data.data
    }

    return response
  },
  (error: AxiosError) => {
    // L'enveloppe backend met le message dans error.error.message.
    // Laravel (422 par défaut) le met dans data.message.
    const backendData = error.response?.data as any
    const status = error.response?.status
    let message: string =
      backendData?.error?.message ||
      backendData?.message ||
      (typeof backendData === 'string' ? backendData : '') ||
      error.message

    const code: string | undefined = backendData?.error?.code

    const customError = new Error(message)
    Object.assign(customError, {
      status,
      code,
      originalError: error,
      data: backendData,
      details: backendData?.error?.details || backendData?.errors,
    })

    // Session invalide / expirée -> nettoyer et rediriger (sans boucle).
    if (status === 401 && (code === 'UNAUTHENTICATED' || code === 'OTP_REQUIRED')) {
      try {
        useAuthStore.getState().logout()
      } catch {
        /* noop */
      }
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login?session=expired')
      }
    }

    return Promise.reject(customError)
  }
)

export default api