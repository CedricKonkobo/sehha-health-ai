import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: 'primary' | 'danger' | 'warning' | 'success' | 'info'
  trend?: string
}

const colorMap = {
  primary: 'bg-primary-50 text-primary border-primary-100',
  danger: 'bg-danger-50 text-danger border-danger-100',
  warning: 'bg-warning-50 text-warning border-warning-100',
  success: 'bg-success-50 text-success border-success-100',
  info: 'bg-info-50 text-info border-info-100',
}

export function KPICard({ title, value, icon: Icon, color, trend }: KPICardProps) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
      <Card className={cn('border', colorMap[color])}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {trend && <p className="text-xs mt-1 opacity-70">{trend}</p>}
            </div>
            <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', colorMap[color].split(' ')[0])}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}