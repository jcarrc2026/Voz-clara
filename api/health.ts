import type {IncomingMessage, ServerResponse} from 'node:http';

interface VercelRequest extends IncomingMessage {
  method?: string;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({error: 'Método no permitido.'});
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const aiConfigured = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');

  res.status(200).json({
    ok: true,
    aiConfigured,
    model: process.env.GEMINI_MODEL || 'gemini-4-hydrogen',
  });
}
