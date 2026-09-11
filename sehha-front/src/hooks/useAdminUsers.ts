import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { adminApi } from '@/lib/adminApi'
import { useToastStore } from '@/stores/toastStore'
import { useAuthStore } from '@/stores/authStore'

export function useAdminUsers() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const [filters, setFilters] = useState({ role: '', search: '' })
  const accessToken = useAuthStore((state) => state.accessToken)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: async () => {
      const { data } = await adminApi.getUsers({
        ...(filters.role && { role: filters.role }),
        ...(filters.search && { search: filters.search }),
      })
      return data
    },
    enabled: !!accessToken,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })

  const createMutation = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      invalidate()
      addToast('Utilisateur créé', 'success')
    },
    onError: (e: Error) => addToast(e.message || 'Erreur création utilisateur', 'error'),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ uuid, role }: { uuid: string; role: string }) => adminApi.updateUserRole(uuid, role),
    onSuccess: () => {
      invalidate()
      addToast('Rôle mis à jour', 'success')
    },
    onError: (e: Error) => addToast(e.message || 'Erreur', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      invalidate()
      addToast('Utilisateur désactivé', 'info')
    },
    onError: (e: Error) => addToast(e.message || 'Erreur', 'error'),
  })

  const toggleStatus = useMutation({
    mutationFn: ({ uuid, isActive }: { uuid: string; isActive: boolean }) =>
      adminApi.toggleUserStatus(uuid, isActive),
    onSuccess: () => {
      invalidate()
      addToast('Statut mis à jour', 'success')
    },
    onError: (e: Error) => addToast(e.message || 'Erreur', 'error'),
  })

  return {
    users: data?.users || [],
    total: data?.pagination?.total || 0,
    isLoading,
    filters,
    setFilters,
    createUser: createMutation.mutate,
    updateUserRole: updateRoleMutation.mutate,
    deleteUser: deleteMutation.mutate,
    toggleUserStatus: toggleStatus.mutate,
    isMutating:
      createMutation.isPending ||
      updateRoleMutation.isPending ||
      deleteMutation.isPending ||
      toggleStatus.isPending,
  }
}
