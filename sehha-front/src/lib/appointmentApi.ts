import api from './axios'
import type {
  Doctor,
  SlotsResponse,
  IaSuggestResponse,
  Appointment,
  AppointmentCreateData,
} from '@/types/appointment'

export const appointmentApi = {
  getDoctors: (params?: { speciality?: string; service_id?: number }) =>
    api.get<Doctor[]>('/appointments/doctors', { params }),

  /**
   * Le backend (AppointmentController::slots) ne prend qu'UNE date à la fois,
   * pas une plage start_date/end_date.
   */
  getSlots: (doctorUuid: string, date: string) =>
    api.get<SlotsResponse>('/appointments/slots', {
      params: { doctor_uuid: doctorUuid, date },
    }),

  /** Suggestion IA du meilleur créneau, basée éventuellement sur un triage existant */
  iaSuggest: (doctorUuid: string, preferredDate: string, triageUuid?: string) =>
    api.get<IaSuggestResponse>('/appointments/slots/ia-suggest', {
      params: {
        doctor_uuid: doctorUuid,
        preferred_date: preferredDate,
        triage_uuid: triageUuid,
      },
    }),

  create: (data: AppointmentCreateData) => api.post<Appointment>('/appointments', data),

  getMyAppointments: () => api.get<Appointment[]>('/appointments'),

  getAppointment: (uuid: string) => api.get<Appointment>(`/appointments/${uuid}`),

  update: (
    uuid: string,
    data: Partial<{ status: Appointment['status']; starts_at: string; motif: string }>
  ) => api.put<Appointment>(`/appointments/${uuid}`, data),

  /** Annulation = DELETE, qui passe le statut à "cancelled" côté backend */
  cancel: (uuid: string) => api.delete<null>(`/appointments/${uuid}`),
}
