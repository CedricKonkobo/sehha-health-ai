import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Camera, Scan, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { dmeApi } from '@/lib/dmeApi'

export function QRScanner() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{ valid: boolean; message: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleScan = async (value: string) => {
    if (!value.trim()) return
    setScanning(true)
    try {
      const { data } = await dmeApi.verifyPrescriptionQR(value)
      setResult({
        valid: data.valid,
        message: data.valid
          ? 'Ordonnance authentique ✓'
          : 'Ordonnance invalide ou falsifiée ✗',
      })
    } catch {
      setResult({ valid: false, message: 'Erreur de vérification' })
    } finally {
      setScanning(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
            <Scan className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">Vérifier une ordonnance</h3>
          <p className="text-sm text-gray-500">Scannez le QR code ou saisissez le code de vérification</p>
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Code QR..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            onKeyDown={(e) => e.key === 'Enter' && handleScan(e.currentTarget.value)}
          />
          <Button onClick={() => handleScan(inputRef.current?.value || '')} disabled={scanning}>
            <Camera className="h-4 w-4" />
          </Button>
        </div>

        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Alert variant={result.valid ? 'success' : 'destructive'} className="flex items-center gap-2">
              {result.valid ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              {result.message}
            </Alert>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}