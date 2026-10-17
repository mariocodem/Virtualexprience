/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL pública del proxy de IA, solo para el ejecutable o despliegues separados. */
  readonly VITE_BRUJULA_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
