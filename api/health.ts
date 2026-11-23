import type {IncomingMessage, ServerResponse} from 'node:http';

interface VercelRequest extends IncomingMessage {
  method?: string;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

function resolveSafeModel(): string {
  const defaultModel = process.env.VERCEL ? 'gemini-2.5-flash' : 'gemini-4-hydrogen';
  const raw = (process.env.GEMINI_MODEL ?? '').trim();
  if (!raw || raw.startsWith('AQ.') || raw.startsWith('AIza') || raw.length > 60) {
    return defaultModel;
  }
  return raw;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({error: 'Método no permitido.'});
    return;
  }

  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  const aiConfigured = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');

  res.status(200).json({
    ok: true,
    aiConfigured,
    model: resolveSafeModel(),
    keyFormat: aiConfigured ? (apiKey.startsWith('AQ.') ? 'AQ' : 'standard') : null,
  });
}
