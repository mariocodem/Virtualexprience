import { useAiStatus } from './aiStatus';
import { outputs, type AiInput, type AiOutput, type AiTask } from './prompts';

/**
 * Cliente del proxy de IA. Nunca lanza: ante cualquier fallo (sin red, sin
 * clave, límite, respuesta inválida) devuelve `null` y el llamador usa el
 * motor local. La API key no existe en el navegador.
 */
const ENDPOINT: string = import.meta.env.VITE_BRUJULA_URL ?? '/api/brujula';

export async function askAi<T extends AiTask>(
  input: AiInput & { task: T },
  timeoutMs = 6000,
): Promise<AiOutput<T> | null> {
  const status = useAiStatus.getState();
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      status.setMode('sin-conexion');
      return null;
    }
    const body = (await response.json()) as { output?: unknown };
    const parsed = outputs[input.task].safeParse(body.output);
    if (!parsed.success) return null;
    status.setMode('en-linea');
    return parsed.data as AiOutput<T>;
  } catch {
    status.setMode('sin-conexion');
    return null;
  }
}
