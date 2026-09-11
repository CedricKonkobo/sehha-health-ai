import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { appointmentApi } from '@/lib/appointmentApi'
import type { Doctor, SlotsResponse } from '@/types/appointment'
import { useToastStore } from '@/stores/toastStore'
import { useAuthStore } from '@/stores/authStore'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function useAppointments() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')

  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)

  const { data: doctors, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const { data } = await appointmentApi.getDoctors()
      return data
    },
    enabled: !!user && !!accessToken,
  })

  /**
   * Le backend ne renvoie les créneaux que pour UNE date. On affiche par défaut
   * les 7 prochains jours en appelant l'endpoint une fois par jour, puis on
   * reconstitue un "schedule" multi-jours pour le SlotPicker.
   */
  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['slots', selectedDoctor?.uuid, selectedDate],
    queryFn: async (): Promise<SlotsResponse[]> => {
      if (!selectedDoctor || !selectedDate) return []
      const days = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i))
      const results = await Promise.all(
        days.map((day) => appointmentApi.getSlots(selectedDoctor.uuid, day))
      )
      return results.map((r) => r.data)
    },
    enabled: !!selectedDoctor && !!selectedDate && !!accessToken,
  })

  const { data: myAppointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments', 'mine'],
    queryFn: async () => {
      const { data } = await appointmentApi.getMyAppointments()
      return data
    },
    enabled: !!user && !!accessToken,
  })

  const createMutation = useMutation({
    mutationFn: appointmentApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      addToast('Rendez-vous confirmé !', 'success')
    },
    onError: (error: any) => {
      const message =
        error?.data?.error?.message || error?.message || 'Erreur lors de la prise de rendez-vous'
      addToast(message, 'error')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ uuid }: { uuid: string }) => appointmentApi.cancel(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      addToast('Rendez-vous annulé', 'info')
    },
  })

  /**
   * @param startsAt format ISO complet, ex: "2026-06-25T09:00:00"
   * @param motif requis par le backend, ne peut pas être vide
   */
  const bookAppointment = useCallback(
    (params: { doctorUuid: string; startsAt: string; motif: string; triageUuid?: string }) => {
      createMutation.mutate({
        doctor_uuid: params.doctorUuid,
        starts_at: params.startsAt,
        motif: params.motif,
        triage_uuid: params.triageUuid,
      })
    },
    [createMutation]
  )

  return {
    doctors: doctors || [],
    schedule: schedule || [],
    myAppointments: myAppointments || [],
    selectedDoctor,
    selectedDate,
    setSelectedDoctor,
    setSelectedDate,
    bookAppointment,
    cancelAppointment: cancelMutation.mutate,
    isLoading: doctorsLoading || scheduleLoading || appointmentsLoading || createMutation.isPending,
  }
}
