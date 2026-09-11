import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useRef } from 'react'
import { triageApi } from '@/lib/triageApi'
import type { TriageAnswerResponse } from '@/lib/triageApi'
import type {
  TriageMessage,
  TriageQuestion,
  TriageProgress,
  TriageResult,
  ClinicalSummary,
  TriageNotification,
} from '@/types/triage'
import { useAuthStore } from '@/stores/authStore'

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export interface TriageFinalResult {
  triage_uuid: string
  result: TriageResult
  clinical_summary: ClinicalSummary
  notification: TriageNotification | null
}

export function useTriage() {
  const queryClient = useQueryClient()
  const { user, accessToken } = useAuthStore()

  const [sessionUuid, setSessionUuid] = useState<string | null>(null)
  const [messages, setMessages] = useState<TriageMessage[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<TriageQuestion | null>(null)
  const [progress, setProgress] = useState<TriageProgress | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [finalResult, setFinalResult] = useState<TriageFinalResult | null>(null)

  // Le backend ne renvoie pas l'historique complet -> on le construit nous-mêmes.
  const turnRef = useRef(0)

  const resetState = useCallback(() => {
    setSessionUuid(null)
    setMessages([])
    setCurrentQuestion(null)
    setProgress(null)
    setIsComplete(false)
    setFinalResult(null)
    turnRef.current = 0
  }, [])

  const playAlertSound = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch {
      console.warn('Audio alert failed')
    }
  }, [])

  const applyResponse = useCallback(
    (res: TriageAnswerResponse) => {
      setSessionUuid(res.session_uuid)

      if (res.status === 'completed' && res.result && res.triage_uuid) {
        setIsComplete(true)
        setCurrentQuestion(null)
        setFinalResult({
          triage_uuid: res.triage_uuid,
          result: res.result,
          clinical_summary: res.clinical_summary || {},
          notification: res.notification || null,
        })

        // Message de fin dans le chat
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'bot',
            type: 'result',
            content: res.result?.message_patient || 'Triage terminé. Score calculé.',
          },
        ])

        if (res.result.ia_score === 'P1') {
          playAlertSound()
        }

        queryClient.invalidateQueries({ queryKey: ['triage', 'history'] })
        return
      }

      // Conversation en cours : on affiche la prochaine question
      const next = res.next_question
      if (next) {
        turnRef.current += 1
        setCurrentQuestion(next)
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: 'bot', type: 'question', content: next.text },
        ])
      }
      setProgress(
        res.progress || {
          current_turn: turnRef.current,
          min_turns: 8,
          max_turns: 14,
        }
      )
    },
    [playAlertSound, queryClient]
  )

  const startMutation = useMutation({
    mutationFn: triageApi.start,
    onSuccess: (res) => {
      resetState()
      applyResponse(res.data)
    },
  })

  const answerMutation = useMutation({
    mutationFn: triageApi.answer,
    onSuccess: (res) => {
      applyResponse(res.data)
    },
  })

  const start = useCallback(() => {
    startMutation.mutate()
  }, [startMutation])

  const sendAnswer = useCallback(
    (answerText: string) => {
      if (!sessionUuid || !answerText.trim()) return

      // On affiche immédiatement la réponse du patient dans le chat
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: 'user', type: 'text', content: answerText },
      ])

      answerMutation.mutate({
        session_uuid: sessionUuid,
        answer: answerText,
      })
    },
    [sessionUuid, answerMutation]
  )

  const newTriage = useCallback(() => {
    resetState()
  }, [resetState])

  // ----- HISTORIQUE -----
  const { data: history } = useQuery({
    queryKey: ['triage', 'history'],
    queryFn: async () => {
      const { data } = await triageApi.getHistory()
      return data
    },
    enabled: !sessionUuid && !!user && !!accessToken,
  })

  return {
    sessionUuid,
    messages,
    currentQuestion,
    progress,
    isComplete,
    isLoading: startMutation.isPending || answerMutation.isPending,
    startError: startMutation.error,
    answerError: answerMutation.error,
    history: history || [],
    start,
    sendAnswer,
    newTriage,
    finalResult,
  }
}
