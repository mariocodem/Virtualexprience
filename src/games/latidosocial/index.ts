import { lazy } from 'react';
import type { HuertaContent } from '@/data/contentSchemas';
import type { IslandGames } from '../types';

/**
 * Juegos 3D de LatidoSocial: «La huerta comunitaria» (reto) y «Defender el
 * bosque juntos» (arena contra la Bruma del sálvese quien pueda).
 */
export const games: IslandGames<HuertaContent> = {
  Minigame: lazy(async () => ({ default: (await import('./huerta/Huerta3D')).Huerta3D })),
  arena: {
    Component: lazy(async () => ({
      default: (await import('./arena/DefenderBosque')).DefenderBosque,
    })),
    verb: 'Defender el bosque juntos',
    howTo: [
      'La Bruma manda niebla por los senderos y cada farol pide un saber. Acércate y pulsa E (o pulsa 1 a 4) para asignar al grupo que lo tiene.',
      'Los faroles bien atendidos disipan la niebla y cargan la ceiba; con su luz decides entre todos y se carga el haz.',
      'Los grupos se cansan: relévalos antes de que se agoten. Con el haz cargado, pulsa Espacio.',
    ],
  },
};
