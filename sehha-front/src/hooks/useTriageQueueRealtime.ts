import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useEcho } from '@/providers/RealtimeProvider'
import { useToastStore } from '@/stores/toastStore'

/**
 * File de triage temps réel (soignants).
 * - triage.queue / triage.queue.updated -> rafraîchit la file + les KPIs
 * - triage.p1.alert / triage.alert       -> toast + son pour un cas P1/P2 entrant
 */
export function useTriageQueueRealtime() {
  const echo = useEcho()
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    if (!echo) return

    const playAlert = () => {
      try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.2)
        gain.gain.setValueAtTime(0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.5)
      } catch {
        /* noop */
      }
    }

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['triage', 'queue'] })
      queryClient.invalidateQueries({ queryKey: ['doctor', 'kpis'] })
      queryClient.invalidateQueries({ queryKey: ['nurse', 'kpis'] })
    }

    const queue = echo.private('triage.queue')
    queue.listen('.triage.queue.updated', invalidate)

    const alert = echo.private('triage.p1.alert')
    alert.listen('.triage.alert', (e: { patient_name?: string; ia_score?: string }) => {
      invalidate()
      if (e?.ia_score === 'P1') {
        addToast(`🚨 Cas P1 : ${e.patient_name ?? 'patient'} — prise en charge immédiate`, 'error', 12000)
        playAlert()
      } else if (e?.ia_score === 'P2') {
        addToast(`⚠️ Cas P2 : ${e.patient_name ?? 'patient'} — à voir en priorité`, 'warning', 8000)
      }
    })

    return () => {
      echo.leave('triage.queue')
      echo.leave('triage.p1.alert')
    }
  }, [echo, queryClient, addToast])
}
