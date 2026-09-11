import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { adminApi } from '@/lib/adminApi'
import { useAuthStore } from '@/stores/authStore'

export function useAdminAudit() {
  const [filters, setFilters] = useState({ action: '', resource_type: '', date_from: '', date_to: '' })
  const accessToken = useAuthStore((state) => state.accessToken)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', filters],
    queryFn: async () => {
      const { data } = await adminApi.getAuditLogs({
        per_page: 50,
        ...(filters.action && { action: filters.action }),
        ...(filters.resource_type && { resource_type: filters.resource_type }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
      })
      return data
    },
    enabled: !!accessToken,
  })

  return {
    logs: data?.logs || [],
    total: data?.pagination?.total || 0,
    isLoading,
    filters,
    setFilters,
  }
}
