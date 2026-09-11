import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { createEcho, type EchoInstance } from '@/lib/echo'

const RealtimeContext = createContext<EchoInstance | null>(null)

/**
 * Monte une connexion Echo/Reverb tant que l'utilisateur est authentifié.
 * Se reconnecte quand le token change, se déconnecte au logout.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [echo, setEcho] = useState<EchoInstance | null>(null)
  const echoRef = useRef<EchoInstance | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      echoRef.current?.disconnect()
      echoRef.current = null
      setEcho(null)
      return
    }

    let instance: EchoInstance | null = null
    try {
      instance = createEcho(accessToken)
      echoRef.current = instance
      setEcho(instance)
    } catch (e) {
      console.warn('Echo init failed', e)
    }

    return () => {
      instance?.disconnect()
      if (echoRef.current === instance) echoRef.current = null
      setEcho((cur) => (cur === instance ? null : cur))
    }
  }, [accessToken, isAuthenticated])

  return <RealtimeContext.Provider value={echo}>{children}</RealtimeContext.Provider>
}

export function useEcho(): EchoInstance | null {
  return useContext(RealtimeContext)
}
