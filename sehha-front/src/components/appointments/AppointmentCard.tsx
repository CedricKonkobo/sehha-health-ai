import { motion } from 'framer-motion'
import { Calendar, Clock, User, X, CheckCircle2, Activity } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// Interface alignée sur les données réelles du backend
interface AppointmentCardProps {
  appointment: {
    uuid: string
    starts_at: string
    ends_at: string
    patient: { uuid: string; name: string }
    doctor: { uuid: string; name: string }
    service?: string
    status: string
    motif?: string
    triage_score?: string // ex: "P2"
    ia_suggested?: boolean // optionnel
    queue_number?: number | null
  }
  onCancel?: (uuid: string) => void // rendu optionnel pour flexibilité
}

// Config des statuts (inchangée mais avec toutes les clés possibles)
const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-warning-100 text-warning-700 border-warning-200' },
  confirmed: { label: 'Confirmé', color: 'bg-success-100 text-success-700 border-success-200' },
  completed: { label: 'Terminé', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'Annulé', color: 'bg-danger-100 text-danger-700' },
  no_show: { label: 'Non présenté', color: 'bg-gray-100 text-gray-500' },
}

export function AppointmentCard({ appointment, onCancel }: AppointmentCardProps) {
  // Sécuriser l'accès au statut
  const status = statusConfig[appointment.status] || statusConfig.pending
  const isUpcoming = ['pending', 'confirmed'].includes(appointment.status)

  // Extraire la date et l'heure depuis starts_at
  const startDate = new Date(appointment.starts_at)
  const endDate = new Date(appointment.ends_at)

  // Formater la date (ex: "lundi 22 juin 2026")
  const formattedDate = startDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Heures (HH:MM)
  const startTime = startDate.toTimeString().slice(0, 5)
  const endTime = endDate.toTimeString().slice(0, 5)

  // Noms et infos avec valeurs par défaut
  const patientName = appointment.patient?.name || 'Patient inconnu'
  const doctorName = appointment.doctor?.name || 'Médecin inconnu'
  const service = appointment.service || 'Service non spécifié'
  const motif = appointment.motif || ''
  const triageScore = appointment.triage_score || ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <Card className={cn('overflow-hidden', isUpcoming && 'border-l-4 border-l-primary')}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              {/* Badges de statut */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={status.color}>
                  {status.label}
                </Badge>
                {appointment.ia_suggested && (
                  <Badge variant="default" className="bg-primary text-white gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    IA recommandé
                  </Badge>
                )}
                {triageScore && (
                  <Badge variant="secondary" className="gap-1">
                    <Activity className="h-3 w-3" />
                    Priorité {triageScore}
                  </Badge>
                )}
              </div>

              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 shrink-0" />
                {formattedDate}
              </div>

              {/* Heure */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4 shrink-0" />
                {startTime} - {endTime}
              </div>

              {/* Médecin + Service */}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="font-medium text-gray-900">{doctorName}</span>
                <span className="text-gray-500">· {service}</span>
              </div>

              {/* Patient */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-gray-400">Patient :</span>
                <span className="font-medium">{patientName}</span>
              </div>

              {/* Motif */}
              {motif && (
                <p className="text-sm text-gray-500 italic">"{motif}"</p>
              )}
            </div>

            {/* Bouton Annuler (visible si onCancel est passé et si le rendez-vous est à venir) */}
            {isUpcoming && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(appointment.uuid)}
                className="text-danger hover:bg-danger-50 shrink-0"
              >
                <X className="h-4 w-4 mr-1" />
                Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}