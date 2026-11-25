export interface LocalAiAdvice {
  title: string;
  corePremise: string;
  framework: string[];
  concreteExample: string;
  mindsetShift: string;
  suggestedAction: string;
}

export type AiProvider = 'grok' | 'openai' | 'openrouter' | 'gemini';

const EXPERT_KNOWLEDGE_BASE: Array<{
  keywords: string[];
  advice: LocalAiAdvice;
}> = [
  {
    keywords: ['caro', 'precio', 'presupuesto', 'costoso', 'dinero', 'descuento'],
    advice: {
      title: 'Estrategia Ejecutiva: Manejo de la Objeción de Precio',
      corePremise: 'Cuando un cliente dice "es caro", rara vez es un problema de dinero; es una falta de claridad en el retorno de inversión o en el costo de no resolver su problema ahora.',
      framework: [
        '1. Validar sin ceder: "Entiendo perfectamente que la inversión es importante para ti..."',
        '2. Aislar la objeción: "...dejando a un lado el número por un segundo, ¿es este exactamente el resultado que buscas?"',
        '3. Reencuadrar el costo de inacción: Comparar el costo de tu solución frente al costo diario de seguir con el problema actual.',
        '4. Certeza y silencio: Mantén el silencio tras dar tu valor; quien habla primero pierde.'
      ],
      concreteExample: '"Entiendo que el presupuesto requiere análisis. Si comparamos esta inversión de $X con el costo de perder 3 clientes al mes por no tener este sistema, la solución se paga sola en 30 días. ¿Te parece si revisamos cómo estructurarlo?"',
      mindsetShift: 'No estás vendiendo un gasto, estás vendiendo un puente hacia un estado deseado. Defender tu precio es defender la calidad del resultado que entregas.',
      suggestedAction: 'Practica en voz alta tu respuesta sin titubear. Elimina cualquier muletilla como "eh..." o "si quieres te hago rebaja".'
    }
  },
  {
    keywords: ['pensar', 'analizar', 'revisar', 'familia', 'consultar', 'luego'],
    advice: {
      title: 'Cierre Consultivo: Manejo del "Tengo que pensarlo"',
      corePremise: '"Tengo que pensarlo" es la forma educada que usa el cerebro para decir "tengo dudas que no me atreví a decirte" o "no vi el valor suficiente".',
      framework: [
        '1. Desarmar con empatía: "Claro que sí, es una decisión importante. Para poder ayudarte mejor a pensar, ¿qué parte es la que te genera más dudas?"',
        '2. Destapar el elefante en la sala: Preguntar directamente por el factor oculto (miedo al fracaso, compatibilidad, tiempos).',
        '3. Agendar compromiso: Si lo va a pensar, fija fecha y hora exacta para retomar la llamada.'
      ],
      concreteExample: '"Por supuesto, tómate tu tiempo. Solo para estar seguro de haberte explicado bien: ¿lo que te hace dudar es el tiempo de implementación o los resultados esperados?"',
      mindsetShift: 'Hacer preguntas directas no es presionar; es respetar el tiempo de ambos y mostrar liderazgo profesional.',
      suggestedAction: 'Usa el simulador de objeciones para responder 3 veces a esta frase con absoluta calma.'
    }
  },
  {
    keywords: ['miedo', 'escénico', 'bloquear', 'nervios', 'temblar', 'público', 'audiencia'],
    advice: {
      title: 'Dominio del Miedo Escénico y la Presencia',
      corePremise: 'El miedo escénico no desaparece; se transforma en adrenalina cuando cambias el foco de "cómo me veo yo" a "cómo le sirvo a la audiencia".',
      framework: [
        '1. Respiración diafragmática 4x4: Inhala en 4 segundos, sostén 4, exhala 4. Oxigena el cerebro y baja el ritmo cardíaco.',
        '2. Los primeros 15 segundos blindados: Memoriza palabra por palabra la primera frase de tu intervención; una vez cruzada, tu cerebro se relaja.',
        '3. Anclaje visual: Identifica a 3 personas amables en la sala (izquierda, centro, derecha) y háblales a ellos.'
      ],
      concreteExample: '"Buenos días. Hoy venimos a resolver una sola pregunta: ¿cómo logramos duplicar nuestra retención este trimestre? Vamos directo a los 3 puntos clave."',
      mindsetShift: 'La audiencia no está esperando que te equivoques; están deseando que tengas éxito y los lideres con seguridad.',
      suggestedAction: 'Haz tu apertura en voz alta frente al espejo 3 veces antes de entrar a cualquier reunión.'
    }
  },
  {
    keywords: ['muletillas', 'eh', 'este', 'osea', 'fluidez', 'limpiar', 'claro'],
    advice: {
      title: 'Protocolo de Eliminación de Muletillas',
      corePremise: 'Las muletillas son el bastón al que recurre tu mente cuando intenta ganar tiempo mientras busca la siguiente palabra. El antídoto es el silencio consciente.',
      framework: [
        '1. Pausa en lugar de ruido: Cada vez que sientas el impulso de decir "este..." o "eh...", cierra la boca y respira medio segundo.',
        '2. Oraciones cortas: Habla en bloques de 7 a 10 palabras con punto final.',
        '3. Conciencia de respiración: Grábate 1 minuto respondiendo una pregunta y cuenta cuántas muletillas usas para medirlas y reducirlas.'
      ],
      concreteExample: 'En lugar de: "Este... yo creo que... eh... deberíamos hacer la reunión el martes", di: "Propongo hacer la reunión el martes. ¿Les parece bien?"',
      mindsetShift: 'El silencio no es vacío; el silencio es autoridad. Los grandes oradores dominan el ritmo con pausas calculadas.',
      suggestedAction: 'Haz el ejercicio de lectura con pausas forzadas cada 3 palabras durante 2 minutos hoy.'
    }
  },
  {
    keywords: ['pitch', 'vender', 'presentar', 'propuesta', 'elevator', 'valor', 'servicio'],
    advice: {
      title: 'Construcción del Elevator Pitch de Alto Impacto',
      corePremise: 'Un buen pitch no describe lo que haces; describe con precisión quirúrgica el problema que resuelves, a quién ayudas y qué transformación generas.',
      framework: [
        '1. Gancho de dolor o identidad: Quién eres o qué problema agudo resuelves.',
        '2. Mecanismo único: Cómo lo haces diferente sin jerga compleja.',
        '3. Resultado comprobable y Llamado a la Acción.'
      ],
      concreteExample: '"Ayudamos a emprendedores y líderes a estructurar su comunicación y sus ventas para duplicar su cierre de clientes sin rogar ni hacer descuentos. ¿Te gustaría ver cómo aplicarlo en tu negocio?"',
      mindsetShift: 'Vender es un acto de servicio y liderazgo. Si tienes una solución real, callarla es egoísta.',
      suggestedAction: 'Escribe tu pitch en 3 líneas en el módulo de constructor de mensajes.'
    }
  }
];

