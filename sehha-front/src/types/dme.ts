// src/types/dme.ts — aligné sur la spec DME v1.0 (dme.pdf) + backend DmeController

export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'anaphylactic'
export type VitalType =
  | 'tension_sys'
  | 'tension_dia'
  | 'heart_rate'
  | 'spo2'
  | 'temperature'
  | 'glycemia'
  | 'weight'
  | 'respiratory_rate'

export type DocumentType =
  | 'ordonnance'
  | 'biologie'
  | 'imagerie'
  | 'compte_rendu'
  | 'ecg'
  | 'certificat'
  | 'bilan_triage'

export type DocumentStatus = 'valide' | 'expire' | 'archive' | 'annule'

export type TriagePriority = 'P1' | 'P2' | 'P3' | 'P4'

// ── Onglet 1 ────────────────────────────────────────────────────────────────

export interface PatientIdentity {
  uuid: string
  name: string
  cin?: string
  birth_date?: string
  age?: number | null
  gender?: string
  phone?: string
  coverage_type?: string
  blood_group?: string
  referring_doctor?: string | null
}

export interface PatientRecord {
  blood_group: string | null
  height_cm: number | null
  coverage_type: string | null
  referring_doctor?: string | null
  weight_kg?: number | null
}

// ── Onglet 2 ─────────────────────────────────────────────────────────────────

export interface Consultation {
  uuid: string
  doctor: string
  service?: string | null
  motif: string
  symptoms_notes?: string | null
  diagnosis: string
  icd10_code?: string | null
  treatment?: string | null
  report_text?: string | null
  exams_requested?: string[] | null
  vitals_at_visit?: Record<string, unknown> | null
  follow_up_required: boolean
  follow_up_date?: string | null
  consultation_date: string
}

// ── Onglet 3 ─────────────────────────────────────────────────────────────────

export interface MedicalDocument {
  uuid: string
  type: DocumentType
  title: string
  issued_at: string
  expires_at?: string | null
  status: DocumentStatus
  pdf_url?: string
  qr_hash?: string
  structured_data?: Record<string, unknown>
  visible_patient: boolean
}

export interface Prescription extends MedicalDocument {
  type: 'ordonnance'
  medicaments: { nom: string; posologie: string; duree: string }[]
}

// ── Onglet 4 ─────────────────────────────────────────────────────────────────

export interface VitalSign {
  id?: number
  type: VitalType
  value: number
  value_2?: number | null
  unit: string
  measured_at: string
  source?: string
  is_abnormal: boolean
  alert_sent?: boolean
  note?: string | null
  consultation_id?: string | null
}

// ── Onglet 5 ─────────────────────────────────────────────────────────────────

export interface TriageEvent {
  uuid: string
  triage_date: string
  ia_score: TriagePriority
  ccmu_score?: number | null
  orientation: string
  red_flags: string[]
  human_validated: boolean
  final_outcome?: string | null
}

// ── Allergies & Antécédents ──────────────────────────────────────────────────

export interface Allergy {
  id: number
  substance: string
  severity: AllergySeverity
  reaction_description?: string | null
  discovered_at: string
  documented_by?: string
  created_at: string
}

export interface MedicalHistory {
  id: number
  type: string
  description: string
  started_at: string
  resolved_at?: string | null
  created_at: string
}

// ── DME complet (réponse GET /patients/{uuid}/dme) ──────────────────────────

export interface DME {
  patient: PatientIdentity
  record: PatientRecord
  allergies: Allergy[]
  medical_history: MedicalHistory[]
  vitals_latest: VitalSign[]
  triages?: TriageEvent[]
  stats?: {
    total_consultations: number
    last_visit: string | null
  }
}

// ── Payloads écriture ────────────────────────────────────────────────────────

export interface StoreVitalPayload {
  type: VitalType
  value: number
  value_2?: number
  unit: string
  measured_at?: string
  source?: string
  note?: string
  consultation_uuid?: string
}

export interface StoreAllergyPayload {
  substance: string
  severity: AllergySeverity
  reaction_description?: string
  discovered_at?: string
}

export const VITAL_META: Record<VitalType, { label: string; unit: string; min?: number; max?: number; alertHigh?: number; alertLow?: number }> = {
  tension_sys:       { label: 'Systolique',    unit: 'mmHg', min: 90,   max: 140,  alertHigh: 160, alertLow: 80  },
  tension_dia:       { label: 'Diastolique',   unit: 'mmHg', min: 60,   max: 89,   alertHigh: 100, alertLow: 50  },
  heart_rate:        { label: 'Fréq. cardiaque', unit: 'bpm', min: 60,  max: 100,  alertHigh: 120, alertLow: 40  },
  spo2:              { label: 'SpO₂',           unit: '%',    min: 95,   max: 100,  alertLow: 90   },
  temperature:       { label: 'Température',    unit: '°C',   min: 36.1, max: 37.2, alertHigh: 38.5, alertLow: 35 },
  glycemia:          { label: 'Glycémie à jeun', unit: 'g/L', min: 0.70, max: 1.10, alertHigh: 2.0, alertLow: 0.6 },
  weight:            { label: 'Poids',           unit: 'kg'  },
  respiratory_rate:  { label: 'Fréq. respiratoire', unit: '/min', min: 12, max: 20, alertHigh: 25, alertLow: 10 },
}
