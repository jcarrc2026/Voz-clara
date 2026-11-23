import React, {useEffect, useMemo, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  ItemResult,
  MatchPairsPayload,
  MultipleChoicePayload,
  SentenceBuilderPayload,
  SessionMode,
  SessionQueueEntry,
  StudyItem,
  StudyLesson,
  StudyModule,
  UpgradePhrasePayload,
  UserItemProgress,
  UserStats,
} from '../types/study';
import {
  calculateSessionXp,
  evaluateItemAnswer,
  type SubmittedAnswer,
} from '../engine/srs';
import {playToneFeedback, speakSpanishPhrase} from '../utils/sound';
import {SpeakerCompanion, type CompanionMood} from './SpeakerCompanion';

interface StudySessionViewProps {
  initialQueue: SessionQueueEntry[];
  mode: SessionMode;
  lessonId: string | null;
  modules: StudyModule[];
  lessons: StudyLesson[];
  progressByItem: Record<string, UserItemProgress>;
  stats: UserStats;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRecordAttempt: (itemId: string, result: ItemResult) => UserItemProgress;
  onCompleteSession: (summary: {
    mode: SessionMode;
    lessonId: string | null;
    itemsTotal: number;
    firstTryCorrect: number;
    recoveredCount: number;
    xpEarned: number;
    durationSeconds: number;
    startedAt: string;
  }) => UserStats;
  onExit: (wasCompleted: boolean) => void;
}

