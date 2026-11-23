import {DEFAULT_USER_ID, getLocalDateString} from '../engine/srs';
import type {PersistedStudyState} from '../types/study';

const STORAGE_KEY = 'vozclara_study_state_v1';

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function createDefaultState(nowMs: number = Date.now()): PersistedStudyState {
  const timezone = getBrowserTimezone();
  return {
    version: 1,
    dayOffset: 0,
    progressByItem: {},
    stats: {
      userId: DEFAULT_USER_ID,
      timezone,
      totalXp: 0,
      todayXp: 0,
      todayDate: getLocalDateString(nowMs, timezone),
      currentStreak: 0,
      longestStreak: 0,
      dailyXpGoal: 50,
      lastStudyDate: null,
      sessionsCompleted: 0,
      soundEnabled: true,
    },
    sessions: [],
    customItems: [],
  };
}

export function loadStudyState(): PersistedStudyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }
    const parsed = JSON.parse(raw) as Partial<PersistedStudyState>;
    const fallback = createDefaultState();
    return {
      version: 1,
      dayOffset: typeof parsed.dayOffset === 'number' ? parsed.dayOffset : 0,
      progressByItem: parsed.progressByItem ?? {},
      stats: {
        ...fallback.stats,
        ...(parsed.stats ?? {}),
      },
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      customItems: Array.isArray(parsed.customItems) ? parsed.customItems : [],
    };
  } catch {
    return createDefaultState();
  }
}

export function saveStudyState(state: PersistedStudyState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignorar errores de cuota
  }
}

export function resetStudyState(): PersistedStudyState {
  const fresh = createDefaultState();
  saveStudyState(fresh);
  return fresh;
}
