import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Stethoscope, Sparkles, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { Card, CardContent } from '@/components/ui/Card'
import { useTriage } from '@/hooks/useTriage'
import { ChatMessage } from '@/components/triage/ChatMessage'
import { QuestionInput } from '@/components/triage/QuestionInput'
import { TriageResult } from '@/components/triage/TriageResult'
import { TriageHistory } from '@/components/triage/TriageHistory'
import { Badge } from '@/components/ui/Badge'

export default function TriagePage() {
  const {
    sessionUuid,
    messages,
    currentQuestion,
    progress,
    isComplete,
    isLoading,
    startError,
    answerError,
    history,
    start,
    sendAnswer,
    newTriage,
    finalResult,
  } = useTriage()

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleStart = () => start()

  const handleNewTriage = () => {
    newTriage()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-primary" />
          Triage IA
        </h1>
        {sessionUuid && progress && (
          <Badge variant="secondary" className="text-xs">
            Échange {progress.current_turn}/{progress.max_turns}
          </Badge>
        )}
      </div>

      {!sessionUuid ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="border-2 border-primary-100 bg-gradient-to-br from-primary-50 to-white">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Assistant Triage Intelligent</h2>
                <p className="text-gray-600 mt-2 max-w-md mx-auto">
                  Décrivez vos symptômes en répondant à quelques questions adaptatives.
                  Notre IA évaluera votre priorité médicale (P1 à P4) et vous orientera vers le bon service.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button size="lg" onClick={handleStart} disabled={isLoading} className="gap-2">
                  {isLoading ? <LoadingSpinner size="sm" /> : <MessageSquare className="h-4 w-4" />}
                  Démarrer le triage
                </Button>
              </div>
              {startError && (
                <Alert variant="destructive" className="mt-4">
                  Erreur lors du démarrage du triage. Veuillez réessayer.
                </Alert>
              )}
            </CardContent>
          </Card>

          <TriageHistory history={history} />
        </motion.div>
      ) : (
        <div className="space-y-4">
          <Card className="min-h-[500px] flex flex-col">
            <CardContent className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[600px]">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-gray-500 text-sm pl-11"
                >
                  <LoadingSpinner size="sm" />
                  L'IA analyse vos réponses...
                </motion.div>
              )}

              {answerError && (
                <Alert variant="destructive" className="mx-11">
                  Erreur lors de l'envoi de la réponse. Veuillez réessayer.
                </Alert>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-xl">
              {isComplete && finalResult ? (
                <TriageResult
                  finalResult={finalResult}
                  onNewTriage={handleNewTriage}
                />
              ) : currentQuestion ? (
                <QuestionInput
                  question={currentQuestion}
                  onAnswer={sendAnswer}
                  disabled={isLoading}
                />
              ) : null}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
