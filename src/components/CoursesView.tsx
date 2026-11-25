import React, {useState} from 'react';
import {ArrowRight, BookOpen, CheckCircle, ChevronDown, ChevronUp, Clock, Play, Sparkles} from 'lucide-react';
import {SAMPLE_COURSES_DATA} from '../engine/localAiCoach';

interface CoursesViewProps {
  onStartSession: (mode: 'mixed' | 'lesson', lessonId?: string | null) => void;
  onOpenMentorWithTopic: (topic: string) => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({
  onStartSession,
  onOpenMentorWithTopic,
}) => {
  // Por defecto el primer pilar está expandido/seleccionado en su lugar
  const [selectedPillarId, setSelectedPillarId] = useState<string>(SAMPLE_COURSES_DATA[0].id);
  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>({});

  const toggleTopicCompleted = (topicTitle: string) => {
    setCompletedTopics((prev) => ({
      ...prev,
      [topicTitle]: !prev[topicTitle],
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#B45309]">
            Cursos y Rutas de Transformación
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#0F172A]">
            Domina tu palabra, ventas y mentalidad
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onStartSession('mixed')}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0F172A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1E293B] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          <span>Iniciar Sesión de Práctica</span>
        </button>
      </div>

      {/* Lista vertical de Pilares con despliegue en el mismo lugar (in-place accordion) */}
      <div className="space-y-4">
        {SAMPLE_COURSES_DATA.map((pillar) => {
          const isSelected = pillar.id === selectedPillarId;
          const completedCount = pillar.topics.filter((t) => completedTopics[t.title]).length;
          const totalCount = pillar.topics.length;

          return (
            <div
              key={pillar.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isSelected
                  ? 'border-[#0F172A] bg-white shadow-lg ring-1 ring-[#0F172A]/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
              }`}
            >
              {/* Cabecera del Pilar (Clickeable para expandir/contraer en el mismo lugar) */}
              <button
                type="button"
                onClick={() => setSelectedPillarId(isSelected ? '' : pillar.id)}
                className={`w-full flex items-center justify-between p-6 text-left transition-colors cursor-pointer ${
                  isSelected ? 'bg-slate-50/80 border-b border-slate-100' : 'bg-white hover:bg-slate-50/40'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-bold tabular-nums shrink-0 ${
                      isSelected ? 'bg-[#0F172A] text-white' : 'bg-amber-50 text-[#B45309] border border-amber-200/50'
                    }`}
                  >
                    Pilar {pillar.id.replace('pillar_', '')}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#0F172A]">
                      {pillar.pillar}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-1">{pillar.summary}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="hidden sm:inline-flex font-mono text-xs font-semibold text-slate-500 tabular-nums">
                    {completedCount} / {totalCount} completados
                  </span>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform ${
                      isSelected ? 'bg-[#0F172A] text-white rotate-180' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              </button>

              {/* Secuencia de Lecciones desplegada exactamente aquí mismo (in-place) */}
              {isSelected && (
                <div className="p-6 sm:p-8 space-y-4 bg-white animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Secuencia de Lecciones y Frameworks
                    </p>
                    <span className="font-mono text-xs font-bold text-[#B45309] sm:hidden">
                      {completedCount} / {totalCount} completados
                    </span>
                  </div>

                  <div className="space-y-3">
                    {pillar.topics.map((topic, idx) => {
                      const isDone = Boolean(completedTopics[topic.title]);
                      return (
                        <div
                          key={idx}
                          className={`rounded-xl border p-4 sm:p-5 transition-colors ${
                            isDone ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-[#F8FAFC]'
                          }`}
                        >
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleTopicCompleted(topic.title)}
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer ${
                                    isDone
                                      ? 'border-emerald-600 bg-emerald-600 text-white'
                                      : 'border-slate-300 bg-white text-transparent hover:border-slate-400'
                                  }`}
                                  aria-label="Marcar lección como completada"
                                >
                                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <h4
                                  className={`font-display text-base font-bold ${
                                    isDone ? 'text-emerald-900 line-through' : 'text-[#0F172A]'
                                  }`}
                                >
                                  {topic.title}
                                </h4>
                              </div>
                              <p className="pl-9 text-sm leading-relaxed text-slate-600">
                                {topic.content}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 pl-9 sm:pl-0">
                              <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500">
                                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                {topic.duration}
                              </span>
                              <button
                                type="button"
                                onClick={() => onOpenMentorWithTopic(topic.title)}
                                className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100 cursor-pointer"
                              >
                                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Preguntar al Mentor IA</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
