import { lazy } from 'react';
import type { CabildoContent } from '@/data/contentSchemas';
import type { IslandGames } from '../types';

/**
 * Juegos 3D de Voxcivitas: la sesión de cabildo en la plaza y la arena
 * «Moderar la plaza» contra la Bruma de la indiferencia.
 */
export const games: IslandGames<CabildoContent> = {
  Minigame: lazy(async () => ({
    default: (await import('./cabildo/CabildoGame')).CabildoGame,
  })),
  arena: {
    Component: lazy(async () => ({
      default: (await import('./arena/PlazaArena')).PlazaArena,
    })),
    verb: 'Moderar la plaza',
    howTo: [
      'La indiferencia apaga a los vecinos. Cuando alguien alza la voz, llega a su lado y pulsa E para escucharlo.',
      'Elige una intervención con el cabildo en mente: escucha, pide evidencia, integra. Si es buena, enciende su farol y su luz carga tu linterna.',
      'Una falacia o una imposición lo apaga del todo y fortalece a la Bruma. Mientras tanto, esquiva su niebla.',
    ],
  },
};
