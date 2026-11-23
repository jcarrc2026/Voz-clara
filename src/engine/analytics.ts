import type {
  SkillDimension,
  StudyItem,
  StudyLesson,
  StudyModule,
  StudySessionRecord,
  UserItemProgress,
  UserStats,
} from '../types/study';
import {DAY_MS, getLocalDateString} from './srs';

export const ALL_SKILLS: SkillDimension[] = [
  'Claridad y Estructura',
  'Ritmo y Pausas',
  'Tono Persuasivo',
  'Presencia Ejecutiva',
  'Escucha y Tacto',
];

export const SKILL_SHORT_LABELS: Record<SkillDimension, string> = {
  'Claridad y Estructura': 'Claridad',
  'Ritmo y Pausas': 'Ritmo y pausas',
  'Tono Persuasivo': 'Persuasión',
  'Presencia Ejecutiva': 'Ejecutivo',
  'Escucha y Tacto': 'Escucha y tacto',
};

export interface DailyAnalyticsPoint {
  date: string; // YYYY-MM-DD
  label: string; // ej. "22 nov"
  xp: number;
  sessions: number;
  streak: number;
  goalMet: boolean;
}

export interface SkillBreakdownPoint {
  skill: SkillDimension;
  shortLabel: string;
  masteryPct: number; // 0..100
  practicedCount: number;
  totalCount: number;
  avgBox: number;
  lapsesTotal: number;
}

export function inferItemSkill(
  item: StudyItem,
  lessons: StudyLesson[],
  modules: StudyModule[]
): SkillDimension {
  if (item.skillTag) return item.skillTag;

  if (
    item.id === 'itm_elo_1_3' ||
    item.id === 'itm_pub_1_3' ||
    item.id === 'itm_biz_2_3'
  ) {
    return 'Ritmo y Pausas';
  }

  const lesson = lessons.find((l) => l.id === item.lessonId);
  const mod = lesson ? modules.find((m) => m.id === lesson.moduleId) : undefined;

  if (lesson?.id === 'les_elo_01_03' || lesson?.id === 'les_pub_02_03') {
    return 'Escucha y Tacto';
  }
  if (lesson?.id === 'les_pub_02_02') return 'Ritmo y Pausas';
  if (lesson?.id === 'les_biz_03_01' || lesson?.id === 'les_biz_03_03') {
    return 'Presencia Ejecutiva';
  }
  if (lesson?.id === 'les_biz_03_02' || lesson?.id === 'les_pub_02_01') {
    return 'Tono Persuasivo';
  }
  if (mod?.category === 'Comunicación empresarial') return 'Presencia Ejecutiva';
  if (mod?.category === 'Hablar en público') return 'Ritmo y Pausas';
  return 'Claridad y Estructura';
}

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(dt);
}

