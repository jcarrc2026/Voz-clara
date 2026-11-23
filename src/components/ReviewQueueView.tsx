import React, {useState} from 'react';
import {AlertTriangle, CalendarPlus, Play, RotateCcw} from 'lucide-react';
import type {SessionMode, StudyItem, StudyLesson, UserItemProgress} from '../types/study';
import {calculatePriorityScore, isItemDue} from '../engine/srs';

interface ReviewQueueViewProps {
  items: StudyItem[];
  lessons: StudyLesson[];
  progressByItem: Record<string, UserItemProgress>;
  nowMs: number;
  dayOffset: number;
  onSimulateNextDay: () => void;
  onResetClockSimulation: () => void;
  onStartSession: (mode: SessionMode, lessonId?: string | null) => void;
}

type ReviewFilter = 'due' | 'leech' | 'studied';

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  items,
  lessons,
  progressByItem,
  nowMs,
  dayOffset,
  onSimulateNextDay,
  onResetClockSimulation,
  onStartSession,
}) => {
  const [filter, setFilter] = useState<ReviewFilter>('due');

  const lessonMap = new Map(lessons.map((l) => [l.id, l.title]));

  const studiedItems = items.filter((item) => Boolean(progressByItem[item.id]?.lastReviewedAt));
  const dueItems = studiedItems.filter((item) => isItemDue(progressByItem[item.id], nowMs));
  const leechItems = studiedItems.filter((item) => progressByItem[item.id]?.isLeech);

  const activeList = (
    filter === 'due' ? dueItems : filter === 'leech' ? leechItems : studiedItems
  ).sort((a, b) => {
    const scoreA = calculatePriorityScore(progressByItem[a.id], a, nowMs);
    const scoreB = calculatePriorityScore(progressByItem[b.id], b, nowMs);
    return scoreB - scoreA;
  });

  const formatReviewDate = (iso: string) => {
    const targetMs = Date.parse(iso);
    const diffDays = Math.round((targetMs - nowMs) / 86_400_000);
    if (diffDays <= 0) return 'Vencido hoy';
    if (diffDays === 1) return 'En 1 día';
    return `En ${diffDays} días`;
  };

  return (
    <main className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Repetición espaciada (Leitner + SM-2 simplificado)
            {dayOffset > 0 ? ` · Reloj simulado +${dayOffset} día(s)` : ''}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            Cola de Repaso y Priorización
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSimulateNextDay}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <CalendarPlus className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            Simular +1 día
          </button>
          {dayOffset > 0 && (
            <button
              type="button"
              onClick={onResetClockSimulation}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Volver a hoy
            </button>
          )}
          <button
            type="button"
            disabled={studiedItems.length === 0}
            onClick={() => onStartSession('review', null)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f46e5] px-4 py-2 text-xs font-medium text-white hover:bg-[#3525cd] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap shrink-0"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            Iniciar repaso
          </button>
        </div>
      </div>

      {/* Filtros y fórmula visible */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setFilter('due')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              filter === 'due' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vencidos ({dueItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('leech')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              filter === 'leech'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Críticos / Leech ({leechItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('studied')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              filter === 'studied'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos estudiados ({studiedItems.length})
          </button>
        </div>

        <p className="font-mono text-xs text-slate-500">
          prioridad = atraso×2 + fallos×3 + (caja≤1 ? 10 : 0) + dif×0.5
        </p>
      </div>

      {activeList.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-slate-800">
            {studiedItems.length === 0
              ? 'Todavía no hay ítems estudiados en tu historial.'
              : filter === 'due'
                ? 'No tienes ítems vencidos ahora mismo. Usa "Simular +1 día" para probar cómo vencen tus repasos.'
                : 'No tienes ítems marcados como críticos (≥3 fallos históricos).'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-4 py-3">Ítem y lección</th>
                <th className="px-4 py-3 text-right">Caja</th>
                <th className="px-4 py-3 text-right">Intervalo</th>
                <th className="px-4 py-3 text-right">Factor</th>
                <th className="px-4 py-3 text-right">Fallos</th>
                <th className="px-4 py-3 text-right">Prioridad</th>
                <th className="px-4 py-3">Próxima revisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeList.map((item) => {
                const prog = progressByItem[item.id];
                const score = calculatePriorityScore(prog, item, nowMs);
                const due = isItemDue(prog, nowMs);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="max-w-md px-4 py-3.5">
                      <p className="line-clamp-2 font-medium text-slate-900">{item.prompt}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {lessonMap.get(item.lessonId) ?? 'Lección'} · Dif {item.difficulty}/5
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-800 tabular-nums">
                      Nivel {prog.boxLevel}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {prog.intervalDays} d
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {prog.easeFactor.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums">
                      <span className={prog.lapses > 0 ? 'font-semibold text-amber-700' : 'text-slate-600'}>
                        {prog.lapses}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {score}
                    </td>
                    <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                      {prog.isLeech ? (
                        <span className="inline-flex items-center gap-1 font-medium text-red-700">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatReviewDate(prog.nextReviewAt)} (Crítico)
                        </span>
                      ) : (
                        <span className={due ? 'font-medium text-amber-700' : 'text-slate-600'}>
                          {formatReviewDate(prog.nextReviewAt)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
};
