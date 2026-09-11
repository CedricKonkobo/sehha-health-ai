import { motion } from 'framer-motion'
import { Search, Calendar, Shield, UserPlus, Edit, Trash, LogIn, FileText, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { AuditLog } from '@/types/admin'
import { cn } from '@/lib/utils'

interface AuditLogTableProps {
  logs: AuditLog[]
  total: number
  isLoading: boolean
  filters: { action: string; resource_type: string; date_from: string; date_to: string }
  onFilterChange: (filters: AuditLogTableProps['filters']) => void
}

const ACTION_META: Record<string, { icon: typeof Eye; cls: string }> = {
  login: { icon: LogIn, cls: 'bg-success-100 text-success-700' },
  logout: { icon: LogIn, cls: 'bg-gray-100 text-gray-600' },
  create: { icon: UserPlus, cls: 'bg-primary-100 text-primary-700' },
  update: { icon: Edit, cls: 'bg-info-100 text-info-700' },
  delete: { icon: Trash, cls: 'bg-danger-100 text-danger-700' },
  read: { icon: Eye, cls: 'bg-gray-100 text-gray-600' },
  export: { icon: FileText, cls: 'bg-warning-100 text-warning-700' },
}

export function AuditLogTable({ logs, total, isLoading, filters, onFilterChange }: AuditLogTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Journal d'audit ({total})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Action (create/update...)" value={filters.action} onChange={(e) => onFilterChange({ ...filters, action: e.target.value })} className="pl-10" />
          </div>
          <Input placeholder="Ressource (users, consultations...)" value={filters.resource_type} onChange={(e) => onFilterChange({ ...filters, resource_type: e.target.value })} />
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input type="date" value={filters.date_from} onChange={(e) => onFilterChange({ ...filters, date_from: e.target.value })} className="pl-10" />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input type="date" value={filters.date_to} onChange={(e) => onFilterChange({ ...filters, date_to: e.target.value })} className="pl-10" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Utilisateur</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Ressource</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const meta = ACTION_META[log.action] ?? { icon: Shield, cls: 'bg-gray-100 text-gray-600' }
                  const Icon = meta.icon
                  return (
                    <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">{log.user}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={cn('gap-1', meta.cls)}>
                          <Icon className="h-3 w-3" />
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {log.resource_type}
                        {log.resource_id != null && <span className="text-xs text-gray-400"> #{log.resource_id}</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-400 font-mono text-xs">{log.ip_address ?? '—'}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
            {logs.length === 0 && <p className="text-center text-sm text-gray-400 py-8">Aucune entrée</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
