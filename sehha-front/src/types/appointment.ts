// src/types/appointment.ts

/**
 * Un médecin tel que renvoyé par GET /appointments/doctors
 * (AppointmentController::doctors)
 */
export interface Doctor {
  uuid: string
  first_name: string
  last_name: string
  full_name: string
  specialty: string
  grade: string
  service: string | null
  clinic: string | null
  rating: number
  avatar_url: string | null
  /**
   * schedule_json brut du DoctorProfile : objet indexé par jour de semaine
   * (0 = dimanche ... 6 = samedi), PAS un tableau.
   * Exemple : { "1": { is_working: true, start: "08:00", end: "16:00", break_start: "12:00", break_end: "13:00" } }
   */
  schedule: Record<string, DoctorDaySchedule> | null
}

export interface DoctorDaySchedule {
  is_working: boolean
  start?: string // "08:00"
  end?: string // "16:00"
  break_start?: string | null
  break_end?: string | null
}

/**
 * Un créneau tel que renvoyé par AppointmentSlotService::getAvailableSlots()
 * via GET /appointments/slots. Pas de "id", pas de "is_available" (les créneaux
 * renvoyés sont déjà filtrés comme disponibles), pas de "is_ai_recommended".
 */
export interface TimeSlot {
  start: string // "2026-06-25 09:00:00" (toDateTimeLocalString)
  end: string
}

/** Réponse de GET /appointments/slots pour UNE SEULE date */
export interface SlotsResponse {
  doctor_uuid: string
  doctor_name: string
  date: string
  slots: TimeSlot[]
}

/** Réponse de GET /appointments/slots/ia-suggest */
export interface IaSuggestResponse {
  suggested_slot: TimeSlot
  alternative_slots: TimeSlot[]
  ia_suggested: boolean
  reason: string
}

/** Rendez-vous tel que renvoyé par AppointmentController::appointmentResponse() */
export interface Appointment {
  uuid: string
  starts_at: string
  ends_at: string
  patient: {
    uuid: string
    name: string
  }
  doctor: {
    uuid: string
    name: string
  }
  service?: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  motif?: string
  triage_score?: string
  ia_suggested?: boolean
  queue_number?: number | null
  created_at: string
}

/**
 * Payload envoyé à POST /appointments (StoreAppointmentRequest) :
 * - doctor_uuid : requis
 * - starts_at : requis, doit être une date future ISO ("2026-06-25T09:00:00")
 * - motif : requis (le backend n'accepte pas un motif vide)
 * - triage_uuid / service_id : optionnels
 */
export interface AppointmentCreateData {
  doctor_uuid: string
  starts_at: string
  motif: string
  triage_uuid?: string
  service_id?: number
  ia_suggested?: boolean
}
