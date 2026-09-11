// src/lib/patientApi.ts
import api from './axios'

export interface UpdateProfilePayload {
  phone?: string
  email?: string
  current_password?: string
  new_password?: string
  new_password_confirmation?: string
}

export interface OcrScanResult {
  text: string
  confidence?: number
  document_type?: string
  structured?: Record<string, unknown>
}

export const patientApi = {
  // PUT /patients/me/profile — coordonnées modifiables (téléphone, email, mdp)
  updateProfile: (data: UpdateProfilePayload) =>
    api.put<{ message: string }>('/patients/me/profile', data),

  // POST /ocr/scan — envoie une image base64, le backend OCR + LLM et sauvegarde en BDD
  // Backend attend: { image: string (base64), title?: string, patient_uuid?: string }
  scanDocument: (imageBase64: string, title?: string) =>
    api.post<OcrScanResult>('/ocr/scan', {
      image: imageBase64,
      ...(title ? { title } : {}),
    }),

  // POST /speech-to-text — transcription audio base64
  transcribeAudio: (audioBase64: string, language: string = 'fr') =>
    api.post<{ text: string }>('/speech-to-text', {
      audio: audioBase64,
      language,
    }),
}
