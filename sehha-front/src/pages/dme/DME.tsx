// src/pages/dme/DME.tsx
// Vue DME patient — lecture seule pour les données médicales (spec PDF)
// 5 onglets : Vue rapide | Consultations | Documents | Constantes | Urgences
// + onglet Scanner (OCR)
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Activity, AlertTriangle,
  User, Droplet, Ruler, CreditCard, ChevronDown, ChevronUp,
  Download, CheckCircle2, XCircle, TrendingUp,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { useDME } from '@/hooks/useDME'
import { dmeApi } from '@/lib/dmeApi'
import { OcrScanner } from '@/components/dme/OcrScanner'
import { QRScanner } from '@/components/dme/QRScanner'
import { VITAL_META } from '@/types/dme'
import type { VitalType, Consultation, VitalSign } from '@/types/dme'
import { cn } from '@/lib/utils'

// ── Types & helpers ───────────────────────────────────────────────────────────

type Tab = 'vue_rapide' | 'consultations' | 'documents' | 'constantes' | 'urgences' | 'scanner' | 'verify'

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

const formatDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const SEVERITY_LABELS: Record<string, { label: string; cls: string; badge: 'destructive' | 'warning' | 'secondary' }> = {
  mild:         { label: 'Légère',         cls: 'bg-yellow-50 border-yellow-200', badge: 'secondary' },
  moderate:     { label: 'Modérée',        cls: 'bg-orange-50 border-orange-200', badge: 'warning' },
  severe:       { label: 'Sévère',         cls: 'bg-red-50 border-red-200',       badge: 'destructive' },
  anaphylactic: { label: 'Anaphylactique', cls: 'bg-red-100 border-red-400',      badge: 'destructive' },
}

const PRIORITY_MAP: Record<string, { cls: string }> = {
  P1: { cls: 'bg-red-600 text-white' },
  P2: { cls: 'bg-orange-500 text-white' },
  P3: { cls: 'bg-yellow-500 text-white' },
  P4: { cls: 'bg-green-500 text-white' },
}

// ── Onglet 1 : Vue Rapide ─────────────────────────────────────────────────────

