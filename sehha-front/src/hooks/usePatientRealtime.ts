import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useEcho } from '@/providers/RealtimeProvider'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'

/**
 * Canal privé du patient : mises à jour de ses rendez-vous / triage.
 */
export function usePatientRealtime() {
  const echo = useEcho()
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!echo || !user?.uuid || user.role !== 'patient') return

    const channel = echo.private(`patient.${user.uuid}`)
    channel.listen('.appointment.updated', (e: { status?: string; doctor_name?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      const label =
        e?.status === 'confirmed'
          ? `Rendez-vous confirmé${e.doctor_name ? ` avec ${e.doctor_name}` : ''}`
          : e?.status === 'cancelled'
          ? 'Un rendez-vous a été annulé'
          : 'Statut de rendez-vous mis à jour'
      addToast(label, e?.status === 'cancelled' ? 'warning' : 'success')
    })

    return () => {
      echo.leave(`patient.${user.uuid}`)
    }
  }, [echo, user?.uuid, user?.role, queryClient, addToast])
}
