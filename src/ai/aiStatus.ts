import { create } from 'zustand';

export type AiMode = 'desconocido' | 'en-linea' | 'sin-conexion';

/** Estado de la IA generativa, visible en la interfaz («Modo sin conexión», CLAUDE.md §8). */
export const useAiStatus = create<{ mode: AiMode; setMode: (mode: AiMode) => void }>()((set) => ({
  mode: 'desconocido',
  setMode: (mode) => {
    set({ mode });
  },
}));
