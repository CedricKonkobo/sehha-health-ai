import { motion } from 'framer-motion'
import { Bed, Activity, Users, Package, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { KPICard } from '@/components/doctor/KPICard'
import { CapacityCard } from './CapacityCard'
import { StockAlert } from './StockAlert'
import { useNurseDashboard } from '@/hooks/useNurseDashboard'
import { useTriageQueueRealtime } from '@/hooks/useTriageQueueRealtime'
import { useInventoryRealtime } from '@/hooks/useInventoryRealtime'
import { cn } from '@/lib/utils'

export function NurseDashboard() {
  useTriageQueueRealtime()
  useInventoryRealtime()

  const { kpis, departments, stocks, isLoading, updateCapacity, updateStock, isUpdating } = useNurseDashboard()

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Tableau de bord Infirmier
        </h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Constantes aujourd'hui" value={kpis?.vitals_recorded_today ?? 0} icon={Activity} color="primary" />
        <KPICard title="Admissions urgences" value={kpis?.patients_admitted_today ?? 0} icon={Users} color="info" />
        <KPICard title="Consultations clôturées" value={kpis?.patients_discharged_today ?? 0} icon={TrendingUp} color="success" />
        <KPICard
          title="Alertes stock"
          value={kpis?.low_stock_alerts ?? 0}
          icon={Package}
          color={kpis?.low_stock_alerts ? 'danger' : 'success'}
        />
      </div>

      {kpis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bed className="h-4 w-4" />
              Taux d'occupation global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${kpis.bed_occupancy_rate}%` }}
                  className={cn(
                    'h-full rounded-full',
                    kpis.bed_occupancy_rate >= 90 ? 'bg-danger' : kpis.bed_occupancy_rate >= 75 ? 'bg-warning' : 'bg-success'
                  )}
                />
              </div>
              <span
                className={cn(
                  'font-bold text-lg',
                  kpis.bed_occupancy_rate >= 90 ? 'text-danger' : kpis.bed_occupancy_rate >= 75 ? 'text-warning' : 'text-success'
                )}
              >
                {kpis.bed_occupancy_rate}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bed className="h-5 w-5 text-primary" />
            Capacité par service
          </h2>
          {departments.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400">Aucun service avec lits</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {departments.map((dept) => (
                <CapacityCard
                  key={dept.service_id}
                  department={dept}
                  onUpdate={(bedsOccupied) => updateCapacity({ serviceId: dept.service_id, bedsOccupied })}
                  isUpdating={isUpdating}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Stocks &amp; Alertes
          </h2>
          <StockAlert
            stocks={stocks}
            onUpdateStock={(id, quantity) => updateStock({ id, quantity })}
            isUpdating={isUpdating}
          />
        </div>
      </div>
    </div>
  )
}
