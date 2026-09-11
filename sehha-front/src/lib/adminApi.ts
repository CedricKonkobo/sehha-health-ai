import api from './axios'
import type { AdminUser, AuditLog, AdminKPI, InventoryStatus, Pagination } from '@/types/admin'

export const adminApi = {
  // ---- Utilisateurs ----
  getUsers: (params?: { role?: string; search?: string }) =>
    api.get<{ users: AdminUser[]; pagination: Pagination }>('/admin/users', { params }),

  createUser: (data: {
    name: string
    email: string
    phone: string
    cin: string
    password: string
    role: 'infirmier' | 'medecin' | 'admin'
    speciality?: string
  }) => api.post<{ user_uuid: string; role: string }>('/admin/users', data),

  updateUser: (uuid: string, data: Partial<{ name: string; email: string; phone: string; speciality: string }>) =>
    api.put<{ uuid: string; name: string; email: string; role: string }>(`/admin/users/${uuid}`, data),

  updateUserRole: (uuid: string, role: string) =>
    api.put<{ user_uuid: string; new_role: string }>(`/admin/users/${uuid}/role`, { role }),

  toggleUserStatus: (uuid: string, isActive: boolean) =>
    api.put<{ uuid: string; is_active: boolean }>(`/admin/users/${uuid}/status`, { is_active: isActive }),

  deleteUser: (uuid: string) => api.delete<null>(`/admin/users/${uuid}`),

  // ---- Journal d'audit ----
  getAuditLogs: (params?: {
    action?: string
    user_id?: string | number
    resource_type?: string
    date_from?: string
    date_to?: string
    per_page?: number
  }) => api.get<{ logs: AuditLog[]; pagination: Pagination }>('/admin/audit-logs', { params }),

  // ---- KPIs ----
  getKPIs: (period?: 'today' | 'week' | 'month') =>
    api.get<AdminKPI>('/admin/stats/kpis', { params: period ? { period } : undefined }),

  // ---- Stocks ----
  getInventory: () => api.get<InventoryStatus>('/admin/inventory'),

  updateStock: (id: number, data: { quantity: number; alert_threshold: number }) =>
    api.put<{ item_id: number; new_status: string; quantity: number }>(`/admin/inventory/${id}`, data),

  restock: (id: number, quantity: number) =>
    api.post<{ item_id: number; quantity: number; status: string }>(`/admin/inventory/${id}/restock`, { quantity }),
}
