import type { FormatKind, IslandId, MinigameId, World } from '@/types/domain';
import { newlyEarnedBadges } from './badges';
import { explorerStanding } from './levels';
import { stationStatus } from './selectors';
import type { JournalKind, MinigameBest, Progress, ProgressEvent, TransitionResult } from './types';

/**
 * Transiciones puras del progreso: reciben el estado, el mundo y la hora, y
 * devuelven el nuevo estado más los eventos que la interfaz debe anunciar.
 * Toda regla de negocio del progreso vive aquí, no en los componentes.
 */

const JOURNAL_LIMIT = 200;

export interface MinigameRun {
  accuracy: number;
  criteria: number;
  toolsUsed: number;
}

class Draft {
  readonly previous: Progress;
  readonly world: World;
  readonly now: Date;
  readonly progress: Progress;
  readonly events: ProgressEvent[] = [];
  private entries = 0;

  constructor(previous: Progress, world: World, now: Date) {
    this.previous = previous;
    this.world = world;
    this.now = now;
    this.progress = structuredClone(previous);
  }

  get iso(): string {
    return this.now.toISOString();
  }

  log(kind: JournalKind, ref: string): void {
    this.entries += 1;
    this.progress.journal.push({
      id: `${this.iso}#${String(this.entries)}`,
      at: this.iso,
      kind,
      ref,
    });
  }

  /** Cierra la transición: marca el día, otorga insignias y detecta subidas de nivel. */
  finish(): TransitionResult {
    const day = localDay(this.now);
    if (!this.progress.activeDays.includes(day)) this.progress.activeDays.push(day);

    for (const badgeId of newlyEarnedBadges(this.progress, this.world)) {
      this.progress.badges[badgeId] = this.iso;
      this.events.push({ type: 'badge', badgeId });
      this.log('insignia', badgeId);
    }

    const before = explorerStanding(this.previous.xp, this.world.levels).current;
    const after = explorerStanding(this.progress.xp, this.world.levels).current;
    if (after.id !== before.id) {
      this.events.push({ type: 'level-up', levelId: after.id });
      this.log('nivel', after.id);
    }

    if (this.progress.journal.length > JOURNAL_LIMIT) {
      this.progress.journal = this.progress.journal.slice(-JOURNAL_LIMIT);
    }
    return { progress: this.progress, events: this.events };
  }
}

const unchanged = (progress: Progress): TransitionResult => ({ progress, events: [] });

export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function visitIsland(
  progress: Progress,
  world: World,
  islandId: IslandId,
  now: Date,
): TransitionResult {
  const draft = new Draft(progress, world, now);
  if (!draft.progress.visitedIslands.includes(islandId)) {
    draft.progress.visitedIslands.push(islandId);
    draft.log('isla-visitada', islandId);
  }
  return draft.finish();
}

export function startStation(
  progress: Progress,
  world: World,
  stationId: string,
  now: Date,
): TransitionResult {
  const station = world.stations.find((s) => s.id === stationId);
  if (!station || stationStatus(progress, station) !== 'disponible') return unchanged(progress);
  const draft = new Draft(progress, world, now);
  draft.progress.stations[stationId] = { startedAt: draft.iso, attempts: 0 };
  draft.log('estacion-iniciada', stationId);
  return draft.finish();
}

/** Intento sin completar la estación: alimenta al motor adaptativo. */
export function recordAttempt(
  progress: Progress,
  world: World,
  stationId: string,
  score: number,
  now: Date,
): TransitionResult {
  const station = world.stations.find((s) => s.id === stationId);
  if (!station) return unchanged(progress);
  const status = stationStatus(progress, station);
  if (status === 'bloqueada' || status === 'en-preparacion') return unchanged(progress);
  const draft = new Draft(progress, world, now);
  const record = (draft.progress.stations[stationId] ??= { startedAt: draft.iso, attempts: 0 });
  record.attempts += 1;
  record.bestScore = Math.max(record.bestScore ?? 0, clamp01(score));
  return draft.finish();
}

export function completeStation(
  progress: Progress,
  world: World,
  stationId: string,
  score: number,
  now: Date,
): TransitionResult {
  const station = world.stations.find((s) => s.id === stationId);
  if (!station) return unchanged(progress);
  const status = stationStatus(progress, station);
  if (status === 'bloqueada' || status === 'en-preparacion') return unchanged(progress);

  const draft = new Draft(progress, world, now);
  const record = (draft.progress.stations[stationId] ??= { startedAt: draft.iso, attempts: 0 });
  record.attempts += 1;
  record.bestScore = Math.max(record.bestScore ?? 0, clamp01(score));

  if (!record.completedAt) {
    record.completedAt = draft.iso;
    draft.progress.xp += station.xp;
    draft.events.push({ type: 'station-completed', stationId }, { type: 'xp', amount: station.xp });
    draft.log('estacion-completada', stationId);

    if (station.type === 'desafio' && !draft.progress.fragments.includes(station.islandId)) {
      draft.progress.fragments.push(station.islandId);
      draft.events.push({ type: 'fragment', islandId: station.islandId });
      draft.log('fragmento', station.islandId);
    }
  }
  return draft.finish();
}

export function recordFormat(
  progress: Progress,
  world: World,
  format: FormatKind,
  now: Date,
): TransitionResult {
  if (progress.formatsTried.includes(format)) return unchanged(progress);
  const draft = new Draft(progress, world, now);
  draft.progress.formatsTried.push(format);
  draft.log('formato', format);
  return draft.finish();
}

export function recordReflection(
  progress: Progress,
  world: World,
  stationId: string,
  now: Date,
): TransitionResult {
  const draft = new Draft(progress, world, now);
  draft.progress.reflections += 1;
  draft.log('reflexion', stationId);
  return draft.finish();
}

export function recordMinigame(
  progress: Progress,
  world: World,
  minigameId: MinigameId,
  run: MinigameRun,
  now: Date,
): TransitionResult {
  const draft = new Draft(progress, world, now);
  const previous: MinigameBest = draft.progress.minigames[minigameId] ?? {
    accuracy: 0,
    criteria: 0,
    toolsUsed: 0,
    runs: 0,
  };
  draft.progress.minigames[minigameId] = {
    accuracy: Math.max(previous.accuracy, clamp01(run.accuracy)),
    criteria: Math.max(previous.criteria, clamp01(run.criteria)),
    toolsUsed: Math.max(previous.toolsUsed, Math.max(0, Math.round(run.toolsUsed))),
    runs: previous.runs + 1,
  };
  return draft.finish();
}

export function setMastery(
  progress: Progress,
  world: World,
  islandId: IslandId,
  value: number,
  now: Date,
): TransitionResult {
  const draft = new Draft(progress, world, now);
  draft.progress.mastery[islandId] = clamp01(value);
  return draft.finish();
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
