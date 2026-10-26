import type { HuertaContent } from '@/data/contentSchemas';
import type { IslandGames } from '../types';

/**
 * Juegos 3D de LatidoSocial: su reto y su arena contra la Bruma. Mientras falte
 * alguno, se juega su versión accesible (y la arena de faros de respuesta).
 */
export const games: IslandGames<HuertaContent> = {
  Minigame: null,
  arena: null,
};
