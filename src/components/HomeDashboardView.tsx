import React, {useMemo, useState} from 'react';
import {
  ArrowRight,
  Clock,
  Filter,
  Megaphone,
  Mic,
  Pause,
  PauseCircle,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  Volume2,
} from 'lucide-react';
import type {
  SessionMode,
  StudyItem,
  StudyLesson,
  StudyModule,
  StudySessionRecord,
  UserItemProgress,
  UserStats,
} from '../types/study';
import {computeDailySeries} from '../engine/analytics';
import {getLocalDateString, isItemDue} from '../engine/srs';
import {speakSpanishPhrase} from '../utils/sound';

interface HomeDashboardViewProps {
  modules: StudyModule[];
  lessons: StudyLesson[];
  items: StudyItem[];
  progressByItem: Record<string, UserItemProgress>;
  stats: UserStats;
  sessions: StudySessionRecord[];
  nextLesson: StudyLesson | null;
  nowMs: number;
  dayOffset: number;
  onStartSession: (mode: SessionMode, lessonId?: string | null) => void;
  onNavigateTab: (tab: 'path' | 'review' | 'phrases' | 'analytics' | 'model') => void;
}

const WAVEFORM_HEIGHTS = [12, 24, 32, 16, 28, 10, 20, 36, 18, 26, 12, 22, 30, 14, 24, 8, 28, 20, 32, 16, 22, 12, 26, 14];

