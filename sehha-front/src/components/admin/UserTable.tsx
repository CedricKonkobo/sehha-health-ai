import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, UserCheck, UserX, Trash2, Shield, Stethoscope, User, HeartPulse } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { AdminUser, UserRole } from '@/types/admin'
import { cn } from '@/lib/utils'

interface UserTableProps {
  users: AdminUser[]
  total: number
  isLoading: boolean
  filters: { role: string; search: string }
  onFilterChange: (filters: { role: string; search: string }) => void
  onToggleStatus: (uuid: string, isActive: boolean) => void
  onDelete: (uuid: string) => void
  onUpdateRole: (uuid: string, role: string) => void
}

const ROLE_META: Record<UserRole, { icon: typeof Shield; label: string; cls: string }> = {
  super_admin: { icon: Shield, label: 'Super-admin', cls: 'bg-purple-100 text-purple-700' },
  admin: { icon: Shield, label: 'Admin', cls: 'bg-purple-100 text-purple-700' },
  medecin: { icon: Stethoscope, label: 'Médecin', cls: 'bg-primary-100 text-primary-700' },
  infirmier: { icon: HeartPulse, label: 'Infirmier', cls: 'bg-info-100 text-info-700' },
  patient: { icon: User, label: 'Patient', cls: 'bg-gray-100 text-gray-700' },
}

const ROLE_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'patient', label: 'Patients' },
  { value: 'medecin', label: 'Médecins' },
  { value: 'infirmier', label: 'Infirmiers' },
  { value: 'admin', label: 'Admins' },
]

export function UserTable({ users, total, isLoading, filters, onFilterChange, onToggleStatus, onDelete }: UserTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Gestion des utilisateurs ({total})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher (nom, email)..."
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {ROLE_FILTERS.map((r) => (
              <button
                key={r.value || 'all'}
                onClick={() => onFilterChange({ ...filters, role: r.value })}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                  filters.role === r.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {r.label}
              </button>
            ))}
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
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Utilisateur</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Rôle</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Statut</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Dernière connexion</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {users.map((user) => {
                    const meta = ROLE_META[user.role] ?? ROLE_META.patient
                    const RoleIcon = meta.icon
                    return (
                      <motion.tr
                        key={user.uuid}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                              {(user.name || '?').slice(0, 2).toUpperCase()}
                            </div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={cn('gap-1', meta.cls)}>
                            <RoleIcon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-900">{user.email || '—'}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => onToggleStatus(user.uuid, !user.is_active)}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                              user.is_active ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'
                            )}
                          >
                            {user.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('fr-FR') : 'Jamais'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {deleteConfirm === user.uuid ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => { onDelete(user.uuid); setDeleteConfirm(null) }}>
                                Confirmer
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDeleteConfirm(null)}>
                                Annuler
                              </Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:bg-danger-50" onClick={() => setDeleteConfirm(user.uuid)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
            {users.length === 0 && <p className="text-center text-sm text-gray-400 py-8">Aucun utilisateur</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
