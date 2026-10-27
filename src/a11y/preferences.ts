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
  /** Cómo se ve el mundo: relieve 3D o carta 2D equivalente. */
  mapMode: '3d' | '2d';
  /** Cómo se juegan los retos y las Brumas: en 3D o en su versión accesible equivalente. */
  gameMode: '3d' | 'accesible';
  /** Ritmo tranquilo en los juegos 3D: ataques más lentos y puntería asistida. */
  calmPace: boolean;
  /** Letra de lectura: la del atlas, Atkinson Hyperlegible u OpenDyslexic. */
  font: 'estandar' | 'legible' | 'dislexia';
  /** Interlineado y espaciado entre letras y palabras ampliados. */
  spacing: 'normal' | 'amplio';
}

export const DEFAULT_PREFERENCES: Preferences = {
  textStep: 0,
  contrast: 'normal',
  motion: 'sistema',
  mapMode: '3d',
  gameMode: '3d',
  calmPace: false,
  font: 'estandar',
  spacing: 'normal',
};

interface PreferencesActions {
  setTextStep: (step: TextStep) => void;
  setContrast: (contrast: Preferences['contrast']) => void;
  setMotion: (motion: Preferences['motion']) => void;
  setMapMode: (mapMode: Preferences['mapMode']) => void;
  setGameMode: (gameMode: Preferences['gameMode']) => void;
  setCalmPace: (calmPace: boolean) => void;
  setFont: (font: Preferences['font']) => void;
  setSpacing: (spacing: Preferences['spacing']) => void;
  /** Vuelve a los ajustes de fábrica. */
  resetPreferences: () => void;
}

export const PREFERENCES_STORAGE_KEY = 'virtux:preferencias';

export const usePreferences = create<Preferences & PreferencesActions>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      setTextStep: (textStep) => {
        set({ textStep });
      },
      setContrast: (contrast) => {
        set({ contrast });
      },
      setMotion: (motion) => {
        set({ motion });
      },
      setMapMode: (mapMode) => {
        set({ mapMode });
      },
      setGameMode: (gameMode) => {
        set({ gameMode });
      },
      setCalmPace: (calmPace) => {
        set({ calmPace });
      },
      setFont: (font) => {
        set({ font });
      },
      setSpacing: (spacing) => {
        set({ spacing });
      },
      resetPreferences: () => {
        set(DEFAULT_PREFERENCES);
      },
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ textStep, contrast, motion, mapMode, gameMode, calmPace, font, spacing }) => ({
        textStep,
        contrast,
        motion,
        mapMode,
        gameMode,
        calmPace,
        font,
        spacing,
      }),
    },
  ),
);
