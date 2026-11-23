import type {
  ItemResult,
  MatchPairsPayload,
  MultipleChoicePayload,
  SentenceBuilderPayload,
  SessionMode,
  SessionQueueEntry,
  StudyItem,
  StudyLesson,
  StudyModule,
  UpgradePhrasePayload,
  UserItemProgress,
  UserStats,
} from '../types/study';

export const BASE_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30, 60] as const;
export const DEFAULT_USER_ID = 'usr_local_01';
export const LEECH_LAPSES_THRESHOLD = 3;
export const DAY_MS = 86_400_000;

export function getLocalDateString(nowMs: number, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date(nowMs));
  } catch {
    return new Date(nowMs).toISOString().slice(0, 10);
  }
}

export function getPreviousDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day - 1);
  return new Date(utc).toISOString().slice(0, 10);
}

export function createInitialProgress(itemId: string, nowMs: number): UserItemProgress {
  return {
    userId: DEFAULT_USER_ID,
    itemId,
    boxLevel: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    isLeech: false,
    lastResult: null,
    lastReviewedAt: null,
    nextReviewAt: new Date(nowMs).toISOString(),
  };
}

export function calculatePriorityScore(
  progress: UserItemProgress,
  item: StudyItem,
  nowMs: number
): number {
  const dueMs = Date.parse(progress.nextReviewAt);
  const overdueDays = Math.max(0, (nowMs - dueMs) / DAY_MS);
  const lowBoxBonus = progress.boxLevel <= 1 ? 10 : 0;
  const leechBonus = progress.isLeech ? 6 : 0;

  return Number(
    (
      overdueDays * 2.0 +
      progress.lapses * 3.0 +
      lowBoxBonus +
      leechBonus +
      item.difficulty * 0.5
    ).toFixed(2)
  );
}

export function isItemDue(progress: UserItemProgress | undefined, nowMs: number): boolean {
  if (!progress || !progress.lastReviewedAt) {
    return false;
  }
  return Date.parse(progress.nextReviewAt) <= nowMs;
}

export function updateProgressAfterItem(
  prevProgress: UserItemProgress | undefined,
  itemId: string,
  result: ItemResult,
  nowMs: number
): UserItemProgress {
  const base = prevProgress ?? createInitialProgress(itemId, nowMs);
  const nowIso = new Date(nowMs).toISOString();

  if (result === 'wrong') {
    const nextBox = Math.max(0, base.boxLevel - 2);
    const nextLapses = base.lapses + 1;
    const nextEase = Math.max(1.3, Number((base.easeFactor - 0.2).toFixed(2)));
    const nextInterval = nextBox === 0 ? 1 : BASE_INTERVALS_DAYS[nextBox];

    return {
      ...base,
      boxLevel: nextBox,
      easeFactor: nextEase,
      intervalDays: nextInterval,
      repetitions: 0,
      lapses: nextLapses,
      isLeech: nextLapses >= LEECH_LAPSES_THRESHOLD,
      lastResult: 'wrong',
      lastReviewedAt: nowIso,
      nextReviewAt: new Date(nowMs + nextInterval * DAY_MS).toISOString(),
    };
  }

  if (result === 'correct_retry') {
    return {
      ...base,
      lastResult: 'correct_retry',
      lastReviewedAt: nowIso,
    };
  }

  const nextBox = Math.min(6, base.boxLevel + 1);
  const nextEase = Math.min(2.8, Number((base.easeFactor + 0.05).toFixed(2)));
  const rawInterval = BASE_INTERVALS_DAYS[nextBox] * (nextEase / 2.5);
  const nextInterval = Math.max(1, Math.round(rawInterval));

  return {
    ...base,
    boxLevel: nextBox,
    easeFactor: nextEase,
    intervalDays: nextInterval,
    repetitions: base.repetitions + 1,
    lastResult: 'correct_first',
    lastReviewedAt: nowIso,
    nextReviewAt: new Date(nowMs + nextInterval * DAY_MS).toISOString(),
  };
}

export type SubmittedAnswer =
  | {type: 'sentence_builder'; sequence: string[]}
  | {type: 'multiple_choice'; optionId: string}
  | {type: 'upgrade_phrase'; optionId: string}
  | {type: 'match_pairs'; mapping: Record<string, string>};

