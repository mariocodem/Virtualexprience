import { describe, expect, it, vi } from 'vitest';
import { extractJson, handleBrujula } from '../../../server/brujula';
import { resolveProvider } from '../../../server/providers';
import { createRateLimiter } from '../../../server/rateLimit';

const ENV = { LLM_PROVIDER: 'groq', LLM_API_KEY: 'clave-de-prueba' };

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/brujula', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': crypto.randomUUID(),
      ...headers,
    },
    body: JSON.stringify(body),
  });

const LINE = {
  task: 'bruma-linea',
  island: 'ComunicArte',
  name: 'Bruma de los rumores',
  nature: 'Difunde lo que no se ha verificado.',
  level: 2,
  phase: 1,
  moment: 'fallo',
  streak: -1,
};

const modelReply = (content: string, status = 200) =>
  vi.fn<typeof fetch>(async () =>
    Promise.resolve(
      new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status }),
    ),
  );

describe('proxy de Brújula', () => {
  it('sin API key no se configura: el cliente usará el motor local', async () => {
    expect(resolveProvider({})).toBeNull();
    const response = await handleBrujula(post(LINE), {});
    expect(response.status).toBe(503);
    const health = await handleBrujula(new Request('http://localhost/api/brujula'), {});
    expect(await health.json()).toMatchObject({ configured: false });
  });

  it('usa el preset del proveedor y permite cambiar el modelo', () => {
    expect(resolveProvider(ENV)).toMatchObject({ baseUrl: 'https://api.groq.com/openai/v1' });
    expect(resolveProvider({ ...ENV, LLM_MODEL: '' })?.model).toBe('llama-3.1-8b-instant');
    expect(resolveProvider({ ...ENV, LLM_PROVIDER: 'gemini', LLM_MODEL: 'otro' })?.model).toBe(
      'otro',
    );
  });

  it('valida la entrada antes de llamar al modelo', async () => {
    const fetcher = modelReply('{"line":"x"}');
    const response = await handleBrujula(post({ task: 'otra-cosa' }), ENV, fetcher);
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('devuelve la salida del modelo validada y nunca la API key', async () => {
    const fetcher = modelReply('```json\n{"line": "Te faltó revisar la fecha, explorador."}\n```');
    const response = await handleBrujula(post(LINE), ENV, fetcher);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(JSON.parse(body)).toMatchObject({
      output: { line: 'Te faltó revisar la fecha, explorador.' },
    });
    expect(body).not.toContain('clave-de-prueba');
    const init = fetcher.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({ authorization: 'Bearer clave-de-prueba' });
  });

  it('rechaza salidas del modelo que no cumplen el esquema', async () => {
    const response = await handleBrujula(post(LINE), ENV, modelReply('{"otra":"cosa"}'));
    expect(response.status).toBe(502);
  });

  it('respeta el origen permitido', async () => {
    const response = await handleBrujula(post(LINE, { origin: 'https://otro.sitio' }), {
      ...ENV,
      ALLOWED_ORIGIN: 'https://archipielago.vercel.app',
    });
    expect(response.status).toBe(403);
  });

  it('limita peticiones por IP', () => {
    const allow = createRateLimiter(2, 1000);
    expect([allow('a', 0), allow('a', 1), allow('a', 2), allow('b', 2), allow('a', 1500)]).toEqual([
      true,
      true,
      false,
      true,
      true,
    ]);
  });

  it('extrae el JSON aunque venga rodeado de texto', () => {
    expect(extractJson('Claro: {"a": 1} listo')).toEqual({ a: 1 });
    expect(() => extractJson('sin json')).toThrow();
  });
});
