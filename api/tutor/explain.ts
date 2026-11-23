import type {IncomingMessage, ServerResponse} from 'node:http';
import {GoogleGenAI, ThinkingLevel} from '@google/genai';

interface VercelRequest extends IncomingMessage {
  method?: string;
  body?: unknown;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseRequestBody(rawBody: unknown): Record<string, unknown> {
  if (!rawBody) return {};
  if (typeof rawBody === 'string') {
    try {
      const parsed = JSON.parse(rawBody);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({error: 'Método no permitido. Usa POST.'});
    return;
  }

  const ai = getAiClient();
  if (!ai) {
    res.status(503).json({
      error:
        'La función opcional de coach con IA requiere configurar GEMINI_API_KEY en las variables de entorno del servidor.',
    });
    return;
  }

  const body = parseRequestBody(req.body);
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  const userAnswer = typeof body.userAnswer === 'string' ? body.userAnswer : undefined;
  const correctAnswer = typeof body.correctAnswer === 'string' ? body.correctAnswer : '';
  const baseExplanation =
    typeof body.baseExplanation === 'string' ? body.baseExplanation : undefined;
  const domainCategory =
    typeof body.domainCategory === 'string' ? body.domainCategory : undefined;

  if (!prompt || !correctAnswer) {
    res.status(400).json({error: 'Faltan datos del ejercicio para generar el consejo.'});
    return;
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-4-hydrogen';

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        `Área de comunicación: ${domainCategory ?? 'Elocuencia, oratoria y comunicación empresarial'}`,
        `Situación / Ejercicio: ${prompt}`,
        `Respuesta elegida por el alumno: ${userAnswer ?? '(no especificada)'}`,
        `Frase o respuesta recomendada: ${correctAnswer}`,
        `Explicación base: ${baseExplanation ?? ''}`,
        '',
        'Dame un consejo breve y accionable (máximo 90 palabras en español) con una variante adicional de cómo decirlo con naturalidad, seguridad y buen tono frente a personas o directivos.',
      ].join('\n'),
      config: {
        systemInstruction:
          'Eres un coach de oratoria, elocuencia y comunicación ejecutiva. Tus consejos son concretos, cálidos, prácticos y aplicables en conversaciones reales, presentaciones en público y reuniones de empresa.',
        ...(modelName.startsWith('gemini-4')
          ? {thinkingConfig: {thinkingLevel: ThinkingLevel.LOW}}
          : {}),
      },
    });

    const explanation = (response.text ?? '').trim();
    if (!explanation) {
      res.status(502).json({error: 'El modelo devolvió una respuesta vacía.'});
      return;
    }

    res.status(200).json({explanation});
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al consultar el coach IA.';
    res.status(500).json({error: message});
  }
}
