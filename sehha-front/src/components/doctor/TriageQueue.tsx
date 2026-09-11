import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, AlertTriangle, CheckCircle2, User, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { priorityConfig, orientationLabels, delayLabels } from '@/types/triage'
import type { QueueItem, ValidateTriagePayload } from '@/types/doctor'
import { cn } from '@/lib/utils'

interface TriageQueueProps {
  items: QueueItem[]
  onValidate: (uuid: string, payload: ValidateTriagePayload) => void
  isValidating: boolean
  onSelectPatient?: (item: QueueItem) => void
  selectedPatientUuid?: string | null
}

// Le backend (TriageController::validate) n'accepte que ces 4 valeurs
// d'orientation -- distinctes des libellés de TriageOrientation côté patient.
const ORIENTATION_OPTIONS: { value: ValidateTriagePayload['orientation']; label: string }[] = [
  { value: 'urgences', label: 'Urgences' },
  { value: 'specialiste', label: 'Spécialiste' },
  { value: 'medecin_gen', label: 'Médecin généraliste' },
  { value: 'teleconsult', label: 'Téléconsultation' },
]

export function TriageQueue({
  items,
  onValidate,
  isValidating,
  onSelectPatient,
  selectedPatientUuid,
}: TriageQueueProps) {
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
          <CheckCircle2 className="h-12 w-12 mb-3 text-success" />
          <p>Aucun triage en attente de validation</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Triages à valider ({items.length})
      </h3>
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.div
            key={item.uuid}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
          >
            <QueueItemCard
              item={item}
              expanded={expandedUuid === item.uuid}
              onToggle={() =>
                setExpandedUuid((current) => (current === item.uuid ? null : item.uuid))
              }
              onValidate={onValidate}
              isValidating={isValidating}
              onSelectPatient={onSelectPatient}
              isSelected={selectedPatientUuid === item.patient_uuid}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function QueueItemCard({
  item,
  expanded,
  onToggle,
  onValidate,
  isValidating,
  onSelectPatient,
  isSelected,
}: {
  item: QueueItem
  expanded: boolean
  onToggle: () => void
  onValidate: (uuid: string, payload: ValidateTriagePayload) => void
  isValidating: boolean
  onSelectPatient?: (item: QueueItem) => void
  isSelected?: boolean
}) {
  const config = priorityConfig[item.ia_score] || priorityConfig.P2
  const isP1 = item.ia_score === 'P1'

  // Pré-rempli avec le score IA actuel -- le médecin confirme ou corrige.
  const [score, setScore] = useState<ValidateTriagePayload['ia_score']>(
    (item.ia_score as ValidateTriagePayload['ia_score']) || 'P2'
  )
  const [orientation, setOrientation] = useState<ValidateTriagePayload['orientation']>('specialiste')
  const [comment, setComment] = useState('')

  const handleSubmit = () => {
    onValidate(item.uuid, { ia_score: score, orientation, comment: comment.trim() || undefined })
  }

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all',
        isP1 && 'border-l-4 border-l-danger animate-pulse-slow',
        isSelected && 'ring-2 ring-primary'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={onToggle}>
            <div
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                config.bg,
                config.color
              )}
            >
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{item.patient_name}</span>
                <Badge
                  variant={
                    item.ia_score === 'P1'
                      ? 'destructive'
                      : item.ia_score === 'P2'
                      ? 'warning'
                      : item.ia_score === 'P3'
                      ? 'info'
                      : 'success'
                  }
                >
                  {item.ia_score}
                </Badge>
                {isP1 && <AlertTriangle className="h-4 w-4 text-danger animate-bounce" />}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {item.symptoms?.chief_complaint || 'Motif non précisé'}
                {' · '}
                {orientationLabels[item.orientation] || item.orientation}
                {' · '}
                {delayLabels[item.recommended_delay] || item.recommended_delay}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <button className="text-gray-400" onClick={onToggle} aria-label="Détails">
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {onSelectPatient && (
              <Button
                size="sm"
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => onSelectPatient(item)}
              >
                Consulter
              </Button>
            )}
          </div>
        </div>

        {item.red_flags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {item.red_flags.map((flag) => (
              <Badge key={flag} variant="destructive" className="text-xs">
                {flag}
              </Badge>
            ))}
          </div>
        )}

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-gray-100 space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Score CCMU (IA)</label>
                <p className="text-sm font-medium text-gray-900">{item.ccmu_score ?? '—'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Confiance IA</label>
                <p className="text-sm font-medium text-gray-900">
                  {Math.round(Number(item.ia_confidence) * 100)}%
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Score à valider</label>
                <select
                  value={score}
                  onChange={(e) => setScore(e.target.value as ValidateTriagePayload['ia_score'])}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="P1">P1 - Urgence absolue</option>
                  <option value="P2">P2 - Très urgent</option>
                  <option value="P3">P3 - Urgent</option>
                  <option value="P4">P4 - Non urgent</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Orientation</label>
                <select
                  value={orientation}
                  onChange={(e) =>
                    setOrientation(e.target.value as ValidateTriagePayload['orientation'])
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {ORIENTATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Commentaire (optionnel)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Observation clinique, justification du changement de score..."
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <Button onClick={handleSubmit} disabled={isValidating} className="w-full gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Valider ce triage
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
