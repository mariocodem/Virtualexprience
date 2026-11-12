import { islandProgress, nextStation, stationStatus } from '@/progress/selectors';
import type { Progress, StationStatus } from '@/progress/types';
import type { Island, IslandId, Station, World } from '@/types/domain';
import { STATION_TYPE_LABEL } from './stationText';

/**
 * Brújula como guía del sendero: a qué isla zarpar desde la carta, qué escala
 * sigue en una isla, cuándo toca el desafío, el faro o el cierre. Puro y
 * determinista: el 3D, la carta 2D y la cartela de la guía lo dibujan.
 */
export type GuideTarget =
  | {
      kind: 'island';
      island: Island;
      /** La escala con la que empieza o sigue su sendero. */
      station: Station | undefined;
      /** `nueva`: no ha empezado; `en-curso`: hay una escala a medias; `sigue`: ya avanzó. */
      reason: 'nueva' | 'en-curso' | 'sigue';
    }
  | { kind: 'station'; island: Island; station: Station; order: number; status: StationStatus }
  | { kind: 'island-done'; island: Island; next: Island | undefined }
  | { kind: 'faro' }
  | { kind: 'done' };

export interface GuideMessage {
  text: string;
  action?: { label: string; to: string };
}

/**
 * La isla a la que conviene zarpar: primero la que tiene una escala a medias,
 * luego la que ya empezó, luego la primera sin su fragmento.
 */
export function suggestedIsland(
  progress: Progress,
  world: World,
  except?: IslandId,
): Island | undefined {
  const open = world.islands.filter(
    (i) =>
      i.id !== except && !progress.fragments.includes(i.id) && nextStation(progress, world, i.id),
  );
  const inProgress = open.find((i) =>
    world.stations.some((s) => s.islandId === i.id && stationStatus(progress, s) === 'en-curso'),
  );
  const started = open.find((i) => islandProgress(progress, world, i.id).completed > 0);
  return inProgress ?? started ?? open[0];
}

/** Adónde guía Brújula: en la carta (`islandId` vacío) o dentro de una isla. */
export function guideTarget(progress: Progress, world: World, islandId?: IslandId): GuideTarget {
  if (islandId) {
    const island = world.islands.find((i) => i.id === islandId);
    if (island) {
      const station = nextStation(progress, world, island.id);
      if (station) {
        const own = world.stations.filter((s) => s.islandId === island.id);
        return {
          kind: 'station',
          island,
          station,
          order: own.indexOf(station) + 1,
          status: stationStatus(progress, station),
        };
      }
      return { kind: 'island-done', island, next: suggestedIsland(progress, world, island.id) };
    }
  }
  const island = suggestedIsland(progress, world);
  if (island) {
    const station = nextStation(progress, world, island.id);
    const reason =
      station && stationStatus(progress, station) === 'en-curso'
        ? 'en-curso'
        : islandProgress(progress, world, island.id).completed > 0
          ? 'sigue'
          : 'nueva';
    return { kind: 'island', island, station, reason };
  }
  // Sin escalas abiertas pero con fragmentos por recuperar: se vuelve a la primera isla pendiente.
  const pending = world.islands.find((i) => !progress.fragments.includes(i.id));
  if (pending) return { kind: 'island', island: pending, station: undefined, reason: 'sigue' };
  return progress.finale?.completedAt ? { kind: 'done' } : { kind: 'faro' };
}

const FARO = { label: 'Ir al Faro Minuto', to: '/mundo?faro=1' };

/** Lo que dice Brújula y la acción que propone, en el vocabulario del mundo. */
export function guideMessage(target: GuideTarget, progress: Progress, world: World): GuideMessage {
  switch (target.kind) {
    case 'island': {
      const { island, station } = target;
      const go = { label: `Zarpar a ${island.name}`, to: `/mundo/${island.id}` };
      const first = station ? `«${station.title}»` : 'su primera escala';
      if (target.reason === 'en-curso') {
        return { text: `Dejaste ${first} a medias en ${island.name}. ¿La retomamos?`, action: go };
      }
      if (target.reason === 'sigue') {
        const { completed, playable } = islandProgress(progress, world, island.id);
        return {
          text: `En ${island.name} llevas ${String(completed)} de ${String(playable)} escalas. La siguiente es ${first}.`,
          action: go,
        };
      }
      const fresh = Object.keys(progress.stations).length === 0;
      return {
        text: fresh
          ? `Empieza tu expedición en ${island.name}: su sendero arranca en ${first}.`
          : `Te espera ${island.name}: su sendero arranca en ${first}.`,
        action: go,
      };
    }
    case 'station': {
      const { island, station, order } = target;
      const open = { to: `/mundo/${island.id}?estacion=${station.id}` };
      if (target.status === 'en-curso') {
        return {
          text: `Te quedaste en la escala ${String(order)}: «${station.title}». Retómala donde la dejaste.`,
          action: { ...open, label: `Retomar la escala ${String(order)}` },
        };
      }
      if (station.type === 'desafio') {
        return {
          text: `Llegaste al desafío de ${island.name}, a los pies de su monumento. Supéralo para recuperar el ${island.fragmentName}.`,
          action: { ...open, label: 'Abrir el desafío' },
        };
      }
      return {
        text: `Sigue el sendero hasta la escala ${String(order)}: «${station.title}» (${STATION_TYPE_LABEL[station.type]} · ${String(station.minutes)} min).`,
        action: { ...open, label: `Abrir la escala ${String(order)}` },
      };
    }
    case 'island-done': {
      const { island, next } = target;
      const done = progress.fragments.includes(island.id)
        ? `Completaste el sendero de ${island.name} y recuperaste el ${island.fragmentName}.`
        : `Completaste las escalas abiertas de ${island.name}.`;
      return next
        ? {
            text: `${done} Tu próxima isla es ${next.name}.`,
            action: { label: `Zarpar a ${next.name}`, to: `/mundo/${next.id}` },
          }
        : { text: `${done} Los fragmentos esperan en el Faro Minuto.`, action: FARO };
    }
    case 'faro':
      return {
        text: 'Reuniste los seis fragmentos. La Gran Bruma espera en el canal: enciende el Faro Minuto.',
        action: FARO,
      };
    case 'done':
      return {
        text: 'El Faro Minuto brilla de nuevo. Vuelve a cualquier isla para afinar tu dominio.',
        action: { label: 'Ver mi pasaporte', to: '/pasaporte' },
      };
  }
}
