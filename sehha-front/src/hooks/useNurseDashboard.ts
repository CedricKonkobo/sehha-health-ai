import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nurseApi } from '@/lib/nurseApi'
import { useToastStore } from '@/stores/toastStore'
import { useAuthStore } from '@/stores/authStore'

export function useNurseDashboard() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const accessToken = useAuthStore((state) => state.accessToken)

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['nurse', 'kpis'],
    queryFn: async () => (await nurseApi.getKPIs()).data.kpis,
    enabled: !!accessToken,
    refetchInterval: 30000,
  })

  const { data: departments, isLoading: deptLoading } = useQuery({
    queryKey: ['nurse', 'capacity'],
    queryFn: async () => (await nurseApi.getCapacity()).data,
    enabled: !!accessToken,
    refetchInterval: 15000,
  })

  const { data: stocks, isLoading: stocksLoading } = useQuery({
    queryKey: ['nurse', 'stocks'],
    queryFn: async () => (await nurseApi.getStocks()).data,
    enabled: !!accessToken,
    refetchInterval: 60000,
  })

  const updateCapacity = useMutation({
    mutationFn: ({ serviceId, bedsOccupied }: { serviceId: number; bedsOccupied: number }) =>
      nurseApi.updateCapacity(serviceId, bedsOccupied),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'capacity'] })
      queryClient.invalidateQueries({ queryKey: ['nurse', 'kpis'] })
      addToast('Capacité mise à jour', 'success')
    },
    onError: (e: Error) => addToast(e.message || 'Erreur mise à jour capacité', 'error'),
  })

  const updateStock = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) => nurseApi.updateStock(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'stocks'] })
      queryClient.invalidateQueries({ queryKey: ['nurse', 'kpis'] })
      addToast('Stock mis à jour', 'success')
    },
    onError: (e: Error) => addToast(e.message || 'Erreur mise à jour stock', 'error'),
  })

  const list = departments || []
  const stockList = stocks || []

  return {
    kpis,
    departments: list,
    stocks: stockList,
    criticalStocks: stockList.filter((s) => s.status === 'critique' || s.status === 'alerte'),
    isLoading: kpisLoading || deptLoading || stocksLoading,
    updateCapacity: updateCapacity.mutate,
    updateStock: updateStock.mutate,
    isUpdating: updateCapacity.isPending || updateStock.isPending,
  }
}
