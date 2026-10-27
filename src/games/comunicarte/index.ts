import { lazy } from 'react';
import type { SalaContent } from '@/data/contentSchemas';
import type { IslandGames } from '../types';

/**
 * Juegos 3D de ComunicArte: su reto y su arena contra la Bruma. Mientras falte
 * alguno, se juega su versión accesible (y la arena de faros de respuesta).
 */
export const games: IslandGames<SalaContent> = {
  Minigame: lazy(async () => ({
    default: (await import('./sala/SalaDeRedaccion3D')).SalaDeRedaccion3D,
  })),
  arena: {
    Component: lazy(async () => ({ default: (await import('./arena/RumorArena')).RumorArena })),
    verb: 'Verificar los rumores',
    howTo: [
      'La Bruma lanza rumores con titular hacia la torre de radio: acércate a uno y pulsa E para interceptarlo.',
      'Revisa una señal (fuente, fecha, cita o imagen) y decide: desmentirlo o dejarlo pasar. Desmentir un rumor falso carga tu linterna.',
      'Detener una noticia verdadera, o dejar que un rumor falso llegue a la torre, fortalece a la Bruma.',
    ],
  },
};
