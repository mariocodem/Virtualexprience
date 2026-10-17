import type { IslandId, Station, World } from '@/types/domain';
import type { Progress, StationStatus } from './types';

export function isCompleted(progress: Progress, stationId: string): boolean {
  return Boolean(progress.stations[stationId]?.completedAt);
}

export function stationStatus(progress: Progress, station: Station): StationStatus {
  if (station.availability === 'en-preparacion') return 'en-preparacion';
  const record = progress.stations[station.id];
  if (record?.completedAt) return 'completada';
  if (!station.requires.every((id) => isCompleted(progress, id))) return 'bloqueada';
  if (record) return 'en-curso';
  return 'disponible';
}

export interface IslandProgress {
  completed: number;
  /** Estaciones disponibles hoy (las que están en preparación no cuentan). */
  playable: number;
  ratio: number;
  hasFragment: boolean;
}

export function islandProgress(
  progress: Progress,
  world: World,
  islandId: IslandId,
): IslandProgress {
  const playable = world.stations.filter(
    (s) => s.islandId === islandId && s.availability === 'disponible',
  );
  const completed = playable.filter((s) => isCompleted(progress, s.id)).length;
  return {
    completed,
    playable: playable.length,
    ratio: playable.length === 0 ? 0 : completed / playable.length,
    hasFragment: progress.fragments.includes(islandId),
  };
}

/** Primera estación del sendero en curso o disponible: la que se sugiere por defecto. */
export function nextStation(
  progress: Progress,
  world: World,
  islandId: IslandId,
): Station | undefined {
  const own = world.stations.filter((s) => s.islandId === islandId);
  return (
    own.find((s) => stationStatus(progress, s) === 'en-curso') ??
    own.find((s) => stationStatus(progress, s) === 'disponible')
  );
}

export function completedCount(progress: Progress): number {
  return Object.values(progress.stations).filter((r) => r.completedAt).length;
}

/** ¿Quien llega ya tiene una expedición en marcha? */
export function hasProgress(progress: Progress): boolean {
  return (
    progress.xp > 0 ||
    Object.keys(progress.stations).length > 0 ||
    progress.visitedIslands.length > 0
  );
}
