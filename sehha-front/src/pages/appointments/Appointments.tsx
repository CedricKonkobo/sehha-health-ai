import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, ChevronLeft, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAppointments } from '@/hooks/useAppointments'
import { DoctorCard } from '@/components/appointments/DoctorCard'
import { SlotPicker } from '@/components/appointments/SlotPicker'
import { AppointmentCard } from '@/components/appointments/AppointmentCard'

type Step = 'doctor' | 'date' | 'confirm'

export default function AppointmentsPage() {
  const {
    doctors,
    schedule,
    myAppointments,
    selectedDoctor,
    setSelectedDoctor,
    setSelectedDate,
    bookAppointment,
    cancelAppointment,
    isLoading,
  } = useAppointments()

  const [step, setStep] = useState<Step>('doctor')
  const [view, setView] = useState<'book' | 'mine'>('book')
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(null)
  const [motif, setMotif] = useState('')
  const [motifError, setMotifError] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  const upcomingAppointments = myAppointments.filter((a) =>
    ['pending', 'confirmed'].includes(a.status)
  )
  const pastAppointments = myAppointments.filter((a) =>
    ['completed', 'cancelled', 'no_show'].includes(a.status)
  )

  const handleSelectDoctor = (doctor: typeof doctors[0]) => {
    setSelectedDoctor(doctor)
    setStep('date')
    const today = new Date().toISOString().split('T')[0]
    setSelectedDate(today)
  }

  const handleSelectSlot = (startsAt: string) => {
    setSelectedSlotStart(startsAt)
    setStep('confirm')
  }

  const handleBook = () => {
    if (!selectedDoctor || !selectedSlotStart) return

    // Le backend exige un motif non vide (StoreAppointmentRequest: 'required')
    if (!motif.trim()) {
      setMotifError(true)
      return
    }

    bookAppointment({
      doctorUuid: selectedDoctor.uuid,
      startsAt: selectedSlotStart, // envoyer tel quel, sans transformation de format
      motif: motif.trim(),
    })

    setBookingSuccess(true)
    setTimeout(() => {
      setBookingSuccess(false)
      setStep('doctor')
      setSelectedDoctor(null)
      setSelectedSlotStart(null)
      setMotif('')
      setMotifError(false)
    }, 3000)
  }

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('date')
      setSelectedSlotStart(null)
    } else if (step === 'date') {
      setStep('doctor')
      setSelectedDoctor(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <CalendarDays className="h-6 w-6 text-primary" />
        Rendez-vous
      </h1>

      {/* Onglets */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setView('book')}
          className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
            view === 'book' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Prendre RDV
        </button>
        <button
          onClick={() => setView('mine')}
          className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
            view === 'mine' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Mes RDV ({upcomingAppointments.length})
        </button>
      </div>

      {view === 'mine' ? (
        <div className="space-y-6">
          {upcomingAppointments.length === 0 && pastAppointments.length === 0 && (
            <p className="text-center text-gray-400 py-12">Aucun rendez-vous</p>
          )}
          {upcomingAppointments.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Mes prochains rendez-vous</h3>
              {upcomingAppointments.map((apt) => (
                <AppointmentCard key={apt.uuid} appointment={apt} onCancel={(uuid) => cancelAppointment({ uuid })} />
              ))}
            </div>
          )}
          {pastAppointments.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900">Historique</h3>
              {pastAppointments.slice(0, 5).map((apt) => (
                <AppointmentCard key={apt.uuid} appointment={apt} onCancel={() => {}} />
              ))}
            </div>
          )}
        </div>
      ) : bookingSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div className="mx-auto h-16 w-16 rounded-full bg-success-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Rendez-vous demandé, en attente de confirmation par le médecin.</h2>
          <p className="text-gray-600 mt-2">Un rappel vous sera envoyé avant la consultation.</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {step !== 'doctor' && (
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Retour
            </Button>
          )}

          <AnimatePresence mode="wait">
            {step === 'doctor' && (
              <motion.div
                key="doctor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold">1. Choisissez un médecin</h2>
                {isLoading && doctors.length === 0 ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {doctors.map((doctor) => (
                      <DoctorCard
                        key={doctor.uuid}
                        doctor={doctor}
                        isSelected={selectedDoctor?.uuid === doctor.uuid}
                        onClick={() => handleSelectDoctor(doctor)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {step === 'date' && selectedDoctor && (
              <motion.div
                key="date"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold">
                  2. Choisissez un créneau · Dr. {selectedDoctor.last_name}
                </h2>
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-4">
                      <SlotPicker
                        schedule={schedule}
                        selectedSlotStart={selectedSlotStart}
                        onSelectSlot={handleSelectSlot}
                      />
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {step === 'confirm' && selectedSlotStart && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold">3. Confirmer le rendez-vous</h2>
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Médecin</p>
                      <p className="font-medium">
                        Dr. {selectedDoctor?.first_name} {selectedDoctor?.last_name}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Créneau</p>
                      <p className="font-medium">
                        {new Date(selectedSlotStart.replace(' ', 'T')).toLocaleString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">
                        Motif de consultation <span className="text-danger">*</span>
                      </p>
                      <Input
                        placeholder="Décrivez brièvement le motif de consultation..."
                        value={motif}
                        onChange={(e) => {
                          setMotif(e.target.value)
                          if (e.target.value.trim()) setMotifError(false)
                        }}
                      />
                      {motifError && (
                        <Alert variant="destructive" className="mt-1 py-2 text-sm">
                          Le motif est obligatoire pour confirmer le rendez-vous.
                        </Alert>
                      )}
                    </div>
                    <Button onClick={handleBook} disabled={isLoading} className="w-full">
                      {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                      Confirmer le rendez-vous
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
