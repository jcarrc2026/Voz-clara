import React, {useState} from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Mic,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Volume2,
} from 'lucide-react';
import type {StudyLesson, StudyModule, UserStats} from '../types/study';
import {SAMPLE_COURSES_DATA, getLocalAiCoaching} from '../engine/localAiCoach';
import {speakSpanishPhrase} from '../utils/sound';

interface HomeDashboardViewProps {
  modules: StudyModule[];
  lessons: StudyLesson[];
  stats: UserStats;
  onStartSession: (mode: 'mixed' | 'lesson', lessonId?: string | null) => void;
  onNavigateTab: (tab: 'dashboard' | 'courses' | 'gym' | 'journal' | 'mentor' | 'analytics') => void;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  modules,
  lessons,
  stats,
  onStartSession,
  onNavigateTab,
}) => {
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickAnswer, setQuickAnswer] = useState<string | null>(null);

  const dailyProgressPct = Math.min(
    100,
    Math.round((stats.todayXp / Math.max(1, stats.dailyXpGoal)) * 100)
  );

  const handleQuickAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    const advice = getLocalAiCoaching(quickPrompt);
    setQuickAnswer(advice.concreteExample);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Banner principal */}
      <section className="relative overflow-hidden rounded-xl border border-slate-200/70 bg-white p-6 shadow-xs md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-amber-100/50 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-32 -bottom-16 h-48 w-48 rounded-full bg-teal-100/50 blur-2xl"
        />

        <div className="relative z-10 flex max-w-2xl flex-col gap-2.5">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Verbo & Presencia Studio · Domina tu palabra y transforma tus ventas
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] text-balance">
            ¡Hola, emprendedor! Eleva tu impacto hoy
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-slate-600">
            Mantén tu racha de {stats.currentStreak} días con una micro-sesión de práctica o explora el gimnasio de oratoria y objeciones de ventas.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <button
            type="button"
            onClick={() => onStartSession('mixed')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#B45309] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#92400e] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
            <span>Iniciar Práctica Rápida</span>
          </button>
        </div>
      </section>

      {/* 4 KPIs de impacto */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200/70 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Racha Actual</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-[#B45309]">
              <Flame className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2 tabular-nums">
            <span className="font-display text-3xl font-bold text-[#0F172A]">
              {stats.currentStreak} <span className="font-sans text-sm font-normal text-slate-500">días</span>
            </span>
            <span className="text-xs font-semibold text-[#B45309]">Mejor: {stats.longestStreak} d</span>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200/70 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meta Diaria XP</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2 tabular-nums">
            <span className="font-display text-3xl font-bold text-[#0F172A]">
              {stats.todayXp}{' '}
              <span className="font-sans text-sm font-normal text-slate-500">
                / {stats.dailyXpGoal} XP
              </span>
            </span>
            <span className="text-xs font-semibold text-teal-800">{dailyProgressPct}% hoy</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('gym')}
          className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200/70 bg-white p-5 text-left shadow-xs transition-colors hover:border-amber-300 hover:bg-amber-50/20 cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gimnasio de Voz</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F172A] text-white">
              <Target className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2 tabular-nums">
            <span className="font-display text-2xl font-bold text-[#0F172A]">Retos & Objeciones</span>
            <span className="text-xs font-semibold text-[#B45309]">Entrenar</span>
          </div>
        </button>

        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200/70 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sesiones Totales</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2 tabular-nums">
            <span className="font-display text-3xl font-bold text-[#0F172A]">
              {stats.sessionsCompleted}
            </span>
            <span className="text-xs font-semibold text-slate-500">Prácticas realizadas</span>
          </div>
        </div>
      </section>

      {/* Grid central de dos columnas */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Columna izquierda: Acceso rápido a cursos y simulador IA */}
        <div className="flex min-w-0 flex-col gap-8 lg:col-span-8">
          {/* Tarjeta de Consulta Rápida al Mentor Local */}
          <section className="rounded-xl border border-slate-200/70 bg-white p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="rounded-md bg-teal-50 px-2.5 py-1 font-mono text-xs font-semibold text-teal-800">
                  Mentor IA Local 24/7
                </span>
                <h2 className="mt-2 font-display text-xl font-bold text-[#0F172A]">
                  Consulta exprés de oratoria y ventas
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('mentor')}
                className="text-xs font-semibold text-[#B45309] hover:underline whitespace-nowrap"
              >
                Abrir panel completo
              </button>
            </div>

            <form onSubmit={handleQuickAsk} className="flex gap-3">
              <input
                type="text"
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder="Ej. ¿Qué le digo a un cliente que dice que lo va a pensar?"
                aria-label="Consulta exprés de oratoria y ventas"
                className="flex-1 rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#0F172A] focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1E293B] cursor-pointer whitespace-nowrap"
              >
                Preguntar
              </button>
            </form>

            {quickAnswer && (
              <div className="rounded-xl bg-teal-50/60 p-4 border border-teal-200 space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-teal-900">Respuesta recomendada por el mentor:</p>
                  <button
                    type="button"
                    onClick={() => speakSpanishPhrase(quickAnswer)}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-teal-800 shadow-xs hover:bg-teal-50 cursor-pointer"
                  >
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Escuchar</span>
                  </button>
                </div>
                <p className="italic text-teal-950">“{quickAnswer}”</p>
              </div>
            )}
          </section>

          {/* Pilares de Transformación */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold text-[#0F172A]">
                Cursos y Pilares Principales
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('courses')}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#B45309] hover:underline whitespace-nowrap shrink-0"
              >
                Ver todos los módulos
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {SAMPLE_COURSES_DATA.slice(0, 2).map((course) => (
                <div
                  key={course.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
                >
                  <div className="space-y-2">
                    <span className="rounded-md bg-amber-50 px-2.5 py-1 font-mono text-xs font-semibold text-[#B45309]">
                      {course.pillar}
                    </span>
                    <h3 className="font-display text-lg font-bold text-[#0F172A]">
                      {course.topics[0].title}
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600">
                      {course.summary}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateTab('courses')}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F172A] hover:text-[#B45309] cursor-pointer"
                  >
                    <span>Explorar lecciones</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Columna derecha: Guardia Diaria y Acceso rápido al Gimnasio */}
        <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4">
          <div className="rounded-xl border border-slate-200/70 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0F172A]">Guardia Diaria</h2>
              <button
                type="button"
                onClick={() => onNavigateTab('journal')}
                className="text-xs font-semibold text-[#B45309] hover:underline"
              >
                Ver bitácora
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl bg-[#F8FAFC] p-4 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Práctica de vocalización (5 min)</span>
                </div>
                <p className="text-xs text-slate-600">Completado hoy. Mantén el ritmo de tu voz firme.</p>
              </div>

              <div className="rounded-xl bg-[#F8FAFC] p-4 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <Flame className="h-4 w-4 text-[#B45309]" aria-hidden="true" />
                  <span>Llamada de valor o propuesta comercial</span>
                </div>
                <p className="text-xs text-slate-600">Pendiente para hoy. Entra con certeza.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('gym')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F172A] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1E293B] cursor-pointer"
            >
              <Target className="h-4 w-4" aria-hidden="true" />
              <span>Entrar al Gimnasio de Voz</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