export function getLocalAiCoaching(query: string): LocalAiAdvice {
  const qLower = query.toLowerCase();

  for (const item of EXPERT_KNOWLEDGE_BASE) {
    if (item.keywords.some((kw) => qLower.includes(kw))) {
      return item.advice;
    }
  }

  return {
    title: 'Mentoría Ejecutiva: Claridad, Estructura y Acción',
    corePremise: 'Toda comunicación de alto impacto se sustenta en tres pilares: una premisa clara, un beneficio innegable para el interlocutor y una llamada a la acción sin fricción.',
    framework: [
      '1. Regla BLUF (Bottom Line Up Front): Comienza siempre por la conclusión o el resultado principal antes de dar los detalles de soporte.',
      '2. Estructura de 3 puntos: Organiza tu argumento en máximo tres ideas maestras para facilitar la retención en quien te escucha.',
      '3. Tono de certeza: Habla con afirmaciones constructivas, eliminando los condicionales débiles ("creo que tal vez podríamos...").'
    ],
    concreteExample: `"${query.trim() ? `Respecto a "${query.substring(0, 45)}..."` : 'Ante cualquier reto de comunicación'}, la clave está en simplificar el mensaje, anclarlo en el beneficio del otro y mantener una postura firme y calmada."`,
    mindsetShift: 'Tu palabra es tu activo comercial y personal más valioso. Cuanta más claridad tengas en tu mente, mayor seguridad proyectarás en tu voz.',
    suggestedAction: 'Define la conclusión de lo que quieres transmitir antes de empezar a hablar y dilo en los primeros 10 segundos.'
  };
}

