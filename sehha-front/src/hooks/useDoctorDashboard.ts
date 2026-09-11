import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { doctorApi } from '@/lib/doctorApi'
import type { ValidateTriagePayload } from '@/types/doctor'
import { useToastStore } from '@/stores/toastStore'
import { useAuthStore } from '@/stores/authStore'

const priorityOrder: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 }

export function useDoctorDashboard() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const accessToken = useAuthStore((state) => state.accessToken)

  const { data: kpiData, isLoading: kpisLoading } = useQuery({
    queryKey: ['doctor', 'kpis'],
    queryFn: async () => {
      const { data } = await doctorApi.getKPIs()
      return data
    },
    enabled: !!accessToken,
    refetchInterval: 30000,
  })

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['triage', 'queue'],
    queryFn: async () => {
      const { data } = await doctorApi.getQueue()
      // Le backend renvoie déjà le tableau directement dans "data".
      return data ?? []
    },
    enabled: !!accessToken,
    refetchInterval: 10000,
  })

  const validateMutation = useMutation({
    mutationFn: ({ uuid, payload }: { uuid: string; payload: ValidateTriagePayload }) =>
      doctorApi.validateTriage(uuid, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage', 'queue'] })
      queryClient.invalidateQueries({ queryKey: ['doctor', 'kpis'] })
      addToast('Triage validé', 'success')
    },
    onError: () => {
      addToast('Erreur lors de la validation du triage', 'error')
    },
  })

  const sortedQueue = [...(queue || [])].sort(
    (a, b) => (priorityOrder[a.ia_score] ?? 99) - (priorityOrder[b.ia_score] ?? 99)
  )

  const validateTriage = (uuid: string, payload: ValidateTriagePayload) => {
    validateMutation.mutate({ uuid, payload })
  }

  return {
    kpis: kpiData?.kpis,
    nextAppointments: kpiData?.next_appointments || [],
    queue: sortedQueue,
    isLoading: kpisLoading || queueLoading,
    validateTriage,
    isValidating: validateMutation.isPending,
  }
}