export function evaluateItemAnswer(
  item: StudyItem,
  submitted: SubmittedAnswer
): {
  isCorrect: boolean;
  correctAnswerLabel: string;
  userAnswerLabel: string;
  spokenPhrase?: string;
} {
  if (item.itemType === 'sentence_builder' && submitted.type === 'sentence_builder') {
    const payload = item.payload as SentenceBuilderPayload;
    const isCorrect =
      submitted.sequence.length === payload.correctSequence.length &&
      payload.correctSequence.every((tok, idx) => submitted.sequence[idx] === tok);
    return {
      isCorrect,
      correctAnswerLabel: payload.spokenPhrase,
      userAnswerLabel: submitted.sequence.join(' ') || '(vacío)',
      spokenPhrase: payload.spokenPhrase,
    };
  }

  if (item.itemType === 'multiple_choice' && submitted.type === 'multiple_choice') {
    const payload = item.payload as MultipleChoicePayload;
    const chosen = payload.options.find((o) => o.id === submitted.optionId);
    const correct = payload.options.find((o) => o.id === payload.correctOptionId);
    return {
      isCorrect: submitted.optionId === payload.correctOptionId,
      correctAnswerLabel: correct?.text ?? '',
      userAnswerLabel: chosen?.text ?? '',
      spokenPhrase: payload.spokenPhrase ?? correct?.text,
    };
  }

  if (item.itemType === 'upgrade_phrase' && submitted.type === 'upgrade_phrase') {
    const payload = item.payload as UpgradePhrasePayload;
    const chosen = payload.options.find((o) => o.id === submitted.optionId);
    const correct = payload.options.find((o) => o.id === payload.correctOptionId);
    return {
      isCorrect: submitted.optionId === payload.correctOptionId,
      correctAnswerLabel: correct?.text ?? '',
      userAnswerLabel: chosen?.text ?? '',
      spokenPhrase: payload.spokenPhrase,
    };
  }

  if (item.itemType === 'match_pairs' && submitted.type === 'match_pairs') {
    const payload = item.payload as MatchPairsPayload;
    const allMatched = payload.pairs.every((pair) => submitted.mapping[pair.id] === pair.id);
    return {
      isCorrect: allMatched,
      correctAnswerLabel: payload.pairs.map((p) => `${p.left} → ${p.right}`).join(' · '),
      userAnswerLabel: allMatched ? 'Emparejamiento correcto' : 'Emparejamiento incompleto',
    };
  }

  return {
    isCorrect: false,
    correctAnswerLabel: '',
    userAnswerLabel: '',
  };
}

export function buildOrderedItems(
  items: StudyItem[],
  modules: StudyModule[],
  lessons: StudyLesson[]
): StudyItem[] {
  const moduleOrder = new Map(modules.map((m) => [m.id, m.orderIndex]));
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));

  return [...items].sort((a, b) => {
    const lesA = lessonMap.get(a.lessonId);
    const lesB = lessonMap.get(b.lessonId);
    const modOrderA = lesA ? (moduleOrder.get(lesA.moduleId) ?? 999) : 999;
    const modOrderB = lesB ? (moduleOrder.get(lesB.moduleId) ?? 999) : 999;
    if (modOrderA !== modOrderB) return modOrderA - modOrderB;

    const lesOrderA = lesA?.orderIndex ?? 999;
    const lesOrderB = lesB?.orderIndex ?? 999;
    if (lesOrderA !== lesOrderB) return lesOrderA - lesOrderB;

    return a.orderIndex - b.orderIndex;
  });
}

export interface QueueBuildResult {
  entries: SessionQueueEntry[];
  dueCount: number;
  newCount: number;
  lessonId: string | null;
}

export function buildSessionQueue(params: {
  mode: SessionMode;
  lessonId?: string | null;
  items: StudyItem[];
  modules: StudyModule[];
  lessons: StudyLesson[];
  progressByItem: Record<string, UserItemProgress>;
  nowMs: number;
  targetSize?: number;
}): QueueBuildResult {
  const {
    mode,
    lessonId = null,
    items,
    modules,
    lessons,
    progressByItem,
    nowMs,
    targetSize = 6,
  } = params;

  const orderedItems = buildOrderedItems(items, modules, lessons);

  const dueItems = orderedItems
    .filter((item) => isItemDue(progressByItem[item.id], nowMs))
    .sort((a, b) => {
      const scoreA = calculatePriorityScore(progressByItem[a.id], a, nowMs);
      const scoreB = calculatePriorityScore(progressByItem[b.id], b, nowMs);
      return scoreB - scoreA;
    });

  const unstartedItems = orderedItems.filter((item) => !progressByItem[item.id]?.lastReviewedAt);

  let selected: StudyItem[] = [];
  let selectedLessonId: string | null = lessonId;

  if (mode === 'lesson' && lessonId) {
    const lessonItems = orderedItems.filter((i) => i.lessonId === lessonId);
    const lessonDue = lessonItems.filter((i) => isItemDue(progressByItem[i.id], nowMs));
    const lessonNew = lessonItems.filter((i) => !progressByItem[i.id]?.lastReviewedAt);
    const lessonRest = lessonItems.filter(
      (i) => progressByItem[i.id]?.lastReviewedAt && !isItemDue(progressByItem[i.id], nowMs)
    );
    selected = [...lessonDue, ...lessonNew, ...lessonRest].slice(0, targetSize);
  } else if (mode === 'review') {
    if (dueItems.length > 0) {
      selected = dueItems.slice(0, targetSize);
    } else {
      const studied = orderedItems
        .filter((i) => Boolean(progressByItem[i.id]?.lastReviewedAt))
        .sort((a, b) => {
          const pA = progressByItem[a.id];
          const pB = progressByItem[b.id];
          if (pB.lapses !== pA.lapses) return pB.lapses - pA.lapses;
          return pA.boxLevel - pB.boxLevel;
        });
      selected = studied.slice(0, targetSize);
    }
    selectedLessonId = null;
  } else {
    const dueCap = Math.min(3, Math.ceil(targetSize * 0.4));
    const chosenDue = dueItems.slice(0, dueCap);
    const chosenIds = new Set(chosenDue.map((i) => i.id));

    const remainingSlots = targetSize - chosenDue.length;
    const chosenNew = unstartedItems.filter((i) => !chosenIds.has(i.id)).slice(0, remainingSlots);
    chosenNew.forEach((i) => chosenIds.add(i.id));

    selected = [...chosenDue, ...chosenNew];

    if (selected.length < targetSize) {
      const moreDue = dueItems.filter((i) => !chosenIds.has(i.id));
      const fill = moreDue.slice(0, targetSize - selected.length);
      fill.forEach((i) => chosenIds.add(i.id));
      selected = [...selected, ...fill];
    }

    if (selected.length < targetSize) {
      const consolidated = orderedItems
        .filter((i) => !chosenIds.has(i.id))
        .sort((a, b) => {
          const pA = progressByItem[a.id];
          const pB = progressByItem[b.id];
          return (pA?.boxLevel ?? 0) - (pB?.boxLevel ?? 0);
        });
      selected = [...selected, ...consolidated.slice(0, targetSize - selected.length)];
    }

    selectedLessonId = chosenNew[0]?.lessonId ?? null;
  }

  let dueCount = 0;
  let newCount = 0;
  for (const item of selected) {
    const p = progressByItem[item.id];
    if (!p?.lastReviewedAt) newCount += 1;
    else if (isItemDue(p, nowMs)) dueCount += 1;
  }

  return {
    entries: selected.map((item) => ({
      item,
      isRetry: false,
      attemptsInSession: 0,
      hadErrorInSession: false,
    })),
    dueCount,
    newCount,
    lessonId: selectedLessonId,
  };
}

