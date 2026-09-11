import { motion } from 'framer-motion'
import { Star, Stethoscope } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { Doctor } from '@/types/appointment'

interface DoctorCardProps {
  doctor: Doctor
  isSelected: boolean
  onClick: () => void
}

export function DoctorCard({ doctor, isSelected, onClick }: DoctorCardProps) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Card
        onClick={onClick}
        className={cn(
          'cursor-pointer transition-all border-2',
          isSelected
            ? 'border-primary bg-primary-50 shadow-md'
            : 'border-transparent hover:border-gray-200 hover:shadow-sm'
        )}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            {doctor.avatar_url ? (
              <img src={doctor.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <Stethoscope className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              Dr. {doctor.first_name} {doctor.last_name}
            </h3>
            <p className="text-sm text-gray-500">
              {doctor.specialty}
              {doctor.service ? ` · ${doctor.service}` : ''}
            </p>
          </div>
          {typeof doctor.rating === 'number' && (
            <Badge variant="secondary" className="gap-1 shrink-0">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {doctor.rating.toFixed(1)}
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
