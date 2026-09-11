// src/components/doctor/DoctorAgenda.tsx
// Agenda journalier + bouton "Ouvrir consultation" par patient
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Clock, User, Check, X, FileText, Stethoscope } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { doctorApi } from '@/lib/doctorApi'
import { useToastStore } from '@/stores/toastStore'
import { useAgendaRealtime } from '@/hooks/useAgendaRealtime'
import { cn } from '@/lib/utils'

interface DoctorAgendaProps {
  doctorUuid: string
  onSelectPatient?: (patient: { patient_uuid: string; patient_name: string }) => void
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'secondary' | 'success' | 'info' | 'destructive' | 'warning' }> = {
  pending:   { label: 'En attente', variant: 'warning' },
  confirmed: { label: 'Confirmé',   variant: 'success' },
  completed: { label: 'Terminé',    variant: 'secondary' },
  cancelled: { label: 'Annulé',     variant: 'destructive' },
  no_show:   { label: 'Absent',     variant: 'destructive' },
}

function toDateInputValue(date: Date) {
  return date.toISOString().split('T')[0]
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function DoctorAgenda({ doctorUuid, onSelectPatient }: DoctorAgendaProps) {
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()))
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  useAgendaRealtime(doctorUuid)

  const { data, isLoading } = useQuery({
    queryKey: ['doctor', 'agenda', doctorUuid, selectedDate],
    queryFn: async () => {
      const { data } = await doctorApi.getDailyAgenda(doctorUuid, selectedDate)
      return data
    },
    enabled: !!doctorUuid,
  })

  const statusMutation = useMutation({
    mutationFn: ({ uuid, status }: { uuid: string; status: 'confirmed' | 'cancelled' }) =>
      doctorApi.updateAppointmentStatus(uuid, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'agenda', doctorUuid] })
      addToast('Rendez-vous mis à jour', 'success')
    },
    onError: () => addToast('Erreur lors de la mise à jour', 'error'),
  })

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(toDateInputValue(d))
  }

  const appointments = data?.appointments || []
  const isToday = selectedDate === toDateInputValue(new Date())

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Agenda du jour
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => shiftDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className={cn('text-sm font-medium min-w-[140px] text-center', isToday && 'text-primary')}>
            {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => shiftDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
        ) : appointments.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucun rendez-vous ce jour-là</p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {appointments.map((apt) => {
                const status = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending
                return (
                  <motion.div
                    key={apt.uuid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{apt.patient_name}</span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatTime(apt.starts_at)}
                        {apt.ends_at && ` – ${formatTime(apt.ends_at)}`}
                        {apt.motif && ` · ${apt.motif}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Bouton principal : ouvrir l'espace consultation */}
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1"
                        onClick={() =>
                          onSelectPatient?.({
                            patient_uuid: apt.patient_uuid,
                            patient_name: apt.patient_name,
                          })
                        }
                        title="Ouvrir le DME et créer une consultation"
                      >
                        <Stethoscope className="h-4 w-4" />
                        Consulter
                      </Button>

                      {/* DME seul (icône) */}
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() =>
                          onSelectPatient?.({
                            patient_uuid: apt.patient_uuid,
                            patient_name: apt.patient_name,
                          })
                        }
                        aria-label="Voir le DME"
                        title="Voir le dossier médical"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>

                      {apt.status === 'pending' && (
                        <>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 text-success border-success"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ uuid: apt.uuid, status: 'confirmed' })}
                            aria-label="Confirmer"
                            title="Confirmer le RDV"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 text-danger border-danger"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ uuid: apt.uuid, status: 'cancelled' })}
                            aria-label="Refuser"
                            title="Refuser le RDV"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
