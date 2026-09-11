import { create } from 'zustand'

interface Toast {
  id: string
  message: string
  variant: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (message: string, variant: Toast['variant'], duration?: number) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, variant, duration = 5000) => {
    const id = Math.random().toString(36).slice(2)
    set((state) => ({ toasts: [...state.toasts, { id, message, variant, duration }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))