import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Users, FileText, BarChart3, Package } from 'lucide-react'
import { KPIDashboard } from '@/components/admin/KPIDashboard'
import { UserTable } from '@/components/admin/UserTable'
import { AuditLogTable } from '@/components/admin/AuditLogTable'
import { StockManagement } from '@/components/admin/StockManagement'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { useAdminAudit } from '@/hooks/useAdminAudit'
import { useAdminKPIs } from '@/hooks/useAdminKPIs'
import { useAdminStocks } from '@/hooks/useAdminStocks'
import { useInventoryRealtime } from '@/hooks/useInventoryRealtime'
import { cn } from '@/lib/utils'

type AdminTab = 'kpis' | 'users' | 'audit' | 'stocks'

const PATH_TO_TAB: Record<string, AdminTab> = {
  '/admin/kpis': 'kpis',
  '/admin/users': 'users',
  '/admin/audit': 'audit',
  '/admin/stocks': 'stocks',
}
const TAB_TO_PATH: Record<AdminTab, string> = {
  kpis: '/admin/kpis',
  users: '/admin/users',
  audit: '/admin/audit',
  stocks: '/admin/stocks',
}

export default function AdminDashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<AdminTab>(PATH_TO_TAB[location.pathname] ?? 'kpis')
  useInventoryRealtime()

  // Garde l'onglet synchronisé avec l'URL (liens de la sidebar, retour navigateur).
  useEffect(() => {
    const t = PATH_TO_TAB[location.pathname]
    if (t && t !== activeTab) setActiveTab(t)
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectTab = (t: AdminTab) => {
    setActiveTab(t)
    if (location.pathname !== TAB_TO_PATH[t]) navigate(TAB_TO_PATH[t], { replace: true })
  }

  const usersQuery = useAdminUsers()
  const auditQuery = useAdminAudit()
  const kpiQuery = useAdminKPIs()
  const stockQuery = useAdminStocks()

  const tabs: { id: AdminTab; label: string; icon: typeof Shield }[] = [
    { id: 'kpis', label: 'KPIs', icon: BarChart3 },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'audit', label: "Journal d'audit", icon: FileText },
    { id: 'stocks', label: 'Stocks', icon: Package },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        Administration
      </h1>

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => selectTab(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'kpis' && (
          <motion.div key="kpis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <KPIDashboard kpis={kpiQuery.kpis} isLoading={kpiQuery.isLoading} period={kpiQuery.period} onPeriodChange={kpiQuery.setPeriod} />
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <UserTable
              users={usersQuery.users}
              total={usersQuery.total}
              isLoading={usersQuery.isLoading}
              filters={usersQuery.filters}
              onFilterChange={usersQuery.setFilters}
              onToggleStatus={(uuid, isActive) => usersQuery.toggleUserStatus({ uuid, isActive })}
              onDelete={(uuid) => usersQuery.deleteUser(uuid)}
              onUpdateRole={(uuid, role) => usersQuery.updateUserRole({ uuid, role })}
            />
          </motion.div>
        )}

        {activeTab === 'audit' && (
          <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <AuditLogTable
              logs={auditQuery.logs}
              total={auditQuery.total}
              isLoading={auditQuery.isLoading}
              filters={auditQuery.filters}
              onFilterChange={auditQuery.setFilters}
            />
          </motion.div>
        )}

        {activeTab === 'stocks' && (
          <motion.div key="stocks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <StockManagement
              stocks={stockQuery.stocks}
              isLoading={stockQuery.isLoading}
              onRestock={(id, quantity) => stockQuery.restock({ id, quantity })}
              isMutating={stockQuery.isMutating}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
