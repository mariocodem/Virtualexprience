import type { Progress } from '@/progress/types';
import type { Badge, World } from '@/types/domain';
import { badgeTally } from './journal';

/**
 * Lo que se cuenta de una insignia al abrirla: si ya está sellada, cuánto falta
 * o tu mejor marca, y dónde se gana. Puro: la ficha solo lo dibuja.
 */
export type BadgeStatus =
  | { earned: true; at: string }
  | {
      earned: false;
      /** Avance contable: estaciones, islas, formatos, días, pistas… */
      tally?: { current: number; target: number };
      /** Mejor partida frente a la meta, como proporciones de 0 a 1. */
      best?: { value: number; goal: number };
      /** Una línea que explica el estado cuando no hay número que mostrar. */
      note?: string;
    };

export function badgeStatus(badge: Badge, progress: Progress, world: World): BadgeStatus {
  const at = progress.badges[badge.id];
  if (at) return { earned: true, at };

  const { criterion } = badge;
  if (criterion.kind === 'minigame') {
    const station = world.stations.find((s) => s.minigame === criterion.minigame);
    const record = progress.minigames[criterion.minigame];
    if (!record) {
      return { earned: false, note: `Aún no has jugado ${station?.title ?? 'este reto'}.` };
    }
    if (criterion.metric === 'tools-used') {
      return {
        earned: false,
        tally: { current: Math.min(record.toolsUsed, criterion.min), target: criterion.min },
      };
    }
    const value = criterion.metric === 'accuracy' ? record.accuracy : record.criteria;
    return { earned: false, best: { value, goal: criterion.min } };
  }

  if (criterion.kind === 'finale') {
    const total = world.islands.length;
    const fragments = progress.fragments.length;
    return fragments < total
      ? {
          earned: false,
          tally: { current: fragments, target: total },
          note: 'El Gran Reto se abre cuando el faro reúne los seis fragmentos.',
        }
      : { earned: false, note: 'El Gran Reto ya está abierto en el Faro Minuto.' };
  }

  const tally = badgeTally(badge, progress, world);
  return tally ? { earned: false, tally } : { earned: false };
}

/** Adónde ir para ganar la insignia. */
export function badgeDestination(badge: Badge, world: World): { to: string; label: string } {
  const { criterion } = badge;
  switch (criterion.kind) {
    case 'island-completed': {
      const island = world.islands.find((i) => i.id === criterion.islandId);
      return { to: `/mundo/${criterion.islandId}`, label: `Zarpar a ${island?.name ?? 'la isla'}` };
    }
    case 'minigame': {
      const station = world.stations.find((s) => s.minigame === criterion.minigame);
      return station
        ? {
            to: `/mundo/${station.islandId}?estacion=${station.id}`,
            label: `Ir a ${station.title}`,
          }
        : { to: '/mundo', label: 'Ir a la carta del archipiélago' };
    }
    case 'fragments':
    case 'finale':
      return { to: '/mundo?faro=1', label: 'Ir al Faro Minuto' };
    default:
      return { to: '/mundo', label: 'Ir a la carta del archipiélago' };
  }
}

/** Proporción como porcentaje entero: 0,8 → «80 %». */
export const percent = (value: number) => `${String(Math.round(value * 100))} %`;
