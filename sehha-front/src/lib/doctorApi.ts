import api from './axios'
import type {
  DashboardKPI,
  UpcomingAppointment,
  QueueItem,
  ValidateTriagePayload,
  ConsultationFormData,
  ConsultationCreateResponse,
  PrescriptionFormData,
  PrescriptionCreateResponse,
  DailyAgenda,
} from '@/types/doctor'

export const doctorApi = {
  getKPIs: () =>
    api.get<{ kpis: DashboardKPI; next_appointments: UpcomingAppointment[] }>(
      '/doctor/dashboard/kpis'
    ),

  /**
   * GET /triage/queue renvoie directement un tableau dans "data"
   * (pas { queue: [...] }).
   */
  getQueue: () => api.get<QueueItem[]>('/triage/queue'),

  /**
   * Il n'existe pas de route pour "changer le statut" d'un item de file
   * d'attente. La seule action soignant disponible est la validation du
   * triage (confirmer/corriger le score IA + orientation).
   */
  validateTriage: (uuid: string, payload: ValidateTriagePayload) =>
    api.put<{ uuid: string }>(`/triage/${uuid}/validate`, payload),

  // Pour le DME complet d'un patient (allergies, antécédents...), réutiliser
  // dmeApi.getDME(patientUuid) de @/lib/dmeApi -- même route, déjà typée.

  createConsultation: (patientUuid: string, data: ConsultationFormData) =>
    api.post<ConsultationCreateResponse>(`/patients/${patientUuid}/consultations`, data),

  createPrescription: (data: PrescriptionFormData) =>
    api.post<PrescriptionCreateResponse>('/prescriptions', data),

  /**
   * Vue journalière de l'agenda (AgendaController::show avec ?date=).
   * Sans "date", le backend renvoie un résumé hebdomadaire sans détail
   * patient -- on utilise donc systématiquement la vue par jour.
   */
  getDailyAgenda: (doctorUuid: string, date: string) =>
    api.get<DailyAgenda>(`/doctor/${doctorUuid}/agenda`, { params: { date } }),

  /**
   * Confirmer/refuser un rendez-vous depuis l'agenda : il n'existe pas de
   * route dédiée "agenda/{eventId}" -- on réutilise PUT /appointments/{uuid}
   * (AppointmentController::update), qui accepte déjà un champ "status".
   */
  updateAppointmentStatus: (
    appointmentUuid: string,
    status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  ) => api.put<{ uuid: string }>(`/appointments/${appointmentUuid}`, { status }),
}
