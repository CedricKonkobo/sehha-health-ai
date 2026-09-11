import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useEcho } from '@/providers/RealtimeProvider'

/**
 * Agenda d'un médecin en temps réel (nouveau RDV, annulation, changement de statut).
 * @param doctorUuid UUID public du médecin
 */
export function useAgendaRealtime(doctorUuid?: string) {
  const echo = useEcho()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!echo || !doctorUuid) return

    const channel = echo.private(`doctor.${doctorUuid}.agenda`)
    channel.listen('.appointment.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'agenda', doctorUuid] })
      queryClient.invalidateQueries({ queryKey: ['doctor', 'kpis'] })
    })

    return () => {
      echo.leave(`doctor.${doctorUuid}.agenda`)
    }
  }, [echo, doctorUuid, queryClient])
}
