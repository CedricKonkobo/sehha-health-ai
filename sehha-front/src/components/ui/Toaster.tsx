import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'
import { cn } from '@/lib/utils'

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const variantStyles = {
  success: 'bg-success-50 border-success-200 text-success-700',
  error: 'bg-danger-50 border-danger-200 text-danger-700',
  warning: 'bg-warning-50 border-warning-200 text-warning-700',
  info: 'bg-info-50 border-info-200 text-info-700',
}

export function Toaster() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = iconMap[toast.variant]
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100 }}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg min-w-[300px] max-w-md',
                variantStyles[toast.variant]
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 opacity-60 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}