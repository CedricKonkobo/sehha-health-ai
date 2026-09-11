import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Le broadcaster "reverb" de laravel-echo s'appuie sur le client Pusher.
;(window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher

export type EchoInstance = Echo<'reverb'>

/**
 * Crée une instance Echo authentifiée au token Sanctum courant.
 * L'auth des canaux privés passe par POST /broadcasting/auth (proxy Vite -> :8000).
 */
export function createEcho(token: string): EchoInstance {
  return new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
    wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/broadcasting/auth',
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  }) as EchoInstance
}