function shuffleDeterministic<T>(arr: T[], seedStr: string): T[] {
  const copy = [...arr];
  let seed = 0;
  for (let i = 0; i < seedStr.length; i += 1) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  for (let i = copy.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export const StudySessionView: React.FC<StudySessionViewProps> = ({
  initialQueue,
  mode,
  lessonId,
  modules,
  lessons,
  progressByItem,
  soundEnabled,
  onToggleSound,
  onRecordAttempt,
  onCompleteSession,
  onExit,
}) => {
  const [queue, setQueue] = useState<SessionQueueEntry[]>(initialQueue);
  const [totalUniqueItems] = useState<number>(initialQueue.length);
  const [completedUniqueIds, setCompletedUniqueIds] = useState<string[]>([]);
  const [firstTryCorrectIds, setFirstTryCorrectIds] = useState<string[]>([]);
  const [mistakeItemIds, setMistakeItemIds] = useState<string[]>([]);
  const [currentCombo, setCurrentCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [startedAtIso] = useState<string>(() => new Date().toISOString());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [stepKey, setStepKey] = useState<number>(0);

  // Estado del ítem actual
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedTokenIndices, setSelectedTokenIndices] = useState<number[]>([]);
  const [activeLeftId, setActiveLeftId] = useState<string | null>(null);
  const [pairMapping, setPairMapping] = useState<Record<string, string>>({});

  // Feedback inmediato
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    xpDelta: number;
    correctAnswerLabel: string;
    userAnswerLabel: string;
    spokenPhrase?: string;
  } | null>(null);

  // Tutor IA opcional
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Resumen final
  const [finalSummary, setFinalSummary] = useState<{
    xpBreakdown: ReturnType<typeof calculateSessionXp>;
    updatedStats: UserStats;
    durationSeconds: number;
    frictionItems: StudyItem[];
    learnedPhrases: string[];
  } | null>(null);

  const currentEntry = queue[0] ?? null;
  const currentItem = currentEntry?.item ?? null;

  const lessonMap = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
  const moduleMap = useMemo(() => new Map(modules.map((m) => [m.id, m])), [modules]);

  const currentLesson = currentItem ? lessonMap.get(currentItem.lessonId) : undefined;
  const currentModule = currentLesson ? moduleMap.get(currentLesson.moduleId) : undefined;

  const shuffledBuilderTokens = useMemo(() => {
    if (!currentItem || currentItem.itemType !== 'sentence_builder') return [];
    const payload = currentItem.payload as SentenceBuilderPayload;
    return shuffleDeterministic(
      payload.tokens.map((text, idx) => ({id: `${currentItem.id}_tok_${idx}`, text})),
      currentItem.id + String(stepKey)
    );
  }, [currentItem, stepKey]);

  const shuffledRightPairs = useMemo(() => {
    if (!currentItem || currentItem.itemType !== 'match_pairs') return [];
    const payload = currentItem.payload as MatchPairsPayload;
    return shuffleDeterministic(
      payload.pairs,
      currentItem.id + String(currentEntry?.attemptsInSession ?? 0)
    );
  }, [currentItem, currentEntry?.attemptsInSession]);

  useEffect(() => {
    if (finalSummary) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finalSummary]);

  const resetItemInputs = () => {
    setSelectedOptionId(null);
    setSelectedTokenIndices([]);
    setActiveLeftId(null);
    setPairMapping({});
    setFeedback(null);
    setAiLoading(false);
    setAiExplanation(null);
    setAiError(null);
  };

  const canCheckAnswer = (() => {
    if (!currentItem || feedback) return false;
    if (currentItem.itemType === 'multiple_choice' || currentItem.itemType === 'upgrade_phrase') {
      return selectedOptionId !== null;
    }
    if (currentItem.itemType === 'sentence_builder') {
      return selectedTokenIndices.length > 0;
    }
    if (currentItem.itemType === 'match_pairs') {
      const payload = currentItem.payload as MatchPairsPayload;
      return Object.keys(pairMapping).length === payload.pairs.length;
    }
    return false;
  })();

  const handleCheckAnswer = () => {
    if (!currentEntry || !currentItem || feedback) return;

    let submitted: SubmittedAnswer;
    if (currentItem.itemType === 'multiple_choice' && selectedOptionId) {
      submitted = {type: 'multiple_choice', optionId: selectedOptionId};
    } else if (currentItem.itemType === 'upgrade_phrase' && selectedOptionId) {
      submitted = {type: 'upgrade_phrase', optionId: selectedOptionId};
    } else if (currentItem.itemType === 'sentence_builder') {
      const sequence = selectedTokenIndices.map((idx) => shuffledBuilderTokens[idx].text);
      submitted = {type: 'sentence_builder', sequence};
    } else if (currentItem.itemType === 'match_pairs') {
      submitted = {type: 'match_pairs', mapping: pairMapping};
    } else {
      return;
    }

    const evalResult = evaluateItemAnswer(currentItem, submitted);

    if (evalResult.isCorrect) {
      const isFirstTry = !currentEntry.hadErrorInSession && !currentEntry.isRetry;
      const itemResult: ItemResult = isFirstTry ? 'correct_first' : 'correct_retry';
      onRecordAttempt(currentItem.id, itemResult);

      if (!completedUniqueIds.includes(currentItem.id)) {
        setCompletedUniqueIds((prev) => [...prev, currentItem.id]);
      }
      if (isFirstTry && !firstTryCorrectIds.includes(currentItem.id)) {
        setFirstTryCorrectIds((prev) => [...prev, currentItem.id]);
      }

      const nextCombo = currentCombo + 1;
      setCurrentCombo(nextCombo);
      setMaxCombo((prev) => Math.max(prev, nextCombo));

      playToneFeedback('correct', soundEnabled);

      setFeedback({
        isCorrect: true,
        xpDelta: isFirstTry ? 10 : 4,
        correctAnswerLabel: evalResult.correctAnswerLabel,
        userAnswerLabel: evalResult.userAnswerLabel,
        spokenPhrase: evalResult.spokenPhrase,
      });
    } else {
      onRecordAttempt(currentItem.id, 'wrong');
      if (!mistakeItemIds.includes(currentItem.id)) {
        setMistakeItemIds((prev) => [...prev, currentItem.id]);
      }
      setCurrentCombo(0);
      playToneFeedback('wrong', soundEnabled);

      setFeedback({
        isCorrect: false,
        xpDelta: 0,
        correctAnswerLabel: evalResult.correctAnswerLabel,
        userAnswerLabel: evalResult.userAnswerLabel,
        spokenPhrase: evalResult.spokenPhrase,
      });
    }
  };

  const handleContinue = () => {
    if (!currentEntry || !currentItem || !feedback) return;

    const restQueue = queue.slice(1);
    let nextQueue: SessionQueueEntry[];

    if (feedback.isCorrect) {
      nextQueue = restQueue;
    } else {
      const requeuedEntry: SessionQueueEntry = {
        item: currentItem,
        isRetry: true,
        attemptsInSession: currentEntry.attemptsInSession + 1,
        hadErrorInSession: true,
      };
      const insertAt = Math.min(3, restQueue.length);
      nextQueue = [
        ...restQueue.slice(0, insertAt),
        requeuedEntry,
        ...restQueue.slice(insertAt),
      ];
    }

    resetItemInputs();
    setStepKey((k) => k + 1);

    if (nextQueue.length === 0) {
      const recoveredCount = mistakeItemIds.length;
      const firstTryCount = firstTryCorrectIds.length;
      const xpBreakdown = calculateSessionXp(
        firstTryCount,
        recoveredCount,
        totalUniqueItems,
        maxCombo
      );
      const updatedStats = onCompleteSession({
        mode,
        lessonId,
        itemsTotal: totalUniqueItems,
        firstTryCorrect: firstTryCount,
        recoveredCount,
        xpEarned: xpBreakdown.totalXp,
        durationSeconds: elapsedSeconds,
        startedAt: startedAtIso,
      });
      const frictionItems = initialQueue
        .map((e) => e.item)
        .filter((i) => mistakeItemIds.includes(i.id));
      const learnedPhrases = initialQueue
        .map((e) => e.item.spokenTakeaway)
        .filter((p): p is string => Boolean(p));

      playToneFeedback('complete', soundEnabled);

      setQueue([]);
      setFinalSummary({
        xpBreakdown,
        updatedStats,
        durationSeconds: elapsedSeconds,
        frictionItems,
        learnedPhrases,
      });
      return;
    }

    setQueue(nextQueue);
  };

  useEffect(() => {
    if (finalSummary || !currentItem) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        !feedback &&
        (currentItem.itemType === 'multiple_choice' || currentItem.itemType === 'upgrade_phrase')
      ) {
        const opts = (currentItem.payload as MultipleChoicePayload | UpgradePhrasePayload).options;
        const idx = Number(e.key) - 1;
        if (idx >= 0 && idx < opts.length) {
          setSelectedOptionId(opts[idx].id);
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (feedback) {
          handleContinue();
        } else if (canCheckAnswer) {
          handleCheckAnswer();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleRequestAiExample = async () => {
    if (!currentItem || !feedback || aiLoading) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const res = await fetch('/api/tutor/explain', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: currentItem.prompt,
          userAnswer: feedback.userAnswerLabel,
          correctAnswer: feedback.correctAnswerLabel,
          baseExplanation: currentItem.explanation,
          domainCategory: currentModule?.category ?? 'Elocuencia, oratoria y comunicación empresarial',
        }),
      });
      const data = (await res.json()) as {explanation?: string; error?: string};
      if (!res.ok) {
        setAiError(data.error ?? 'No se pudo obtener otra variante.');
      } else {
        setAiExplanation(data.explanation ?? null);
      }
    } catch {
      setAiError('Error de conexión con el coach IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // === PANTALLA DE CELEBRACIÓN AL TERMINAR ===
  if (finalSummary) {
    const {xpBreakdown, updatedStats, durationSeconds, frictionItems, learnedPhrases} = finalSummary;
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <motion.div
          initial={{opacity: 0, scale: 0.96, y: 12}}
          animate={{opacity: 1, scale: 1, y: 0}}
          transition={{duration: 0.35, ease: [0.16, 1, 0.3, 1]}}
          className="rounded-2xl border border-slate-200 bg-white p-8"
        >
          <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <SpeakerCompanion mood="celebrate" size={68} />
              <div>
                <p className="text-xs font-semibold text-emerald-700">Lección completada</p>
                <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-900">
                  +{xpBreakdown.totalXp} XP ganados
                </h1>
                <p className="mt-1 text-sm text-slate-600 tabular-nums">
                  Precisión: {xpBreakdown.accuracyPct}% · Tiempo: {formatTimer(durationSeconds)} · Racha:{' '}
                  {updatedStats.currentStreak} días
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-slate-100 py-6 md:grid-cols-5 tabular-nums">
            <div>
              <p className="text-xs text-slate-500">1er intento</p>
              <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
                +{xpBreakdown.firstTryXp}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Recuperados</p>
              <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
                +{xpBreakdown.recoveredXp}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Bono racha</p>
              <p className="mt-1 font-mono text-lg font-semibold text-amber-700">
                +{xpBreakdown.comboBonus}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Bono cierre</p>
              <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
                +{xpBreakdown.completionBonus}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Bono ≥85%</p>
              <p className="mt-1 font-mono text-lg font-semibold text-emerald-700">
                +{xpBreakdown.accuracyBonus}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 py-5 text-sm text-slate-700 tabular-nums">
            <span className="inline-flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-600" aria-hidden="true" />
              Racha diaria: <strong>{updatedStats.currentStreak} días</strong>
            </span>
            <span className="inline-flex items-center gap-2">
              <Trophy className="h-4 w-4 text-sky-600" aria-hidden="true" />
              Meta hoy: <strong>{updatedStats.todayXp} / {updatedStats.dailyXpGoal} XP</strong>
            </span>
          </div>

          {learnedPhrases.length > 0 && (
            <div className="border-t border-slate-100 pt-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Frases clave para repetir en voz alta
              </h2>
              <ul className="mt-3 space-y-2.5">
                {learnedPhrases.map((phrase, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
                  >
                    <span>“{phrase}”</span>
                    <button
                      type="button"
                      onClick={() => speakSpanishPhrase(phrase)}
                      aria-label="Escuchar frase"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 shrink-0"
                    >
                      <Volume2 className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                      Escuchar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {frictionItems.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Para reforzar mañana ({frictionItems.length})
              </h2>
              <ul className="mt-2 divide-y divide-slate-100">
                {frictionItems.map((item) => {
                  const prog = progressByItem[item.id];
                  return (
                    <li key={item.id} className="py-2.5 text-sm">
                      <p className="font-medium text-slate-900">{item.prompt}</p>
                      {prog && (
                        <p className="mt-0.5 font-mono text-xs text-amber-700 tabular-nums">
                          Caja {prog.boxLevel} · Próximo repaso en {prog.intervalDays} día(s)
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => onExit(true)}
              className="rounded-xl border-b-4 border-sky-800 bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-sky-700 active:translate-y-0.5 active:border-b-0"
            >
              Continuar en la ruta
            </button>
          </div>
        </motion.div>
      </main>
    );
  }

  if (!currentItem || !currentEntry) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-700">No hay ejercicios disponibles para esta sesión.</p>
          <button
            type="button"
            onClick={() => onExit(false)}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white"
          >
            Volver
          </button>
        </div>
      </main>
    );
  }

  const progressPct = Math.round((completedUniqueIds.length / Math.max(1, totalUniqueItems)) * 100);
  const companionMood: CompanionMood = feedback
    ? feedback.isCorrect
      ? currentCombo >= 3
        ? 'combo'
        : 'happy'
      : 'encourage'
    : currentCombo >= 3
      ? 'combo'
      : 'idle';

  const handleToggleToken = (tokenIdx: number) => {
    if (feedback) return;
    setSelectedTokenIndices((prev) =>
      prev.includes(tokenIdx) ? prev.filter((i) => i !== tokenIdx) : [...prev, tokenIdx]
    );
  };

  const handlePairLeftClick = (leftId: string) => {
    if (feedback) return;
    setActiveLeftId(activeLeftId === leftId ? null : leftId);
  };

  const handlePairRightClick = (rightId: string) => {
    if (feedback || !activeLeftId) return;
    setPairMapping((prev) => {
      const next = {...prev};
      for (const key of Object.keys(next)) {
        if (next[key] === rightId) delete next[key];
      }
      next[activeLeftId] = rightId;
      return next;
    });
    setActiveLeftId(null);
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      {/* Cabecera animada estilo Duolingo */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onExit(false)}
          aria-label="Salir de la sesión"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Salir
        </button>

        <div className="flex-1">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={false}
              animate={{width: `${Math.max(6, progressPct)}%`}}
              transition={{type: 'spring', stiffness: 260, damping: 24}}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-slate-600 tabular-nums shrink-0">
          {currentCombo >= 2 && (
            <motion.span
              key={currentCombo}
              initial={{scale: 0.8, opacity: 0}}
              animate={{scale: 1, opacity: 1}}
              className="font-semibold text-amber-700"
            >
              {currentCombo}x seguidos
            </motion.span>
          )}
          <span>
            {completedUniqueIds.length}/{totalUniqueItems}
          </span>
          <span className="hidden items-center gap-1 sm:inline-flex">
            <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {formatTimer(elapsedSeconds)}
          </span>
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Silenciar efectos' : 'Activar efectos de sonido'}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Tarjeta principal animada */}
      <AnimatePresence mode="wait">
        <motion.section
          key={`${currentItem.id}_${stepKey}`}
          initial={{opacity: 0, x: 20}}
          animate={
            feedback && !feedback.isCorrect
              ? {opacity: 1, x: [0, -7, 7, -5, 5, 0]}
              : {opacity: 1, x: 0}
          }
          exit={{opacity: 0, x: -20}}
          transition={{duration: 0.22, ease: [0.16, 1, 0.3, 1]}}
          className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">
                {currentModule?.category ?? 'Oratoria'} · {currentLesson?.title ?? 'Práctica'}
                {currentEntry.isRetry ? ' · Repaso de error' : ''}
              </p>
              <h1 className="text-xl font-semibold leading-snug text-slate-900">
                {currentItem.prompt}
              </h1>
              {currentItem.scenarioContext && (
                <p className="pt-1 text-sm text-slate-600">{currentItem.scenarioContext}</p>
              )}
            </div>

            <SpeakerCompanion mood={companionMood} size={56} />
          </div>

          {/* Mecánica 1: sentence_builder (banco táctil animado tipo Duolingo) */}
          {currentItem.itemType === 'sentence_builder' && (
            <div className="mt-6 space-y-6">
              {/* Zona de construcción de frase */}
              <div className="min-h-[82px] rounded-xl border border-slate-200 bg-slate-50 p-4">
                {selectedTokenIndices.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Toca los bloques de abajo en orden para formar tu respuesta elocuente...
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedTokenIndices.map((tokIdx) => {
                      const tok = shuffledBuilderTokens[tokIdx];
                      return (
                        <motion.button
                          key={tok.id}
                          layout
                          initial={{scale: 0.9, opacity: 0}}
                          animate={{scale: 1, opacity: 1}}
                          type="button"
                          disabled={Boolean(feedback)}
                          onClick={() => handleToggleToken(tokIdx)}
                          className="rounded-xl border border-sky-300 border-b-2 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 shadow-xs hover:bg-sky-50"
                        >
                          {tok.text}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Banco de fichas */}
              <div className="flex flex-wrap gap-2.5">
                {shuffledBuilderTokens.map((tok, idx) => {
                  const isUsed = selectedTokenIndices.includes(idx);
                  return (
                    <motion.button
                      key={tok.id}
                      layout
                      whileTap={{scale: 0.95}}
                      type="button"
                      disabled={Boolean(feedback) || isUsed}
                      onClick={() => handleToggleToken(idx)}
                      className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                        isUsed
                          ? 'border-slate-200 bg-slate-100 text-transparent select-none'
                          : 'border-slate-300 border-b-2 bg-white text-slate-800 hover:border-sky-400 hover:bg-slate-50'
                      }`}
                    >
                      {tok.text}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mecánica 2: upgrade_phrase (mejora frase débil) */}
          {currentItem.itemType === 'upgrade_phrase' && (
            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <p className="text-xs font-medium text-amber-800">Frase habitual a evitar</p>
                <p className="mt-1 text-sm italic text-slate-800">
                  “{(currentItem.payload as UpgradePhrasePayload).weakPhrase}”
                </p>
              </div>

              <div className="space-y-2.5">
                {(currentItem.payload as UpgradePhrasePayload).options.map((opt, idx) => {
                  const isSelected = selectedOptionId === opt.id;
                  const isCorrectOpt =
                    feedback &&
                    opt.id === (currentItem.payload as UpgradePhrasePayload).correctOptionId;
                  const isWrongSelected = feedback && isSelected && !feedback.isCorrect;

                  let styleClass =
                    'border-slate-200 border-b-2 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50';
                  if (feedback) {
                    if (isCorrectOpt) {
                      styleClass = 'border-emerald-500 border-b-2 bg-emerald-50 text-emerald-950';
                    } else if (isWrongSelected) {
                      styleClass = 'border-red-400 border-b-2 bg-red-50 text-red-950';
                    } else {
                      styleClass = 'border-slate-200 bg-white text-slate-400';
                    }
                  } else if (isSelected) {
                    styleClass = 'border-sky-600 border-b-2 bg-sky-50 text-sky-950';
                  }

                  return (
                    <motion.button
                      key={opt.id}
                      whileTap={{scale: 0.99}}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-colors ${styleClass}`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-current/20 font-mono text-xs font-semibold tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="flex-1">{opt.text}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mecánica 3: multiple_choice */}
          {currentItem.itemType === 'multiple_choice' && (
            <div className="mt-6 space-y-2.5">
              {(currentItem.payload as MultipleChoicePayload).options.map((opt, idx) => {
                const isSelected = selectedOptionId === opt.id;
                const isCorrectOpt =
                  feedback &&
                  opt.id === (currentItem.payload as MultipleChoicePayload).correctOptionId;
                const isWrongSelected = feedback && isSelected && !feedback.isCorrect;

                let styleClass =
                  'border-slate-200 border-b-2 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50';
                if (feedback) {
                  if (isCorrectOpt) {
                    styleClass = 'border-emerald-500 border-b-2 bg-emerald-50 text-emerald-950';
                  } else if (isWrongSelected) {
                    styleClass = 'border-red-400 border-b-2 bg-red-50 text-red-950';
                  } else {
                    styleClass = 'border-slate-200 bg-white text-slate-400';
                  }
                } else if (isSelected) {
                  styleClass = 'border-sky-600 border-b-2 bg-sky-50 text-sky-950';
                }

                return (
                  <motion.button
                    key={opt.id}
                    whileTap={{scale: 0.99}}
                    type="button"
                    disabled={Boolean(feedback)}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-colors ${styleClass}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-current/20 font-mono text-xs font-semibold tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Mecánica 4: match_pairs */}
          {currentItem.itemType === 'match_pairs' && (
            <div className="mt-6 space-y-3">
              <p className="text-xs text-slate-500">
                Toca una situación a la izquierda y conéctala con su frase a la derecha.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  {(currentItem.payload as MatchPairsPayload).pairs.map((pair, idx) => {
                    const matchedRightId = pairMapping[pair.id];
                    const matchedRightObj = (
                      currentItem.payload as MatchPairsPayload
                    ).pairs.find((p) => p.id === matchedRightId);
                    const isActive = activeLeftId === pair.id;

                    return (
                      <motion.button
                        key={pair.id}
                        whileTap={{scale: 0.98}}
                        type="button"
                        disabled={Boolean(feedback)}
                        onClick={() => handlePairLeftClick(pair.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-b-2 px-3.5 py-3 text-left text-sm transition-colors ${
                          isActive
                            ? 'border-sky-600 bg-sky-50 text-sky-950'
                            : matchedRightObj
                              ? 'border-slate-300 bg-slate-50 text-slate-900'
                              : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-mono text-xs font-medium text-slate-500">
                          {idx + 1}.
                        </span>
                        <span className="flex-1 font-medium">{pair.left}</span>
                        {matchedRightObj && (
                          <span className="max-w-[130px] truncate text-xs text-sky-700">
                            → {matchedRightObj.right}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  {shuffledRightPairs.map((pair) => {
                    const isUsed = Object.values(pairMapping).includes(pair.id);
                    return (
                      <motion.button
                        key={pair.id}
                        whileTap={{scale: 0.98}}
                        type="button"
                        disabled={Boolean(feedback) || !activeLeftId}
                        onClick={() => handlePairRightClick(pair.id)}
                        className={`w-full rounded-xl border border-b-2 px-3.5 py-3 text-left text-sm transition-colors ${
                          isUsed
                            ? 'border-slate-200 bg-slate-100 text-slate-400'
                            : activeLeftId
                              ? 'border-sky-300 bg-white text-slate-900 hover:bg-sky-50'
                              : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {pair.right}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Barra inferior antes de comprobar */}
          {!feedback && (
            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
              <span className="text-xs text-slate-400">
                {currentItem.itemType === 'sentence_builder'
                  ? 'Ordena los bloques y comprueba'
                  : 'Pulsa Enter o Comprobar'}
              </span>
              <button
                type="button"
                disabled={!canCheckAnswer}
                onClick={handleCheckAnswer}
                className="rounded-xl border-b-4 border-sky-800 bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sky-700 active:translate-y-0.5 active:border-b-0 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
              >
                Comprobar
              </button>
            </div>
          )}

          {/* Banner inferior animado de retroalimentación */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{opacity: 0, y: 18}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: 10}}
                transition={{duration: 0.2, ease: [0.16, 1, 0.3, 1]}}
                className={`mt-8 rounded-xl border p-5 ${
                  feedback.isCorrect
                    ? 'border-emerald-200 bg-emerald-50/80'
                    : 'border-red-200 bg-red-50/80'
                }`}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      {feedback.isCorrect ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                          <span className="text-sm font-bold text-emerald-900">
                            ¡Excelente! · +{feedback.xpDelta} XP
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 text-red-700" aria-hidden="true" />
                          <span className="text-sm font-bold text-red-900">
                            Ajustemos el enfoque · Volverá en esta sesión
                          </span>
                        </>
                      )}

                      {feedback.spokenPhrase && (
                        <button
                          type="button"
                          onClick={() => speakSpanishPhrase(feedback.spokenPhrase ?? '')}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Volume2 className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                          Escuchar tono
                        </button>
                      )}
                    </div>

                    {!feedback.isCorrect && (
                      <p className="text-sm text-red-900">
                        Forma recomendada:{' '}
                        <strong className="font-semibold">“{feedback.correctAnswerLabel}”</strong>
                      </p>
                    )}

                    <p className="text-sm leading-relaxed text-slate-700">
                      {currentItem.explanation}
                    </p>

                    {!feedback.isCorrect && (
                      <div className="pt-1">
                        <button
                          type="button"
                          disabled={aiLoading}
                          onClick={handleRequestAiExample}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                          {aiLoading
                            ? 'Pensando variante...'
                            : 'Dame otra forma de decirlo (IA opcional)'}
                        </button>

                        {aiExplanation && (
                          <div className="mt-3 rounded-lg border border-sky-200 bg-white p-3.5 text-sm leading-relaxed text-slate-800">
                            <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800">
                              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                              Variante de coach
                            </p>
                            <p>{aiExplanation}</p>
                          </div>
                        )}

                        {aiError && <p className="mt-2 text-xs text-red-700">{aiError}</p>}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleContinue}
                    className={`inline-flex items-center gap-2 self-end rounded-xl border-b-4 px-5 py-2.5 text-sm font-semibold text-white transition-all active:translate-y-0.5 active:border-b-0 whitespace-nowrap shrink-0 sm:self-start ${
                      feedback.isCorrect
                        ? 'border-emerald-800 bg-emerald-600 hover:bg-emerald-700'
                        : 'border-slate-950 bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </AnimatePresence>
    </main>
  );
};
