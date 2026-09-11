export type UserRole = 'patient' | 'infirmier' | 'medecin' | 'admin' | 'super_admin'

/** GET /admin/users -> { users, pagination } (AdminController@users). */
export interface AdminUser {
  uuid: string
  name: string
  email: string | null
  role: UserRole
  is_active: boolean
  last_login_at?: string | null
  created_at: string
}

/** GET /admin/audit-logs -> { logs, pagination } (AdminController@auditLogs). */
export interface AuditLog {
  id: number
  user: string
  action: string
  resource_type: string
  resource_id: number | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  timestamp: string | null
}

/** GET /admin/stats/kpis -> AdminRepository::getKpis (clés françaises). */
export interface AdminKPI {
  period: string
  taux_occupation_lits: { percentage: number; total_beds: number; occupied_beds: number }
  temps_attente_moyen_minutes: number
  taux_reorientation: { percentage: number; total: number; reoriented: number }
  rdv_stats: {
    confirmed: number
    completed: number
    cancelled: number
    no_show: number
    pending: number
  }
  cas_p1_aujourdhui: number
  flux_patients: { triages: number; consultations: number; ordonnances: number }
}

/** GET /admin/inventory -> { total_items, by_status, items } (AdminRepository::getInventoryStatus). */
export interface StockAdmin {
  id: number
  product_name: string
  quantity: number
  unit: string
  alert_threshold: number
  status: 'ok' | 'faible' | 'alerte' | 'critique'
  clinic?: string | null
  last_updated?: string | null
  last_updated_by?: string | null
}

export interface InventoryStatus {
  total_items: number
  by_status: { ok: number; faible: number; alerte: number; critique: number }
  items: StockAdmin[]
}

export interface Pagination {
  current_page: number
  total: number
  per_page: number
}
