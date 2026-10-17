import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { world } from '@/data';
import type { FormatKind, IslandId, MinigameId, World } from '@/types/domain';
import { progressSchema } from './schema';
import * as t from './transitions';
import { initialProgress, type Progress, type ProgressEvent, type TransitionResult } from './types';

export const PROGRESS_STORAGE_KEY = 'virtux:progreso';

export interface ProgressActions {
  visitIsland: (islandId: IslandId) => ProgressEvent[];
  startStation: (stationId: string) => ProgressEvent[];
  recordAttempt: (stationId: string, score: number) => ProgressEvent[];
  completeStation: (stationId: string, score: number) => ProgressEvent[];
  recordFormat: (format: FormatKind) => ProgressEvent[];
  recordReflection: (stationId: string) => ProgressEvent[];
  recordMinigame: (minigameId: MinigameId, run: t.MinigameRun) => ProgressEvent[];
  setMastery: (islandId: IslandId, value: number) => void;
  /** Sustituye todo el progreso (modo demo). */
  replace: (progress: Progress) => void;
  reset: () => void;
}

export type ProgressStore = Progress & ProgressActions;

export function pickProgress(state: Progress): Progress {
  return {
    version: state.version,
    xp: state.xp,
    stations: state.stations,
    visitedIslands: state.visitedIslands,
    fragments: state.fragments,
    badges: state.badges,
    formatsTried: state.formatsTried,
    reflections: state.reflections,
    activeDays: state.activeDays,
    minigames: state.minigames,
    mastery: state.mastery,
    journal: state.journal,
  };
}

export function createProgressStore(source: World = world, clock: () => Date = () => new Date()) {
  return create<ProgressStore>()(
    persist<ProgressStore, [], [], Progress>(
      (set, get) => {
        const apply = (
          transition: (progress: Progress, w: World, now: Date) => TransitionResult,
        ): ProgressEvent[] => {
          const result = transition(pickProgress(get()), source, clock());
          set(result.progress);
          return result.events;
        };

        return {
          ...initialProgress(),
          visitIsland: (islandId) => apply((p, w, now) => t.visitIsland(p, w, islandId, now)),
          startStation: (stationId) => apply((p, w, now) => t.startStation(p, w, stationId, now)),
          recordAttempt: (stationId, score) =>
            apply((p, w, now) => t.recordAttempt(p, w, stationId, score, now)),
          completeStation: (stationId, score) =>
            apply((p, w, now) => t.completeStation(p, w, stationId, score, now)),
          recordFormat: (format) => apply((p, w, now) => t.recordFormat(p, w, format, now)),
          recordReflection: (stationId) =>
            apply((p, w, now) => t.recordReflection(p, w, stationId, now)),
          recordMinigame: (minigameId, run) =>
            apply((p, w, now) => t.recordMinigame(p, w, minigameId, run, now)),
          setMastery: (islandId, value) => {
            apply((p, w, now) => t.setMastery(p, w, islandId, value, now));
          },
          replace: (progress) => {
            set(pickProgress(progress));
          },
          reset: () => {
            set(initialProgress());
          },
        };
      },
      {
        name: PROGRESS_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => pickProgress(state),
        // Si lo guardado no es válido, se empieza de cero en vez de romper la app.
        merge: (persisted, current) => {
          const parsed = progressSchema.safeParse(persisted);
          return parsed.success ? { ...current, ...parsed.data } : current;
        },
      },
    ),
  );
}

export const useProgress = createProgressStore();
