/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del proxy de IA cuando vive en otro dominio que la web (el ejecutable no lo usa). */
  readonly VITE_BRUJULA_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Solo en el ejecutable de escritorio: lo expone el preload de Electron. */
  readonly virtux?: { desktop: true; platform: string };
}