function VueRapideTab({ dmeData }: { dmeData: NonNullable<ReturnType<typeof useDME>['dmeData']> }) {
  const { patient, record, allergies, medical_history, vitals_latest, stats } = dmeData
  const criticalAllergies = allergies.filter((a) => a.severity === 'severe' || a.severity === 'anaphylactic')
  const activeConditions = medical_history.filter((h) => !h.resolved_at)

  // Dernière valeur par type de constante
  const latestByType: Record<string, VitalSign> = {}
  for (const v of vitals_latest ?? []) {
    if (!latestByType[v.type]) latestByType[v.type] = v
  }

  return (
    <div className="space-y-4">
      {/* Bloc A — Identité */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900">{patient.name}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                {patient.phone && <span>Tél : {patient.phone}</span>}
                {record?.referring_doctor && <span>Médecin réf. : {record.referring_doctor}</span>}
                {stats?.last_visit && <span>Dernière visite : {formatDate(stats.last_visit)}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {record?.blood_group && (
                <Badge className="bg-red-500 text-white gap-1">
                  <Droplet className="h-3 w-3" />{record.blood_group}
                </Badge>
              )}
              {record?.height_cm && (
                <Badge variant="outline" className="gap-1">
                  <Ruler className="h-3 w-3" />{record.height_cm} cm
                </Badge>
              )}
              {record?.coverage_type && (
                <Badge variant="outline" className="gap-1">
                  <CreditCard className="h-3 w-3" />{record.coverage_type}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloc B — Alertes critiques (lecture seule, informative) */}
      {criticalAllergies.length > 0 && (
        <div className="rounded-xl border-2 border-red-400 bg-red-50 p-4 space-y-2">
          <h3 className="font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Mes allergies critiques — à signaler à tout soignant
          </h3>
          {criticalAllergies.map((a) => (
            <div key={a.id} className="flex items-start gap-2 text-sm text-red-800">
              <span className="font-semibold uppercase">ALLERGIE</span>
              <span>{a.substance} — {SEVERITY_LABELS[a.severity]?.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bloc C — Résumé (2 colonnes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Pathologies actives</p>
            {activeConditions.length === 0
              ? <p className="text-sm text-gray-400">Aucune</p>
              : activeConditions.map((h) => (
                  <p key={h.id} className="text-sm text-gray-700">• {h.description}</p>
                ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Allergies connues</p>
            {allergies.length === 0
              ? <p className="text-sm text-gray-400">Aucune</p>
              : allergies.map((a) => (
                  <p key={a.id} className="text-sm text-gray-700">• {a.substance} ({SEVERITY_LABELS[a.severity]?.label})</p>
                ))}
          </CardContent>
        </Card>
      </div>

      {/* Bloc D — Indicateurs actuels */}
      {Object.keys(latestByType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Mes dernières constantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(latestByType)
                .filter(([t]) => ['tension_sys', 'heart_rate', 'spo2', 'glycemia'].includes(t))
                .map(([type, v]) => {
                  const meta = VITAL_META[type as VitalType]
                  const abnormal = v.is_abnormal
                  return (
                    <div key={type} className={cn('rounded-lg border p-3 text-center', abnormal ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50')}>
                      <p className="text-xs text-gray-500">{meta?.label ?? type}</p>
                      <p className={cn('text-lg font-bold', abnormal ? 'text-red-600' : 'text-gray-900')}>
                        {v.value}{v.value_2 ? `/${v.value_2}` : ''} <span className="text-xs font-normal">{meta?.unit}</span>
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(v.measured_at)}</p>
                    </div>
                  )
                })}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              ℹ️ Les constantes ne peuvent être modifiées que par un soignant
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Onglet 2 : Consultations ──────────────────────────────────────────────────

function ConsultationsTab() {
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: consultations = [], isLoading } = useQuery({
    queryKey: ['my-consultations'],
    queryFn: async () => {
      const res = await dmeApi.getMyConsultations()
      const raw = (res.data as any)
      return Array.isArray(raw) ? raw : (raw?.data ?? [])
    },
  })

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Lecture seule — {consultations.length} consultation(s) enregistrée(s)
      </p>
      {consultations.length === 0 && (
        <Card><CardContent className="py-12 text-center text-gray-400">Aucune consultation</CardContent></Card>
      )}
      {consultations.map((c: Consultation) => (
        <Card key={c.uuid}>
          <CardContent className="p-4">
            <div
              className="flex items-start justify-between cursor-pointer"
              onClick={() => setExpanded(expanded === c.uuid ? null : c.uuid)}
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{formatDate(c.consultation_date)}</span>
                  <span className="text-sm text-gray-500">{c.doctor}</span>
                  {c.service && <Badge variant="outline" className="text-xs">{c.service}</Badge>}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">Motif : {c.motif}</p>
                <p className="text-sm font-medium">Diagnostic : {c.diagnosis}</p>
              </div>
              {expanded === c.uuid
                ? <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" />
                : <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />}
            </div>

            <AnimatePresence>
              {expanded === c.uuid && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-gray-100 space-y-3"
                >
                  {c.treatment && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500">Traitement</p>
                      <p className="text-sm text-gray-700">{c.treatment}</p>
                    </div>
                  )}
                  {c.icd10_code && (
                    <p className="text-xs text-gray-500">Code CIM-10 : <span className="font-mono font-medium">{c.icd10_code}</span></p>
                  )}
                  {c.follow_up_required && (
                    <p className="text-sm text-primary">📅 Suivi requis{c.follow_up_date ? ` — ${formatDate(c.follow_up_date)}` : ''}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Onglet 3 : Documents & Ordonnances ───────────────────────────────────────

function DocumentsTab() {
  const { downloadPrescription } = useDME()

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['my-documents'],
    queryFn: async () => {
      const res = await dmeApi.getMyDocuments()
      const raw = (res.data as any)
      return Array.isArray(raw) ? raw : (raw?.data ?? [])
    },
  })

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Vos ordonnances et documents médicaux</p>
      {prescriptions.length === 0 && (
        <Card><CardContent className="py-12 text-center text-gray-400">Aucun document</CardContent></Card>
      )}
      {prescriptions.map((p: any) => {
        const isExpired = p.expires_at && new Date(p.expires_at) < new Date()
        return (
          <Card key={p.uuid}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium">{p.title}</span>
                    <Badge variant={isExpired ? 'destructive' : p.status === 'valide' ? 'success' : 'secondary'}>
                      {isExpired ? 'Expirée' : p.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Émise le {formatDate(p.issued_at)}
                    {p.expires_at && ` · Expire le ${formatDate(p.expires_at)}`}
                  </p>
                  {p.medicaments?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {p.medicaments.map((m: any, i: number) => (
                        <p key={i} className="text-xs text-gray-600">
                          • <span className="font-medium">{m.nom}</span> — {m.posologie} pendant {m.duree}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 shrink-0"
                  onClick={() => downloadPrescription(p.uuid, `${p.title}.pdf`)}
                >
                  <Download className="h-3 w-3" />
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ── Onglet 4 : Constantes (lecture seule) ────────────────────────────────────

function ConstantesTab() {
  const { data: vitals = [], isLoading } = useQuery({
    queryKey: ['my-vitals'],
    queryFn: async () => {
      const res = await dmeApi.getMyVitals()
      const raw = (res.data as any)
      return Array.isArray(raw) ? raw : (raw?.data ?? [])
    },
  })

  // Grouper par type
  const byType: Record<string, VitalSign[]> = {}
  for (const v of vitals) {
    if (!byType[v.type]) byType[v.type] = []
    byType[v.type].push(v)
  }

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  return (
    <div className="space-y-4">
      <Alert className="flex items-start gap-2 bg-blue-50 border-blue-200 text-blue-800">
        <Activity className="h-4 w-4 mt-0.5 shrink-0" />
        <p className="text-sm">Les constantes vitales sont mesurées par votre soignant et ne peuvent pas être modifiées ici.</p>
      </Alert>

      {Object.keys(byType).length === 0 && (
        <Card><CardContent className="py-12 text-center text-gray-400">Aucune constante enregistrée</CardContent></Card>
      )}

      {Object.entries(byType).map(([type, values]) => {
        const meta = VITAL_META[type as VitalType]
        return (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {meta?.label ?? type}
                <span className="text-xs font-normal text-gray-400">({meta?.unit})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {values.slice(0, 10).map((v, i) => (
                  <div key={i} className={cn(
                    'shrink-0 rounded border p-2 text-center min-w-[80px]',
                    v.is_abnormal ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  )}>
                    <p className={cn('text-sm font-bold', v.is_abnormal ? 'text-red-600' : 'text-gray-800')}>
                      {v.value}{v.value_2 ? `/${v.value_2}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(v.measured_at)}</p>
                    {v.is_abnormal && <p className="text-xs text-red-500">⚠</p>}
                  </div>
                ))}
              </div>
              {meta?.min && meta?.max && (
                <p className="text-xs text-gray-400 mt-2">Norme : {meta.min}–{meta.max} {meta.unit}</p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ── Onglet 5 : Urgences ───────────────────────────────────────────────────────

function UrgencesTab({ dmeData }: { dmeData: NonNullable<ReturnType<typeof useDME>['dmeData']> }) {
  const triages = dmeData.triages ?? []

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Historique de vos passages aux urgences</p>
      {triages.length === 0 && (
        <Card><CardContent className="py-12 text-center text-gray-400">Aucun passage aux urgences</CardContent></Card>
      )}
      {triages.map((t) => {
        const p = PRIORITY_MAP[t.ia_score] || PRIORITY_MAP.P4
        return (
          <Card key={t.uuid} className={cn(t.ia_score === 'P1' && 'border-l-4 border-l-red-500')}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('rounded px-2 py-0.5 text-xs font-bold', p.cls)}>{t.ia_score}</span>
                    <span className="text-sm">{formatDateTime(t.triage_date)}</span>
                    <span className="text-xs text-gray-500">{t.orientation}</span>
                  </div>
                  {t.red_flags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.red_flags.map((f) => <Badge key={f} variant="destructive" className="text-xs">{f}</Badge>)}
                    </div>
                  )}
                  {t.final_outcome && (
                    <p className="text-xs text-gray-500 mt-1">Issue : {t.final_outcome}</p>
                  )}
                </div>
                {t.human_validated
                  ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  : <XCircle className="h-5 w-5 text-orange-400 shrink-0" />}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}


// ── Page principale ───────────────────────────────────────────────────────────

export default function DMEPage() {
  const { dmeData, isLoading } = useDME()
  const [activeTab, setActiveTab] = useState<Tab>('vue_rapide')

  if (isLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><LoadingSpinner size="lg" /></div>
  }

  if (!dmeData) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>Aucun dossier médical trouvé</p>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'vue_rapide',    label: '⚡ Vue rapide' },
    { id: 'consultations', label: '📋 Consultations' },
    { id: 'documents',     label: '📄 Documents' },
    { id: 'constantes',    label: '📊 Constantes' },
    { id: 'urgences',      label: '🚨 Urgences' },
    { id: 'scanner',       label: '🔍 Scanner' },
    { id: 'verify',        label: '✅ Vérifier QR' },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Mon Dossier Médical
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {dmeData.record?.blood_group && (
            <Badge className="bg-red-500 text-white gap-1">
              <Droplet className="h-3 w-3" />Groupe {dmeData.record.blood_group}
            </Badge>
          )}
          {dmeData.record?.coverage_type && (
            <Badge variant="outline" className="gap-1">
              <CreditCard className="h-3 w-3" />{dmeData.record.coverage_type}
            </Badge>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-lg px-3 py-2 text-xs font-medium transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {activeTab === 'vue_rapide'    && <VueRapideTab dmeData={dmeData} />}
          {activeTab === 'consultations' && <ConsultationsTab />}
          {activeTab === 'documents'     && <DocumentsTab />}
          {activeTab === 'constantes'    && <ConstantesTab />}
          {activeTab === 'urgences'      && <UrgencesTab dmeData={dmeData} />}
          {activeTab === 'scanner'       && <OcrScanner />}
          {activeTab === 'verify'        && <QRScanner />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
