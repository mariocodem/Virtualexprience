import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Cuatro pasos de tamaño de texto (CLAUDE.md §10). */
export const TEXT_SCALES = [1, 1.125, 1.25, 1.5] as const;
export type TextStep = 0 | 1 | 2 | 3;

export interface Preferences {
  textStep: TextStep;
  contrast: 'normal' | 'alto';
  /** `sistema` respeta `prefers-reduced-motion`; `reducido` lo fuerza. */
  motion: 'sistema' | 'reducido';
}

interface PreferencesActions {
  setTextStep: (step: TextStep) => void;
  setContrast: (contrast: Preferences['contrast']) => void;
  setMotion: (motion: Preferences['motion']) => void;
}

export const PREFERENCES_STORAGE_KEY = 'virtux:preferencias';

export const usePreferences = create<Preferences & PreferencesActions>()(
  persist(
    (set) => ({
      textStep: 0,
      contrast: 'normal',
      motion: 'sistema',
      setTextStep: (textStep) => {
        set({ textStep });
      },
      setContrast: (contrast) => {
        set({ contrast });
      },
      setMotion: (motion) => {
        set({ motion });
      },
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ textStep, contrast, motion }) => ({ textStep, contrast, motion }),
    },
  ),
);
