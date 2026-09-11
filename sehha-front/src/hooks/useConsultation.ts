import { useMutation } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { doctorApi } from '@/lib/doctorApi'
import type { ConsultationFormData } from '@/types/doctor'
import { useToastStore } from '@/stores/toastStore'

export function useConsultation() {
  const addToast = useToastStore((s) => s.addToast)
  const [formData, setFormData] = useState<Partial<ConsultationFormData>>({
    follow_up_required: false,
  })

  const updateField = useCallback(<K extends keyof ConsultationFormData>(
    field: K,
    value: ConsultationFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const submitMutation = useMutation({
    mutationFn: ({ patientUuid, data }: { patientUuid: string; data: ConsultationFormData }) =>
      doctorApi.createConsultation(patientUuid, data),
    onSuccess: (res) => {
      const alert = res.data.allergy_alert
      if (alert) {
        addToast(alert.message, 'warning', 10000)
      } else {
        addToast('Consultation enregistrée', 'success')
      }
      setFormData({ follow_up_required: false })
    },
    onError: () => {
      addToast("Erreur lors de l'enregistrement", 'error')
    },
  })

  const submit = useCallback(
    (patientUuid: string) => {
      if (!formData.motif || !formData.diagnosis) {
        addToast('Le motif et le diagnostic sont obligatoires', 'warning')
        return
      }
      submitMutation.mutate({ patientUuid, data: formData as ConsultationFormData })
    },
    [formData, submitMutation, addToast]
  )

  return {
    formData,
    updateField,
    submit,
    isSubmitting: submitMutation.isPending,
    consultationUuid: submitMutation.data?.data.consultation_uuid,
  }
}
