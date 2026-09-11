import api from './axios'
import type {
  TriageQuestion,
  TriageProgress,
  TriageResult,
  ClinicalSummary,
  TriageNotification,
  TriageHistoryItem,
} from '@/types/triage'

/**
 * Payload envoyé à POST /api/v1/triage/answer
 * - Pour démarrer une nouvelle conversation : ne pas envoyer session_uuid (ou null/undefined).
 *   Dans ce cas, "answer" est ignoré par le backend mais reste requis par la validation
 *   Laravel (['required','string','max:2000']) -> on envoie une chaîne neutre.
 * - Pour continuer : envoyer session_uuid + answer (texte libre).
 */
export interface TriageAnswerPayload {
  session_uuid?: string | null
  answer: string
}

/**
 * Réponse de POST /api/v1/triage/answer une fois passée par l'intercepteur axios
 * (qui extrait déjà `data.data`). Ce type couvre les 3 cas possibles renvoyés par
 * TriageChatbotController::answer :
 *  - nouvelle conversation (next_question présent sous la clé "next_question")
 *  - conversation en cours (next_question)
 *  - conversation terminée (status === 'completed', result + triage_uuid présents)
 */
export interface TriageAnswerResponse {
  session_uuid: string
  status: 'in_progress' | 'completed'

  // Présent uniquement pendant la conversation (tant que status !== 'completed')
  next_question?: TriageQuestion
  progress?: TriageProgress
  clinical_data_so_far?: ClinicalSummary
  fallback?: boolean

  // Présent uniquement quand status === 'completed'
  triage_uuid?: string
  result?: TriageResult
  clinical_summary?: ClinicalSummary
  notification?: TriageNotification | null
}

export const triageApi = {
  /**
   * Démarre une nouvelle conversation de triage.
   * Le backend attend POST /triage/answer SANS session_uuid pour initier.
   */
  start: () =>
    api.post<TriageAnswerResponse>('/triage/answer', {
      answer: 'Bonjour, je souhaite démarrer un triage.',
    }),

  /**
   * Envoie la réponse du patient à la question courante.
   */
  answer: (payload: TriageAnswerPayload) =>
    api.post<TriageAnswerResponse>('/triage/answer', payload),

  /** Détail d'un triage déjà calculé (TriageController::show) */
  getResult: (uuid: string) => api.get<TriageHistoryItem>(`/triage/${uuid}`),

  /** Validation humaine d'un triage par un soignant (TriageController::validate) */
  validate: (uuid: string) => api.put<{ success: boolean }>(`/triage/${uuid}/validate`),

  /** Historique des triages du patient connecté (TriageController::myHistory) */
  getHistory: () => api.get<TriageHistoryItem[]>('/triage/history'),

  /** File d'attente de triage (vue soignant) */
  getQueue: () => api.get<{ queue: TriageHistoryItem[] }>('/triage/queue'),
}
