// src/lib/dmeApi.ts
import api from './axios'
import type { DME, StoreVitalPayload, StoreAllergyPayload, Consultation, VitalSign } from '@/types/dme'

export const dmeApi = {
  // ── Patient : ses propres données (/me/) ─────────────────────────────────
  // Ces routes sont STATIQUES et déclarées avant les wildcards /patients/{uuid}/
  // dans api.php pour éviter que Laravel ne matche "me" comme UUID.

  getMyDme:            () => api.get<DME>('/patients/me/dme'),
  getMyConsultations:  () => api.get<Consultation[]>('/patients/me/consultations'),
  getMyVitals:         () => api.get<VitalSign[]>('/patients/me/vitals'),
  getMyDocuments:      () => api.get<any[]>('/patients/me/documents'),

  // ── Médecin : données d'un patient tiers (/patients/{uuid}/) ─────────────

  getDME:           (uuid: string) => api.get<DME>(`/patients/${uuid}/dme`),
  getConsultations: (uuid: string) => api.get<Consultation[]>(`/patients/${uuid}/consultations`),
  getVitals:        (uuid: string) => api.get<VitalSign[]>(`/patients/${uuid}/vitals`),
  getAllergies:      (uuid: string) => api.get(`/patients/${uuid}/allergies`),
  getPrescriptions: (uuid: string) => api.get(`/patients/${uuid}/prescriptions`),

  // ── Écriture (médecin uniquement) ─────────────────────────────────────────

  storeVital:   (uuid: string, data: StoreVitalPayload) =>
    api.post(`/patients/${uuid}/vitals`, data),

  storeAllergy: (uuid: string, data: StoreAllergyPayload) =>
    api.post(`/patients/${uuid}/allergies`, data),

  dictateReport: (uuid: string, audio: string, consultationUuid?: string) =>
    api.post<{ transcript: string; report_text: string }>(
      `/patients/${uuid}/consultations/dictate`,
      { audio, language: 'fr', ...(consultationUuid ? { consultation_uuid: consultationUuid } : {}) }
    ),

  // ── PDF ordonnances ───────────────────────────────────────────────────────

  getPrescriptionPDF: (uuid: string) =>
    api.get(`/prescriptions/${uuid}/pdf`, { responseType: 'blob' }),

  /**
   * Vérifie une ordonnance. Accepte :
   *  - l'URL complète encodée dans le QR (…/prescriptions/verify?uuid=..&hash=..)
   *  - le format "uuid|hash"
   *  - un objet { uuid, hash }
   */
  verifyPrescriptionQR: (input: string | { uuid: string; hash: string }) => {
    let body: { uuid?: string; hash?: string; qr_data?: string }
    if (typeof input !== 'string') {
      body = input
    } else if (input.includes('?')) {
      body = { qr_data: input }
    } else if (input.includes('|')) {
      const [uuid, hash] = input.split('|')
      body = { uuid, hash }
    } else {
      body = { qr_data: input }
    }
    return api.post<{ valid: boolean; message: string; verified_at: string }>('/prescriptions/verify', body)
  },
}