export function computeDailySeries(params: {
  sessions: StudySessionRecord[];
  stats: UserStats;
  nowMs: number;
  days: number;
}): DailyAnalyticsPoint[] {
  const {sessions, stats, nowMs, days} = params;
  const xpByDate = new Map<string, {xp: number; sessions: number}>();

  for (const session of sessions) {
    const ts = Date.parse(session.completedAt);
    const localDate = getLocalDateString(Number.isNaN(ts) ? nowMs : ts, stats.timezone);
    const prev = xpByDate.get(localDate) ?? {xp: 0, sessions: 0};
    xpByDate.set(localDate, {
      xp: prev.xp + session.xpEarned,
      sessions: prev.sessions + 1,
    });
  }

  // Construimos un rango extendido previo para calcular la racha acumulada correctamente
  const lookbackDays = Math.max(days + 30, 60);
  const allDates: string[] = [];
  for (let offset = lookbackDays - 1; offset >= 0; offset -= 1) {
    allDates.push(getLocalDateString(nowMs - offset * DAY_MS, stats.timezone));
  }

  const streakByDate = new Map<string, number>();
  let runningStreak = 0;

  for (const dateStr of allDates) {
    const dayData = xpByDate.get(dateStr);
    if (dayData && dayData.xp > 0) {
      runningStreak += 1;
    } else {
      runningStreak = 0;
    }
    streakByDate.set(dateStr, runningStreak);
  }

  // Si el usuario tiene racha registrada hoy en stats (ej. importada), aseguramos coherencia en el día actual
  const todayStr = getLocalDateString(nowMs, stats.timezone);
  if (stats.lastStudyDate === todayStr && (streakByDate.get(todayStr) ?? 0) < stats.currentStreak) {
    streakByDate.set(todayStr, stats.currentStreak);
  }

  const windowDates = allDates.slice(allDates.length - days);
  return windowDates.map((dateStr) => {
    const dayData = xpByDate.get(dateStr) ?? {xp: 0, sessions: 0};
    return {
      date: dateStr,
      label: formatShortDate(dateStr),
      xp: dayData.xp,
      sessions: dayData.sessions,
      streak: streakByDate.get(dateStr) ?? 0,
      goalMet: dayData.xp >= stats.dailyXpGoal,
    };
  });
}

export function computeSkillBreakdown(params: {
  items: StudyItem[];
  lessons: StudyLesson[];
  modules: StudyModule[];
  progressByItem: Record<string, UserItemProgress>;
}): SkillBreakdownPoint[] {
  const {items, lessons, modules, progressByItem} = params;

  return ALL_SKILLS.map((skill) => {
    const skillItems = items.filter((item) => inferItemSkill(item, lessons, modules) === skill);
    const totalCount = skillItems.length;

    let practicedCount = 0;
    let boxSum = 0;
    let lapsesTotal = 0;
    let masteryPoints = 0;

    for (const item of skillItems) {
      const prog = progressByItem[item.id];
      if (prog && prog.lastReviewedAt) {
        practicedCount += 1;
        boxSum += prog.boxLevel;
        lapsesTotal += prog.lapses;
        // Nivel 4+ equivale a dominio consolidado (100%); niveles 0..3 escalan proporcionalmente
        const itemScore = Math.min(1, (prog.boxLevel + (prog.lastResult === 'correct_first' ? 1 : 0.35)) / 4);
        masteryPoints += itemScore;
      }
    }

    const masteryPct = totalCount > 0 ? Math.round((masteryPoints / totalCount) * 100) : 0;
    const avgBox = practicedCount > 0 ? Number((boxSum / practicedCount).toFixed(1)) : 0;

    return {
      skill,
      shortLabel: SKILL_SHORT_LABELS[skill],
      masteryPct,
      practicedCount,
      totalCount,
      avgBox,
      lapsesTotal,
    };
  });
}

export type AchievementIconKey =
  | 'mic'
  | 'sun'
  | 'flame'
  | 'crown'
  | 'award'
  | 'target'
  | 'zap'
  | 'trophy';

export interface AchievementBadge {
  id: string;
  title: string;
  category: 'Racha' | 'Sesiones' | 'Horario' | 'Precisión' | 'XP';
  description: string;
  icon: AchievementIconKey;
  unlocked: boolean;
  progressCurrent: number;
  progressTarget: number;
  progressLabel: string;
}

function getLocalHour(isoDate: string, timezone: string): number {
  try {
    const dt = new Date(isoDate);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).formatToParts(dt);
    const hourPart = parts.find((p) => p.type === 'hour')?.value;
    const parsed = Number(hourPart);
    return Number.isNaN(parsed) ? dt.getHours() : parsed % 24;
  } catch {
    return new Date(isoDate).getHours();
  }
}

