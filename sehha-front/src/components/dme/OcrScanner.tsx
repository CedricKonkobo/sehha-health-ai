// src/components/dme/OcrScanner.tsx
// Permet au patient de scanner un document (photo ou upload) via l'API OCR,
// puis de le sauvegarder localement (IndexedDB + téléchargement).
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, Upload, FileText, Download, Trash2,
  CheckCircle2, AlertTriangle, Loader2, X, ScanLine,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { patientApi } from '@/lib/patientApi'
import { cn } from '@/lib/utils'

// ── Types 

export interface ScannedDocument {
  id: string
  name: string
  scannedAt: string
  imageDataUrl: string  // original image
  text: string          // texte OCR extrait
  confidence?: number
  documentType?: string
  size: number          // bytes de l'image
}

// ── Stockage local (localStorage, simple et sans dépendance) 

const STORAGE_KEY = 'sehha_scanned_docs'

function loadSaved(): ScannedDocument[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveDocs(docs: ScannedDocument[]) {
  // On ne stocke pas l'image en localStorage (trop lourd) — seulement les métadonnées + texte
  const light = docs.map(({ imageDataUrl: _, ...rest }) => rest)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(light))
  } catch {
    // quota dépassé — on ignore silencieusement
  }
}

// ── Helpers 

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // enlever le préfixe data:...;base64,
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const DOC_TYPE_LABELS: Record<string, string> = {
  ordonnance: '📋 Ordonnance',
  biologie:   '🧪 Analyse',
  imagerie:   '🩻 Radio / IRM',
  certificat: '📄 Certificat',
  autre:      '📎 Autre',
}

// ── Composant principal 