export interface XpBreakdown {
  firstTryXp: number;
  recoveredXp: number;
  comboBonus: number;
  completionBonus: number;
  accuracyBonus: number;
  totalXp: number;
  accuracyPct: number;
}

export function calculateSessionXp(
  firstTryCorrect: number,
  recoveredCount: number,
  totalItems: number,
  maxCombo: number
): XpBreakdown {
  const firstTryXp = firstTryCorrect * 10;
  const recoveredXp = recoveredCount * 4;
  const comboBonus = maxCombo >= 3 ? maxCombo * 2 : 0;
  const completionBonus = totalItems > 0 ? 15 : 0;
  const accuracyPct = totalItems > 0 ? Math.round((firstTryCorrect / totalItems) * 100) : 0;
  const accuracyBonus = accuracyPct >= 85 && totalItems > 0 ? 10 : 0;

  return {
    firstTryXp,
    recoveredXp,
    comboBonus,
    completionBonus,
    accuracyBonus,
    totalXp: firstTryXp + recoveredXp + comboBonus + completionBonus + accuracyBonus,
    accuracyPct,
  };
}

export function updateDailyStreak(
  stats: UserStats,
  earnedXp: number,
  nowMs: number
): UserStats {
  const todayStr = getLocalDateString(nowMs, stats.timezone);
  const yesterdayStr = getPreviousDateString(todayStr);

  const todayXp = stats.todayDate === todayStr ? stats.todayXp + earnedXp : earnedXp;

  let nextStreak = stats.currentStreak;
  if (stats.lastStudyDate === todayStr) {
    nextStreak = Math.max(1, stats.currentStreak);
  } else if (stats.lastStudyDate === yesterdayStr) {
    nextStreak = stats.currentStreak + 1;
  } else {
    nextStreak = 1;
  }

  return {
    ...stats,
    totalXp: stats.totalXp + earnedXp,
    todayXp,
    todayDate: todayStr,
    currentStreak: nextStreak,
    longestStreak: Math.max(stats.longestStreak, nextStreak),
    lastStudyDate: todayStr,
    sessionsCompleted: stats.sessionsCompleted + 1,
  };
}

export function getNextUnfinishedLesson(
  lessons: StudyLesson[],
  modules: StudyModule[],
  items: StudyItem[],
  progressByItem: Record<string, UserItemProgress>
): StudyLesson | null {
  const modOrder = new Map(modules.map((m) => [m.id, m.orderIndex]));
  const sortedLessons = [...lessons].sort((a, b) => {
    const ma = modOrder.get(a.moduleId) ?? 99;
    const mb = modOrder.get(b.moduleId) ?? 99;
    if (ma !== mb) return ma - mb;
    return a.orderIndex - b.orderIndex;
  });

  for (const lesson of sortedLessons) {
    const lessonItems = items.filter((i) => i.lessonId === lesson.id);
    const hasUnstarted = lessonItems.some((i) => !progressByItem[i.id]?.lastReviewedAt);
    if (hasUnstarted) return lesson;
  }
  return sortedLessons[0] ?? null;
}
