import type {IncomingMessage, ServerResponse} from 'node:http';
import {GoogleGenAI, ThinkingLevel, Type} from '@google/genai';

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
        'El generador opcional de ejercicios requiere configurar GEMINI_API_KEY en las variables de entorno del servidor.',
    });
    return;
  }

  const body = parseRequestBody(req.body);
  const notes = typeof body.notes === 'string' ? body.notes : '';
  const category = typeof body.category === 'string' ? body.category : undefined;
  const countRaw = typeof body.count === 'number' ? body.count : Number(body.count);

  if (!notes || notes.trim().length < 20) {
    res.status(400).json({
      error: 'Describe una situación o pega al menos 20 caracteres de notas para crear ejercicios.',
    });
    return;
  }

  const safeCount = Math.min(5, Math.max(1, Number.isFinite(countRaw) && countRaw > 0 ? countRaw : 3));
  const defaultModel = process.env.VERCEL ? 'gemini-2.5-flash' : 'gemini-4-hydrogen';
  const rawModel = (process.env.GEMINI_MODEL ?? '').trim();
  const modelName =
    !rawModel || rawModel.startsWith('AQ.') || rawModel.startsWith('AIza') || rawModel.length > 60
      ? defaultModel
      : rawModel;

  const requestParams = {
    model: modelName,
    contents: [
      `Unidad/Enfoque: ${category ?? 'Elocuencia y comunicación empresarial'}`,
      `Cantidad exacta de ejercicios a generar: ${safeCount}`,
      'Genera preguntas situacionales cortas (tipo multiple_choice) para entrenar elocuencia, claridad, diplomacia o presencia escénica basadas en estas notas o situaciones:',
      '---',
      notes.trim().slice(0, 4000),
    ].join('\n'),
    config: {
      systemInstruction:
        'Eres un diseñador instruccional de oratoria, elocuencia y comunicación ejecutiva. Creas micro-ejercicios prácticos en español con 4 opciones plausibles (1 elocuente/acertada y 3 distractores típicos como ser vago, agresivo o excesivamente apologético) y una explicación breve de impacto comunicativo.',
      ...(modelName.startsWith('gemini-4')
        ? {thinkingConfig: {thinkingLevel: ThinkingLevel.LOW}}
        : {}),
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            prompt: {type: Type.STRING},
            difficulty: {type: Type.INTEGER},
            options: {
              type: Type.ARRAY,
              items: {type: Type.STRING},
            },
            correctIndex: {type: Type.INTEGER},
            explanation: {type: Type.STRING},
          },
          required: ['prompt', 'difficulty', 'options', 'correctIndex', 'explanation'],
        },
      },
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
        const vertexAi = createAiClient(apiKey, true);
        response = await vertexAi.models.generateContent(requestParams);
      } else {
        throw firstErr;
      }
    }

    const raw = (response.text ?? '[]').trim();
    const parsed = JSON.parse(raw);
    res.status(200).json({items: Array.isArray(parsed) ? parsed : []});
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al generar ejercicios con IA.';
    res.status(500).json({error: message});
  }
}
