import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-5 [&>svg]:w-5',
  {
    variants: {
      variant: {
        default: 'bg-white border-gray-200 text-gray-900',
        destructive: 'border-danger-200 bg-danger-50 text-danger-600',
        warning: 'border-warning-200 bg-warning-50 text-warning-600',
        info: 'border-info-200 bg-info-50 text-info-600',
        success: 'border-success-200 bg-success-50 text-success-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const iconMap = {
  default: Info,
  destructive: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
}

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const Icon = iconMap[variant || 'default']
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
        <div className="text-sm font-medium">{children}</div>
      </div>
    )
  }
)
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
  )
)
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm opacity-90', className)} {...props} />
  )
)
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }