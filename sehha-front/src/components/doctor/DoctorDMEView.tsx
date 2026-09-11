// src/components/doctor/DoctorDMEView.tsx
// Vue DME complète côté médecin — 5 onglets conformes à la spec dme.pdf
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, AlertTriangle, Stethoscope, FileText, Activity, Siren,
  Droplet, CreditCard, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  TrendingUp, Plus, Mic, MicOff, Save, Download, ClipboardList,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { dmeApi } from '@/lib/dmeApi'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { useConsultationWorkspace } from '@/hooks/useConsultationWorkspace'
import { VITAL_META } from '@/types/dme'
import type { DME, VitalSign, VitalType, Consultation } from '@/types/dme'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

type DmeTab = 'vue_rapide' | 'consultations' | 'documents' | 'constantes' | 'urgences'

interface DoctorDMEViewProps {
  patientUuid: string
  dme: DME
  /** Callback appelé après création d'une consultation (pour débloquer l'ordonnance) */
  onConsultationSaved?: (uuid: string) => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const formatDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const SEVERITY_MAP: Record<string, { label: string; cls: string }> = {
  mild:         { label: 'Légère',        cls: 'bg-yellow-50 border-yellow-200' },
  moderate:     { label: 'Modérée',       cls: 'bg-orange-50 border-orange-200' },
  severe:       { label: 'Sévère',        cls: 'bg-red-50 border-red-200' },
  anaphylactic: { label: 'Anaphylactique', cls: 'bg-red-100 border-red-400' },
}

const PRIORITY_MAP: Record<string, { cls: string; label: string }> = {
  P1: { cls: 'bg-red-600 text-white',    label: 'P1 — Urgence absolue' },
  P2: { cls: 'bg-orange-500 text-white', label: 'P2 — Très urgent' },
  P3: { cls: 'bg-yellow-500 text-white', label: 'P3 — Urgent' },
  P4: { cls: 'bg-green-500 text-white',  label: 'P4 — Non urgent' },
}

function isAbnormal(type: VitalType, value: number) {
  const m = VITAL_META[type]
  if (!m) return false
  if (m.alertHigh && value > m.alertHigh) return true
  if (m.alertLow  && value < m.alertLow)  return true
  return false
}

function VitalBadge({ type, value }: { type: VitalType; value: number }) {
  const m = VITAL_META[type]
  const abnormal = isAbnormal(type, value)
  return (
    <div className={cn('rounded-lg border p-3 text-center', abnormal ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50')}>
      <p className="text-xs text-gray-500">{m?.label ?? type}</p>
      <p className={cn('text-lg font-bold', abnormal ? 'text-red-600' : 'text-gray-900')}>
        {value} <span className="text-xs font-normal">{m?.unit}</span>
      </p>
      {abnormal && <p className="text-xs text-red-500 mt-0.5">⚠ Hors norme</p>}
    </div>
  )
}

// ── Tab: Vue Rapide (Onglet 1) ────────────────────────────────────────────────

function VueRapideTab({ dme, onConsult }: { dme: DME; onConsult: () => void }) {
  const { patient, record, allergies, medical_history, vitals_latest, stats } = dme

  const criticalAllergies = allergies.filter((a) => a.severity === 'severe' || a.severity === 'anaphylactic')
  const activeHistory = medical_history.filter((h) => !h.resolved_at)

  // Grouper les dernières constantes par type (1 par type)
  const latestByType: Record<string, VitalSign> = {}
  for (const v of (vitals_latest ?? [])) {
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
                {patient.age && <span>Âge : {patient.age} ans</span>}
                {patient.cin && <span>CIN : {patient.cin}</span>}
                {patient.phone && <span>Tél : {patient.phone}</span>}
                {record?.referring_doctor && <span>Médecin réf. : {record.referring_doctor}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {record?.blood_group && (
                <Badge className="bg-red-500 text-white gap-1">
                  <Droplet className="h-3 w-3" />{record.blood_group}
                </Badge>
              )}
              {record?.coverage_type && (
                <Badge variant="outline" className="gap-1">
                  <CreditCard className="h-3 w-3" />{record.coverage_type}
                </Badge>
              )}
            </div>
          </div>
          {stats && (
            <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
              <span>{stats.total_consultations} consultation(s)</span>
              {stats.last_visit && <span>Dernière visite : {formatDate(stats.last_visit)}</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bloc B — Alertes critiques */}
      {(criticalAllergies.length > 0 || activeHistory.length > 0) && (
        <div className="rounded-xl border-2 border-red-400 bg-red-50 p-4 space-y-2">
          <h3 className="font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            ALERTES CRITIQUES — À lire avant tout acte
          </h3>
          {criticalAllergies.map((a) => (
            <div key={a.id} className="flex items-start gap-2 text-sm text-red-800">
              <span className="font-semibold uppercase">ALLERGIE</span>
              <span>{a.substance} — {a.reaction_description || SEVERITY_MAP[a.severity]?.label}</span>
            </div>
          ))}
          {activeHistory.map((h) => (
            <div key={h.id} className="flex items-start gap-2 text-sm text-red-800">
              <span className="font-semibold uppercase">{h.type}</span>
              <span>{h.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bloc C — Résumé médical (4 colonnes) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">Pathologies chroniques</p>
            {activeHistory.length === 0
              ? <p className="text-xs text-gray-400">Aucune</p>
              : activeHistory.map((h) => (
                  <p key={h.id} className="text-xs text-gray-700">• {h.description} ({h.type})</p>
                ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">Allergies</p>
            {allergies.length === 0
              ? <p className="text-xs text-gray-400">Aucune connue</p>
              : allergies.slice(0, 3).map((a) => (
                  <p key={a.id} className="text-xs text-gray-700">• {a.substance} ({SEVERITY_MAP[a.severity]?.label})</p>
                ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">Antécédents résolus</p>
            {medical_history.filter(h => h.resolved_at).length === 0
              ? <p className="text-xs text-gray-400">Aucun</p>
              : medical_history.filter(h => h.resolved_at).slice(0, 3).map((h) => (
                  <p key={h.id} className="text-xs text-gray-700">• {h.description}</p>
                ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">Dernière visite</p>
            {stats?.last_visit
              ? <p className="text-xs text-gray-700">{formatDate(stats.last_visit)}</p>
              : <p className="text-xs text-gray-400">Aucune</p>}
          </CardContent>
        </Card>
      </div>

      {/* Bloc D — Indicateurs de santé actuels */}
      {Object.keys(latestByType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Indicateurs de santé actuels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(latestByType)
                .filter(([t]) => ['tension_sys', 'heart_rate', 'spo2', 'glycemia'].includes(t))
                .map(([type, v]) => (
                  <VitalBadge key={type} type={type as VitalType} value={v.value} />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bloc E — Actions rapides */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onConsult} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle consultation
        </Button>
      </div>
    </div>
  )
}

// ── Tab: Consultations (Onglet 2) ─────────────────────────────────────────────

function ConsultationsTab({ patientUuid }: { patientUuid: string }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: consultations = [], isLoading } = useQuery({
    queryKey: ['consultations', patientUuid],
    queryFn: async () => {
      const { data } = await dmeApi.getConsultations(patientUuid)
      return data
    },
    enabled: !!patientUuid,
  })

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-500">{consultations.length} consultation(s) — antéchronologique</h3>
      {consultations.length === 0 && (
        <Card><CardContent className="py-12 text-center text-gray-400">Aucune consultation</CardContent></Card>
      )}
      {consultations.map((c: Consultation) => (
        <Card key={c.uuid} className="overflow-hidden">
          <CardContent className="p-4">
            <div
              className="flex items-start justify-between cursor-pointer"
              onClick={() => setExpanded(expanded === c.uuid ? null : c.uuid)}
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{formatDate(c.consultation_date)}</span>
                  <span className="text-sm text-gray-500">{c.doctor}</span>
                  {c.service && <Badge variant="outline" className="text-xs">{c.service}</Badge>}
                  {c.icd10_code && <Badge variant="secondary" className="text-xs font-mono">{c.icd10_code}</Badge>}
                </div>
                <p className="mt-1 text-sm text-gray-600">Motif : {c.motif}</p>
                <p className="text-sm font-medium text-gray-800">Diagnostic : {c.diagnosis}</p>
              </div>
              {expanded === c.uuid ? <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" /> : <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />}
            </div>
            <AnimatePresence>
              {expanded === c.uuid && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-gray-100 space-y-3"
                >
                  {c.treatment && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Traitement</p>
                      <p className="text-sm text-gray-700">{c.treatment}</p>
                    </div>
                  )}
                  {c.symptoms_notes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Symptômes / Notes</p>
                      <p className="text-sm text-gray-700">{c.symptoms_notes}</p>
                    </div>
                  )}
                  {c.report_text && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Compte-rendu</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-2">{c.report_text}</p>
                    </div>
                  )}
                  {c.follow_up_required && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <ClipboardList className="h-4 w-4" />
                      Suivi requis{c.follow_up_date ? ` — ${formatDate(c.follow_up_date)}` : ''}
                    </div>
                  )}
                  {c.exams_requested && c.exams_requested.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Examens demandés</p>
                      <div className="flex flex-wrap gap-1">
                        {c.exams_requested.map((ex, i) => <Badge key={i} variant="outline" className="text-xs">{ex}</Badge>)}
                      </div>
                    </div>
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

// ── Tab: Documents (Onglet 3) ─────────────────────────────────────────────────

function DocumentsTab({ patientUuid }: { patientUuid: string }) {
  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['prescriptions', patientUuid],
    queryFn: async () => {
      const { data } = await dmeApi.getPrescriptions(patientUuid)
      return data
    },
    enabled: !!patientUuid,
  })

  const downloadPDF = async (uuid: string, title: string) => {
    const res = await dmeApi.getPrescriptionPDF(uuid)
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${title}.pdf`
    a.click(); URL.revokeObjectURL(url)
  }

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-500">Ordonnances & Documents</h3>
      {prescriptions.length === 0 && (
        <Card><CardContent className="py-12 text-center text-gray-400">Aucun document</CardContent></Card>
      )}
      {prescriptions.map((p: any) => (
        <Card key={p.uuid}>
          <CardContent className="p-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium">{p.title}</span>
                <Badge variant={p.status === 'valide' ? 'success' : 'secondary'}>{p.status}</Badge>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Émise le {formatDate(p.issued_at)}
                {p.expires_at && ` · Expire le ${formatDate(p.expires_at)}`}
              </p>
              {p.medicaments?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.medicaments.map((m: any, i: number) => (
                    <span key={i} className="text-xs bg-gray-100 rounded px-2 py-0.5">{m.nom} — {m.posologie}</span>
                  ))}
                </div>
              )}
            </div>
            <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => downloadPDF(p.uuid, p.title)}>
              <Download className="h-3 w-3" />PDF
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Tab: Constantes (Onglet 4) ────────────────────────────────────────────────

const VITAL_GROUPS: { label: string; vitals: { type: VitalType; hasSecond?: boolean; secondLabel?: string }[] }[] = [
  {
    label: 'Cardio-vasculaire',
    vitals: [
      { type: 'tension_sys', hasSecond: true, secondLabel: 'Diastolique (mmHg)' },
      { type: 'heart_rate' },
      { type: 'spo2' },
    ],
  },
  {
    label: 'Métabolique',
    vitals: [{ type: 'temperature' }, { type: 'glycemia' }, { type: 'respiratory_rate' }],
  },
  {
    label: 'Anthropométrie',
    vitals: [{ type: 'weight' }],
  },
]

function ConstantesTab({ workspace }: { workspace: ReturnType<typeof useConsultationWorkspace> }) {
  const { vitalsForm, updateVital, vitalsHistory, saveAllVitals, isSavingVitals } = workspace

  // Grouper l'historique par type
  const byType: Record<string, VitalSign[]> = {}
  for (const v of vitalsHistory) {
    if (!byType[v.type]) byType[v.type] = []
    byType[v.type].push(v)
  }

  return (
    <div className="space-y-6">
      {/* Formulaire de saisie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Saisir de nouvelles constantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {VITAL_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{group.label}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {group.vitals.map(({ type }) => {
                  const meta = VITAL_META[type]
                  const val = vitalsForm[type] ?? ''
                  const numVal = parseFloat(val)
                  const abnormal = val !== '' && !isNaN(numVal) && isAbnormal(type, numVal)
                  return (
                    <div key={type}>
                      <label className="text-xs text-gray-600 mb-1 block">{meta.label} ({meta.unit})</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={val}
                        onChange={(e) => updateVital(type, e.target.value)}
                        placeholder={meta.min && meta.max ? `${meta.min}–${meta.max}` : ''}
                        className={cn('text-sm', abnormal && 'border-red-400 focus:ring-red-300')}
                      />
                      {abnormal && <p className="text-xs text-red-500 mt-0.5">⚠ Valeur hors norme</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          <Button onClick={saveAllVitals} disabled={isSavingVitals} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {isSavingVitals ? 'Enregistrement...' : 'Enregistrer toutes les constantes'}
          </Button>
        </CardContent>
      </Card>

      {/* Historique */}
      {Object.keys(byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Historique des constantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(byType).map(([type, values]) => {
                const meta = VITAL_META[type as VitalType]
                return (
                  <div key={type}>
                    <p className="text-xs font-semibold text-gray-500 mb-1">{meta?.label ?? type}</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {values.slice(0, 8).map((v, i) => (
                        <div key={i} className={cn(
                          'shrink-0 rounded border p-2 text-center min-w-[80px]',
                          v.is_abnormal ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                        )}>
                          <p className={cn('text-sm font-bold', v.is_abnormal ? 'text-red-600' : 'text-gray-800')}>
                            {v.value}{v.value_2 ? `/${v.value_2}` : ''} <span className="text-xs font-normal">{meta?.unit}</span>
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(v.measured_at)}</p>
                          {v.is_abnormal && <p className="text-xs text-red-500">⚠</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Tab: Urgences (Onglet 5) ──────────────────────────────────────────────────

function UrgencesTab({ triages }: { triages: DME['triages'] }) {
  if (!triages || triages.length === 0) {
    return <Card><CardContent className="py-12 text-center text-gray-400">Aucun passage aux urgences</CardContent></Card>
  }

  // Détecter un pattern récurrent
  const hasPattern = triages.length >= 2 && triages.slice(0, 2).some(t => t.ia_score === 'P1' || t.ia_score === 'P2')

  return (
    <div className="space-y-3">
      {hasPattern && (
        <Alert variant="destructive" className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Pattern IA détecté</p>
            <p className="text-sm">{triages.length} passages — score élevé répété. Pathologie sous-jacente à investiguer.</p>
          </div>
        </Alert>
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
                    <span className="text-sm font-medium">{formatDateTime(t.triage_date)}</span>
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

// ── Espace Consultation (création + dictée + constantes intégrées) ─────────────

function ConsultationWorkspace({ patientUuid, dme, onSaved }: { patientUuid: string; dme: DME; onSaved?: (uuid: string) => void }) {
  const workspace = useConsultationWorkspace(patientUuid)
  const { form, updateField, reportText, setReportText, saveConsultation, isSavingConsultation, savedConsultationUuid, dictateMutation, isDictating } = workspace
  const { isListening, transcript, interimText, start, stop, clear } = useSpeechToText()
  const [workspaceTab, setWorkspaceTab] = useState<'form' | 'vitals'>('form')

  const handleDictate = () => {
    if (isListening) {
      stop()
      if (transcript.trim()) {
        dictateMutation.mutate(transcript)
        clear()
      }
    } else {
      start()
    }
  }

  useEffect(() => {
    if (savedConsultationUuid) onSaved?.(savedConsultationUuid)
  }, [savedConsultationUuid, onSaved])

  return (
    <div className="space-y-4">
      {/* Patient header */}
      <div className="rounded-lg bg-primary-50 border border-primary-200 p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold text-white shrink-0">
          {dme.patient.name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-primary">{dme.patient.name}</p>
          <p className="text-xs text-primary-600">Espace consultation</p>
        </div>
      </div>

      {/* Alertes allergies rapides */}
      {dme.allergies.filter(a => a.severity === 'severe' || a.severity === 'anaphylactic').length > 0 && (
        <Alert variant="destructive" className="flex items-start gap-2 py-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p className="text-sm font-medium">
            Allergies critiques : {dme.allergies.filter(a => a.severity === 'severe' || a.severity === 'anaphylactic').map(a => a.substance).join(', ')}
          </p>
        </Alert>
      )}

      {/* Workspace tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {(['form', 'vitals'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setWorkspaceTab(t)}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all',
              workspaceTab === t ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {t === 'form' ? '📋 Consultation' : '📊 Constantes'}
          </button>
        ))}
      </div>

      {workspaceTab === 'form' && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            {/* Motif */}
            <div>
              <label className="text-sm font-medium">Motif <span className="text-red-500">*</span></label>
              <Input value={form.motif || ''} onChange={(e) => updateField('motif', e.target.value)} placeholder="Motif de la visite..." className="mt-1" />
            </div>

            {/* Diagnostic */}
            <div>
              <label className="text-sm font-medium">Diagnostic <span className="text-red-500">*</span></label>
              <Input value={form.diagnosis || ''} onChange={(e) => updateField('diagnosis', e.target.value)} placeholder="Diagnostic principal..." className="mt-1" />
            </div>

            {/* ICD-10 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Code ICD-10</label>
                <Input value={form.icd10_code || ''} onChange={(e) => updateField('icd10_code', e.target.value.toUpperCase())} placeholder="Ex: I10" className="mt-1 font-mono" />
              </div>
              <div>
                <label className="text-sm font-medium">Date consultation</label>
                <Input type="date" value={form.consultation_date || ''} onChange={(e) => updateField('consultation_date', e.target.value)} className="mt-1" />
              </div>
            </div>

            {/* Traitement */}
            <div>
              <label className="text-sm font-medium">Traitement / Recommandations</label>
              <textarea
                value={form.treatment || ''}
                onChange={(e) => updateField('treatment', e.target.value)}
                placeholder="Traitement proposé..."
                className="mt-1 w-full min-h-[80px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>

            {/* Symptômes */}
            <div>
              <label className="text-sm font-medium">Symptômes observés</label>
              <textarea
                value={form.symptoms_notes || ''}
                onChange={(e) => updateField('symptoms_notes', e.target.value)}
                placeholder="Observations cliniques..."
                className="mt-1 w-full min-h-[80px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>

            {/* Compte-rendu avec dictée vocale */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Compte-rendu (dictée vocale)</label>
                <Button type="button" variant={isListening ? 'destructive' : 'outline'} size="sm" onClick={handleDictate} className="gap-1" disabled={isDictating}>
                  {isListening ? <><Mic className="h-4 w-4 animate-pulse" /> Arrêter</> : <><MicOff className="h-4 w-4" /> Dicter</>}
                </Button>
              </div>
              {isListening && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-primary-200 bg-primary-50 p-3 mb-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Mic className="h-3 w-3 animate-pulse" />
                    Écoute en cours...
                  </div>
                  <p className="text-sm text-gray-800 min-h-[1.5rem]">
                    {transcript && <span>{transcript}</span>}
                    {interimText && (
                      <span className="text-gray-400 italic"> {interimText}</span>
                    )}
                    {!transcript && !interimText && (
                      <span className="text-gray-400 italic">Parlez maintenant...</span>
                    )}
                  </p>
                </motion.div>
              )}
              {isDictating && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <LoadingSpinner size="sm" /> Génération du compte-rendu par l'IA...
                </div>
              )}
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Le compte-rendu apparaît ici après la dictée, ou saisissez-le manuellement..."
                className="w-full min-h-[120px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>

            {/* Suivi */}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="followup" checked={form.follow_up_required || false} onChange={(e) => updateField('follow_up_required', e.target.checked)} className="h-4 w-4" />
              <label htmlFor="followup" className="text-sm">Suivi requis</label>
              {form.follow_up_required && (
                <Input type="date" value={form.follow_up_date || ''} onChange={(e) => updateField('follow_up_date', e.target.value)} className="w-auto" />
              )}
            </div>

            <Button onClick={saveConsultation} disabled={isSavingConsultation} className="w-full gap-2">
              <Save className="h-4 w-4" />
              {isSavingConsultation ? 'Enregistrement...' : 'Enregistrer la consultation'}
            </Button>

            {savedConsultationUuid && (
              <p className="text-sm text-green-600 text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Consultation enregistrée — vous pouvez générer l'ordonnance
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {workspaceTab === 'vitals' && (
        <ConstantesTab workspace={workspace} />
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function DoctorDMEView({ patientUuid, dme, onConsultationSaved }: DoctorDMEViewProps) {
  const [activeTab, setActiveTab] = useState<DmeTab>('vue_rapide')
  const [showWorkspace, setShowWorkspace] = useState(false)

  const tabs: { id: DmeTab; label: string; icon: typeof User }[] = [
    { id: 'vue_rapide',    label: '⚡ Vue rapide',    icon: User },
    { id: 'consultations', label: '📋 Consultations', icon: Stethoscope },
    { id: 'documents',     label: '📄 Documents',     icon: FileText },
    { id: 'constantes',    label: '📊 Constantes',    icon: Activity },
    { id: 'urgences',      label: '🚨 Urgences',      icon: Siren },
  ]

  const workspace = useConsultationWorkspace(patientUuid)

  return (
    <div className="space-y-4">
      {/* Navigation 5 onglets */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setShowWorkspace(false) }}
            className={cn(
              'rounded-lg px-3 py-2 text-xs font-medium transition-all whitespace-nowrap',
              activeTab === tab.id && !showWorkspace
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setShowWorkspace(true)}
          className={cn(
            'rounded-lg px-3 py-2 text-xs font-medium transition-all whitespace-nowrap gap-1 flex items-center',
            showWorkspace ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200'
          )}
        >
          <Plus className="h-3 w-3" />
          Consultation
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showWorkspace ? (
          <motion.div key="workspace" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <ConsultationWorkspace patientUuid={patientUuid} dme={dme} onSaved={onConsultationSaved} />
          </motion.div>
        ) : activeTab === 'vue_rapide' ? (
          <motion.div key="vue_rapide" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <VueRapideTab dme={dme} onConsult={() => setShowWorkspace(true)} />
          </motion.div>
        ) : activeTab === 'consultations' ? (
          <motion.div key="consultations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <ConsultationsTab patientUuid={patientUuid} />
          </motion.div>
        ) : activeTab === 'documents' ? (
          <motion.div key="documents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <DocumentsTab patientUuid={patientUuid} />
          </motion.div>
        ) : activeTab === 'constantes' ? (
          <motion.div key="constantes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <ConstantesTab workspace={workspace} />
          </motion.div>
        ) : (
          <motion.div key="urgences" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <UrgencesTab triages={dme.triages} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
