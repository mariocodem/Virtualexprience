import { lazy } from 'react';
import type { IslandId } from '@/types/domain';
import { GAMES } from './registry';
import type { ArenaEntry } from './types';

/** Arena de faros de respuesta: la de respaldo mientras una isla no tenga la suya. */
export const FAROS: ArenaEntry = {
  Component: lazy(async () => ({ default: (await import('./shared/QuizArena')).QuizArena })),
  verb: 'Responder en los faros',
  howTo: [
    'Cada embate levanta un faro por respuesta: llega al de la correcta y pulsa E, o pulsa su número.',
    'Acertar carga tu linterna; fallar hace más fuerte a la Bruma.',
  ],
};

/** La arena 3D de una isla, o la de respaldo. */
export function arenaFor(island: IslandId): ArenaEntry {
  return GAMES[island].arena ?? FAROS;
}
