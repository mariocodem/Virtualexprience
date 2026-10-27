import { lazy } from 'react';
import type { PuentesContent } from '@/data/contentSchemas';
import type { IslandGames } from '../types';

/**
 * Juegos 3D de NeuroMath: el reto «Puentes de Fractal» (un cañón entre
 * acantilados) y la arena «Reconstruir el puente de luz» (un abismo).
 */
export const games: IslandGames<PuentesContent> = {
  Minigame: lazy(async () => ({ default: (await import('./PuentesReto')).PuentesReto })),
  arena: {
    Component: lazy(async () => ({ default: (await import('./PuenteDeLuz')).PuenteDeLuz })),
    verb: 'Reconstruir el puente de luz',
    howTo: [
      'La Bruma flota sobre un abismo y proyecta un hueco: una medida escrita como fracción, porcentaje, escala o ecuación.',
      'Recoge losetas del anillo (E junto a ellas, o su número) y colócalas en el estribo para tender el puente; la palanca lo prueba.',
      'Si el puente mide justo, se enciende: sube a él y dispara a la Bruma. Si no, cae y la Bruma se fortalece.',
    ],
  },
};
