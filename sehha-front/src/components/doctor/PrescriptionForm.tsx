import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Pill, Plus, X, AlertTriangle, FileSignature, QrCode } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { usePrescription } from '@/hooks/usePrescription'
import SignatureCanvas from 'react-signature-canvas'
import type { DME } from '@/types/dme'

interface PrescriptionFormProps {
  patientUuid: string
  /** Allergies réelles du patient, récupérées depuis le DME (GET /patients/{uuid}/dme) */
  allergies?: DME['allergies']
}

export function PrescriptionForm({ patientUuid, allergies = [] }: PrescriptionFormProps) {
  const {
    medications,
    notes,
    signatureData,
    setNotes,
    setSignatureData,
    addMedication,
    updateMedication,
    removeMedication,
    submit,
    isSubmitting,
    prescriptionResult,
    openPdf,
  } = usePrescription(patientUuid)

  const [showSignature, setShowSignature] = useState(false)
  const signatureRef = useRef<SignatureCanvas>(null)

  const handleSaveSignature = () => {
    if (signatureRef.current) {
      const data = signatureRef.current.toDataURL()
      setSignatureData(data)
      setShowSignature(false)
    }
  }

  const handleClearSignature = () => {
    signatureRef.current?.clear()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Pill className="h-5 w-5 text-primary" />
          Ordonnance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Alertes allergies (réelles, depuis le DME) */}
        {allergies.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <Alert variant="destructive" className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Alertes allergies patient</p>
                <p className="text-sm">
                  {allergies.map((a) => `${a.substance} (${a.severity})`).join(', ')}
                </p>
              </div>
            </Alert>
          </motion.div>
        )}

        {/* Médicaments */}
        <div className="space-y-3">
          {medications.map((med, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-gray-200 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Médicament #{index + 1}</span>
                {medications.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeMedication(index)} className="h-6 w-6 text-danger">
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  placeholder="Nom du médicament"
                  value={med.nom}
                  onChange={(e) => updateMedication(index, 'nom', e.target.value)}
                />
                <Input
                  placeholder="Posologie (ex: 500mg, 3x/jour)"
                  value={med.posologie}
                  onChange={(e) => updateMedication(index, 'posologie', e.target.value)}
                />
                <Input
                  placeholder="Durée (ex: 7 jours)"
                  value={med.duree}
                  onChange={(e) => updateMedication(index, 'duree', e.target.value)}
                />
              </div>
            </motion.div>
          ))}
          <Button variant="outline" onClick={addMedication} className="w-full gap-1">
            <Plus className="h-4 w-4" />
            Ajouter un médicament
          </Button>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Notes générales</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Instructions au patient..."
            className="w-full min-h-[60px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        </div>

        {/* Signature (capture locale uniquement -- non envoyée au backend
            pour l'instant, voir note dans usePrescription.ts) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileSignature className="h-4 w-4" />
              Signature numérique
            </label>
            <Button variant="ghost" size="sm" onClick={() => setShowSignature(!showSignature)}>
              {showSignature ? 'Masquer' : 'Signer'}
            </Button>
          </div>
          {showSignature && (
            <div className="space-y-2">
              <SignatureCanvas
                ref={signatureRef}
                penColor="black"
                canvasProps={{ width: 500, height: 200, className: 'sig-canvas w-full border rounded' }}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClearSignature}>
                  Effacer
                </Button>
                <Button size="sm" onClick={handleSaveSignature}>
                  Valider la signature
                </Button>
              </div>
            </div>
          )}
          {signatureData && !showSignature && (
            <div className="rounded-lg border border-gray-200 p-2">
              <img src={signatureData} alt="Signature" className="h-16 object-contain" />
            </div>
          )}
        </div>

        <Button onClick={submit} disabled={isSubmitting} className="w-full gap-2">
          {isSubmitting ? 'Génération...' : (
            <>
              <QrCode className="h-4 w-4" />
              Générer PDF + QR
            </>
          )}
        </Button>

        {prescriptionResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-success"
          >
            Ordonnance générée !{' '}
            <button
              type="button"
              onClick={() => openPdf(prescriptionResult.document_uuid)}
              className="underline text-primary"
            >
              Voir le PDF
            </button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
