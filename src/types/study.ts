export type DomainCategory =
  | 'Elocuencia diaria'
  | 'Hablar en público'
  | 'Comunicación empresarial';

export type SkillDimension =
  | 'Claridad y Estructura'
  | 'Ritmo y Pausas'
  | 'Tono Persuasivo'
  | 'Presencia Ejecutiva'
  | 'Escucha y Tacto';

export type ItemType =
  | 'sentence_builder'
  | 'multiple_choice'
  | 'upgrade_phrase'
  | 'match_pairs';

export type SessionMode = 'mixed' | 'review' | 'lesson';

export type ItemResult = 'correct_first' | 'correct_retry' | 'wrong';

export interface StudyModule {
  id: string;
  slug: string;
  title: string;
  category: DomainCategory;
  description: string;
  orderIndex: number;
}

export interface StudyLesson {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  orderIndex: number;
  estimatedMinutes: number;
}

export interface SentenceBuilderPayload {
  tokens: string[]; // Banco de bloques (incluye correctos + distractores opcionales)
  correctSequence: string[]; // Secuencia exacta esperada
  spokenPhrase: string; // Frase final legible para escuchar con TTS
}

export interface MultipleChoicePayload {
  options: Array<{id: string; text: string}>;
  correctOptionId: string;
  spokenPhrase?: string;
}

export interface UpgradePhrasePayload {
  weakPhrase: string;
  options: Array<{id: string; text: string}>;
  correctOptionId: string;
  spokenPhrase: string;
}

export interface MatchPairItem {
  id: string;
  left: string;
  right: string;
}

export interface MatchPairsPayload {
  pairs: MatchPairItem[];
}

export type ItemPayload =
  | SentenceBuilderPayload
  | MultipleChoicePayload
  | UpgradePhrasePayload
  | MatchPairsPayload;

export interface StudyItem {
  id: string;
  lessonId: string;
  itemType: ItemType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  skillTag?: SkillDimension;
  prompt: string;
  scenarioContext?: string;
  payload: ItemPayload;
  explanation: string;
  spokenTakeaway?: string;
  orderIndex: number;
  isCustom?: boolean;
}

export interface UserItemProgress {
  userId: string;
  itemId: string;
  boxLevel: number; // 0..6
  easeFactor: number; // 1.3..2.8
  intervalDays: number;
  repetitions: number;
  lapses: number;
  isLeech: boolean;
  lastResult: ItemResult | null;
  lastReviewedAt: string | null;
  nextReviewAt: string;
}

export interface UserStats {
  userId: string;
  timezone: string;
  totalXp: number;
  todayXp: number;
  todayDate: string; // YYYY-MM-DD in user timezone
  currentStreak: number;
  longestStreak: number;
  dailyXpGoal: number;
  lastStudyDate: string | null; // YYYY-MM-DD
  sessionsCompleted: number;
  soundEnabled: boolean;
}

export interface StudySessionRecord {
  id: string;
  mode: SessionMode;
  lessonId: string | null;
  itemsTotal: number;
  firstTryCorrect: number;
  recoveredCount: number;
  xpEarned: number;
  durationSeconds: number;
  startedAt: string;
  completedAt: string;
}

export interface SessionQueueEntry {
  item: StudyItem;
  isRetry: boolean;
  attemptsInSession: number;
  hadErrorInSession: boolean;
}

export interface PersistedStudyState {
  version: number;
  dayOffset: number;
  progressByItem: Record<string, UserItemProgress>;
  stats: UserStats;
  sessions: StudySessionRecord[];
  customItems: StudyItem[];
}
