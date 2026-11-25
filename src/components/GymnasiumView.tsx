import React, {useState, useEffect} from 'react';
import {
  Bookmark,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  HelpCircle,
  Mic,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {SAMPLE_QUICK_TIPS, getLocalAiCoaching, type LocalAiAdvice} from '../engine/localAiCoach';
import {speakSpanishPhrase} from '../utils/sound';

interface GymnasiumViewProps {
  onAddXp: (amount: number) => void;
}

type GymSubTab = 'challenges' | 'objections' | 'tips';

const OBJECTION_SIMULATOR_SCENARIOS = [
  {
    id: 'obj_caro',
    title: '"Es muy caro / Se sale de nuestro presupuesto"',
    category: 'Ventas y Negocios',
    intent: 'Defender la inversión mostrando valor y costo de inacción.',
  },
  {
    id: 'obj_pensar',
    title: '"Tengo que pensarlo / Consultarlo con mi socio"',
    category: 'Ventas y Negocios',
    intent: 'Descubrir la objeción real oculta y fijar un compromiso.',
  },
  {
    id: 'obj_tiempo',
    title: '"No tengo tiempo en este momento para implementarlo"',
    category: 'Productividad y Operación',
    intent: 'Demostrar que el sistema ahorra tiempo desde la primera semana.',
  },
  {
    id: 'obj_competencia',
    title: '"Ya trabajamos con otra opción similar"',
    category: 'Negociación',
    intent: 'Resaltar el factor diferencial y el costo de oportunidad.',
  },
];

const TIP_CATEGORIES = ['Todas', 'Reuniones', 'Ventas', 'Redes/Video', 'Conversaciones difíciles', 'Día a día'];

export const GymnasiumView: React.FC<GymnasiumViewProps> = ({onAddXp}) => {
  const [subTab, setSubTab] = useState<GymSubTab>('challenges');

  // Estado del temporizador de retos
  const [challengeType, setChallengeType] = useState<'fluency' | 'pause' | 'monologue'>('fluency');
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [challengeCompleted, setChallengeCompleted] = useState<boolean>(false);

  // Estado del simulador de objeciones
  const [selectedObjectionId, setSelectedObjectionId] = useState<string>(OBJECTION_SIMULATOR_SCENARIOS[0].id);
  const [simulatedAdvice, setSimulatedAdvice] = useState<LocalAiAdvice | null>(null);

  // Estado de tips rápidos
  const [tipCategory, setTipCategory] = useState<string>('Todas');
  const [savedTips, setSavedTips] = useState<Record<string, boolean>>({});
  const [appliedTips, setAppliedTips] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let interval: number | null = null;
    if (timerRunning && timerSeconds > 0) {
      interval = window.setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      setChallengeCompleted(true);
      onAddXp(15);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerSeconds, onAddXp]);

  const handleStartChallenge = (type: 'fluency' | 'pause' | 'monologue') => {
    setChallengeType(type);
    setChallengeCompleted(false);
    setTimerRunning(true);
    if (type === 'fluency') setTimerSeconds(60);
    else if (type === 'pause') setTimerSeconds(45);
    else setTimerSeconds(120);
  };

  const handleSimulateObjection = (title: string) => {
    const advice = getLocalAiCoaching(title);
    setSimulatedAdvice(advice);
  };

  const toggleSaveTip = (id: string) => {
    setSavedTips((prev) => ({...prev, [id]: !prev[id]}));
  };

  const toggleAppliedTip = (id: string) => {
    setAppliedTips((prev) => {
      const next = {...prev, [id]: !prev[id]};
      if (next[id]) onAddXp(10);
      return next;
    });
  };

  const filteredTips =
    tipCategory === 'Todas'
      ? SAMPLE_QUICK_TIPS
      : SAMPLE_QUICK_TIPS.filter((t) => t.category === tipCategory);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#B45309]">
            Gimnasio de Práctica Diaria
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#0F172A]">
            Entrena tu voz, agilidad y respuestas ejecutivas
          </h1>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-200/75 p-1">
          {(
            [
              {id: 'challenges', label: 'Retos de Habla'},
              {id: 'objections', label: 'Simulador de Objeciones'},
              {id: 'tips', label: 'Píldoras de Tips'},
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                subTab === tab.id
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subtab 1: Retos de Habla y Temporizador */}
      {subTab === 'challenges' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs lg:col-span-6 space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F172A]">
                Selecciona tu Reto de Oratoria
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Ejercicios cronometrados para entrenar tu fluidez y control vocal sin muletillas.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleStartChallenge('fluency')}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 text-left transition-all hover:border-amber-400 hover:bg-amber-50/20 cursor-pointer"
              >
                <div>
                  <span className="font-display text-base font-bold text-[#0F172A]">
                    1. Gimnasia de Fluidez (60s)
                  </span>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Habla sin parar durante 1 minuto sobre una idea clave manteniendo ritmo constante.
                  </p>
                </div>
                <span className="rounded-lg bg-amber-100 px-3 py-1 font-mono text-xs font-semibold text-[#B45309] shrink-0">
                  +15 XP
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStartChallenge('pause')}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 text-left transition-all hover:border-teal-400 hover:bg-teal-50/20 cursor-pointer"
              >
                <div>
                  <span className="font-display text-base font-bold text-[#0F172A]">
                    2. Control de Pausas (45s)
                  </span>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Haz silencio intencional de 2 segundos exactamente cada 5 palabras que digas.
                  </p>
                </div>
                <span className="rounded-lg bg-teal-100 px-3 py-1 font-mono text-xs font-semibold text-teal-800 shrink-0">
                  +15 XP
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStartChallenge('monologue')}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 text-left transition-all hover:border-indigo-400 hover:bg-indigo-50/20 cursor-pointer"
              >
                <div>
                  <span className="font-display text-base font-bold text-[#0F172A]">
                    3. Monólogo Estructurado (2 min)
                  </span>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Apertura fuerte, 2 argumentos centrales y cierre memorable sin muletillas.
                  </p>
                </div>
                <span className="rounded-lg bg-indigo-100 px-3 py-1 font-mono text-xs font-semibold text-indigo-800 shrink-0">
                  +25 XP
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs lg:col-span-6 flex flex-col items-center justify-center text-center space-y-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-[#B45309] shadow-inner">
              <Mic className="h-8 w-8" aria-hidden="true" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Modo: {challengeType === 'fluency' ? 'Fluidez 60s' : challengeType === 'pause' ? 'Pausas 45s' : 'Monólogo 2m'}
              </p>
              <div className="mt-3 font-mono text-5xl font-extrabold text-[#0F172A] tabular-nums">
                {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
              </div>
            </div>

            {challengeCompleted ? (
              <div className="rounded-xl bg-emerald-50 p-4 text-emerald-900 w-full space-y-2">
                <p className="font-display font-bold">¡Reto completado con éxito!</p>
                <p className="text-xs text-emerald-700">Has ganado XP y entrenado tu control vocal.</p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 max-w-sm">
                {timerRunning
                  ? 'Habla en voz alta con postura erguida. El temporizador está activo.'
                  : 'Selecciona un reto a la izquierda para iniciar la práctica en vivo.'}
              </p>
            )}

            <div className="flex items-center gap-3 w-full">
              {!timerRunning ? (
                <button
                  type="button"
                  onClick={() => handleStartChallenge(challengeType)}
                  className="flex-1 rounded-xl bg-[#0F172A] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1E293B] cursor-pointer"
                >
                  Iniciar Temporizador
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setTimerRunning(false)}
                  className="flex-1 rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 cursor-pointer"
                >
                  Pausar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerSeconds(challengeType === 'fluency' ? 60 : challengeType === 'pause' ? 45 : 120);
                  setChallengeCompleted(false);
                }}
                aria-label="Reiniciar cronómetro"
                className="rounded-xl border border-slate-200 p-3 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Simulador de Objeciones */}
      {subTab === 'objections' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs lg:col-span-5 space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F172A]">
                Selecciona una Objeción Frecuente
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Entrena respuestas profesionales, calmadas y de alto valor comercial.
              </p>
            </div>

            <div className="space-y-3">
              {OBJECTION_SIMULATOR_SCENARIOS.map((obj) => {
                const isSelected = obj.id === selectedObjectionId;
                return (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => {
                      setSelectedObjectionId(obj.id);
                      handleSimulateObjection(obj.title);
                    }}
                    className={`flex w-full flex-col gap-1.5 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-sm'
                        : 'border-slate-200 bg-[#F8FAFC] text-[#0F172A] hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-amber-300' : 'text-[#B45309]'
                      }`}
                    >
                      {obj.category}
                    </span>
                    <h3 className="font-display text-sm font-bold">{obj.title}</h3>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const current = OBJECTION_SIMULATOR_SCENARIOS.find((o) => o.id === selectedObjectionId);
                if (current) handleSimulateObjection(current.title);
              }}
              className="w-full rounded-xl bg-[#0F172A] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1E293B] cursor-pointer"
            >
              Generar Respuesta Experta
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs lg:col-span-7 space-y-6">
            {simulatedAdvice ? (
              <div className="space-y-6">
                <div>
                  <span className="rounded-md bg-amber-50 px-2.5 py-1 font-mono text-xs font-semibold text-[#B45309]">
                    Análisis Ejecutivo de Objeción
                  </span>
                  <h3 className="mt-3 font-display text-xl font-bold text-[#0F172A]">
                    {simulatedAdvice.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {simulatedAdvice.corePremise}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F8FAFC] p-5 border border-slate-200 space-y-3">
                  <h4 className="font-display text-sm font-bold text-[#0F172A]">
                    Framework de Respuesta:
                  </h4>
                  <ul className="space-y-2 text-xs leading-relaxed text-slate-700">
                    {simulatedAdvice.framework.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-bold text-[#B45309]">·</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-teal-50/50 p-5 border border-teal-200 space-y-2">
                  <h4 className="font-display text-sm font-bold text-teal-900">
                    Ejemplo de Guion Probado:
                  </h4>
                  <p className="text-sm italic text-teal-950">{simulatedAdvice.concreteExample}</p>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => speakSpanishPhrase(simulatedAdvice.concreteExample)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-xs hover:bg-teal-50 cursor-pointer"
                    >
                      <Volume2 className="h-4 w-4" aria-hidden="true" />
                      <span>Escuchar Cadencia</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 p-5 text-white space-y-1">
                  <p className="text-xs text-amber-300 font-semibold uppercase tracking-wider">
                    Cambio de Mentalidad
                  </p>
                  <p className="text-sm leading-relaxed">{simulatedAdvice.mindsetShift}</p>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center space-y-4">
                <HelpCircle className="mx-auto h-12 w-12 text-slate-400" aria-hidden="true" />
                <h3 className="font-display text-lg font-bold text-[#0F172A]">
                  Selecciona una objeción para ver la estrategia
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Haz clic en "Generar Respuesta Experta" para desplegar el marco de negociación, guion y postura mental.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 3: Píldoras de Tips Rápidos */}
      {subTab === 'tips' && (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div
              role="tablist"
              aria-label="Filtrar tips por situación"
              className="flex items-center gap-1.5 overflow-x-auto pb-1"
            >
              {TIP_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={tipCategory === cat}
                  onClick={() => setTipCategory(cat)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    tipCategory === cat
                      ? 'bg-[#0F172A] text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500 tabular-nums">
              Mostrando {filteredTips.length} tip(s)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredTips.map((tip) => {
              const isSaved = Boolean(savedTips[tip.id]);
              const isApplied = Boolean(appliedTips[tip.id]);
              return (
                <article
                  key={tip.id}
                  className={`flex flex-col justify-between rounded-xl border p-6 transition-all ${
                    isApplied ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-amber-50 px-2.5 py-1 font-mono text-xs font-semibold text-[#B45309]">
                        {tip.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSaveTip(tip.id)}
                        aria-label={isSaved ? 'Tip guardado en tus favoritos' : 'Guardar tip'}
                        className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                          isSaved ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <Bookmark className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <h3 className="font-display text-base font-bold text-[#0F172A]">{tip.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{tip.advice}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => speakSpanishPhrase(tip.advice)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-800 hover:underline cursor-pointer"
                    >
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Escuchar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleAppliedTip(tip.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        isApplied
                          ? 'bg-emerald-600 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{isApplied ? 'Aplicado (+10 XP)' : 'Marcar aplicado'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
