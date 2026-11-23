import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import dotenv from 'dotenv';
import {GoogleGenAI, ThinkingLevel, Type} from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

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

async function startServer() {
  const app = express();
  app.use(express.json({limit: '1mb'}));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      aiConfigured: Boolean(getAiClient()),
    });
  });

  app.post('/api/tutor/explain', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'La función opcional de coach con IA requiere configurar GEMINI_API_KEY en Settings > Secrets.',
      });
      return;
    }

    const {prompt, userAnswer, correctAnswer, baseExplanation, domainCategory} = req.body ?? {};
    if (!prompt || !correctAnswer) {
      res.status(400).json({error: 'Faltan datos del ejercicio para generar el consejo.'});
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
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
          thinkingConfig: {thinkingLevel: ThinkingLevel.LOW},
        },
      });

      const explanation = (response.text ?? '').trim();
      if (!explanation) {
        res.status(502).json({error: 'El modelo devolvió una respuesta vacía.'});
        return;
      }

      res.json({explanation});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al consultar el coach IA.';
      res.status(500).json({error: message});
    }
  });

  app.post('/api/items/generate', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'El generador opcional de ejercicios requiere configurar GEMINI_API_KEY en Settings > Secrets.',
      });
      return;
    }

    const {notes, category, count = 3} = req.body ?? {};
    if (!notes || typeof notes !== 'string' || notes.trim().length < 20) {
      res.status(400).json({error: 'Describe una situación o pega al menos 20 caracteres de notas para crear ejercicios.'});
      return;
    }

    const safeCount = Math.min(5, Math.max(1, Number(count) || 3));

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
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
          thinkingConfig: {thinkingLevel: ThinkingLevel.LOW},
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
      });

      const raw = (response.text ?? '[]').trim();
      const parsed = JSON.parse(raw);
      res.json({items: Array.isArray(parsed) ? parsed : []});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al generar ejercicios con IA.';
      res.status(500).json({error: message});
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VozClara server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
