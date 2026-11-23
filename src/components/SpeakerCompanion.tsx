import React from 'react';
import {motion} from 'motion/react';

export type CompanionMood = 'idle' | 'happy' | 'combo' | 'encourage' | 'celebrate';

interface SpeakerCompanionProps {
  mood: CompanionMood;
  size?: number;
}

export const SpeakerCompanion: React.FC<SpeakerCompanionProps> = ({mood, size = 56}) => {
  const isHappy = mood === 'happy' || mood === 'combo' || mood === 'celebrate';
  const isEncourage = mood === 'encourage';

  const bodyFill =
    mood === 'combo'
      ? '#D97706'
      : isHappy
        ? '#059669'
        : isEncourage
          ? '#475569'
          : '#0284C7';

  return (
    <motion.div
      animate={
        mood === 'celebrate'
          ? {y: [0, -8, 0, -5, 0], rotate: [0, -4, 4, 0]}
          : mood === 'combo'
            ? {scale: [1, 1.1, 1], y: [0, -4, 0]}
            : mood === 'happy'
              ? {y: [0, -5, 0]}
              : mood === 'encourage'
                ? {x: [0, -4, 4, -2, 0]}
                : {y: [0, -2, 0]}
      }
      transition={
        mood === 'idle'
          ? {duration: 3, repeat: Infinity, ease: 'easeInOut'}
          : {duration: 0.45, ease: [0.16, 1, 0.3, 1]}
      }
      style={{width: size, height: size}}
      className="shrink-0 select-none"
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" fill="none" className="h-full w-full">
        {/* Ondas laterales de voz cuando hay acierto o combo */}
        {isHappy && (
          <>
            <motion.path
              d="M9 24C6 28 6 36 9 40"
              stroke={bodyFill}
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{opacity: 0, scale: 0.8}}
              animate={{opacity: [0.4, 1, 0.4], scale: 1}}
              transition={{duration: 1.2, repeat: Infinity}}
            />
            <motion.path
              d="M55 24C58 28 58 36 55 40"
              stroke={bodyFill}
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{opacity: 0, scale: 0.8}}
              animate={{opacity: [0.4, 1, 0.4], scale: 1}}
              transition={{duration: 1.2, repeat: Infinity}}
            />
          </>
        )}

        {/* Cuerpo geométrico tipo cápsula acústica / orador */}
        <rect x="14" y="10" width="36" height="42" rx="18" fill={bodyFill} />
        {/* Base de micrófono estilizada */}
        <path
          d="M24 54H40M32 52V56"
          stroke="#0F172A"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Rostro expresivo */}
        <rect x="20" y="18" width="24" height="18" rx="9" fill="#FFFFFF" />

        {/* Ojos */}
        {isHappy ? (
          <>
            <path
              d="M24 26C25.2 24 27.8 24 29 26"
              stroke="#0F172A"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M35 26C36.2 24 38.8 24 40 26"
              stroke="#0F172A"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </>
        ) : isEncourage ? (
          <>
            <circle cx="26.5" cy="26" r="2" fill="#0F172A" />
            <circle cx="37.5" cy="26" r="2" fill="#0F172A" />
          </>
        ) : (
          <>
            <circle cx="26.5" cy="25.5" r="2.1" fill="#0F172A" />
            <circle cx="37.5" cy="25.5" r="2.1" fill="#0F172A" />
          </>
        )}

        {/* Boca */}
        {isHappy ? (
          <path
            d="M27.5 30C29 33 35 33 36.5 30"
            stroke="#0F172A"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        ) : isEncourage ? (
          <path
            d="M28.5 31.5H35.5"
            stroke="#0F172A"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M29 30.5C30.5 32 33.5 32 35 30.5"
            stroke="#0F172A"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        )}
      </svg>
    </motion.div>
  );
};
