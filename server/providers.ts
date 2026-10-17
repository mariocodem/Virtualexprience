/**
 * Proveedores con API compatible con OpenAI (chat/completions). Todos tienen
 * plan gratuito; se elige con LLM_PROVIDER y se puede cambiar el modelo con
 * LLM_MODEL o la URL con LLM_BASE_URL sin tocar código.
 */
export interface ProviderConfig {
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}

const PRESETS: Record<string, { baseUrl: string; model: string }> = {
  groq: { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.1-8b-instant' },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
  },
};

export type Env = Record<string, string | undefined>;

/** Configuración del proveedor, o `null` si falta la API key (modo sin conexión). */
export function resolveProvider(env: Env): ProviderConfig | null {
  const apiKey = env.LLM_API_KEY?.trim();
  if (!apiKey) return null;
  const name = (env.LLM_PROVIDER ?? 'groq').trim().toLowerCase();
  const preset = PRESETS[name];
  const baseUrl = (env.LLM_BASE_URL ?? preset?.baseUrl ?? '').replace(/\/+$/, '');
  // LLM_MODEL vacío en .env cuenta como «sin definir»: se usa el modelo del preset.
  const custom = env.LLM_MODEL?.trim() ?? '';
  const model = custom.length > 0 ? custom : (preset?.model ?? '');
  if (!baseUrl || !model) return null;
  return { name, baseUrl, model, apiKey };
}
