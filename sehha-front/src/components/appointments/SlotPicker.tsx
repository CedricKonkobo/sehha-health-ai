import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SlotsResponse } from '@/types/appointment'

interface SlotPickerProps {
  schedule: SlotsResponse[]
  selectedSlotStart: string | null
  onSelectSlot: (startsAt: string) => void
}

function formatTime(dateTimeLocal: string): string {
  // "2026-06-25 09:00:00" ou "2026-06-25T09:00:00" -> "09:00"
  const match = dateTimeLocal.match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : dateTimeLocal
}

function formatDayLabel(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function SlotPicker({ schedule, selectedSlotStart, onSelectSlot }: SlotPickerProps) {
  const daysWithSlots = schedule.filter((day) => day.slots.length > 0)

  if (daysWithSlots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>Aucun créneau disponible sur les 7 prochains jours</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {daysWithSlots.map((day) => (
        <div key={day.date} className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 capitalize">
            {formatDayLabel(day.date)}
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {day.slots.map((slot) => (
              <motion.button
                key={slot.start}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectSlot(slot.start)}
                className={cn(
                  'relative rounded-lg border px-2 py-2 text-sm font-medium transition-all',
                  selectedSlotStart === slot.start
                    ? 'border-primary bg-primary text-white shadow-md'
                    : 'border-gray-200 bg-white hover:border-primary hover:text-primary'
                )}
              >
                {formatTime(slot.start)}
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
