import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/adminApi'
import { useToastStore } from '@/stores/toastStore'
import { useAuthStore } from '@/stores/authStore'

export function useAdminStocks() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const accessToken = useAuthStore((state) => state.accessToken)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stocks'],
    queryFn: async () => (await adminApi.getInventory()).data,
    enabled: !!accessToken,
    refetchInterval: 30000,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'stocks'] })

  const restockMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) => adminApi.restock(id, quantity),
    onSuccess: () => {
      invalidate()
      addToast('Stock réapprovisionné', 'success')
    },
    onError: (e: Error) => addToast(e.message || 'Erreur réapprovisionnement', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, quantity, alert_threshold }: { id: number; quantity: number; alert_threshold: number }) =>
      adminApi.updateStock(id, { quantity, alert_threshold }),
    onSuccess: () => {
      invalidate()
      addToast('Stock mis à jour', 'success')
    },
    onError: (e: Error) => addToast(e.message || 'Erreur mise à jour', 'error'),
  })

  return {
    stocks: data?.items || [],
    byStatus: data?.by_status,
    isLoading,
    restock: restockMutation.mutate,
    updateStock: updateMutation.mutate,
    isMutating: restockMutation.isPending || updateMutation.isPending,
  }
}
