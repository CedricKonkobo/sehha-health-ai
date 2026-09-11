import { useState } from 'react'
import { motion } from 'framer-motion'
import { Package, AlertTriangle, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { StockAdmin } from '@/types/admin'
import { cn } from '@/lib/utils'

interface StockManagementProps {
  stocks: StockAdmin[]
  isLoading: boolean
  onRestock: (id: number, quantity: number) => void
  isMutating: boolean
}

const STATUS_LABEL: Record<StockAdmin['status'], string> = {
  ok: 'OK',
  faible: 'Faible',
  alerte: 'Alerte',
  critique: 'Critique',
}

function badgeVariant(s: StockAdmin['status']): 'success' | 'warning' | 'destructive' {
  if (s === 'critique' || s === 'alerte') return 'destructive'
  if (s === 'faible') return 'warning'
  return 'success'
}

export function StockManagement({ stocks, isLoading, onRestock, isMutating }: StockManagementProps) {
  const [restockingId, setRestockingId] = useState<number | null>(null)
  const [addQty, setAddQty] = useState('')

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const critical = stocks.filter((s) => s.status === 'critique').length
  const low = stocks.filter((s) => s.status === 'alerte' || s.status === 'faible').length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-danger-50 border-danger-200">
          <CardContent className="p-4">
            <p className="text-sm text-danger font-medium">Stock critique</p>
            <p className="text-2xl font-bold text-danger">{critical}</p>
          </CardContent>
        </Card>
        <Card className="bg-warning-50 border-warning-200">
          <CardContent className="p-4">
            <p className="text-sm text-warning font-medium">Stock bas (alerte / faible)</p>
            <p className="text-2xl font-bold text-warning">{low}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Inventaire ({stocks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Article</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Quantité</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Seuil</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Statut</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Réappro.</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock) => (
                  <motion.tr
                    key={stock.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      'border-b border-gray-100 hover:bg-gray-50',
                      (stock.status === 'critique' || stock.status === 'alerte') && 'bg-danger-50/50',
                      stock.status === 'faible' && 'bg-warning-50/50'
                    )}
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">{stock.product_name}</td>
                    <td className="py-3 px-4 text-center">
                      {stock.quantity} <span className="text-xs text-gray-500">{stock.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-center text-gray-500">{stock.alert_threshold}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={badgeVariant(stock.status)}>
                        {(stock.status === 'critique') && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {STATUS_LABEL[stock.status]}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {restockingId === stock.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <Input
                            type="number"
                            placeholder="+ Qté"
                            value={addQty}
                            onChange={(e) => setAddQty(e.target.value)}
                            className="w-20 h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            className="h-8"
                            disabled={isMutating || !addQty}
                            onClick={() => {
                              onRestock(stock.id, Number(addQty))
                              setRestockingId(null)
                              setAddQty('')
                            }}
                          >
                            OK
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8" onClick={() => setRestockingId(null)}>
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => setRestockingId(stock.id)}>
                          <Plus className="h-3 w-3" />
                          Réappro.
                        </Button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {stocks.length === 0 && <p className="text-center text-sm text-gray-400 py-8">Inventaire vide</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
