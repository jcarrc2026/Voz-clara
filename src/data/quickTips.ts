import type {SkillDimension} from '../types/study';

export interface QuickTip {
  id: string;
  skill: SkillDimension;
  title: string;
  advice: string;
  microAction: string;
}

export const QUICK_TIPS: QuickTip[] = [
  {
    id: 'tip_silence_emphasis',
    skill: 'Ritmo y Pausas',
    title: 'Usa el silencio para dar énfasis',
    advice:
      'Una pausa de 1.5 segundos justo después de tu idea principal hace que el público la procese y multiplique su peso.',
    microAction: 'Di tu frase clave, cierra los labios y cuenta mentalmente "uno, dos" antes de seguir.',
  },
  {
    id: 'tip_no_apology_open',
    skill: 'Tono Persuasivo',
    title: 'Nunca abras pidiendo disculpas',
    advice:
      'Frases como "perdón por los nervios" o "sé que tienen poco tiempo" reducen tu autoridad antes de presentar tu argumento.',
    microAction: 'Reemplaza "perdón por la demora" por "gracias por su paciencia; vamos directo al punto".',
  },
  {
    id: 'tip_bluf_execs',
    skill: 'Presencia Ejecutiva',
    title: 'Conclusión primero frente a directivos',
    advice:
      'Los perfiles gerenciales deciden más rápido cuando escuchan la recomendación y su impacto en los primeros 15 segundos.',
    microAction: 'Abre con: "Recomiendo hacer X porque reduce Y en un Z%. Estos son los dos motivos...".',
  },
  {
    id: 'tip_one_person_per_sentence',
    skill: 'Escucha y Tacto',
    title: 'Mira a una sola persona por frase',
    advice:
      'Barrer la sala con la mirada de lado a lado transmite nerviosismo; sostener contacto visual breve da cercanía y calma.',
    microAction: 'Termina una idea completa mirando a un asistente y cambia de persona en la siguiente oración.',
  },
  {
    id: 'tip_replace_fillers',
    skill: 'Claridad y Estructura',
    title: 'Cambia las muletillas por aire',
    advice:
      'Quien escucha percibe un "ehhh" o "o sea" como duda, pero percibe medio segundo de silencio como seguridad mental.',
    microAction: 'Cuando sientas venir una muletilla, inhala suave por la nariz y retoma con un verbo directo.',
  },
  {
    id: 'tip_plant_feet',
    skill: 'Ritmo y Pausas',
    title: 'Planta ambos pies antes de hablar',
    advice:
      'Empezar a hablar mientras caminas o acomodas notas diluye el impacto de tu apertura frente a un grupo.',
    microAction: 'Detente, apoya ambos pies firmes al ancho de los hombros, respira una vez y recién habla.',
  },
  {
    id: 'tip_signpost_three',
    skill: 'Claridad y Estructura',
    title: 'Anuncia cuántos puntos vas a decir',
    advice:
      'Tu audiencia retiene mucho mejor una respuesta improvisada cuando le das un mapa previo de cuántos bloques escuchará.',
    microAction: 'Empieza con: "Hay dos aspectos clave aquí: primero... y segundo...".',
  },
  {
    id: 'tip_hold_silence_price',
    skill: 'Tono Persuasivo',
    title: 'Sostén el silencio tras decir tu precio',
    advice:
      'Justificar demasiado después de dar una tarifa o condición proyecta inseguridad e invita a pedir descuentos.',
    microAction: 'Di el monto o plazo con voz serena y espera en silencio a que la otra parte responda.',
  },
  {
    id: 'tip_validate_without_but',
    skill: 'Escucha y Tacto',
    title: 'Evita el "pero" después de validar',
    advice:
      'Decir "Entiendo tu punto, pero..." borra emocionalmente la primera mitad de tu frase y pone a la otra persona a la defensiva.',
    microAction: 'Usa "y" o punto y seguido: "Entiendo tu urgencia; veamos cómo ajustar el alcance".',
  },
  {
    id: 'tip_paraphrase_tough_q',
    skill: 'Escucha y Tacto',
    title: 'Resume las preguntas largas del público',
    advice:
      'Repetir en una oración breve la duda de un asistente te da 3 segundos para pensar y alinea a toda la sala.',
    microAction: 'Di: "Para asegurar que todos lo escuchamos: preguntas cómo cubriremos el riesgo X, ¿cierto?".',
  },
  {
    id: 'tip_drop_tone_end',
    skill: 'Presencia Ejecutiva',
    title: 'Baja la entonación al cerrar una frase',
    advice:
      'Terminar las afirmaciones con tono ascendente las hace sonar como preguntas o búsqueda de aprobación.',
    microAction: 'En tu última palabra de cada idea importante, desciende ligeramente el tono como punto final.',
  },
  {
    id: 'tip_close_who_when',
    skill: 'Presencia Ejecutiva',
    title: 'Todo cierre lleva qué, quién y cuándo',
    advice:
      'Despedirse de una reunión con "ahí estamos en contacto" garantiza retrabajo y falta de seguimiento.',
    microAction: 'Cierra en 15 segundos: "Laura envía el borrador hoy y validamos el jueves a las 10".',
  },
];

export function pickRandomQuickTip(excludeId?: string | null): QuickTip {
  const candidates = excludeId
    ? QUICK_TIPS.filter((tip) => tip.id !== excludeId)
    : QUICK_TIPS;
  const pool = candidates.length > 0 ? candidates : QUICK_TIPS;
  const randomIdx = Math.floor(Math.random() * pool.length);
  return pool[randomIdx];
}
