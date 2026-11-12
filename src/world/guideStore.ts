import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface GuideState {
  /** La cartela de Brújula está abierta; si se oculta, queda un botón para volver a abrirla. */
  open: boolean;
  setOpen: (open: boolean) => void;
}

/** Si quien juega ocultó la guía, se recuerda en este navegador. */
export const useGuide = create<GuideState>()(
  persist(
    (set) => ({
      open: true,
      setOpen: (open) => {
        set({ open });
      },
    }),
    { name: 'virtux:guia', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
