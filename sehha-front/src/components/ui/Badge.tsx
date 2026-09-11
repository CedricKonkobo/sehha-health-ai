import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary-100 text-primary-700',
        secondary: 'border-transparent bg-gray-100 text-gray-700',
        destructive: 'border-transparent bg-danger-100 text-danger-600',
        warning: 'border-transparent bg-warning-100 text-warning-600',
        info: 'border-transparent bg-info-100 text-info-600',
        success: 'border-transparent bg-success-100 text-success-600',
        outline: 'text-gray-900 border-gray-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }