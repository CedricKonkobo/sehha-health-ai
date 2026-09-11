import { motion } from 'framer-motion'
import { Stethoscope, Mic, MicOff, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useConsultation } from '@/hooks/useConsultation'
import { useSpeechToText } from '@/hooks/useSpeechToText'

interface ConsultationPatient {
  uuid: string
  name: string
}

interface ConsultationFormProps {
  patient: ConsultationPatient
  onSaved?: (consultationUuid: string) => void
}

export function ConsultationForm({ patient, onSaved }: ConsultationFormProps) {
  const { formData, updateField, submit, isSubmitting, consultationUuid } = useConsultation()
  const { isListening, transcript, start, stop, clear } = useSpeechToText()

  const handleDictate = () => {
    if (isListening) {
      stop()
      if (transcript) {
        updateField('symptoms_notes', `${formData.symptoms_notes || ''} ${transcript}`.trim())
        clear()
      }
    } else {
      start()
    }
  }

  const handleSubmit = () => {
    submit(patient.uuid)
  }

  // Une fois la consultation enregistrée, on notifie le parent pour
  // débloquer l'onglet ordonnance.
  if (consultationUuid) {
    onSaved?.(consultationUuid)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Stethoscope className="h-5 w-5 text-primary" />
          Nouvelle Consultation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Patient info */}
        <div className="rounded-lg bg-gray-50 p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary">
            {patient.name.charAt(0)}
          </div>
          <p className="font-medium">{patient.name}</p>
        </div>

        {/* Motif (requis) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Motif de consultation <span className="text-danger">*</span>
          </label>
          <Input
            value={formData.motif || ''}
            onChange={(e) => updateField('motif', e.target.value)}
            placeholder="Motif de la visite..."
          />
        </div>

        {/* Diagnostic (requis) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Diagnostic principal <span className="text-danger">*</span>
          </label>
          <Input
            value={formData.diagnosis || ''}
            onChange={(e) => updateField('diagnosis', e.target.value)}
            placeholder="Diagnostic..."
          />
        </div>

        {/* Code ICD-10 (un seul, pas une liste) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Code ICD-10</label>
          <Input
            value={formData.icd10_code || ''}
            onChange={(e) => updateField('icd10_code', e.target.value.toUpperCase())}
            placeholder="Ex: J06.9"
            className="font-mono"
          />
        </div>

        {/* Traitement */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Traitement / Recommandations</label>
          <textarea
            value={formData.treatment || ''}
            onChange={(e) => updateField('treatment', e.target.value)}
            placeholder="Traitement proposé..."
            className="w-full min-h-[80px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        </div>

        {/* Symptômes / notes avec dictée */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Symptômes observés / Compte-rendu</label>
            <Button
              type="button"
              variant={isListening ? 'destructive' : 'ghost'}
              size="sm"
              onClick={handleDictate}
              className="gap-1"
            >
              {isListening ? <Mic className="h-4 w-4 animate-pulse" /> : <MicOff className="h-4 w-4" />}
              {isListening ? 'Arrêter' : 'Dictée vocale'}
            </Button>
          </div>
          {isListening && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-primary bg-primary-50 p-2 rounded"
            >
              🎤 {transcript || 'Parlez maintenant...'}
            </motion.div>
          )}
          <textarea
            value={formData.symptoms_notes || ''}
            onChange={(e) => updateField('symptoms_notes', e.target.value)}
            placeholder="Notes cliniques complémentaires..."
            className="w-full min-h-[100px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        </div>

        {/* Suivi */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="followup"
            checked={formData.follow_up_required || false}
            onChange={(e) => updateField('follow_up_required', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="followup" className="text-sm">Suivi requis</label>
          {formData.follow_up_required && (
            <Input
              type="date"
              value={formData.follow_up_date || ''}
              onChange={(e) => updateField('follow_up_date', e.target.value)}
              className="w-auto"
            />
          )}
        </div>

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full gap-2">
          <Save className="h-4 w-4" />
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer la consultation'}
        </Button>
      </CardContent>
    </Card>
  )
}
