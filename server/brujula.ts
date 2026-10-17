import {
  aiInput,
  buildMessages,
  outputs,
  PROMPT_VERSION,
  type AiInput,
} from '../src/ai/prompts/index.ts';
import { resolveProvider, type Env, type ProviderConfig } from './providers.ts';
import { createRateLimiter } from './rateLimit.ts';

/**
 * Proxy de Brújula y la Bruma: el navegador nunca ve la API key. Valida la
 * entrada, limita el abuso, llama al modelo y valida su salida antes de
 * devolverla. Si algo falla responde con error y el cliente usa el motor local.
 */

const MAX_BODY = 8_000;
const TIMEOUT_MS = 9_000;
const allow = createRateLimiter(30, 60_000);

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
  });

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

/** Extrae el primer objeto JSON de la respuesta del modelo (tolera bloques ``` ```). */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('La respuesta no trae JSON.');
  return JSON.parse(text.slice(start, end + 1));
}

async function callModel(
  provider: ProviderConfig,
  input: AiInput,
  fetcher: typeof fetch,
): Promise<unknown> {
  const { system, user, temperature } = buildMessages(input);
  const request = async (jsonMode: boolean) =>
    fetcher(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify({
        model: provider.model,
        temperature,
        max_tokens: 320,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

  let response = await request(true);
  // Algunos modelos no aceptan el modo JSON: se reintenta una vez sin él.
  if (response.status === 400) response = await request(false);
  if (!response.ok) throw new Error(`El proveedor respondió ${String(response.status)}.`);
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('El proveedor no devolvió contenido.');
  return extractJson(content);
}

export async function handleBrujula(
  request: Request,
  env: Env = process.env,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const provider = resolveProvider(env);
  const allowedOrigin = env.ALLOWED_ORIGIN?.trim();
  const cors: Record<string, string> = allowedOrigin
    ? { 'access-control-allow-origin': allowedOrigin, vary: 'origin' }
    : {};

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        'access-control-allow-methods': 'GET, POST',
        'access-control-allow-headers': 'content-type',
      },
    });
  }
  if (request.method === 'GET') {
    return json(
      {
        configured: Boolean(provider),
        provider: provider?.name ?? null,
        model: provider?.model ?? null,
        version: PROMPT_VERSION,
      },
      200,
      cors,
    );
  }
  if (request.method !== 'POST') return json({ error: 'metodo-no-permitido' }, 405, cors);

  const origin = request.headers.get('origin');
  if (allowedOrigin && origin && origin !== allowedOrigin)
    return json({ error: 'origen-no-permitido' }, 403);
  if (!allow(clientIp(request))) return json({ error: 'demasiadas-peticiones' }, 429, cors);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'peticion-demasiado-grande' }, 413, cors);

  let input: AiInput;
  try {
    input = aiInput.parse(JSON.parse(raw));
  } catch {
    return json({ error: 'entrada-invalida' }, 400, cors);
  }
  if (!provider) return json({ error: 'sin-configurar' }, 503, cors);

  try {
    const output = outputs[input.task].parse(await callModel(provider, input, fetcher));
    return json({ task: input.task, output, version: PROMPT_VERSION }, 200, cors);
  } catch {
    return json({ error: 'fallo-del-modelo' }, 502, cors);
  }
}
