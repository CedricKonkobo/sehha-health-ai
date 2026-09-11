// src/hooks/useDME.ts
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { dmeApi } from '@/lib/dmeApi'
import type { DME } from '@/types/dme'

export function useDME() {
  const userUuid = useAuthStore((state) => state.user?.uuid)
  const accessToken = useAuthStore((state) => state.accessToken)
  const role = useAuthStore((state) => state.user?.role)

  const { data: dmeData, isLoading } = useQuery<DME>({
    queryKey: ['dme', userUuid],
    queryFn: async () => {
      if (!userUuid) throw new Error('Utilisateur non identifié')
      const response = role === 'patient'
        ? await dmeApi.getMyDme()
        : await dmeApi.getDME(userUuid)
      return response.data
    },
    enabled: !!userUuid && !!accessToken,
    staleTime: 5 * 60 * 1000,
  })

  const downloadPrescription = async (uuid: string, filename: string) => {
    try {
      const response = await dmeApi.getPrescriptionPDF(uuid)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      console.error('Échec du téléchargement')
    }
  }

  return { dmeData, isLoading, downloadPrescription }
}
