import { create } from 'zustand';

/** Panel de accesibilidad: uno solo para toda la app, abierto desde cualquier disparador o con Alt+A. */
export const useA11yPanel = create<{ open: boolean; setOpen: (open: boolean) => void }>()(
  (set) => ({
    open: false,
    setOpen: (open) => {
      set({ open });
    },
  }),
);
