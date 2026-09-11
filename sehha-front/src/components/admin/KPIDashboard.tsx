import { motion } from 'framer-motion'
import { Users, Clock, Bed, Activity, TrendingUp, AlertTriangle, FileText, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { KPICard } from '@/components/doctor/KPICard'
import type { AdminKPI } from '@/types/admin'
import { cn } from '@/lib/utils'

interface KPIDashboardProps {
  kpis: AdminKPI | undefined
  isLoading: boolean
  period: 'today' | 'week' | 'month'
  onPeriodChange: (p: 'today' | 'week' | 'month') => void
}

const PERIODS: { id: 'today' | 'week' | 'month'; label: string }[] = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
]

export function KPIDashboard({ kpis, isLoading, period, onPeriodChange }: KPIDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPeriodChange(p.id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              period === p.id ? 'bg-white text-primary shadow-sm' : 'text-gray-600'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading || !kpis ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-28 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Occupation lits"
              value={`${kpis.taux_occupation_lits.percentage}%`}
              icon={Bed}
              color={kpis.taux_occupation_lits.percentage >= 90 ? 'danger' : 'success'}
            />
            <KPICard title="Temps attente moyen" value={`${kpis.temps_attente_moyen_minutes} min`} icon={Clock} color="warning" />
            <KPICard title="Taux de réorientation" value={`${kpis.taux_reorientation.percentage}%`} icon={TrendingUp} color="info" />
            <KPICard title="Cas P1 aujourd'hui" value={kpis.cas_p1_aujourdhui} icon={AlertTriangle} color="danger" />
            <KPICard title="Triages" value={kpis.flux_patients.triages} icon={Activity} color="primary" />
            <KPICard title="Consultations" value={kpis.flux_patients.consultations} icon={Users} color="primary" />
            <KPICard title="Ordonnances" value={kpis.flux_patients.ordonnances} icon={FileText} color="success" />
            <KPICard
              title="RDV confirmés"
              value={kpis.rdv_stats.confirmed + kpis.rdv_stats.completed}
              icon={CalendarDays}
              color="info"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Rendez-vous par statut
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-8 rounded-full overflow-hidden">
                {(
                  [
                    ['pending', 'bg-warning', kpis.rdv_stats.pending],
                    ['confirmed', 'bg-info', kpis.rdv_stats.confirmed],
                    ['completed', 'bg-success', kpis.rdv_stats.completed],
                    ['cancelled', 'bg-danger', kpis.rdv_stats.cancelled],
                    ['no_show', 'bg-gray-400', kpis.rdv_stats.no_show],
                  ] as const
                ).map(([key, color, count]) => {
                  const total =
                    kpis.rdv_stats.pending +
                      kpis.rdv_stats.confirmed +
                      kpis.rdv_stats.completed +
                      kpis.rdv_stats.cancelled +
                      kpis.rdv_stats.no_show || 1
                  const pct = (count / total) * 100
                  return (
                    <motion.div
                      key={key}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className={cn('flex items-center justify-center text-xs text-white font-medium', color)}
                      title={`${key}: ${count}`}
                    >
                      {pct > 12 && count}
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
