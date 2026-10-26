import type { CabildoContent } from '@/data/contentSchemas';
import type { IslandGames } from '../types';

/**
 * Juegos 3D de Voxcivitas: su reto y su arena contra la Bruma. Mientras falte
 * alguno, se juega su versión accesible (y la arena de faros de respuesta).
 */
export const games: IslandGames<CabildoContent> = {
  Minigame: null,
  arena: null,
};
