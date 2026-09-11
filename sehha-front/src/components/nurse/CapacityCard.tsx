import { motion } from 'framer-motion'
import { Bed, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useState } from 'react'
import type { DepartmentCapacity } from '@/types/nurse'
import { cn } from '@/lib/utils'

interface CapacityCardProps {
  department: DepartmentCapacity
  onUpdate: (bedsOccupied: number) => void
  isUpdating: boolean
}

export function CapacityCard({ department, onUpdate, isUpdating }: CapacityCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [occupied, setOccupied] = useState(department.occupied_beds)

  const rate = department.occupancy_rate
  const color = rate >= 90 ? 'text-danger' : rate >= 75 ? 'text-warning' : 'text-success'
  const bg = rate >= 90 ? 'bg-danger-50' : rate >= 75 ? 'bg-warning-50' : 'bg-success-50'

  const handleSave = () => {
    const clamped = Math.max(0, Math.min(department.total_beds, occupied))
    onUpdate(clamped)
    setIsEditing(false)
  }

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bed className="h-4 w-4 text-primary" />
              {department.department}
            </CardTitle>
            <Badge variant={rate >= 90 ? 'destructive' : rate >= 75 ? 'warning' : 'success'}>{rate}%</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEditing ? (
            <>
              <div className={cn('rounded-lg p-3 text-center', bg)}>
                <p className={cn('text-2xl font-bold', color)}>{rate}%</p>
                <p className="text-xs text-gray-600">Taux d'occupation</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm text-center">
                <div className="rounded-lg bg-gray-50 p-2">
                  <p className="font-semibold">{department.total_beds}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2 flex flex-col items-center">
                  <Users className="h-4 w-4 text-gray-500" />
                  <p className="font-semibold">{department.occupied_beds}</p>
                  <p className="text-xs text-gray-500">Occupés</p>
                </div>
                <div className="rounded-lg bg-success-50 p-2 flex flex-col items-center">
                  <Bed className="h-4 w-4 text-success" />
                  <p className="font-semibold text-success">{department.available_beds}</p>
                  <p className="text-xs text-gray-500">Libres</p>
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full" onClick={() => { setOccupied(department.occupied_beds); setIsEditing(true) }}>
                Modifier les lits occupés
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <label className="text-xs font-medium">Lits occupés (max {department.total_beds})</label>
              <Input
                type="number"
                min={0}
                max={department.total_beds}
                value={occupied}
                onChange={(e) => setOccupied(Number(e.target.value))}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setIsEditing(false)}>
                  Annuler
                </Button>
                <Button size="sm" className="flex-1" onClick={handleSave} disabled={isUpdating}>
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
