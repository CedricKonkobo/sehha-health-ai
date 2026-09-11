import { AlertTriangle, History, Droplet, Ruler, CreditCard, Activity, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { DME } from '@/types/dme'

interface PatientDmePanelProps {
  dme: DME
}

function getSeverityVariant(severity: string): 'destructive' | 'warning' | 'secondary' {
  if (severity === 'severe' || severity === 'anaphylactic') return 'destructive'
  if (severity === 'moderate') return 'warning'
  return 'secondary'
}

function formatDate(date?: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function PatientDmePanel({ dme }: PatientDmePanelProps) {
  const { patient, record, allergies, medical_history, vitals_latest } = dme

  return (
    <div className="space-y-4">
      {/* Infos patient */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">{patient.name}</h3>
            <p className="text-xs text-gray-500">UUID: {patient.uuid.slice(0, 8)}...</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {record?.blood_group && (
              <Badge className="bg-danger text-white gap-1">
                <Droplet className="h-3 w-3" />
                Groupe {record.blood_group}
              </Badge>
            )}
            {record?.height_cm && (
              <Badge variant="outline" className="gap-1">
                <Ruler className="h-3 w-3" />
                {record.height_cm} cm
              </Badge>
            )}
            {record?.coverage_type && (
              <Badge variant="outline" className="gap-1">
                <CreditCard className="h-3 w-3" />
                {record.coverage_type}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-danger" />
            Allergies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allergies.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune allergie connue</p>
          ) : (
            <div className="space-y-2">
              {allergies.map((allergy) => (
                <div
                  key={allergy.id}
                  className={cn(
                    'rounded-lg border p-3',
                    allergy.severity === 'severe' || allergy.severity === 'anaphylactic'
                      ? 'bg-danger-50 border-danger-200'
                      : allergy.severity === 'moderate'
                      ? 'bg-warning-50 border-warning-200'
                      : 'bg-gray-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{allergy.substance}</span>
                    <Badge variant={getSeverityVariant(allergy.severity)}>{allergy.severity}</Badge>
                  </div>
                  {allergy.reaction_description && (
                    <p className="text-sm text-gray-600 mt-1">{allergy.reaction_description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Découvert le {formatDate(allergy.discovered_at)}</span>
                    {allergy.documented_by && <span>Documenté par {allergy.documented_by}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Antécédents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            Antécédents médicaux
          </CardTitle>
        </CardHeader>
        <CardContent>
          {medical_history.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun antécédent enregistré</p>
          ) : (
            <div className="space-y-3">
              {medical_history.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.resolved_at ? 'secondary' : 'destructive'}>
                          {item.resolved_at ? 'Résolu' : 'Actif'}
                        </Badge>
                        <span className="text-sm font-medium text-gray-500">{item.type}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{item.description}</p>
                    </div>
                    <div className="text-right text-xs text-gray-400 shrink-0">
                      <div>Début : {formatDate(item.started_at)}</div>
                      {item.resolved_at && <div>Fin : {formatDate(item.resolved_at)}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dernières constantes */}
      {vitals_latest && vitals_latest.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Dernières constantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {vitals_latest.map((vital: any, index: number) => (
                <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">{vital.type || 'Constante'}</p>
                  <p className="text-base font-semibold">
                    {vital.value} {vital.unit || ''}
                  </p>
                  <p className="text-xs text-gray-400">
                    {vital.measured_at ? formatDate(vital.measured_at) : ''}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