export async function fetchMultiAiCoaching(
  query: string,
  provider: AiProvider,
  apiKey: string
): Promise<LocalAiAdvice> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('API Key vacía');
  }

  const systemPrompt = 'Eres el mentor ejecutivo y estratega de oratoria, ventas, negociación y mentalidad de "El camino de la voz". Responde estrictamente en formato JSON con la siguiente estructura exacta: {"title": "...", "corePremise": "...", "framework": ["1. ...", "2. ..."], "concreteExample": "...", "mindsetShift": "...", "suggestedAction": "..."}. Sé directo, inspirador, práctico y sin relleno.';

  let url = '';
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  let body: any = {};

  if (provider === 'grok') {
    url = 'https://api.x.ai/v1/chat/completions';
    headers['Authorization'] = `Bearer ${cleanKey}`;
    body = {
      model: 'grok-beta',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.7
    };
  } else if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers['Authorization'] = `Bearer ${cleanKey}`;
    body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.7
    };
  } else if (provider === 'openrouter') {
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers['Authorization'] = `Bearer ${cleanKey}`;
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'Verbo & Presencia Studio';
    body = {
      model: 'x-ai/grok-2-1212',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.7
    };
  } else if (provider === 'gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;
    body = {
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\nConsulta del usuario: ${query}` }
          ]
        }
      ]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Error HTTP (${response.status}): ${errText.substring(0, 100)}`);
  }

  const data = await response.json();
  let content = '';

  if (provider === 'gemini') {
    content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else {
    content = data.choices?.[0]?.message?.content || '';
  }

  if (!content) {
    throw new Error('Respuesta vacía del proveedor');
  }

  try {
    const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return {
      title: parsed.title || 'Asesoría IA: ' + query.substring(0, 30),
      corePremise: parsed.corePremise || content,
      framework: Array.isArray(parsed.framework) ? parsed.framework : ['1. Análisis inicial', '2. Ejecución táctica'],
      concreteExample: parsed.concreteExample || 'Ejemplo práctico generado por IA.',
      mindsetShift: parsed.mindsetShift || 'Confía en tu claridad y presencia.',
      suggestedAction: parsed.suggestedAction || 'Ponlo en práctica hoy mismo.'
    };
  } catch (err) {
    return {
      title: 'Asesoría Estratégica IA',
      corePremise: content,
      framework: ['1. Analizar el contexto planteado', '2. Aplicar comunicación asertiva'],
      concreteExample: `"${query}" -> Abordarlo con firmeza y serenidad.`,
      mindsetShift: 'Tu palabra transforma tu realidad comercial y personal.',
      suggestedAction: 'Ejecuta con convicción y tono calmado.'
    };
  }
}

