import React, {useMemo, useState} from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Crown,
  Flame,
  Lock,
  Mic,
  Play,
  Sun,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import type {
  SessionMode,
  SkillDimension,
  StudyItem,
  StudyLesson,
  StudyModule,
  StudySessionRecord,
  UserItemProgress,
  UserStats,
} from '../types/study';
import {
  computeAchievements,
  computeDailySeries,
  computeSkillBreakdown,
  inferItemSkill,
  type AchievementIconKey,
} from '../engine/analytics';

interface AnalyticsViewProps {
  modules: StudyModule[];
  lessons: StudyLesson[];
  items: StudyItem[];
  progressByItem: Record<string, UserItemProgress>;
  stats: UserStats;
  sessions: StudySessionRecord[];
  nowMs: number;
  dayOffset: number;
  onStartSession: (mode: SessionMode, lessonId?: string | null) => void;
}

type WindowDays = 7 | 14 | 30;

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  modules,
  lessons,
  items,
  progressByItem,
  stats,
  sessions,
  nowMs,
  dayOffset,
  onStartSession,
}) => {
  const [windowDays, setWindowDays] = useState<WindowDays>(14);

  const studiedCount = useMemo(
    () => items.filter((i) => Boolean(progressByItem[i.id]?.lastReviewedAt)).length,
    [items, progressByItem]
  );

  const dailySeries = useMemo(
    () =>
      computeDailySeries({
        sessions,
        stats,
        nowMs,
        days: windowDays,
      }),
    [sessions, stats, nowMs, windowDays]
  );

  const skillBreakdown = useMemo(
    () =>
      computeSkillBreakdown({
        items,
        lessons,
        modules,
        progressByItem,
      }),
    [items, lessons, modules, progressByItem]
  );

  const avgAccuracy = useMemo(() => {
    if (sessions.length === 0) return 0;
    const totals = sessions.reduce(
      (acc, s) => ({
        first: acc.first + s.firstTryCorrect,
        items: acc.items + s.itemsTotal,
      }),
      {first: 0, items: 0}
    );
    return totals.items > 0 ? Math.round((totals.first / totals.items) * 100) : 0;
  }, [sessions]);

  const strongestSkill = useMemo(() => {
    const practiced = skillBreakdown.filter((s) => s.practicedCount > 0);
    if (practiced.length === 0) return null;
    return [...practiced].sort((a, b) => b.masteryPct - a.masteryPct)[0];
  }, [skillBreakdown]);

  const windowTotalXp = useMemo(
    () => dailySeries.reduce((sum, d) => sum + d.xp, 0),
    [dailySeries]
  );

  const handlePracticeSkill = (skill: SkillDimension) => {
    const matchingItem = items.find((item) => inferItemSkill(item, lessons, modules) === skill);
    if (matchingItem) {
      onStartSession('lesson', matchingItem.lessonId);
    } else {
      onStartSession('mixed', null);
    }
  };

  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const achievements = useMemo(
    () => computeAchievements(stats, sessions),
    [stats, sessions]
  );

  const unlockedCount = useMemo(
    () => achievements.filter((a) => a.unlocked).length,
    [achievements]
  );

  const visibleAchievements = useMemo(() => {
    if (badgeFilter === 'unlocked') return achievements.filter((a) => a.unlocked);
    if (badgeFilter === 'locked') return achievements.filter((a) => !a.unlocked);
    return achievements;
  }, [achievements, badgeFilter]);

  const renderBadgeIcon = (key: AchievementIconKey, unlocked: boolean) => {
    const cls = `h-5 w-5 ${unlocked ? 'text-emerald-700' : 'text-slate-400'}`;
    switch (key) {
      case 'mic':
        return <Mic className={cls} aria-hidden="true" />;
      case 'sun':
        return <Sun className={cls} aria-hidden="true" />;
      case 'flame':
        return <Flame className={cls} aria-hidden="true" />;
      case 'crown':
        return <Crown className={cls} aria-hidden="true" />;
      case 'award':
        return <Award className={cls} aria-hidden="true" />;
      case 'target':
        return <Target className={cls} aria-hidden="true" />;
      case 'zap':
        return <Zap className={cls} aria-hidden="true" />;
      case 'trophy':
        return <Trophy className={cls} aria-hidden="true" />;
    }
  };

  const achievementsSection = (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-medium text-slate-500 tabular-nums">
            Insignias de constancia · {unlockedCount} de {achievements.length} desbloqueadas
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-slate-900">
            Logros de Oratoria
          </h2>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              {id: 'all', label: `Todos (${achievements.length})`},
              {id: 'unlocked', label: `Logrados (${unlockedCount})`},
              {id: 'locked', label: `Pendientes (${achievements.length - unlockedCount})`},
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setBadgeFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                badgeFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {visibleAchievements.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          {badgeFilter === 'unlocked'
            ? 'Aún no has desbloqueado insignias. Completa sesiones y mantén tu racha para activarlas.'
            : 'Ya desbloqueaste todas las insignias disponibles.'}
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleAchievements.map((badge) => {
            const pct = Math.min(
              100,
              Math.round((badge.progressCurrent / Math.max(1, badge.progressTarget)) * 100)
            );

            return (
              <article
                key={badge.id}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                  badge.unlocked
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        badge.unlocked ? 'bg-emerald-100' : 'bg-slate-200/70'
                      }`}
                    >
                      {renderBadgeIcon(badge.icon, badge.unlocked)}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        badge.unlocked ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {badge.unlocked ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Logrado
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                          Bloqueado
                        </>
                      )}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">{badge.category}</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-slate-900">{badge.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {badge.description}
                  </p>
                </div>

                <div className="mt-4 pt-2">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="font-mono text-slate-600">{badge.progressLabel}</span>
                    <span className="font-mono font-medium text-slate-700">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        badge.unlocked ? 'bg-emerald-600' : 'bg-sky-600'
                      }`}
                      style={{width: `${pct}%`}}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );

  if (sessions.length === 0 && studiedCount === 0) {
    return (
      <main className="space-y-8">
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-[#4f46e5]">
            <BarChart3 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">
            Analítica de Oratoria
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
            Completa tu primera micro-sesión para visualizar aquí tu XP diario frente a la meta, la evolución de tu racha y el desglose de tus habilidades de comunicación (claridad, ritmo y pausas, tono persuasivo, presencia ejecutiva y escucha activa).
          </p>
          <button
            type="button"
            onClick={() => onStartSession('mixed', null)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border-b-4 border-indigo-900 bg-[#4f46e5] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#3525cd] active:translate-y-0.5 active:border-b-0"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Completar primera sesión
          </button>
        </div>

        {achievementsSection}
      </main>
    );
  }

  return (
    <main className="space-y-8">
      {/* Encabezado y selector de ventana */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Progreso como orador · Últimos {windowDays} días
            {dayOffset > 0 ? ` · Reloj simulado (+${dayOffset} d)` : ''}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            Analítica de Oratoria y Comunicación
          </h1>
        </div>

        <div
          role="tablist"
          aria-label="Ventana de tiempo"
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
        >
          {([7, 14, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              role="tab"
              aria-selected={windowDays === days}
              onClick={() => setWindowDays(days)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                windowDays === days
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {days} días
            </button>
          ))}
        </div>
      </div>

      {/* Tira de 4 KPIs reales */}
      <section className="grid grid-cols-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white md:grid-cols-4 md:divide-x md:divide-y-0">
        <div className="p-5 tabular-nums">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <TrendingUp className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            XP en últimos {windowDays} d
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900">{windowTotalXp} XP</p>
          <p className="mt-0.5 text-xs text-slate-500">Acumulado total: {stats.totalXp} XP</p>
        </div>

        <div className="p-5 tabular-nums">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Flame className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
            Racha diaria
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900">
            {stats.currentStreak} días
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Mejor racha: {stats.longestStreak} días</p>
        </div>

        <div className="p-5 tabular-nums">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Target className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            Precisión media
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900">{avgAccuracy}%</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {stats.sessionsCompleted} sesión(es) completadas
          </p>
        </div>

        <div className="p-5 tabular-nums">
          <p className="text-xs font-medium text-slate-500">Fortaleza actual</p>
          <p className="mt-1.5 truncate text-lg font-bold text-slate-900">
            {strongestSkill ? strongestSkill.shortLabel : 'En evaluación'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {strongestSkill
              ? `${strongestSkill.masteryPct}% dominio (${strongestSkill.practicedCount}/${strongestSkill.totalCount})`
              : `${studiedCount} ejercicios vistos`}
          </p>
        </div>
      </section>

      {/* Gráficas 1 y 2: XP diario y Evolución de racha */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* XP Diario */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">XP diario vs. meta</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Meta diaria: {stats.dailyXpGoal} XP (verde cuando alcanzas el objetivo)
              </p>
            </div>
          </div>

          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySeries} margin={{top: 10, right: 12, left: -16, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tick={{fontSize: 11, fill: '#64748B'}}
                  tickLine={false}
                  axisLine={{stroke: '#CBD5E1'}}
                  interval={windowDays === 30 ? 4 : windowDays === 14 ? 1 : 0}
                />
                <YAxis
                  tick={{fontSize: 11, fill: '#64748B'}}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{fill: '#F1F5F9'}}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`${value ?? 0} XP`, 'XP ganado']}
                  labelFormatter={(label) => `Fecha: ${label}`}
                />
                <ReferenceLine
                  y={stats.dailyXpGoal}
                  stroke="#059669"
                  strokeDasharray="4 4"
                  label={{
                    value: `Meta ${stats.dailyXpGoal}`,
                    position: 'insideTopRight',
                    fill: '#059669',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="xp" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {dailySeries.map((entry) => (
                    <Cell
                      key={entry.date}
                      fill={entry.goalMet ? '#059669' : '#0284C7'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historial de racha */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Historial de racha</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Días consecutivos con práctica registrada en tu zona horaria ({stats.timezone})
            </p>
          </div>

          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySeries} margin={{top: 10, right: 12, left: -16, bottom: 0}}>
                <defs>
                  <linearGradient id="streakGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tick={{fontSize: 11, fill: '#64748B'}}
                  tickLine={false}
                  axisLine={{stroke: '#CBD5E1'}}
                  interval={windowDays === 30 ? 4 : windowDays === 14 ? 1 : 0}
                />
                <YAxis
                  tick={{fontSize: 11, fill: '#64748B'}}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`${value ?? 0} día(s)`, 'Racha acumulada']}
                  labelFormatter={(label) => `Fecha: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="streak"
                  stroke="#D97706"
                  strokeWidth={2.2}
                  fill="url(#streakGradient)"
                  activeDot={{r: 4, fill: '#D97706'}}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Gráfica 3: Radar + Desglose tabular de habilidades comunicativas */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Desglose de habilidades de comunicación
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Calculado según tus aciertos al primer intento y nivel de consolidación en repetición espaciada
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="h-72 w-full lg:col-span-5">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={skillBreakdown}>
                <PolarGrid stroke="#CBD5E1" />
                <PolarAngleAxis
                  dataKey="shortLabel"
                  tick={{fontSize: 12, fill: '#334155', fontWeight: 500}}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{fontSize: 10, fill: '#94A3B8'}}
                  tickCount={5}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`${value ?? 0}%`, 'Dominio']}
                />
                <Radar
                  name="Dominio"
                  dataKey="masteryPct"
                  stroke="#0284C7"
                  strokeWidth={2}
                  fill="#0284C7"
                  fillOpacity={0.22}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto lg:col-span-7">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <tr>
                  <th className="py-2.5 pr-4">Habilidad</th>
                  <th className="px-3 py-2.5 text-right">Vistos</th>
                  <th className="px-3 py-2.5 text-right">Caja media</th>
                  <th className="px-3 py-2.5 text-right">Dominio</th>
                  <th className="py-2.5 pl-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {skillBreakdown.map((row) => (
                  <tr key={row.skill} className="hover:bg-slate-50/70">
                    <td className="py-3.5 pr-4">
                      <p className="font-medium text-slate-900">{row.skill}</p>
                      <div className="mt-1.5 h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-sky-600"
                          style={{width: `${row.masteryPct}%`}}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-xs text-slate-600">
                      {row.practicedCount}/{row.totalCount}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-xs text-slate-600">
                      {row.avgBox}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-xs font-semibold text-slate-900">
                      {row.masteryPct}%
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => handlePracticeSkill(row.skill)}
                        className="text-xs font-medium text-sky-700 hover:underline whitespace-nowrap shrink-0"
                      >
                        Entrenar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {achievementsSection}
    </main>
  );
};
