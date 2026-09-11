import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { doctorApi } from '@/lib/doctorApi'
import type { QueueItem, ValidateTriagePayload } from '@/types/doctor'
import { TriageQueue } from '@/components/doctor/TriageQueue'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToastStore } from '@/stores/toastStore'
import { useAuthStore } from '@/stores/authStore'
import { useTriageQueueRealtime } from '@/hooks/useTriageQueueRealtime'

const priorityOrder: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 }

export default function TriageQueuePage() {
  useTriageQueueRealtime()
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const accessToken = useAuthStore((s) => s.accessToken)

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['triage', 'queue'],
    queryFn: async () => (await doctorApi.getQueue()).data ?? [],
    enabled: !!accessToken,
    refetchInterval: 10000,
  })

  const validateMutation = useMutation({
    mutationFn: ({ uuid, payload }: { uuid: string; payload: ValidateTriagePayload }) =>
      doctorApi.validateTriage(uuid, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage', 'queue'] })
      addToast('Triage validé', 'success')
    },
    onError: (e: Error) => addToast(e.message || 'Erreur lors de la validation', 'error'),
  })

  const sorted = [...queue].sort(
    (a: QueueItem, b: QueueItem) => (priorityOrder[a.ia_score] ?? 99) - (priorityOrder[b.ia_score] ?? 99)
  )

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-primary" />
        File de triage
      </h1>
      <TriageQueue
        items={sorted}
        onValidate={(uuid, payload) => validateMutation.mutate({ uuid, payload })}
        isValidating={validateMutation.isPending}
      />
    </div>
  )
}
