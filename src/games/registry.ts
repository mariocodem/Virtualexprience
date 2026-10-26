import { games as activatuidea } from './activatuidea';
import { games as comunicarte } from './comunicarte';
import { games as gerencia } from './gerencia';
import { games as latidosocial } from './latidosocial';
import { games as neuromath } from './neuromath';
import type { GamesByIsland } from './types';
import { games as voxcivitas } from './voxcivitas';

/** Juegos 3D de cada isla. Cada isla los declara en src/games/<isla>/index.ts. */
export const GAMES: GamesByIsland = {
  comunicarte,
  neuromath,
  voxcivitas,
  gerencia,
  activatuidea,
  latidosocial,
};
