import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { adminApi } from '@/lib/adminApi'
import { useAuthStore } from '@/stores/authStore'

export function useAdminKPIs() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week')
  const accessToken = useAuthStore((state) => state.accessToken)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'kpis', period],
    queryFn: async () => (await adminApi.getKPIs(period)).data,
    refetchInterval: 60000,
    enabled: !!accessToken,
  })

  return { kpis: data, isLoading, period, setPeriod }
}