export function OcrScanner() {
  const [scanning, setScanning] = useState(false)
  const [preview, setPreview] = useState<{ dataUrl: string; file: File } | null>(null)
  const [result, setResult] = useState<{ text: string; confidence?: number; documentType?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [docName, setDocName] = useState('')
  const [saved, setSaved] = useState<ScannedDocument[]>(() => loadSaved())
  const [selectedDoc, setSelectedDoc] = useState<ScannedDocument | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // ── Traitement image 

  const processFile = useCallback(async (file: File) => {
    setError(null)
    setResult(null)

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Fichier non supporté. Utilisez une image (JPG, PNG, WEBP) ou un PDF.')
      return
    }

    const dataUrl = await fileToDataUrl(file)
    setPreview({ dataUrl, file })
    setDocName(file.name.replace(/\.[^/.]+$/, ''))
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  // ── Lancer l'OCR 

  const runOcr = async () => {
    if (!preview) return
    setScanning(true)
    setError(null)
    try {
      const base64 = await fileToBase64(preview.file)
      // Backend: POST /ocr/scan → DocumentController.scan() → OcrService → Python
      // Réponse: { success, data: { uuid, type, title, extracted_text, ai_summary } }
      const res = await patientApi.scanDocument(base64, docName || undefined)
      const backendDoc = (res.data as any)?.data ?? res.data

      const extractedText = backendDoc?.extracted_text ?? backendDoc?.text ?? ''
      const docType       = backendDoc?.type ?? backendDoc?.document_type ?? null
      const aiSummary     = backendDoc?.ai_summary ?? null
      const savedTitle    = backendDoc?.title ?? null

      setResult({
        text: extractedText || (aiSummary ? `[Résumé IA]
${aiSummary}` : ''),
        documentType: docType,
        // Pas de confidence score dans la réponse backend
      })

      // Mettre à jour le nom si le LLM a trouvé un titre
      if (savedTitle && !docName) setDocName(savedTitle)
      else if (docType && !docName) setDocName(DOC_TYPE_LABELS[docType] || docType)

      // Le document est DÉJÀ sauvegardé en base par le backend.
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || e?.message || "Erreur OCR"
      setError(msg)
    } finally {
      setScanning(false)
    }
  }

  // ── Sauvegarder localement 

  const saveLocally = () => {
    if (!result || !preview) return
    const doc: ScannedDocument = {
      id: crypto.randomUUID(),
      name: docName || `Document ${new Date().toLocaleDateString('fr-FR')}`,
      scannedAt: new Date().toISOString(),
      imageDataUrl: preview.dataUrl,
      text: result.text,
      confidence: result.confidence,
      documentType: result.documentType,
      size: preview.file.size,
    }
    const updated = [doc, ...saved]
    setSaved(updated)
    saveDocs(updated)
    // reset
    setPreview(null)
    setResult(null)
    setDocName('')
  }

  // ── Télécharger le texte extrait 

  const downloadText = (doc: ScannedDocument) => {
    const blob = new Blob([doc.text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.name.replace(/\s+/g, '_')}_OCR.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const deleteDoc = (id: string) => {
    const updated = saved.filter((d) => d.id !== id)
    setSaved(updated)
    saveDocs(updated)
    if (selectedDoc?.id === id) setSelectedDoc(null)
  }

  const resetCapture = () => {
    setPreview(null)
    setResult(null)
    setError(null)
    setDocName('')
  }

  // ── Render 

  return (
    <div className="space-y-6">
      {/* Zone de capture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-5 w-5 text-primary" />
            Scanner un document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!preview ? (
            <div className="grid grid-cols-2 gap-3">
              {/* Prise de vue caméra */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-6 hover:border-primary hover:bg-primary-50 transition-colors"
              >
                <Camera className="h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Prendre une photo</span>
                <span className="text-xs text-gray-400">Caméra du téléphone</span>
              </button>

              {/* Upload fichier */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-6 hover:border-primary hover:bg-primary-50 transition-colors"
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Choisir un fichier</span>
                <span className="text-xs text-gray-400">JPG, PNG, PDF</span>
              </button>

              {/* Inputs cachés */}
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Aperçu */}
              <div className="relative">
                <img
                  src={preview.dataUrl}
                  alt="Document à scanner"
                  className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50"
                />
                <button
                  onClick={resetCapture}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-100"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              {/* Nom du document */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nom du document</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Ex : Ordonnance Dr. Benali — Mars 2026"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Lancer OCR */}
              {!result && (
                <Button onClick={runOcr} disabled={scanning} className="w-full gap-2">
                  {scanning
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours...</>
                    : <><ScanLine className="h-4 w-4" /> Analyser le document</>}
                </Button>
              )}
            </div>
          )}

          {/* Erreur */}
          {error && (
            <Alert variant="destructive" className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-sm">{error}</p>
            </Alert>
          )}

          {/* Résultat OCR */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-gray-800">Texte extrait</span>
                    {result.documentType && (
                      <Badge variant="secondary">{DOC_TYPE_LABELS[result.documentType] || result.documentType}</Badge>
                    )}
                    {result.confidence !== undefined && (
                      <Badge variant={result.confidence > 0.8 ? 'success' : 'warning'}>
                        {Math.round(result.confidence * 100)}% confiance
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {result.text || '(Aucun texte détecté — vérifiez la qualité de limage)'}
                  </pre>
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveLocally} className="flex-1 gap-2">
                    <Download className="h-4 w-4" />
                    Sauvegarder localement
                  </Button>
                  <Button variant="outline" onClick={resetCapture} className="gap-2">
                    <X className="h-4 w-4" />
                    Recommencer
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Documents sauvegardés */}
      {saved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Documents scannés ({saved.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {saved.map((doc) => (
              <div
                key={doc.id}
                className={cn(
                  'rounded-lg border p-3 cursor-pointer transition-colors',
                  selectedDoc?.id === doc.id ? 'border-primary bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900 truncate">{doc.name}</span>
                      {doc.documentType && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(doc.scannedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' · '}{formatSize(doc.size)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadText(doc) }}
                      className="h-7 w-7 rounded flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary-50"
                      title="Télécharger le texte"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id) }}
                      className="h-7 w-7 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Texte extrait (accordéon) */}
                <AnimatePresence>
                  {selectedDoc?.id === doc.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-gray-100"
                    >
                      <p className="text-xs font-semibold text-gray-500 mb-1">Texte extrait</p>
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed bg-white rounded p-2 border max-h-40 overflow-y-auto">
                        {doc.text || '(Aucun texte)'}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
