import { useTriage } from '@/hooks/useTriage'
import { TriageHistory as TriageHistoryComponent } from '@/components/triage/TriageHistory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { History } from 'lucide-react'

export default function TriageHistoryPage() {
  const { history } = useTriage()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <History className="h-6 w-6 text-primary" />
        Historique des Triages
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Tous vos triages précédents</CardTitle>
        </CardHeader>
        <CardContent>
          <TriageHistoryComponent history={history} />
        </CardContent>
      </Card>
    </div>
  )
}