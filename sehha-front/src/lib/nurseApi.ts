import api from './axios'
import type { VitalInput, DepartmentCapacity, StockItem, NurseKPI } from '@/types/nurse'

export const nurseApi = {
  /** POST /patients/{uuid}/vitals — une mesure de constante (type unique). */
  recordVital: (patientUuid: string, data: VitalInput) =>
    api.post<{ vital_id: number; is_abnormal: boolean }>(`/patients/${patientUuid}/vitals`, data),

  /** GET /nurse/capacity — tableau nu. */
  getCapacity: () => api.get<DepartmentCapacity[]>('/nurse/capacity'),

  /** PUT /nurse/capacity — { service_id, beds_occupied }. */
  updateCapacity: (serviceId: number, bedsOccupied: number) =>
    api.put<{ service_id: number; beds_occupied: number; beds_available: number }>('/nurse/capacity', {
      service_id: serviceId,
      beds_occupied: bedsOccupied,
    }),

  /** GET /nurse/stocks — tableau nu (stocks bas/alerte/critique). */
  getStocks: () => api.get<StockItem[]>('/nurse/stocks'),

  /** PUT /nurse/stocks/{id} — { quantity } (valeur absolue). */
  updateStock: (id: number, quantity: number) =>
    api.put<{ item_id: number; quantity: number; status: string }>(`/nurse/stocks/${id}`, { quantity }),

  /** GET /nurse/dashboard/kpis — { kpis }. */
  getKPIs: () => api.get<{ kpis: NurseKPI }>('/nurse/dashboard/kpis'),
}
