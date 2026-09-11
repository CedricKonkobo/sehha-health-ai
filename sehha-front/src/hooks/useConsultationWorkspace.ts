// src/hooks/useConsultationWorkspace.ts
// Gère l'espace consultation complet : constantes, dictée, sauvegarde
import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dmeApi } from '@/lib/dmeApi'
import { doctorApi } from '@/lib/doctorApi'
import { useToastStore } from '@/stores/toastStore'
import type { StoreVitalPayload, VitalType } from '@/types/dme'
import type { ConsultationFormData } from '@/types/doctor'

export function useConsultationWorkspace(patientUuid: string) {
  const addToast = useToastStore((s) => s.addToast)
  const queryClient = useQueryClient()

  // ── Consultation form state ───────────────────────────────────────────────
  const [form, setForm] = useState<Partial<ConsultationFormData>>({ follow_up_required: false })
  const [reportText, setReportText] = useState('')
  const [savedConsultationUuid, setSavedConsultationUuid] = useState<string | null>(null)

  const updateField = useCallback(<K extends keyof ConsultationFormData>(field: K, value: ConsultationFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  // ── Vitals state ──────────────────────────────────────────────────────────
  const [vitalsForm, setVitalsForm] = useState<Partial<Record<VitalType, string>>>({})

  const updateVital = useCallback((type: VitalType, value: string) => {
    setVitalsForm((prev) => ({ ...prev, [type]: value }))
  }, [])

  // ── Fetch vitals history ──────────────────────────────────────────────────
  const { data: vitalsHistory = [] } = useQuery({
    queryKey: ['vitals', patientUuid],
    queryFn: async () => {
      const { data } = await dmeApi.getVitals(patientUuid)
      return data
    },
    enabled: !!patientUuid,
  })

  // ── Save vitals ───────────────────────────────────────────────────────────
  const vitalsMutation = useMutation({
    mutationFn: (payload: StoreVitalPayload) => dmeApi.storeVital(patientUuid, payload),
    onSuccess: (_, payload) => {
      addToast(`Constante "${payload.type}" enregistrée${payload.type === 'spo2' && Number(payload.value) < 90 ? ' — ALERTE SpO₂ bas' : ''}`, 'success')
      queryClient.invalidateQueries({ queryKey: ['vitals', patientUuid] })
      queryClient.invalidateQueries({ queryKey: ['dme', patientUuid] })
    },
    onError: () => addToast("Erreur lors de l'enregistrement des constantes", 'error'),
  })

  // ── Save all vitals at once (tension sys+dia together) ────────────────────
  const saveAllVitals = useCallback(async () => {
    const entries = Object.entries(vitalsForm).filter(([, v]) => v !== '')
    if (entries.length === 0) { addToast('Aucune constante à enregistrer', 'warning'); return }

    // tension_sys et tension_dia → on enregistre tension_sys avec value_2 = dia
    const sys = vitalsForm['tension_sys']
    const dia = vitalsForm['tension_dia']

    const promises: Promise<unknown>[] = []

    for (const [type, rawValue] of entries) {
      if (type === 'tension_dia' && sys) continue // géré avec sys
      const meta = await import('@/types/dme').then(m => m.VITAL_META[type as VitalType])
      if (!meta) continue
      promises.push(
        dmeApi.storeVital(patientUuid, {
          type: type as VitalType,
          value: parseFloat(rawValue as string),
          value_2: type === 'tension_sys' && dia ? parseFloat(dia) : undefined,
          unit: meta.unit,
          source: 'medical_device',
          consultation_uuid: savedConsultationUuid ?? undefined,
        })
      )
    }

    await Promise.all(promises)
    addToast('Toutes les constantes enregistrées', 'success')
    queryClient.invalidateQueries({ queryKey: ['vitals', patientUuid] })
    queryClient.invalidateQueries({ queryKey: ['dme', patientUuid] })
    setVitalsForm({})
  }, [vitalsForm, patientUuid, savedConsultationUuid, addToast, queryClient])

  // ── Dictation → report ────────────────────────────────────────────────────
  const dictateMutation = useMutation({
    mutationFn: (audio: string) => dmeApi.dictateReport(patientUuid, audio, savedConsultationUuid ?? undefined),
    onSuccess: (res) => {
      setReportText(res.data.report_text)
      addToast('Compte-rendu généré depuis la dictée', 'success')
    },
    onError: () => addToast('Erreur lors de la dictée', 'error'),
  })

  // ── Save consultation ─────────────────────────────────────────────────────
  const consultationMutation = useMutation({
    mutationFn: (data: ConsultationFormData) => doctorApi.createConsultation(patientUuid, data),
    onSuccess: (res) => {
      const uuid = res.data.consultation_uuid
      setSavedConsultationUuid(uuid)
      const alert = res.data.allergy_alert
      if (alert) {
        addToast(alert.message, 'warning', 10000)
      } else {
        addToast('Consultation enregistrée', 'success')
      }
      queryClient.invalidateQueries({ queryKey: ['consultations', patientUuid] })
      queryClient.invalidateQueries({ queryKey: ['dme', patientUuid] })
    },
    onError: () => addToast("Erreur lors de l'enregistrement", 'error'),
  })

  const saveConsultation = useCallback(() => {
    if (!form.motif || !form.diagnosis) {
      addToast('Le motif et le diagnostic sont obligatoires', 'warning')
      return
    }
    consultationMutation.mutate({ ...(form as ConsultationFormData), report_text: reportText || undefined } as any)
  }, [form, reportText, consultationMutation, addToast])

  return {
    // form
    form,
    updateField,
    reportText,
    setReportText,
    saveConsultation,
    isSavingConsultation: consultationMutation.isPending,
    savedConsultationUuid,
    // vitals
    vitalsForm,
    updateVital,
    vitalsHistory,
    saveAllVitals,
    isSavingVitals: vitalsMutation.isPending,
    // dictation
    dictateMutation,
    isDictating: dictateMutation.isPending,
  }
}
