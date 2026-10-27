import { useAiStatus } from './aiStatus';
import { outputs, type AiInput, type AiOutput, type AiTask } from './prompts';

/**
 * Cliente del proxy de IA. Nunca lanza: ante cualquier fallo (sin red, sin
 * clave, límite, respuesta inválida) devuelve `null` y el llamador usa el
 * motor local. La API key no existe en el navegador.
 */
const ENDPOINT: string = import.meta.env.VITE_BRUJULA_URL ?? '/api/brujula';
/** Tras un fallo del proxy se espera antes de volver a intentarlo: sin red, no se insiste. */
const BACKOFF_MS = 60_000;
let pausedUntil = 0;
/** El ejecutable funciona sin red: ni siquiera intenta llamar al proxy. */
const desktop = typeof window !== 'undefined' && window.virtux?.desktop === true;

export async function askAi<T extends AiTask>(
  input: AiInput & { task: T },
  timeoutMs = 6000,
): Promise<AiOutput<T> | null> {
  const status = useAiStatus.getState();
  if (desktop) {
    status.setMode('sin-conexion');
    return null;
  }
  if (Date.now() < pausedUntil) return null;
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      // Una entrada rechazada (400) es de esa petición; lo demás indica que no hay proxy útil.
      if (response.status !== 400) pausedUntil = Date.now() + BACKOFF_MS;
      status.setMode('sin-conexion');
      return null;
    }
    const body = (await response.json()) as { output?: unknown };
    const parsed = outputs[input.task].safeParse(body.output);
    if (!parsed.success) return null;
    status.setMode('en-linea');
    return parsed.data as AiOutput<T>;
  } catch {
    pausedUntil = Date.now() + BACKOFF_MS;
    status.setMode('sin-conexion');
    return null;
  }
}
