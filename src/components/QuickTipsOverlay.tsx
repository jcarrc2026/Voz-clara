import React, {useEffect} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {Lightbulb, Play, Shuffle, Volume2, X} from 'lucide-react';
import type {QuickTip} from '../data/quickTips';
import {speakSpanishPhrase} from '../utils/sound';

interface QuickTipsOverlayProps {
  isOpen: boolean;
  tip: QuickTip | null;
  contextLabel: string;
  onNextTip: () => void;
  onStartNextSession: () => void;
  onClose: () => void;
}

export const QuickTipsOverlay: React.FC<QuickTipsOverlayProps> = ({
  isOpen,
  tip,
  contextLabel,
  onNextTip,
  onStartNextSession,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && tip && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-tip-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: 0.18}}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          />

          {/* Modal Card */}
          <motion.div
            initial={{opacity: 0, scale: 0.96, y: 12}}
            animate={{opacity: 1, scale: 1, y: 0}}
            exit={{opacity: 0, scale: 0.96, y: 8}}
            transition={{duration: 0.2, ease: [0.16, 1, 0.3, 1]}}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl md:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Lightbulb className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    {contextLabel} · {tip.skill}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar consejo rápido"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tip.id}
                initial={{opacity: 0, y: 6}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -6}}
                transition={{duration: 0.16}}
                className="mt-5 space-y-4"
              >
                <h2
                  id="quick-tip-title"
                  className="font-display text-2xl font-bold tracking-tight text-slate-900"
                >
                  {tip.title}
                </h2>

                <p className="text-sm leading-relaxed text-slate-600">{tip.advice}</p>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-700">Cómo aplicarlo hoy</p>
                  <p className="mt-1 text-sm text-slate-800">{tip.microAction}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onNextTip}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <Shuffle className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  Otro consejo
                </button>
                <button
                  type="button"
                  onClick={() => speakSpanishPhrase(`${tip.title}. ${tip.advice}`)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <Volume2 className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                  Escuchar
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 whitespace-nowrap shrink-0"
                >
                  Entendido
                </button>
                <button
                  type="button"
                  onClick={onStartNextSession}
                  className="inline-flex items-center gap-1.5 rounded-xl border-b-2 border-sky-800 bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-sky-700 active:translate-y-px active:border-b-0 whitespace-nowrap shrink-0"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  Siguiente sesión
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
