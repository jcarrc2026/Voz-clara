import React, {useState} from 'react';
import {motion} from 'motion/react';
import {ArrowRight, Award, Check, Flame, Lightbulb, Mic, Play, RotateCcw, Trophy} from 'lucide-react';
import type {
  DomainCategory,
  SessionMode,
  StudyItem,
  StudyLesson,
  StudyModule,
  StudySessionRecord,
  UserItemProgress,
  UserStats,
} from '../types/study';
import {getLocalDateString, isItemDue} from '../engine/srs';
import {SpeakerCompanion} from './SpeakerCompanion';

type CategoryFilter = 'Todas' | DomainCategory;

const CATEGORY_FILTERS: CategoryFilter[] = [
  'Todas',
  'Elocuencia diaria',
  'Hablar en público',
  'Comunicación empresarial',
];

interface LearningPathViewProps {
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
  onOpenReview: () => void;
  onOpenQuickTip: () => void;
}

const NODE_OFFSETS = [0, 38, -34, 24, -28];

export const LearningPathView: React.FC<LearningPathViewProps> = ({
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
  onOpenReview,
  onOpenQuickTip,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('Todas');

  const todayStr = getLocalDateString(nowMs, stats.timezone);
  const todayXp = stats.todayDate === todayStr ? stats.todayXp : 0;
  const dailyProgressPct = Math.min(100, Math.round((todayXp / stats.dailyXpGoal) * 100));

  const dueCount = items.filter((item) => isItemDue(progressByItem[item.id], nowMs)).length;
  const masteredCount = items.filter((item) => (progressByItem[item.id]?.boxLevel ?? 0) >= 3).length;
  const studiedCount = items.filter((item) => Boolean(progressByItem[item.id]?.lastReviewedAt)).length;

  const visibleModules =
    selectedCategory === 'Todas'
      ? modules
      : modules.filter((mod) => mod.category === selectedCategory);

  return (
    <main className="w-full">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Columna izquierda: Ruta animada de lecciones estilo Duolingo */}
        <div className="space-y-8 lg:col-span-8">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <SpeakerCompanion mood={dailyProgressPct >= 100 ? 'happy' : 'idle'} size={58} />
              <div>
                <p className="text-xs font-medium text-slate-500 tabular-nums">
                  {modules.length} unidades · {lessons.length} lecciones · {items.length} ejercicios
                  {dayOffset > 0 ? ` · +${dayOffset} d simulados` : ''}
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
                  Camino de comunicación
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onStartSession('mixed', null)}
              className="inline-flex items-center gap-2 rounded-xl border-b-4 border-indigo-800 bg-[#4f46e5] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#3525cd] active:translate-y-0.5 active:border-b-0 whitespace-nowrap shrink-0"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              Sesión rápida (5 min)
            </button>
          </div>

          {/* Filtro por área */}
          <div
            role="tablist"
            aria-label="Filtrar unidades por área"
            className="flex items-center gap-2 overflow-x-auto pb-1"
          >
            {CATEGORY_FILTERS.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Unidades y nodos sinuosos */}
          <div className="space-y-12">
            {visibleModules.map((mod) => {
              const modLessons = lessons
                .filter((l) => l.moduleId === mod.id)
                .sort((a, b) => a.orderIndex - b.orderIndex);

              const modLessonIds = new Set(modLessons.map((l) => l.id));
              const modItems = items.filter((i) => modLessonIds.has(i.lessonId));
              const modCompleted = modItems.filter(
                (i) => Boolean(progressByItem[i.id]?.lastReviewedAt)
              ).length;

              return (
                <section key={mod.id} className="space-y-8">
                  {/* Cabecera de Unidad */}
                  <div className="rounded-xl border border-slate-200 bg-white p-6">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Unidad {String(mod.orderIndex).padStart(2, '0')} · {mod.category}
                        </p>
                        <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
                          {mod.title}
                        </h2>
                      </div>
                      <span className="font-mono text-xs font-medium text-slate-600 tabular-nums shrink-0">
                        {modCompleted}/{modItems.length} ejercicios vistos
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{mod.description}</p>
                  </div>

                  {/* Camino vertical de nodos */}
                  <div className="relative flex flex-col items-center space-y-8 overflow-x-hidden py-2">
                    {modLessons.map((lesson, idx) => {
                      const lessonItems = items.filter((i) => i.lessonId === lesson.id);
                      const seenInLesson = lessonItems.filter((i) =>
                        Boolean(progressByItem[i.id]?.lastReviewedAt)
                      ).length;
                      const isCompleted =
                        lessonItems.length > 0 && seenInLesson === lessonItems.length;
                      const isActiveNode = nextLesson?.id === lesson.id;
                      const offsetX = NODE_OFFSETS[idx % NODE_OFFSETS.length];

                      return (
                        <motion.div
                          key={lesson.id}
                          initial={{opacity: 0, y: 12}}
                          animate={{opacity: 1, y: 0}}
                          transition={{duration: 0.25, delay: idx * 0.05}}
                          style={{transform: `translateX(${offsetX}px)`}}
                          className="relative flex flex-col items-center"
                        >
                          {/* Etiqueta flotante animada en el nodo recomendado */}
                          {isActiveNode && (
                            <motion.div
                              animate={{y: [0, -4, 0]}}
                              transition={{duration: 1.8, repeat: Infinity, ease: 'easeInOut'}}
                              className="mb-2.5 rounded-lg border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-[#3525cd] shadow-xs"
                            >
                              Siguiente paso
                            </motion.div>
                          )}

                          {/* Nodo táctil circular */}
                          <motion.button
                            type="button"
                            whileHover={{scale: 1.06}}
                            whileTap={{scale: 0.96}}
                            onClick={() => onStartSession('lesson', lesson.id)}
                            aria-label={`Practicar lección ${lesson.title}`}
                            className={`relative flex h-20 w-20 items-center justify-center rounded-full border-b-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 ${
                              isCompleted
                                ? 'border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700'
                                : isActiveNode
                                  ? 'border-indigo-900 bg-[#4f46e5] text-white hover:bg-[#3525cd]'
                                  : 'border-slate-300 bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="h-8 w-8 stroke-[2.5]" aria-hidden="true" />
                            ) : isActiveNode ? (
                              <Mic className="h-7 w-7" aria-hidden="true" />
                            ) : (
                              <Award className="h-7 w-7 text-slate-400" aria-hidden="true" />
                            )}
                          </motion.button>

                          {/* Título limpio debajo del nodo */}
                          <div className="mt-3 max-w-[230px] text-center">
                            <p className="text-sm font-semibold text-slate-900">{lesson.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                              ~{lesson.estimatedMinutes} min · {seenInLesson}/{lessonItems.length} completados
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* Columna derecha: Progreso diario, racha y repasos */}
        <aside className="space-y-6 lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900">Tu ritmo diario</h2>

              <div className="mt-4 grid grid-cols-2 gap-4 border-b border-slate-100 pb-4 tabular-nums">
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Flame className="h-4 w-4 text-amber-600" aria-hidden="true" />
                    Racha actual
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-slate-900">
                    {stats.currentStreak} días
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Trophy className="h-4 w-4 text-sky-600" aria-hidden="true" />
                    Total acumulado
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-slate-900">
                    {stats.totalXp} XP
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium text-slate-700">Meta de hoy</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {todayXp} / {stats.dailyXpGoal} XP
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    initial={{width: 0}}
                    animate={{width: `${dailyProgressPct}%`}}
                    transition={{duration: 0.4, ease: [0.16, 1, 0.3, 1]}}
                    className="h-full rounded-full bg-emerald-600"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 tabular-nums">
                  {masteredCount}/{items.length} expresiones consolidadas en memoria
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">Repaso inteligente</h2>
                <button
                  type="button"
                  onClick={onOpenReview}
                  className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline whitespace-nowrap shrink-0"
                >
                  Ver cola
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {dueCount > 0
                  ? `Tienes ${dueCount} ejercicio(s) listos para reforzar hoy antes de que los olvides.`
                  : studiedCount > 0
                    ? 'Estás al día con tus repasos espaciados. Avanza en la ruta o refuerza frases difíciles.'
                    : 'Completa tu primera lección para activar el calendario de repetición espaciada.'}
              </p>
              <button
                type="button"
                disabled={studiedCount === 0}
                onClick={() => onStartSession('review', null)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {dueCount > 0 ? `Repasar ${dueCount} pendientes` : 'Practicar refuerzo'}
              </button>
              <button
                type="button"
                onClick={onOpenQuickTip}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Lightbulb className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                Consejo rápido de oratoria
              </button>
            </div>

            {sessions.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-slate-900">Actividad reciente</h2>
                <ul className="mt-3 divide-y divide-slate-100 text-xs tabular-nums">
                  {sessions.slice(0, 3).map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <span className="text-slate-600">
                        {s.firstTryCorrect}/{s.itemsTotal} al primer intento
                      </span>
                      <span className="font-mono font-semibold text-emerald-700">+{s.xpEarned} XP</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
};
