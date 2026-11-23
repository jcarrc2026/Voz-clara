import React, {useState} from 'react';
import {Volume2} from 'lucide-react';
import type {DomainCategory, StudyItem, StudyLesson, StudyModule, UserItemProgress} from '../types/study';
import {speakSpanishPhrase} from '../utils/sound';

interface PhrasebookViewProps {
  modules: StudyModule[];
  lessons: StudyLesson[];
  items: StudyItem[];
  progressByItem: Record<string, UserItemProgress>;
}

const CATEGORIES: Array<'Todas' | DomainCategory> = [
  'Todas',
  'Elocuencia diaria',
  'Hablar en público',
  'Comunicación empresarial',
];

export const PhrasebookView: React.FC<PhrasebookViewProps> = ({
  modules,
  lessons,
  items,
  progressByItem,
}) => {
  const [filter, setFilter] = useState<'Todas' | DomainCategory>('Todas');

  const lessonMap = new Map(lessons.map((l) => [l.id, l]));
  const moduleMap = new Map(modules.map((m) => [m.id, m]));

  const phraseItems = items.filter((item) => {
    if (!item.spokenTakeaway) return false;
    if (filter === 'Todas') return true;
    const lesson = lessonMap.get(item.lessonId);
    const mod = lesson ? moduleMap.get(lesson.moduleId) : undefined;
    return mod?.category === filter;
  });

  return (
    <main className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Repertorio de frases modelo · Escúchalas y repítelas en voz alta
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            Frases Elocuentes y Ejecutivas
          </h1>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === cat
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {phraseItems.map((item) => {
          const lesson = lessonMap.get(item.lessonId);
          const mod = lesson ? moduleMap.get(lesson.moduleId) : undefined;
          const prog = progressByItem[item.id];
          const phrase = item.spokenTakeaway ?? '';

          return (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">
                  {mod?.category ?? 'Comunicación'} · {lesson?.title ?? 'Práctica'} ·{' '}
                  {prog?.lastReviewedAt ? `Nivel ${prog.boxLevel}` : 'Por practicar'}
                </p>
                <blockquote className="mt-3 text-base font-semibold leading-snug text-slate-900">
                  “{phrase}”
                </blockquote>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{item.explanation}</p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-500">Dilo en voz alta con pausa final</span>
                <button
                  type="button"
                  onClick={() => speakSpanishPhrase(phrase)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <Volume2 className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                  Escuchar cadencia
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
};
