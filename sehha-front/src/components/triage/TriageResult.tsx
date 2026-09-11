import { motion } from 'framer-motion'
import { AlertTriangle, Clock, MapPin, Activity, ShieldAlert, Bell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { TriageFinalResult } from '@/hooks/useTriage'
import { priorityConfig, delayLabels, orientationLabels } from '@/types/triage'
import { cn } from '@/lib/utils'

interface TriageResultProps {
  finalResult: TriageFinalResult
  onValidate?: () => void
  onNewTriage?: () => void
}

function badgeVariantForScore(score: string): 'destructive' | 'warning' | 'info' | 'success' {
  if (score === 'P1') return 'destructive'
  if (score === 'P2') return 'warning'
  if (score === 'P3') return 'info'
  return 'success'
}

export function TriageResult({ finalResult, onValidate, onNewTriage }: TriageResultProps) {
  const { result, clinical_summary, notification } = finalResult
  const config = priorityConfig[result.ia_score] || priorityConfig.P2
  const isP1 = result.ia_score === 'P1'
  const redFlags = (clinical_summary?.red_flags_detectes as string[] | undefined) || []
  const symptoms = (clinical_summary?.symptoms as string[] | undefined) || []

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20 }}
      className="space-y-4"
    >
      <Card
        className={cn(
          'border-2 overflow-hidden',
          isP1 ? 'border-danger animate-pulse-slow' : 'border-gray-200'
        )}
      >
        <div className={cn('h-2 w-full', config.bg)} />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className={cn('h-5 w-5', config.color)} />
              Résultat du Triage
            </CardTitle>
            <Badge variant={badgeVariantForScore(result.ia_score)} className="text-sm px-3 py-1">
              {result.ia_score}
            </Badge>
          </div>
          <p className={cn('text-sm font-semibold', config.color)}>{config.label}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {isP1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex items-center gap-2 rounded-lg bg-danger-50 p-3 text-danger"
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">
                ALERTE VITALE - Intervention immédiate requise
              </span>
            </motion.div>
          )}

          <p className="text-sm text-gray-700 leading-relaxed">{result.message_patient}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <Clock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Délai recommandé</p>
                <p className="font-semibold text-gray-900">
                  {delayLabels[result.recommended_delay] || result.recommended_delay}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <MapPin className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Orientation</p>
                <p className="font-semibold text-gray-900">
                  {orientationLabels[result.orientation] || result.orientation}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <Activity className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Score CCMU</p>
                <p className="font-semibold text-gray-900">{result.ccmu_score}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <ShieldAlert className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Confiance IA</p>
                <p className="font-semibold text-gray-900">
                  {Math.round((result.confidence || 0) * 100)}%
                </p>
              </div>
            </div>
          </div>

          {result.needs_human_review && (
            <div className="flex items-center gap-2 rounded-lg bg-warning-50 p-3 text-warning-700 text-sm">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Ce triage nécessite une validation par un soignant.
            </div>
          )}

          {symptoms.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Symptômes détectés</p>
              <div className="flex flex-wrap gap-2">
                {symptoms.map((symptom) => (
                  <Badge key={symptom} variant="secondary">
                    {symptom}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {redFlags.length > 0 && (
            <div>
              <p className="text-sm font-medium text-danger mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Signaux d'alerte détectés
              </p>
              <div className="flex flex-wrap gap-2">
                {redFlags.map((flag) => (
                  <Badge key={flag} variant="destructive">
                    {flag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {notification?.message && (
            <div className="flex items-start gap-2 rounded-lg bg-info-50 p-3 text-info-700 text-sm">
              <Bell className="h-4 w-4 shrink-0 mt-0.5" />
              {notification.message}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {onValidate && (
              <Button onClick={onValidate} className="flex-1" variant={isP1 ? 'destructive' : 'default'}>
                Confirmer et entrer dans la file
              </Button>
            )}
            {onNewTriage && (
              <Button onClick={onNewTriage} variant="outline" className="flex-1">
                Nouveau triage
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
