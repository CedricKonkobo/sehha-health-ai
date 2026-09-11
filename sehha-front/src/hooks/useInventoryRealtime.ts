import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useEcho } from '@/providers/RealtimeProvider'
import { useToastStore } from '@/stores/toastStore'

/**
 * Alertes stock + capacité lits en temps réel (infirmier / admin).
 */
export function useInventoryRealtime() {
  const echo = useEcho()
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    if (!echo) return

    const stock = echo.private('inventory.alerts')
    stock.listen('.inventory.alert', (e: { product_name?: string; status?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'stocks'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stocks'] })
      queryClient.invalidateQueries({ queryKey: ['nurse', 'kpis'] })
      if (e?.product_name) {
        addToast(
          `Stock ${e.status ?? 'bas'} : ${e.product_name}`,
          e?.status === 'critique' ? 'error' : 'warning',
          8000
        )
      }
    })

    const beds = echo.private('beds.capacity')
    beds.listen('.beds.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['nurse', 'capacity'] })
      queryClient.invalidateQueries({ queryKey: ['nurse', 'kpis'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'kpis'] })
    })

    return () => {
      echo.leave('inventory.alerts')
      echo.leave('beds.capacity')
    }
  }, [echo, queryClient, addToast])
}
