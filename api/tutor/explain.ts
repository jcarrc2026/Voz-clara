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

function createAiClient(apiKey: string, useVertexExpress = false): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    ...(useVertexExpress ? {vertexai: true} : {}),
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

  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
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

  const defaultModel = process.env.VERCEL ? 'gemini-2.5-flash' : 'gemini-4-hydrogen';
  const rawModel = (process.env.GEMINI_MODEL ?? '').trim();
  const modelName =
    !rawModel || rawModel.startsWith('AQ.') || rawModel.startsWith('AIza') || rawModel.length > 60
      ? defaultModel
      : rawModel;

  const requestParams = {
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
  };

  try {
    let response;
    try {
      const ai = createAiClient(apiKey, false);
      response = await ai.models.generateContent(requestParams);
    } catch (firstErr: unknown) {
      const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
      if (apiKey.startsWith('AQ.') || msg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED')) {
        try {
          const vertexAi = createAiClient(apiKey, true);
          response = await vertexAi.models.generateContent(requestParams);
        } catch {
          throw firstErr;
        }
      } else {
        throw firstErr;
      }
    }

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
