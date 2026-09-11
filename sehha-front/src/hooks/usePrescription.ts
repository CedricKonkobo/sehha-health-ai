import { useMutation } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { doctorApi } from '@/lib/doctorApi'
import { dmeApi } from '@/lib/dmeApi'
import { useToastStore } from '@/stores/toastStore'

/** Ouvre le PDF d'une ordonnance dans un nouvel onglet (via blob authentifié). */
async function openPrescriptionPdf(uuid: string) {
  const res = await dmeApi.getPrescriptionPDF(uuid)
  const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/pdf' }))
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

interface MedicationField {
  nom: string
  posologie: string
  duree: string
}

export function usePrescription(patientUuid: string) {
  const addToast = useToastStore((s) => s.addToast)
  const [medications, setMedications] = useState<MedicationField[]>([
    { nom: '', posologie: '', duree: '' },
  ])
  const [notes, setNotes] = useState('')
  // Le backend ne stocke pas encore de signature (aucun champ dans
  // PrescriptionController::store ni PrescriptionService) : on garde la
  // capture côté UI pour l'archivage visuel/légal local, mais elle n'est pas
  // envoyée à l'API pour l'instant.
  const [signatureData, setSignatureData] = useState<string | null>(null)

  const addMedication = useCallback(() => {
    setMedications((prev) => [...prev, { nom: '', posologie: '', duree: '' }])
  }, [])

  const updateMedication = useCallback(
    (index: number, field: keyof MedicationField, value: string) => {
      setMedications((prev) =>
        prev.map((med, i) => (i === index ? { ...med, [field]: value } : med))
      )
    },
    []
  )

  const removeMedication = useCallback((index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const submitMutation = useMutation({
    mutationFn: (medicaments: MedicationField[]) =>
      doctorApi.createPrescription({
        patient_uuid: patientUuid,
        medicaments,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      // Pas d'ouverture auto du PDF ici : un window.open hors clic utilisateur
      // est bloqué par le navigateur. L'utilisateur clique « Voir le PDF ».
      addToast('Ordonnance générée. Cliquez sur « Voir le PDF ».', 'success')
    },
    onError: (error: any) => {
      // Le backend renvoie un 422 avec error.code = 'ALLERGY_ALERT' et un
      // message précis si un médicament correspond à une allergie connue.
      const code = error?.data?.error?.code
      const message = error?.data?.error?.message
      if (code === 'ALLERGY_ALERT') {
        addToast(message || 'Alerte allergie détectée', 'error', 10000)
      } else {
        addToast("Erreur lors de la génération de l'ordonnance", 'error')
      }
    },
  })

  const submit = useCallback(() => {
    const validMeds = medications.filter((m) => m.nom && m.posologie && m.duree)
    if (validMeds.length === 0) {
      addToast('Ajoutez au moins un médicament valide (nom, posologie, durée)', 'warning')
      return
    }
    submitMutation.mutate(validMeds)
  }, [medications, submitMutation, addToast])

  return {
    medications,
    notes,
    signatureData,
    setNotes,
    setSignatureData,
    addMedication,
    updateMedication,
    removeMedication,
    submit,
    isSubmitting: submitMutation.isPending,
    prescriptionResult: submitMutation.data?.data,
    openPdf: openPrescriptionPdf,
  }
}
