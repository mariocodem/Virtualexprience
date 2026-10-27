import { lazy } from 'react';
import type { MercadoContent } from '@/data/contentSchemas';
import type { IslandGames } from '../types';

/**
 * Juegos 3D de Gerencia+: el puesto de empanadas del muelle («Día de mercado»)
 * y el combate en barco contra la Bruma de la deriva («Llevar el timón»).
 */
export const games: IslandGames<MercadoContent> = {
  Minigame: lazy(async () => ({ default: (await import('./mercado/Mercado3D')).Mercado3D })),
  arena: {
    Component: lazy(async () => ({ default: (await import('./timon/TimonArena')).TimonArena })),
    verb: 'Llevar el timón',
    howTo: [
      'Gobierna el barco con A y D (timón) y W y S (velas) hasta apuntar la proa a la Bruma: el haz sale por delante.',
      'Reparte a tus tres marineros entre velas, bomba y linterna con V, B y L: sin nadie en las velas no avanzas, sin nadie en la bomba el agua te frena y sin nadie en la linterna no puedes disparar.',
      'El contramaestre trae partes con datos: decidir bien carga la linterna; decidir mal fortalece a la Bruma. Esquiva rocas, remolinos y olas.',
    ],
  },
};
