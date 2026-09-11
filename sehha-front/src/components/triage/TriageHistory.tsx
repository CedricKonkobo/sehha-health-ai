import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Clock, History } from 'lucide-react'
import type { TriageHistoryItem } from '@/types/triage'
import { priorityConfig } from '@/types/triage'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TriageHistoryProps {
  history: TriageHistoryItem[]
}

function badgeVariantForScore(score: string): 'destructive' | 'warning' | 'info' | 'success' {
  if (score === 'P1') return 'destructive'
  if (score === 'P2') return 'warning'
  if (score === 'P3') return 'info'
  return 'success'
}

export function TriageHistory({ history }: TriageHistoryProps) {
  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
          <History className="h-12 w-12 mb-3 text-gray-300" />
          <p>Aucun triage dans votre historique</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <History className="h-5 w-5" />
        Historique des triages
      </h2>
      {history.map((item, idx) => {
        const config = priorityConfig[item.ia_score] || priorityConfig.P2
        return (
          <motion.div
            key={item.uuid}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariantForScore(item.ia_score)}>{item.ia_score}</Badge>
                      <span className="text-sm text-gray-500">{formatDate(item.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {item.symptoms_summary || 'Symptômes divers'}
                    </p>
                  </div>
                  <div className="text-right">
                    <Clock className="h-4 w-4 text-gray-400 mb-1 ml-auto" />
                    <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