function formatDurationTotal(seconds: number): string {
  if (seconds <= 0) return '0m';
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  modules,
  lessons,
  items,
  progressByItem,
  stats,
  sessions,
  nextLesson,
  nowMs,
  dayOffset,
  onStartSession,
  onNavigateTab,
}) => {
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(6);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  const todayStr = getLocalDateString(nowMs, stats.timezone);
  const todayXp = stats.todayDate === todayStr ? stats.todayXp : 0;
  const dailyProgressPct = Math.min(100, Math.round((todayXp / Math.max(1, stats.dailyXpGoal)) * 100));

  const dueCount = useMemo(
    () => items.filter((item) => isItemDue(progressByItem[item.id], nowMs)).length,
    [items, progressByItem, nowMs]
  );

  const leechCount = useMemo(
    () => items.filter((item) => progressByItem[item.id]?.isLeech).length,
    [items, progressByItem]
  );

  const sessionSummary = useMemo(() => {
    if (sessions.length === 0) {
      return {accuracyPct: 0, totalFirst: 0, totalItems: 0, totalSeconds: 0};
    }
    const acc = sessions.reduce(
      (sum, s) => ({
        first: sum.first + s.firstTryCorrect,
        items: sum.items + s.itemsTotal,
        secs: sum.secs + s.durationSeconds,
      }),
      {first: 0, items: 0, secs: 0}
    );
    return {
      accuracyPct: acc.items > 0 ? Math.round((acc.first / acc.items) * 100) : 0,
      totalFirst: acc.first,
      totalItems: acc.items,
      totalSeconds: acc.secs,
    };
  }, [sessions]);

  const weeklySeries = useMemo(
    () => computeDailySeries({sessions, stats, nowMs, days: 7}),
    [sessions, stats, nowMs]
  );

  const maxWeeklyXp = useMemo(
    () => Math.max(stats.dailyXpGoal, ...weeklySeries.map((d) => d.xp), 40),
    [weeklySeries, stats.dailyXpGoal]
  );

  const selectedDay = weeklySeries[selectedDayIdx] ?? weeklySeries[weeklySeries.length - 1];

  const moduleMap = useMemo(() => new Map(modules.map((m) => [m.id, m])), [modules]);
  const lessonMap = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);

  // Seleccionar 3 lecciones recomendadas reales (priorizando no terminadas desde nextLesson)
  const recommendedLessons = useMemo(() => {
    const ordered = [...lessons].sort((a, b) => {
      const modA = moduleMap.get(a.moduleId)?.orderIndex ?? 0;
      const modB = moduleMap.get(b.moduleId)?.orderIndex ?? 0;
      if (modA !== modB) return modA - modB;
      return a.orderIndex - b.orderIndex;
    });

    const unfinished = ordered.filter((lesson) => {
      const lessonItems = items.filter((i) => i.lessonId === lesson.id);
      const seenCount = lessonItems.filter((i) => Boolean(progressByItem[i.id]?.lastReviewedAt)).length;
      return lessonItems.length === 0 || seenCount < lessonItems.length;
    });

    const list = unfinished.length >= 3 ? unfinished : [...unfinished, ...ordered.filter((l) => !unfinished.includes(l))];
    return list.slice(0, 3);
  }, [lessons, items, progressByItem, moduleMap]);

  // Módulo activo real basado en nextLesson
  const activeLesson = nextLesson ?? lessons[0];
  const activeModule = activeLesson ? moduleMap.get(activeLesson.moduleId) ?? modules[0] : modules[0];
  const activeModuleLessons = useMemo(
    () => lessons.filter((l) => l.moduleId === activeModule?.id),
    [lessons, activeModule]
  );
  const activeModuleStats = useMemo(() => {
    const lessonIds = new Set(activeModuleLessons.map((l) => l.id));
    const modItems = items.filter((i) => lessonIds.has(i.lessonId));
    const seen = modItems.filter((i) => Boolean(progressByItem[i.id]?.lastReviewedAt)).length;
    const pct = modItems.length > 0 ? Math.round((seen / modItems.length) * 100) : 0;
    return {total: modItems.length, seen, pct};
  }, [activeModuleLessons, items, progressByItem]);

  // Última sesión real y frase modelo asociada para reproducir audio
  const latestSession = sessions[0] ?? null;
  const latestSessionTitle = latestSession
    ? latestSession.lessonId
      ? lessonMap.get(latestSession.lessonId)?.title ?? 'Lección completada'
      : latestSession.mode === 'review'
        ? 'Sesión de repaso espaciado'
        : 'Sesión rápida combinada'
    : 'Apertura firme sin muletillas';

  const latestSessionScore = latestSession && latestSession.itemsTotal > 0
    ? Math.round((latestSession.firstTryCorrect / latestSession.itemsTotal) * 100)
    : null;

  const previewPhrase = useMemo(() => {
    if (latestSession?.lessonId) {
      const match = items.find((i) => i.lessonId === latestSession.lessonId && i.spokenTakeaway);
      if (match?.spokenTakeaway) return match.spokenTakeaway;
    }
    const fallback = items.find((i) => Boolean(i.spokenTakeaway));
    return (
      fallback?.spokenTakeaway ??
      'Tengo una alternativa que puede reducir el tiempo a la mitad; les cuento cómo.'
    );
  }, [latestSession, items]);

  const handleToggleWaveformPlay = () => {
    if (isPlayingPreview) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingPreview(false);
      return;
    }

    setIsPlayingPreview(true);
    speakSpanishPhrase(previewPhrase);
    window.setTimeout(() => {
      setIsPlayingPreview(false);
    }, 3600);
  };

  // Coordenadas del gráfico semanal SVG (width: 640, height: 220)
  const chartPoints = weeklySeries.map((day, idx) => {
    const x = 70 + idx * 82;
    const ratio = maxWeeklyXp > 0 ? day.xp / maxWeeklyXp : 0;
    const barHeight = Math.max(8, Math.round(ratio * 136));
    const y = 170 - barHeight;
    return {day, idx, x, y, barHeight};
  });

  const polylinePoints = chartPoints.map((p) => `${p.x + 18},${p.y}`).join(' ');

  return (
    <div className="flex flex-col gap-8">
      {/* Banner de bienvenida */}
      <section className="relative overflow-hidden rounded-xl border border-slate-200/70 bg-white p-6 shadow-xs md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[#e2dfff]/55 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-32 -bottom-16 h-48 w-48 rounded-full bg-[#ffdbca]/55 blur-2xl"
        />

        <div className="relative z-10 flex max-w-2xl flex-col gap-2.5">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3525cd]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Sesión diaria recomendada · {modules.length} unidades · {lessons.length} lecciones
            {dayOffset > 0 ? ` · +${dayOffset} d simulados` : ''}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1e] text-balance">
            Entrena tu voz y elocuencia hoy
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-[#464555]">
            {stats.currentStreak > 0
              ? `Mantienes una racha de ${stats.currentStreak} día(s) y llevas ${todayXp} de ${stats.dailyXpGoal} XP hoy. ${
                  dueCount > 0
                    ? `Tienes ${dueCount} ejercicio(s) listos para repasar antes de olvidarlos.`
                    : 'Tu cola de repaso está al día.'
                }`
              : `Completa una micro-sesión de 5 minutos enfocada en claridad, oratoria y comunicación ejecutiva.`}
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <button
            type="button"
            onClick={() => onStartSession('mixed', null)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#fd761a] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#e5650d] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
            Iniciar Práctica Rápida
          </button>
        </div>
      </section>

      {/* Fila de 4 KPIs reales */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200/70 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#464555]">Precisión vocal</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e2dfff] text-[#0f0069]">
              <Target className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2 tabular-nums">
            <span className="font-display text-3xl font-bold text-[#191c1e]">
              {sessions.length > 0 ? `${sessionSummary.accuracyPct}%` : '—'}
            </span>
            <span className="text-xs font-medium text-[#005338]">
              {sessions.length > 0
                ? `${sessionSummary.totalFirst}/${sessionSummary.totalItems} al 1.º intento`
                : 'Sin sesiones aún'}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200/70 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#464555]">Meta de hoy</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e2dfff] text-[#0f0069]">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2 tabular-nums">
            <span className="font-display text-3xl font-bold text-[#191c1e]">
              {todayXp}{' '}
              <span className="font-sans text-sm font-normal text-[#464555]">
                / {stats.dailyXpGoal} XP
              </span>
            </span>
            <span className="text-xs font-medium text-[#005338]">
              {todayXp >= stats.dailyXpGoal ? 'Objetivo cumplido' : `${dailyProgressPct}% hoy`}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('review')}
          className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200/70 bg-white p-5 text-left shadow-xs transition-colors hover:border-indigo-200 hover:bg-indigo-50/20"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#464555]">Repasos pendientes</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ffdbca] text-[#341100]">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2 tabular-nums">
            <span className="font-display text-3xl font-bold text-[#191c1e]">{dueCount}</span>
            <span className="text-xs font-medium text-[#9d4300]">
              {leechCount > 0 ? `${leechCount} críticos` : dueCount > 0 ? 'Listos hoy' : 'Al día'}
            </span>
          </div>
        </button>

        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200/70 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#464555]">Tiempo de práctica</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e2dfff] text-[#0f0069]">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2 tabular-nums">
            <span className="font-display text-3xl font-bold text-[#191c1e]">
              {formatDurationTotal(sessionSummary.totalSeconds)}
            </span>
            <span className="text-xs font-medium text-[#464555]">
              {stats.sessionsCompleted} sesiones
            </span>
          </div>
        </div>
      </section>

      {/* Grid principal de 2 columnas */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Columna izquierda */}
        <div className="flex min-w-0 flex-col gap-8 lg:col-span-8">
          {/* Progreso Semanal (7 días reales) */}
          <section className="flex flex-col gap-5 rounded-xl border border-slate-200/70 bg-white p-6 shadow-xs">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-xl font-bold text-[#191c1e]">Progreso Semanal</h2>
                <p className="text-xs text-[#464555]">
                  XP diario acumulado en los últimos 7 días (haz clic en una barra para inspeccionar)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-[#464555]">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#4f46e5]" />
                  Meta: {stats.dailyXpGoal} XP
                </div>
                {selectedDay && (
                  <span className="rounded-lg bg-[#e2dfff] px-2.5 py-1 font-mono text-xs font-semibold text-[#0f0069] tabular-nums">
                    {selectedDay.label}: {selectedDay.xp} XP
                  </span>
                )}
              </div>
            </div>

            <div className="w-full pt-1">
              <svg
                aria-label="Gráfico de progreso semanal de XP"
                className="h-auto w-full sm:h-56 overflow-visible"
                role="img"
                viewBox="0 0 640 215"
              >
                {/* Líneas guía horizontales */}
                <g className="text-[#e6e8ea]" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1">
                  <line x1="42" x2="620" y1="34" y2="34" />
                  <line x1="42" x2="620" y1="80" y2="80" />
                  <line x1="42" x2="620" y1="125" y2="125" />
                  <line x1="42" x2="620" y1="170" y2="170" />
                </g>

                {/* Etiquetas Y */}
                <g className="fill-[#777587] font-mono text-[11px]" textAnchor="end">
                  <text x="34" y="38">{maxWeeklyXp}</text>
                  <text x="34" y="84">{Math.round(maxWeeklyXp * 0.66)}</text>
                  <text x="34" y="129">{Math.round(maxWeeklyXp * 0.33)}</text>
                  <text x="34" y="174">0</text>
                </g>

                {/* Barras interactivas */}
                <g>
                  {chartPoints.map((pt) => {
                    const isSelected = pt.idx === selectedDayIdx;
                    return (
                      <rect
                        key={pt.day.date}
                        x={pt.x}
                        y={pt.y}
                        width={36}
                        height={pt.barHeight}
                        rx={6}
                        onClick={() => setSelectedDayIdx(pt.idx)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'fill-[#4f46e5]'
                            : pt.day.goalMet
                              ? 'fill-[#6ffbbe] hover:fill-[#4edea3]'
                              : 'fill-[#e2dfff] hover:fill-[#c3c0ff]'
                        }`}
                      />
                    );
                  })}
                </g>

                {/* Línea de tendencia */}
                {chartPoints.length > 1 && (
                  <polyline
                    fill="none"
                    points={polylinePoints}
                    stroke="#3525cd"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    className="pointer-events-none"
                  />
                )}

                {/* Puntos */}
                <g className="pointer-events-none">
                  {chartPoints.map((pt) => (
                    <circle
                      key={pt.day.date}
                      cx={pt.x + 18}
                      cy={pt.y}
                      r={pt.idx === selectedDayIdx ? 5 : 3.5}
                      className={pt.idx === selectedDayIdx ? 'fill-[#fd761a]' : 'fill-[#3525cd]'}
                    />
                  ))}
                </g>

                {/* Etiquetas X */}
                <g textAnchor="middle" className="font-sans text-[12px]">
                  {chartPoints.map((pt) => (
                    <text
                      key={pt.day.date}
                      x={pt.x + 18}
                      y={198}
                      className={
                        pt.idx === selectedDayIdx
                          ? 'fill-[#191c1e] font-semibold'
                          : 'fill-[#464555]'
                      }
                    >
                      {pt.day.label}
                    </text>
                  ))}
                </g>
              </svg>
            </div>
          </section>

          {/* Lecciones Recomendadas para Hoy */}
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-lg sm:text-xl font-bold text-[#191c1e]">
                Lecciones Recomendadas para Hoy
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('path')}
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#3525cd] hover:underline whitespace-nowrap shrink-0"
              >
                Ver todas ({lessons.length})
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {recommendedLessons.map((lesson, index) => {
                const mod = moduleMap.get(lesson.moduleId);
                const lessonItems = items.filter((i) => i.lessonId === lesson.id);
                const seen = lessonItems.filter((i) =>
                  Boolean(progressByItem[i.id]?.lastReviewedAt)
                ).length;

                const iconConfig =
                  index === 0
                    ? {bg: 'bg-[#e2dfff] text-[#0f0069]', Icon: PauseCircle}
                    : index === 1
                      ? {bg: 'bg-[#ffdbca] text-[#341100]', Icon: Filter}
                      : {bg: 'bg-[#6ffbbe] text-[#002113]', Icon: Megaphone};

                const CardIcon = iconConfig.Icon;

                return (
                  <article
                    key={lesson.id}
                    className="flex flex-col justify-between gap-5 rounded-xl border border-slate-200/70 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconConfig.bg}`}
                        >
                          <CardIcon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <span className="text-xs font-medium text-[#464555] tabular-nums">
                          ~{lesson.estimatedMinutes} min · {seen}/{lessonItems.length}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#777587]">
                        {mod ? `Unidad ${String(mod.orderIndex).padStart(2, '0')} · ${mod.category}` : 'Práctica'}
                      </p>
                      <h3 className="font-display text-base font-bold leading-snug text-[#191c1e]">
                        {lesson.title}
                      </h3>
                      <p className="line-clamp-2 text-xs leading-relaxed text-[#464555]">
                        {lesson.summary}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onStartSession('lesson', lesson.id)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3525cd] whitespace-nowrap cursor-pointer"
                    >
                      <Play className="h-4 w-4" aria-hidden="true" />
                      Practicar
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        {/* Columna derecha */}
        <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4">
          {/* Último Análisis de Sesión */}
          <section className="flex flex-col gap-4 rounded-xl border border-slate-200/70 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#191c1e]">
                {latestSession ? 'Última Sesión' : 'Audio de Muestra'}
              </h2>
              <span className="font-mono text-xs font-semibold text-[#005338] tabular-nums">
                {latestSessionScore !== null ? `${latestSessionScore}/100` : 'Modelo base'}
              </span>
            </div>

            <div>
              <p className="text-xs text-[#464555] tabular-nums">
                {latestSession
                  ? `${new Intl.DateTimeFormat('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(latestSession.completedAt))} · +${latestSession.xpEarned} XP`
                  : 'Unidad 01 · Elocuencia diaria'}
              </p>
              <h3 className="mt-1 truncate text-base font-semibold text-[#191c1e]">
                {latestSessionTitle}
              </h3>
            </div>

            {/* Vista previa con forma de onda y TTS real */}
            <div className="flex items-center gap-3 rounded-xl bg-[#f2f4f6] p-3.5">
              <button
                type="button"
                onClick={handleToggleWaveformPlay}
                aria-label={isPlayingPreview ? 'Pausar frase modelo' : 'Escuchar frase modelo'}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4f46e5] text-white transition-colors hover:bg-[#3525cd] cursor-pointer"
              >
                {isPlayingPreview ? (
                  <Pause className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              <svg
                aria-hidden="true"
                className="h-10 w-full text-[#4f46e5]"
                viewBox="0 0 192 40"
              >
                {WAVEFORM_HEIGHTS.map((h, i) => {
                  const y = (40 - h) / 2;
                  return (
                    <rect
                      key={i}
                      x={i * 8}
                      y={y}
                      width={4}
                      height={h}
                      rx={2}
                      fill="currentColor"
                      opacity={isPlayingPreview ? (i % 2 === 0 ? 0.95 : 0.6) : 0.65}
                    />
                  );
                })}
              </svg>
            </div>

            <p className="text-xs italic leading-relaxed text-[#464555]">
              “{previewPhrase}”
            </p>

            <button
              type="button"
              onClick={() => onNavigateTab('analytics')}
              className="inline-flex w-full items-center justify-between pt-1 text-sm font-semibold text-[#3525cd] hover:underline"
            >
              <span>Ver reporte completo</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </section>

          {/* Tu Ruta Actual */}
          {activeModule && activeLesson && (
            <section className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-xs flex flex-col">
              <div className="relative flex h-32 w-full items-end overflow-hidden bg-gradient-to-br from-[#2d3133] via-[#3525cd] to-[#fd761a]/80 p-4">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 320 120"
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-25"
                >
                  <circle cx="255" cy="56" r="46" fill="none" stroke="white" strokeWidth="1.5" />
                  <circle cx="255" cy="56" r="28" fill="none" stroke="white" strokeWidth="1.5" />
                  <path
                    d="M20 92 Q 95 45, 175 86 T 310 64"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  />
                </svg>
                <div className="relative z-10 flex w-full items-center justify-between">
                  <span className="rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#191c1e]">
                    Unidad {String(activeModule.orderIndex).padStart(2, '0')} activa
                  </span>
                  <Mic className="h-6 w-6 text-white/90" aria-hidden="true" />
                </div>
              </div>

              <div className="flex flex-col gap-4 p-6">
                <div>
                  <p className="text-xs font-medium text-[#464555]">{activeModule.category}</p>
                  <h3 className="mt-1 font-display text-lg font-bold text-[#191c1e]">
                    {activeModule.title}
                  </h3>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="text-[#464555]">Progreso de la unidad</span>
                    <span className="font-semibold text-[#3525cd]">
                      {activeModuleStats.pct}% ({activeModuleStats.seen}/{activeModuleStats.total})
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e6e8ea]">
                    <div
                      className="h-full rounded-full bg-[#4f46e5] transition-all duration-500"
                      style={{width: `${activeModuleStats.pct}%`}}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onStartSession('lesson', activeLesson.id)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2f4f6] px-4 py-2.5 text-sm font-semibold text-[#191c1e] transition-colors hover:bg-[#e6e8ea] cursor-pointer"
                >
                  <span>Continuar: {activeLesson.title}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};