export function computeAchievements(
  stats: UserStats,
  sessions: StudySessionRecord[]
): AchievementBadge[] {
  const sessionsCount = Math.max(stats.sessionsCompleted, sessions.length);
  const bestStreak = Math.max(stats.longestStreak, stats.currentStreak);
  const hasEarlyBird = sessions.some((s) => getLocalHour(s.completedAt, stats.timezone) < 9);
  const hasPerfectSession = sessions.some(
    (s) => s.itemsTotal > 0 && s.firstTryCorrect === s.itemsTotal
  );

  return [
    {
      id: 'ach_first_voice',
      title: 'Primera Voz',
      category: 'Sesiones',
      description: 'Completa tu primera micro-sesión de elocuencia.',
      icon: 'mic',
      unlocked: sessionsCount >= 1,
      progressCurrent: Math.min(1, sessionsCount),
      progressTarget: 1,
      progressLabel: `${Math.min(1, sessionsCount)} / 1 sesión`,
    },
    {
      id: 'ach_early_bird',
      title: 'Madrugador (Early Bird)',
      category: 'Horario',
      description: 'Completa una sesión de práctica antes de las 9:00 a. m.',
      icon: 'sun',
      unlocked: hasEarlyBird,
      progressCurrent: hasEarlyBird ? 1 : 0,
      progressTarget: 1,
      progressLabel: hasEarlyBird ? '1 / 1 antes 9:00' : '0 / 1 antes 9:00',
    },
    {
      id: 'ach_streak_3',
      title: 'Ritmo Constante',
      category: 'Racha',
      description: 'Mantén una racha diaria de 3 días consecutivos.',
      icon: 'flame',
      unlocked: bestStreak >= 3,
      progressCurrent: Math.min(3, bestStreak),
      progressTarget: 3,
      progressLabel: `${Math.min(3, bestStreak)} / 3 días`,
    },
    {
      id: 'ach_consistency_king',
      title: 'Rey de la Constancia (Consistency King)',
      category: 'Racha',
      description: 'Alcanza una racha diaria de 7 días consecutivos.',
      icon: 'crown',
      unlocked: bestStreak >= 7,
      progressCurrent: Math.min(7, bestStreak),
      progressTarget: 7,
      progressLabel: `${Math.min(7, bestStreak)} / 7 días`,
    },
    {
      id: 'ach_sessions_5',
      title: 'Orador en Marcha',
      category: 'Sesiones',
      description: 'Completa 5 sesiones cortas de entrenamiento.',
      icon: 'award',
      unlocked: sessionsCount >= 5,
      progressCurrent: Math.min(5, sessionsCount),
      progressTarget: 5,
      progressLabel: `${Math.min(5, sessionsCount)} / 5 sesiones`,
    },
    {
      id: 'ach_sessions_10',
      title: 'Presencia Sólida',
      category: 'Sesiones',
      description: 'Completa 10 sesiones de práctica en la ruta.',
      icon: 'trophy',
      unlocked: sessionsCount >= 10,
      progressCurrent: Math.min(10, sessionsCount),
      progressTarget: 10,
      progressLabel: `${Math.min(10, sessionsCount)} / 10 sesiones`,
    },
    {
      id: 'ach_perfect_session',
      title: 'Precisión Escénica',
      category: 'Precisión',
      description: 'Termina una sesión con 100% de aciertos al primer intento.',
      icon: 'target',
      unlocked: hasPerfectSession,
      progressCurrent: hasPerfectSession ? 1 : 0,
      progressTarget: 1,
      progressLabel: hasPerfectSession ? '100% logrado' : '0 / 1 perfecta',
    },
    {
      id: 'ach_xp_500',
      title: 'Voz de Alto Impacto',
      category: 'XP',
      description: 'Acumula 500 XP totales practicando comunicación y oratoria.',
      icon: 'zap',
      unlocked: stats.totalXp >= 500,
      progressCurrent: Math.min(500, stats.totalXp),
      progressTarget: 500,
      progressLabel: `${Math.min(500, stats.totalXp)} / 500 XP`,
    },
  ];
}