export const SAMPLE_COURSES_DATA = [
  {
    id: 'pillar_1',
    pillar: 'Oratoria y Claridad Mental',
    summary: 'Domina tu voz, elimina muletillas y estructura discursos memorables.',
    topics: [
      {
        title: 'Ordenar ideas antes de hablar (Regla de las 3 líneas)',
        duration: '6 min',
        content: 'Estructura mental instantánea: 1) Qué digo (conclusión), 2) Por qué importa (impacto), 3) Ejemplo o siguiente paso. Nunca empieces a hablar sin saber cuál es tu punto final.'
      },
      {
        title: 'Estructuras rápidas: PREP y Pasado-Presente-Futuro',
        duration: '7 min',
        content: 'El método PREP (Punto, Razón, Ejemplo, Punto) te permite responder cualquier pregunta improvisada en una junta directiva o entrevista con absoluta solidez.'
      },
      {
        title: 'Voz, pausas y silencios estratégicos',
        duration: '8 min',
        content: 'El silencio de 2 segundos tras una idea clave obliga a la audiencia a reflexionar y te otorga autoridad instantánea.'
      },
      {
        title: 'Vencer el miedo escénico y la respiración diafragmática',
        duration: '6 min',
        content: 'Técnica 4x4 de respiración para calmar el sistema nervioso central y afrontar presentaciones con serenidad y aplomo.'
      }
    ]
  },
  {
    id: 'pillar_2',
    pillar: 'Manera de Vender',
    summary: 'Cierra tratos con elegancia, sirviendo con valor y defendiendo tus precios.',
    topics: [
      {
        title: 'Enamorar al cliente sin rogar ni perseguir',
        duration: '6 min',
        content: 'La venta exitosa ocurre cuando el cliente percibe que tú tienes la certeza absoluta de que tu solución transformará su realidad.'
      },
      {
        title: 'Vender transformación antes que características',
        duration: '7 min',
        content: 'A la gente no le importan las especificaciones técnicas; le importa cómo se sentirá su negocio o su vida una vez resuelto el problema.'
      },
      {
        title: 'Escucha activa y preguntas poderosas',
        duration: '8 min',
        content: 'Quien hace las preguntas controla y comprende la conversación. Escucha el 80% del tiempo y habla el 20%.'
      },
      {
        title: 'Manejo calmado del "no" y objeciones de precio',
        duration: '6 min',
        content: 'Una objeción no es un rechazo personal; es una invitación a explicar mejor el valor o a resolver una duda oculta.'
      }
    ]
  },
  {
    id: 'pillar_3',
    pillar: 'Proyección de Negocio y Liderazgo',
    summary: 'Construye autoridad ejecutiva, comunica propuestas y lidera con coherencia.',
    topics: [
      {
        title: 'Presencia ejecutiva y coherencia de liderazgo',
        duration: '6 min',
        content: 'Tu lenguaje corporal, tu tono calmado y el cumplimiento de tus promesas forman la columna vertebral de tu reputación.'
      },
      {
        title: 'Aumentar el valor percibido y negociar con firmeza',
        duration: '7 min',
        content: 'Nunca compitas por precio; compite por impacto, velocidad de ejecución y seguridad en el resultado.'
      },
      {
        title: 'Construir acuerdos en lugar de debatir para ganar',
        duration: '6 min',
        content: 'El objetivo de una negociación ejecutiva no es ganarle al otro, sino alinear intereses para que ambas partes ganen con claridad.'
      }
    ]
  },
  {
    id: 'pillar_4',
    pillar: 'Manera de Ver la Vida y Mentalidad',
    summary: 'Audita tu diálogo interno, instala hábitos diarios y enfócate en lo controlable.',
    topics: [
      {
        title: 'Auditar el diálogo interno y los pensamientos',
        duration: '6 min',
        content: 'Hablarte con desprecio o duda en privado destruye tu proyección en público. Instala un estándar implacable de respeto interno.'
      },
      {
        title: 'Sistemas y la guardia diaria de pequeños compromisos',
        duration: '7 min',
        content: 'La confianza no nace de afirmaciones vacías, sino de cumplir promesas cotidianas contigo mismo todos los días.'
      },
      {
        title: 'Enfoque estoico: dominar lo que está bajo tu control',
        duration: '6 min',
        content: 'Separa la energía que inviertes en quejarte de factores externos y redirígela por completo a tu preparación y tu acción.'
      }
    ]
  }
];

export const SAMPLE_QUICK_TIPS = [
  {
    id: 'tip_1',
    category: 'Reuniones',
    title: 'Usa la regla BLUF para iniciar',
    advice: 'Empieza tus intervenciones dando la conclusión de inmediato. Ejemplo: "Nuestra recomendación es aprobar el presupuesto B porque reduce un 30% el riesgo operativo".'
  },
  {
    id: 'tip_2',
    category: 'Ventas',
    title: 'Nunca hables de precio antes de anclar el valor',
    advice: 'Si te preguntan cuánto cuesta antes de entender el problema, responde: "Para darte una cifra exacta que se ajuste a ti, dime primero qué volumen manejas actualmente".'
  },
  {
    id: 'tip_3',
    category: 'Redes/Video',
    title: 'Mira directamente al lente de la cámara',
    advice: 'Cuando grabes videos o estés en videollamada, mira al pequeño lente y no a la pantalla. Eso genera contacto visual instantáneo en quien te ve.'
  },
  {
    id: 'tip_4',
    category: 'Conversaciones difíciles',
    title: 'Separa la persona del problema',
    advice: 'Di: "El retraso en este entregable está afectando al equipo", en lugar de "Tú siempre llegas tarde y fallas". Ataca el proceso, no al individuo.'
  },
  {
    id: 'tip_5',
    category: 'Día a día',
    title: 'La postura de poder antes de entrar',
    advice: 'Párate erguido con los hombros relajados y respira hondo durante 30 segundos antes de hablar en público. Tu fisiología cambia tu química cerebral.'
  }
];
