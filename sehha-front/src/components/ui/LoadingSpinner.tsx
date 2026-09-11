import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-3',
  lg: 'h-12 w-12 border-4',
}

export function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeMap[size],
        className
      )}
      role="status"
      aria-label="Chargement"
    >
      <span className="sr-only">Chargement...</span>
    </div>
  )
}