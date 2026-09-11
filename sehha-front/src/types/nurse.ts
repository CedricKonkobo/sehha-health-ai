import type { VitalType } from './dme'

/** Payload d'une mesure de constante (POST /patients/{uuid}/vitals). */
export interface VitalInput {
  type: VitalType
  value: number
  value_2?: number
  unit: string
  source?: 'medical_device' | 'wearable' | 'self_reported'
  measured_at?: string
  note?: string
}

/** GET /nurse/capacity -> tableau (NurseController@capacity). */
export interface DepartmentCapacity {
  department: string
  service_id: number
  total_beds: number
  occupied_beds: number
  available_beds: number
  occupancy_rate: number
  updated_at: string | null
}

/** GET /nurse/stocks -> tableau (NurseController@stocks). */
export type StockStatus = 'ok' | 'faible' | 'alerte' | 'critique'

export interface StockItem {
  id: number
  name: string
  category?: string
  current_quantity: number
  min_threshold: number
  unit: string
  status: StockStatus
  clinic?: string | null
  last_updated?: string | null
}

/** GET /nurse/dashboard/kpis -> { kpis: NurseKPI }. */
export interface NurseKPI {
  vitals_recorded_today: number
  patients_admitted_today: number
  patients_discharged_today: number
  low_stock_alerts: number
  bed_occupancy_rate: number
}
