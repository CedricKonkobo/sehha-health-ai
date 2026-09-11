// Scores IA renvoyés par le moteur de triage (FastAPI) via TriageChatbotController.
// Garde P1-P4 pour l'affichage (couleurs / libellés), mais le backend peut aussi renvoyer
// d'autres valeurs (ex: 'P2' par défaut en fallback) -> on type en union connue + fallback string.
export type TriagePriority = 'P1' | 'P2' | 'P3' | 'P4'

export type TriageOrientation =
  | 'urgences'
  | 'specialiste'
  | 'medecin_generaliste'
  | 'soins_domicile'
  | string

export type RecommendedDelay =
  | 'immediat'
  | 'sous_1h'
  | 'sous_24h'
  | 'sous_72h'
  | string

/**
 * Une question posée par le chatbot.
 * IMPORTANT : le backend (TriageChatbotController::answer) ne renvoie QUE
 * { id, text } — pas de "type" (single_choice/boolean/scale), pas de "options".
 * Toutes les réponses sont donc en texte libre.
 */
export interface TriageQuestion {
  id: number | string
  text: string
}

/** progress.* tel que renvoyé par le backend (avec valeurs par défaut si absentes) */
export interface TriageProgress {
  current_turn: number
  min_turns: number
  max_turns: number
}

/** Résultat final du triage, à plat, tel que renvoyé dans data.result */
export interface TriageResult {
  ia_score: TriagePriority | string
  ccmu_score: number
  orientation: TriageOrientation
  recommended_delay: RecommendedDelay
  message_patient: string
  confidence: number
  needs_human_review: boolean
}

/** Résumé clinique structuré construit par le moteur IA (forme libre / dépend du moteur) */
export interface ClinicalSummary {
  chief_complaint?: string
  symptoms?: string[]
  red_flags_detectes?: string[]
  [key: string]: unknown
}

/** Notification éventuelle renvoyée par le moteur IA à la fin du triage */
export interface TriageNotification {
  type?: string
  message?: string
  [key: string]: unknown
}

/** Message affiché dans la fenêtre de chat (purement front, pas stocké côté backend) */
export interface TriageMessage {
  id: string
  role: 'bot' | 'user'
  content: string
  type?: 'text' | 'question' | 'result'
}

/** Item de l'historique des triages (GET /triage/history) */
export interface TriageHistoryItem {
  uuid: string
  ia_score: TriagePriority | string
  ccmu_score?: number | null
  orientation?: TriageOrientation
  recommended_delay?: RecommendedDelay
  created_at: string
  symptoms_summary?: string
}

export const priorityConfig: Record<
  string,
  { color: string; bg: string; label: string; desc: string }
> = {
  P1: {
    color: 'text-danger',
    bg: 'bg-danger',
    label: 'URGENCE ABSOLUE',
    desc: 'Risque vital immédiat - Intervention en moins de 5 minutes',
  },
  P2: {
    color: 'text-warning',
    bg: 'bg-warning',
    label: 'TRÈS URGENT',
    desc: 'Risque vital potentiel - Intervention en moins de 15 minutes',
  },
  P3: {
    color: 'text-info',
    bg: 'bg-info',
    label: 'URGENT',
    desc: 'État inconfortable mais stable - Intervention en moins de 60 minutes',
  },
  P4: {
    color: 'text-success',
    bg: 'bg-success',
    label: 'NON URGENT',
    desc: 'État stable - Consultation programmée',
  },
}

export const delayLabels: Record<string, string> = {
  immediat: 'Immédiat',
  sous_1h: 'Sous 1 heure',
  sous_4h: 'Sous 4 heures',
  sous_24h: 'Sous 24 heures',
  sous_48h: 'Sous 48 heures',
  sous_72h: 'Sous 72 heures',
}

export const orientationLabels: Record<string, string> = {
  urgences: 'Urgences',
  urgence_vitale: 'Urgence vitale',
  urgence_a_surveiller: 'Urgence à surveiller',
  specialiste: 'Spécialiste',
  consultation_specialiste: 'Consultation spécialiste',
  medecin_gen: 'Médecin généraliste',
  medecin_generaliste: 'Médecin généraliste',
  consultation_generaliste: 'Consultation généraliste',
  teleconsult: 'Téléconsultation',
  teleconsultation: 'Téléconsultation',
  soins_domicile: 'Soins à domicile',
}
