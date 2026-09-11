// src/types/doctor.ts
import type { TriagePriority, TriageOrientation, RecommendedDelay } from './triage'

export interface DashboardKPI {
  patients_waiting: number
  consultations_today: number
  avg_wait_time_minutes: number
  prescriptions_today: number
  triage_by_priority: Record<TriagePriority, number>
}

export interface UpcomingAppointment {
  uuid: string
  patient_name: string
  starts_at: string
  motif: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
}

export interface QueueItem {
  uuid: string
  patient_uuid: string
  patient_name: string
  ia_score: TriagePriority | string
  ccmu_score: number | null
  ia_confidence: number | string
  orientation: TriageOrientation
  recommended_delay: RecommendedDelay
  symptoms: {
    chief_complaint?: string
    severity_eva?: number
    [key: string]: unknown
  }
  red_flags: string[]
  human_validated: boolean
  validated_by: string | null
  triage_date: string
  created_at: string
}

export interface ValidateTriagePayload {
  ia_score: TriagePriority
  orientation: 'urgences' | 'specialiste' | 'medecin_gen' | 'teleconsult'
  comment?: string
}

/**
 * Payload POST /patients/{uuid}/consultations
 * report_text ajouté (compte-rendu dicté, stocké en BDD)
 */
export interface ConsultationFormData {
  motif: string
  symptoms_notes?: string
  diagnosis: string
  icd10_code?: string
  treatment?: string
  exams_requested?: string[]
  vitals_at_visit?: Record<string, unknown>
  report_text?: string
  follow_up_required?: boolean
  follow_up_date?: string
  consultation_date?: string
}

export interface ConsultationCreateResponse {
  consultation_uuid: string
  allergy_alert: {
    severity: string
    substance: string
    message: string
  } | null
}

export interface PrescriptionMedication {
  nom: string
  posologie: string
  duree: string
}

export interface PrescriptionFormData {
  patient_uuid: string
  medicaments: PrescriptionMedication[]
  notes?: string
}

export interface PrescriptionCreateResponse {
  document_uuid: string
  qr_hash: string
  pdf_url: string
  expires_at: string | null
}

export interface AgendaAppointment {
  uuid: string
  patient_uuid: string
  patient_name: string
  starts_at: string
  ends_at: string | null
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  motif: string | null
}

export interface DailyAgenda {
  date: string
  available_slots: { start: string; end: string }[]
  appointments: AgendaAppointment[]
}
