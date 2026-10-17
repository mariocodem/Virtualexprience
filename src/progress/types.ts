import type { FormatKind, IslandId, MinigameId } from '@/types/domain';

export type StationStatus =
  'bloqueada' | 'en-preparacion' | 'disponible' | 'en-curso' | 'completada';

export interface StationRecord {
  startedAt: string;
  completedAt?: string;
  attempts: number;
  /** Mejor resultado de 0 a 1. */
  bestScore?: number;
}

export interface MinigameBest {
  /** Proporción de decisiones correctas, de 0 a 1. */
  accuracy: number;
  /** Proporción de justificaciones con el criterio adecuado, de 0 a 1. */
  criteria: number;
  /** Máximo de pistas de verificación distintas usadas en una partida. */
  toolsUsed: number;
  runs: number;
}

export type JournalKind =
  | 'isla-visitada'
  | 'estacion-iniciada'
  | 'estacion-completada'
  | 'fragmento'
  | 'insignia'
  | 'nivel'
  | 'formato'
  | 'reflexion';

/** Entrada de la bitácora: datos estructurados; el texto se compone en la interfaz. */
export interface JournalEntry {
  id: string;
  at: string;
  kind: JournalKind;
  ref: string;
}

export interface Progress {
  version: 1;
  xp: number;
  stations: Record<string, StationRecord>;
  visitedIslands: IslandId[];
  fragments: IslandId[];
  /** id de insignia → fecha ISO en que se obtuvo. */
  badges: Record<string, string>;
  formatsTried: FormatKind[];
  reflections: number;
  /** Días con actividad, en formato AAAA-MM-DD (hora local). */
  activeDays: string[];
  minigames: Partial<Record<MinigameId, MinigameBest>>;
  /** Dominio estimado por competencia (0–1); lo actualiza el motor adaptativo. */
  mastery: Partial<Record<IslandId, number>>;
  journal: JournalEntry[];
}

/** Lo que una acción provocó, para que la interfaz lo celebre o lo anuncie. */
export type ProgressEvent =
  | { type: 'xp'; amount: number }
  | { type: 'station-completed'; stationId: string }
  | { type: 'fragment'; islandId: IslandId }
  | { type: 'badge'; badgeId: string }
  | { type: 'level-up'; levelId: string };

export interface TransitionResult {
  progress: Progress;
  events: ProgressEvent[];
}

export function initialProgress(): Progress {
  return {
    version: 1,
    xp: 0,
    stations: {},
    visitedIslands: [],
    fragments: [],
    badges: {},
    formatsTried: [],
    reflections: 0,
    activeDays: [],
    minigames: {},
    mastery: {},
    journal: [],
  };
}
