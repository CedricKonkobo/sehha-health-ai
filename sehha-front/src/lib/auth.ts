import api from './axios'
import type { User } from '@/stores/authStore'

export interface LoginCredentials {
  email?: string
  cin?: string
  password: string
}

export interface RegisterData {
  name: string
  cin: string
  phone: string
  email?: string
  password: string
  password_confirmation: string
  // L'inscription publique crée toujours un patient (le backend ignore tout rôle).
}

/**
 * Le backend identifie l'utilisateur par email pour la vérification OTP
 * (OtpController::verifyOtp fait User::where('email', $request->email)).
 * Il n'y a pas de "temp_token" côté backend.
 */
export interface OTPData {
  email: string
  otp: string
}

/**
 * Réponse de POST /auth/login. Deux cas possibles selon le rôle :
 * - soignant (medecin/infirmier/admin/super_admin) -> { otp_required: true, otp_sent: true }
 * - patient -> { token, token_type, expires_in, user }
 */
export interface LoginResponse {
  otp_required?: boolean
  otp_sent?: boolean
  /** Présent quand otp_required : email du compte (pour enchaîner /otp même après login CIN). */
  email?: string
  token?: string
  token_type?: string
  expires_in?: number
  user?: User
}

/** Réponse de POST /auth/otp/verify : toujours un token direct + user */
export interface OtpVerifyResponse {
  token: string
  token_type: string
  expires_in: number
  user: User
}

export interface RegisterResponse {
  user_uuid: string
  otp_sent: boolean
}

export const authApi = {
  login: (credentials: LoginCredentials) =>
    api.post<LoginResponse>('/auth/login', credentials),

  verifyOTP: (data: OTPData) => api.post<OtpVerifyResponse>('/auth/otp/verify', data),

  requestOTP: (email: string) => api.post<{ otp_sent: boolean }>('/auth/otp/request', { email }),

  register: (data: RegisterData) => api.post<RegisterResponse>('/auth/register', data),

  refresh: () => api.post<{ token: string }>('/auth/refresh'),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<{ user: User }>('/auth/me'),
}
