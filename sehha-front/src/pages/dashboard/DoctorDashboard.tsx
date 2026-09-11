// src/pages/dashboard/DoctorDashboard.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Users, Stethoscope, Clock, FileText, Activity, AlertTriangle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuthStore } from '@/stores/authStore'
import { useDoctorDashboard } from '@/hooks/useDoctorDashboard'
import { useTriageQueueRealtime } from '@/hooks/useTriageQueueRealtime'
import { dmeApi } from '@/lib/dmeApi'
import { KPICard } from '@/components/doctor/KPICard'
import { TriageQueue } from '@/components/doctor/TriageQueue'
import { DoctorAgenda } from '@/components/doctor/DoctorAgenda'
import { DoctorDMEView } from '@/components/doctor/DoctorDMEView'
import { PrescriptionForm } from '@/components/doctor/PrescriptionForm'
import { cn } from '@/lib/utils'

interface SelectedPatient {
  patient_uuid: string
  patient_name: string
}

export default function DoctorDashboard() {
  const { user } = useAuthStore()
  useTriageQueueRealtime()

  const { kpis, queue, isLoading, validateTriage, isValidating } = useDoctorDashboard()
  const [selectedItem, setSelectedItem] = useState<SelectedPatient | null>(null)
  const [consultationUuid, setConsultationUuid] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<'dme' | 'prescription'>('dme')

  const { data: dme, isLoading: dmeLoading } = useQuery({
    queryKey: ['dme', selectedItem?.patient_uuid],
    queryFn: async () => {
      const { data } = await dmeApi.getDME(selectedItem!.patient_uuid)
      return data
    },
    enabled: !!selectedItem,
  })

  const handleSelectPatient = (patient: SelectedPatient) => {
    setSelectedItem(patient)
    setConsultationUuid(null)
    setActivePanel('dme')
  }

  if (isLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><LoadingSpinner size="lg" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Tableau de bord Médecin
        </h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Patients en attente"       value={kpis?.patients_waiting || 0}       icon={Users}       color="warning" />
        <KPICard title="Consultations aujourd'hui"  value={kpis?.consultations_today || 0}    icon={Stethoscope} color="primary" />
        <KPICard title="Temps moyen d'attente"      value={`${kpis?.avg_wait_time_minutes || 0} min`} icon={Clock} color="info" />
        <KPICard title="Ordonnances émises"         value={kpis?.prescriptions_today || 0}    icon={FileText}    color="success" />
      </div>

      {/* Répartition priorité */}
      {kpis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Répartition par priorité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-8 rounded-full overflow-hidden">
              {(['P1', 'P2', 'P3', 'P4'] as const).map((p) => {
                const count = kpis.triage_by_priority[p] || 0
                const total = Object.values(kpis.triage_by_priority).reduce((a, b) => a + b, 0) || 1
                const pct = (count / total) * 100
                return (
                  <motion.div
                    key={p}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    className={cn(
                      'flex items-center justify-center text-xs text-white font-medium',
                      p === 'P1' ? 'bg-danger' : p === 'P2' ? 'bg-warning' : p === 'P3' ? 'bg-info' : 'bg-success'
                    )}
                    title={`${p}: ${count}`}
                  >
                    {pct > 10 && `${p} (${count})`}
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File d'attente + panneau patient */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            File d'attente
          </h2>
          <TriageQueue
            items={queue}
            onValidate={validateTriage}
            isValidating={isValidating}
            onSelectPatient={handleSelectPatient}
            selectedPatientUuid={selectedItem?.patient_uuid || null}
          />
        </div>

        <div className="lg:col-span-2">
          {!selectedItem ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Stethoscope className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Cliquez sur «&nbsp;Consulter&nbsp;» pour un patient dans la file d'attente.</p>
              </CardContent>
            </Card>
          ) : dmeLoading ? (
            <div className="flex h-40 items-center justify-center"><LoadingSpinner size="lg" /></div>
          ) : !dme ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Impossible de charger le dossier médical de ce patient.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-gray-200">
                <button
                  onClick={() => setActivePanel('dme')}
                  className={cn(
                    'pb-2 px-3 text-sm font-medium border-b-2 transition-colors',
                    activePanel === 'dme' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  Dossier médical (DME)
                </button>
                <button
                  onClick={() => setActivePanel('prescription')}
                  className={cn(
                    'pb-2 px-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1',
                    activePanel === 'prescription' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  Ordonnance
                  {consultationUuid && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                </button>
              </div>

              {activePanel === 'dme' && (
                <DoctorDMEView
                  patientUuid={selectedItem.patient_uuid}
                  dme={dme}
                  onConsultationSaved={(uuid) => setConsultationUuid(uuid)}
                />
              )}

              {activePanel === 'prescription' && (
                <PrescriptionForm
                  patientUuid={selectedItem.patient_uuid}
                  allergies={dme?.allergies || []}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Agenda */}
      {user?.uuid && (
        <DoctorAgenda doctorUuid={user.uuid} onSelectPatient={handleSelectPatient} />
      )}
    </div>
  )
}
