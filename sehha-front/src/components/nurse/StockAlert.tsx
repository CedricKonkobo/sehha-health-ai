import { motion, AnimatePresence } from 'framer-motion'
import { Package, AlertTriangle, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { StockItem, StockStatus } from '@/types/nurse'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface StockAlertProps {
  stocks: StockItem[]
  onUpdateStock: (itemId: number, quantity: number) => void
  isUpdating: boolean
}

const STATUS_LABEL: Record<StockStatus, string> = {
  ok: 'OK',
  faible: 'FAIBLE',
  alerte: 'ALERTE',
  critique: 'CRITIQUE',
}

function badgeVariant(status: StockStatus): 'success' | 'warning' | 'destructive' {
  if (status === 'critique' || status === 'alerte') return 'destructive'
  if (status === 'faible') return 'warning'
  return 'success'
}

export function StockAlert({ stocks, onUpdateStock, isUpdating }: StockAlertProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [qty, setQty] = useState('')

  const alerts = stocks.filter((s) => s.status === 'critique' || s.status === 'alerte')

  const handleSave = (item: StockItem) => {
    const n = Number(qty)
    if (!Number.isNaN(n)) {
      onUpdateStock(item.id, n)
      setEditingId(null)
      setQty('')
    }
  }

  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-4">
          <div className="flex items-center gap-2 text-danger mb-2">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">{alerts.length} alerte(s) stock</h3>
          </div>
          <div className="space-y-1">
            {alerts.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded bg-white p-2 text-sm">
                <span className="font-medium">{item.name}</span>
                <span className="text-gray-500">
                  {item.current_quantity} / seuil {item.min_threshold} {item.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Inventaire à surveiller
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stocks.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucun stock en alerte</p>}
          <AnimatePresence>
            {stocks.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-3',
                  item.status === 'critique' || item.status === 'alerte'
                    ? 'border-danger-200 bg-danger-50'
                    : item.status === 'faible'
                    ? 'border-warning-200 bg-warning-50'
                    : 'border-gray-100 bg-white'
                )}
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <Badge variant={badgeVariant(item.status)} className="text-xs mt-0.5">
                    {STATUS_LABEL[item.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {editingId === item.id ? (
                    <>
                      <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-20 h-8 text-sm" autoFocus />
                      <Button size="icon" className="h-8 w-8" onClick={() => handleSave(item)} disabled={isUpdating}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold">
                        {item.current_quantity} {item.unit}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          setEditingId(item.id)
                          setQty(String(item.current_quantity))
                        }}
                      >
                        Ajuster
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}
